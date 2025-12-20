#!/usr/bin/env node
/**
 * backtest-btc-debt-vs-dca.js
 *
 * Historical backtest using DAILY BTC price data (CSV input) to compare:
 *
 * A) A BTC-collateralized debt strategy under a strict survival rule:
 *    "After a -70% price drop, collateral ratio must still be >= 200%"
 *    => Maximum allowed debt: D <= 0.15 * collateral_value
 *
 * B) A pure DCA strategy using the SAME amount of external cash
 *    consumed by the debt strategy (interest + principal repayments + Bitcoin L1 fees).
 *
 * Rebalance frequencies tested:
 *   - daily
 *   - weekly
 *   - monthly
 *   - quarterly
 *   - yearly
 *
 * Costs modeled (external cash outlay):
 *   - Interest on debt (APR, paid externally by default)
 *   - Forced principal repayments (external cash)
 *   - Bitcoin L1 transaction fees (modeled via sat/vB * vbytes * txCount)
 *
 * Output:
 *   - Printed as ASCII tables to console
 *
 * Requirements:
 *   - Node.js 18+
 *
 * Usage:
 *   node index.js /path/to/btc_daily.csv [--param=value ...]
 *
 * Example:
 *   node index.js btc.csv --start=2020-01-01 --end=2025-12-20 --initialUSD=25000 --initialBTC=0
 */

const fs = require("fs");
const path = require("path");

/* =========================
   CONFIG / CONSTANTS
   ========================= */

const FREQUENCIES = ["daily", "weekly", "monthly", "quarterly", "yearly"];

/* =========================
   CSV PARSING
   ========================= */

/**
 * Very simple CSV parser.
 * Assumes no escaped commas or complex quoting.
 * Suitable for standard OHLC datasets.
 */
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV file too short.");

  const header = lines[0].split(",").map((s) => s.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts.length !== header.length) continue;

    const obj = {};
    for (let j = 0; j < header.length; j++) obj[header[j]] = parts[j].trim();
    rows.push(obj);
  }
  return { header, rows };
}

/**
 * Attempt to automatically detect date and price columns.
 */
function detectColumns(header) {
  const norm = (s) => s.toLowerCase().trim();
  const h = header.map(norm);

  const findAny = (candidates) => {
    for (const c of candidates) {
      const idx = h.indexOf(norm(c));
      if (idx !== -1) return header[idx];
    }
    for (const c of candidates) {
      const idx = h.findIndex((x) => x.includes(norm(c)));
      if (idx !== -1) return header[idx];
    }
    return null;
  };

  // Many BTC CSV datasets use Start/End for date and Close for price.
  const dateCol = findAny(["date", "timestamp", "time", "datetime", "start", "end"]);
  const priceCol = findAny(["close", "adj close", "price", "close_usd"]);

  if (!dateCol || !priceCol) {
    throw new Error(
      `Could not detect required columns.\n` +
        `Found header: ${header.join(", ")}\n` +
        `Need: a date column (Date/Start/End/...) and a price column (Close/Price/...).`
    );
  }
  return { dateCol, priceCol };
}

/**
 * Normalize date strings to ISO YYYY-MM-DD (UTC).
 */
function toISODate(value) {
  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  throw new Error(`Unparseable date: ${value}`);
}

/* =========================
   CLI ARGS + RANGE FILTER
   ========================= */

function parseArgs(argv) {
  const args = {
    csvPath: null,
    start: null, // "YYYY-MM-DD"
    end: null, // "YYYY-MM-DD"

    // Initial holdings / purchase
    initialBTC: 0,
    initialUSD: 0,

    // Debt strategy params
    apr: 0.04,
    maxDebtPct: 0.15,
    band: 0.02,
    payInterestDaily: true,
    borrowToMax: true,

    // Fee model params (Bitcoin L1)
    satPerVb: 20,
    vbytesPerTx: 180,
    txBorrow: 1,
    txRepay: 1,
  };

  const positional = [];

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];

    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      if (v === undefined) continue;
      if (!(k in args)) continue;

      if (v === "true") args[k] = true;
      else if (v === "false") args[k] = false;
      else {
        const num = Number(v);
        args[k] = Number.isFinite(num) ? num : v;
      }
    } else {
      positional.push(a);
    }
  }

  args.csvPath = positional[0] || null;
  if (!args.csvPath) {
    throw new Error(
      "Usage: node index.js <btc.csv> [--start=YYYY-MM-DD --end=YYYY-MM-DD --initialUSD=... --initialBTC=... ...]"
    );
  }
  return args;
}

function filterRange(series, start, end) {
  let out = series;
  if (start) out = out.filter((x) => x.date >= start);
  if (end) out = out.filter((x) => x.date <= end);

  if (out.length < 10) {
    throw new Error(
      `Filtered range too short. start=${start} end=${end} -> ${out.length} rows`
    );
  }
  return out;
}

/* =========================
   REBALANCE CALENDAR
   ========================= */

/**
 * Determine whether a given date is a rebalance day for a given frequency.
 */
function isRebalanceDay(freq, isoDate) {
  const d = new Date(isoDate + "T00:00:00Z");

  if (freq === "daily") return true;
  if (freq === "weekly") return d.getUTCDay() === 1; // Monday
  if (freq === "monthly") return d.getUTCDate() === 1;
  if (freq === "quarterly") {
    const m = d.getUTCMonth() + 1;
    return d.getUTCDate() === 1 && [1, 4, 7, 10].includes(m);
  }
  if (freq === "yearly") return d.getUTCDate() === 1 && d.getUTCMonth() === 0;

  return false;
}

/* =========================
   BITCOIN FEE MODEL
   ========================= */

/**
 * Compute a Bitcoin L1 fee in USD.
 *
 * fee_sats = satPerVb * vbytes * txCount
 * fee_btc = fee_sats / 1e8
 * fee_usd = fee_btc * btcPriceUSD
 */
function btcFeeUSD({ satPerVb, vbytes, txCount, btcPriceUSD }) {
  const sats = satPerVb * vbytes * txCount;
  return (sats / 1e8) * btcPriceUSD;
}

/* =========================
   STRATEGY SIMULATIONS
   ========================= */

/**
 * Simulate the BTC-collateralized debt strategy.
 *
 * Mechanics:
 * - Interest accrues daily; by default it is paid externally (cash out of system).
 * - On rebalance days:
 *     - repay principal externally if debt > maxDebt
 *     - borrow and buy BTC if debt < maxDebt*(1-band)
 */
function simulateDebtStrategy(series, cfg, freq) {
  const {
    initialBTC,
    initialUSD,
    apr,
    maxDebtPct,
    band,
    satPerVb,
    vbytesPerTx,
    txBorrow,
    txRepay,
    payInterestDaily,
    borrowToMax,
  } = cfg;

  let btc = initialBTC;
  let debt = 0;

  // Buy BTC at the first available price (if initialUSD provided)
  if (initialUSD > 0) btc += initialUSD / series[0].price;

  // External cash breakdown
  let interestUSD = 0;
  let principalUSD = 0;
  let feesUSD = 0;

  // Operational counters
  let borrows = 0;
  let repays = 0;

  // Diagnostics
  let maxDebtSeen = 0;

  const dailyRate = apr / 365;

  for (const { date, price } of series) {
    // Accrue interest daily
    if (debt > 0) {
      const interest = debt * dailyRate;
      if (payInterestDaily) interestUSD += interest;
      else debt += interest;
    }

    // Track max debt across all days
    if (debt > maxDebtSeen) maxDebtSeen = debt;

    if (!isRebalanceDay(freq, date)) continue;

    const collateralValue = btc * price;
    const maxDebt = maxDebtPct * collateralValue;

    // Forced principal repayment
    if (debt > maxDebt) {
      const repay = debt - maxDebt;
      debt -= repay;
      principalUSD += repay;

      feesUSD += btcFeeUSD({
        satPerVb,
        vbytes: vbytesPerTx,
        txCount: txRepay,
        btcPriceUSD: price,
      });

      repays++;
    }

    // Borrow/refinance
    const lowerBound = maxDebt * (1 - band);
    if (debt < lowerBound) {
      const target = borrowToMax ? maxDebt : lowerBound;
      const borrow = target - debt;

      if (borrow > 0) {
        debt += borrow;
        btc += borrow / price;

        feesUSD += btcFeeUSD({
          satPerVb,
          vbytes: vbytesPerTx,
          txCount: txBorrow,
          btcPriceUSD: price,
        });

        borrows++;
      }
    }

    if (debt > maxDebtSeen) maxDebtSeen = debt;
  }

  const finalPrice = series.at(-1).price;
  const finalValueUSD = btc * finalPrice;
  const externalTotalUSD = interestUSD + principalUSD + feesUSD;

  return {
    freq,

    // Holdings / debt
    btcFinal: btc,
    debtFinal: debt,

    // Valuation
    finalValueUSD,

    // External cash
    externalTotalUSD,
    interestUSD,
    principalUSD,
    feesUSD,

    // Ops & diagnostics
    borrows,
    repays,
    maxDebtSeen,
  };
}

/**
 * Simulate DCA that spends exactly externalBudgetUSD across the selected schedule.
 */
function simulateDCA(series, cfg, freq, externalBudgetUSD) {
  let btc = cfg.initialBTC;
  if (cfg.initialUSD > 0) btc += cfg.initialUSD / series[0].price;

  const buyDays = series.filter((d) => isRebalanceDay(freq, d.date));
  const perBuy = externalBudgetUSD / buyDays.length;

  let feesUSD = 0;

  for (const d of buyDays) {
    const fee = btcFeeUSD({
      satPerVb: cfg.satPerVb,
      vbytes: cfg.vbytesPerTx,
      txCount: 1,              // 1 tx per DCA buy
      btcPriceUSD: d.price,
    });
  
    feesUSD += fee;
  
    const netBuyUSD = Math.max(perBuy - fee, 0);
    btc += netBuyUSD / d.price;
  }

  return {
    freq,
    btcFinal: btc,
    buys: buyDays.length,
    spentUSD: externalBudgetUSD,
    feesUSD,
    finalValueUSD: btc * series.at(-1).price,
  };
}

/* =========================
   FORMATTING + TABLES
   ========================= */

function fmtNum(n, digits = 2) {
  if (!Number.isFinite(n)) return "NaN";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtInt(n) {
  if (!Number.isFinite(n)) return "NaN";
  return Math.round(n).toLocaleString("en-US");
}

function fmtBTC(n) {
  const abs = Math.abs(n);
  const digits = abs >= 100 ? 4 : abs >= 1 ? 6 : 8;
  return fmtNum(n, digits);
}

/**
 * Print an ASCII table with dynamic column widths.
 */
function printTable(title, columns, rows) {
  const formattedRows = rows.map((r) => {
    const out = {};
    for (const c of columns) out[c.key] = c.format ? c.format(r[c.key]) : String(r[c.key]);
    return out;
  });

  const widths = {};
  for (const c of columns) {
    let maxLen = c.label.length;
    for (const r of formattedRows) maxLen = Math.max(maxLen, (r[c.key] ?? "").length);
    widths[c.key] = maxLen;
  }

  const pad = (s, w, align) => {
    s = s ?? "";
    if (s.length >= w) return s;
    const spaces = " ".repeat(w - s.length);
    return align === "right" ? spaces + s : s + spaces;
  };

  const separator = () =>
    columns.map((c) => "-".repeat(widths[c.key])).join("-+-");

  console.log(`\n=== ${title} ===`);
  console.log(columns.map((c) => pad(c.label, widths[c.key], c.align || "left")).join(" | "));
  console.log(separator());

  for (const r of formattedRows) {
    console.log(
      columns.map((c) => pad(r[c.key], widths[c.key], c.align || "left")).join(" | ")
    );
  }
}

/* =========================
   REPORT BUILDERS
   ========================= */

/**
 * Build the debt table rows with additional fields (net value, etc).
 *
 * We include:
 * - final USD value of BTC
 * - net USD value after subtracting outstanding debt
 */
function buildDebtReportRows(debtResults) {
  return debtResults.map((dr) => {
    const netValueUSD = dr.finalValueUSD - dr.debtFinal;
    return {
      freq: dr.freq,
      btcFinal: dr.btcFinal,
      finalValueUSD: dr.finalValueUSD,
      debtFinal: dr.debtFinal,
      netValueUSD,
      externalTotalUSD: dr.externalTotalUSD,
      interestUSD: dr.interestUSD,
      principalUSD: dr.principalUSD,
      feesUSD: dr.feesUSD,
      borrows: dr.borrows,
      repays: dr.repays,
      maxDebtSeen: dr.maxDebtSeen,
    };
  });
}

/**
 * Build a "debt vs DCA" head-to-head table using the SAME frequency for DCA.
 * Includes both BTC delta and USD delta.
 */
function buildHeadToHeadRows(series, cfg, debtResults) {
  return debtResults.map((dr) => {
    const dcaSame = simulateDCA(series, cfg, dr.freq, dr.externalTotalUSD);

    const debtNetUSD = dr.finalValueUSD - dr.debtFinal;
    const dcaNetUSD = dcaSame.finalValueUSD; // no debt in DCA

    return {
      freq: dr.freq,

      debtBTC: dr.btcFinal,
      dcaBTC: dcaSame.btcFinal,
      deltaBTC: dr.btcFinal - dcaSame.btcFinal,

      debtValueUSD: dr.finalValueUSD,
      debtNetUSD,
      dcaValueUSD: dcaSame.finalValueUSD,
      deltaNetUSD: debtNetUSD - dcaNetUSD,

      externalUSD: dr.externalTotalUSD,
    };
  });
}

/**
 * Build the full cross-table:
 * For each debt frequency, show DCA outcomes at all DCA frequencies using the same budget.
 */
function buildDcaCrossRows(series, cfg, debtResults) {
  const rows = [];
  for (const dr of debtResults) {
    for (const dcaFreq of FREQUENCIES) {
      const dca = simulateDCA(series, cfg, dcaFreq, dr.externalTotalUSD);
      rows.push({
        debtFreq: dr.freq,
        dcaFreq: dca.freq,
        budgetUSD: dr.externalTotalUSD,
        dcaBTCFinal: dca.btcFinal,
        dcaValueFinalUSD: dca.finalValueUSD,
        dcaBuys: dca.buys,
        feesUSD: dca.feesUSD,
      });
    }
  }
  return rows;
}

/* =========================
   MAIN
   ========================= */

function main() {
  const args = parseArgs(process.argv);

  const csvText = fs.readFileSync(path.resolve(args.csvPath), "utf8");
  const { header, rows } = parseCSV(csvText);
  const { dateCol, priceCol } = detectColumns(header);

  const fullSeries = rows
    .map((r) => ({ date: toISODate(r[dateCol]), price: Number(r[priceCol]) }))
    .filter((r) => Number.isFinite(r.price) && r.price > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const series = filterRange(fullSeries, args.start, args.end);

  const cfg = {
    initialBTC: Number(args.initialBTC),
    initialUSD: Number(args.initialUSD),

    apr: Number(args.apr),
    maxDebtPct: Number(args.maxDebtPct),
    band: Number(args.band),
    payInterestDaily: Boolean(args.payInterestDaily),
    borrowToMax: Boolean(args.borrowToMax),

    satPerVb: Number(args.satPerVb),
    vbytesPerTx: Number(args.vbytesPerTx),
    txBorrow: Number(args.txBorrow),
    txRepay: Number(args.txRepay),
  };

  // Header/config summary (short + useful)
  console.log("=== BACKTEST CONFIG ===");
  console.log(`CSV: ${args.csvPath}`);
  console.log(`Range: ${series[0].date} -> ${series.at(-1).date} (${series.length} days)`);
  console.log(`Start price: $${fmtNum(series[0].price, 2)} | End price: $${fmtNum(series.at(-1).price, 2)}`);
  console.log(`Initial: initialBTC=${cfg.initialBTC} | initialUSD=$${fmtNum(cfg.initialUSD, 2)}`);
  console.log(`Debt: APR=${fmtNum(cfg.apr * 100, 2)}% | maxDebtPct=${cfg.maxDebtPct} | band=${cfg.band}`);
  console.log(`Fees: sat/vB=${cfg.satPerVb} | vbytes=${cfg.vbytesPerTx} | txBorrow=${cfg.txBorrow} | txRepay=${cfg.txRepay}`);

  // Run debt simulations
  const debtResults = FREQUENCIES.map((f) => simulateDebtStrategy(series, cfg, f));

  // Build report rows
  const debtRows = buildDebtReportRows(debtResults);
  const headToHeadRows = buildHeadToHeadRows(series, cfg, debtResults);
  const dcaCrossRows = buildDcaCrossRows(series, cfg, debtResults);

  // 1) Debt strategy report (includes final USD value + net USD)
  printTable(
    "Debt Strategy Report (incl. USD value + net USD)",
    [
      { key: "freq", label: "Debt Freq", align: "left", format: String },
      { key: "btcFinal", label: "BTC Final", align: "right", format: fmtBTC },
      { key: "finalValueUSD", label: "Final Value $", align: "right", format: fmtInt },
      { key: "debtFinal", label: "Debt Final $", align: "right", format: fmtInt },
      { key: "netValueUSD", label: "Net Value $", align: "right", format: fmtInt },
      { key: "externalTotalUSD", label: "External $", align: "right", format: fmtInt },
      { key: "interestUSD", label: "Interest $", align: "right", format: fmtInt },
      { key: "principalUSD", label: "Principal $", align: "right", format: fmtInt },
      { key: "feesUSD", label: "Fees $", align: "right", format: fmtInt },
      { key: "borrows", label: "Borrows", align: "right", format: fmtInt },
      { key: "repays", label: "Repays", align: "right", format: fmtInt },
      { key: "maxDebtSeen", label: "Max Debt $", align: "right", format: fmtInt },
    ],
    debtRows
  );

  // 2) Head-to-head: debt vs DCA using the SAME frequency
  printTable(
    "Head-to-Head (Debt vs DCA using the SAME frequency)",
    [
      { key: "freq", label: "Freq", align: "left", format: String },

      { key: "debtBTC", label: "Debt BTC", align: "right", format: fmtBTC },
      { key: "dcaBTC", label: "DCA BTC", align: "right", format: fmtBTC },
      { key: "deltaBTC", label: "Δ BTC", align: "right", format: fmtBTC },

      { key: "debtNetUSD", label: "Debt Net $", align: "right", format: fmtInt },
      { key: "dcaValueUSD", label: "DCA Value $", align: "right", format: fmtInt },
      { key: "deltaNetUSD", label: "Δ Net $", align: "right", format: fmtInt },

      { key: "externalUSD", label: "External $", align: "right", format: fmtInt },
    ],
    headToHeadRows
  );

  // 3) DCA cross-table (budget derived from each debt frequency)
  // This is useful if you want to see "if I had to spend X externally under a given debt policy,
  // which DCA schedule would have done best?"
  printTable(
    "DCA Cross-Table (same external budget as each Debt Freq)",
    [
      { key: "debtFreq", label: "Debt Freq", align: "left", format: String },
      { key: "dcaFreq", label: "DCA Freq", align: "left", format: String },
      { key: "budgetUSD", label: "Budget $", align: "right", format: fmtInt },
      { key: "dcaBTCFinal", label: "DCA BTC", align: "right", format: fmtBTC },
      { key: "dcaBuys", label: "Buys", align: "right", format: fmtInt },
      { key: "feesUSD", label: "Fees $", align: "right", format: fmtInt },
      { key: "dcaValueFinalUSD", label: "Final Value $", align: "right", format: fmtInt },
    ],
    dcaCrossRows
  );
}

main();
