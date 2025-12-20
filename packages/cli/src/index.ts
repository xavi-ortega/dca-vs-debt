#!/usr/bin/env node
import fs from "fs";
import path from "path";
import {
  FREQUENCIES,
  filterRange,
  simulateDebtStrategy,
  buildDebtReportRows,
  buildHeadToHeadRows,
  buildDcaCrossRows,
  type CoreConfig,
  type SeriesPoint,
  type Frequency,
} from "@bitcoin-strategy/core";

/* =========================
   CSV parsing (CLI)
   ========================= */

function parseCSV(text: string): {
  header: string[];
  rows: Record<string, string>[];
} {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV file too short.");

  const header = lines[0].split(",").map((s) => s.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts.length !== header.length) continue;

    const obj: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) obj[header[j]] = parts[j].trim();
    rows.push(obj);
  }
  return { header, rows };
}

function detectColumns(header: string[]): {
  dateCol: string;
  priceCol: string;
} {
  const norm = (s: string) => s.toLowerCase().trim();
  const h = header.map(norm);

  const findAny = (candidates: string[]) => {
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

  const dateCol = findAny([
    "date",
    "timestamp",
    "time",
    "datetime",
    "start",
    "end",
  ]);
  const priceCol = findAny(["close", "adj close", "price", "close_usd"]);

  if (!dateCol || !priceCol) {
    throw new Error(
      `Could not detect required columns.\nFound header: ${header.join(", ")}\nNeed date column (Start/End/Date/...) and price column (Close/Price/...).`,
    );
  }
  return { dateCol, priceCol };
}

function toISODate(value: string): string {
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  throw new Error(`Unparseable date: ${value}`);
}

/* =========================
   CLI args
   ========================= */

type CliArgs = {
  csvPath: string | null;
  start: string | null;
  end: string | null;

  initialBTC: number;
  initialUSD: number;

  apr: number;
  maxDebtPct: number;
  band: number;

  payInterestDaily: boolean;
  borrowToMax: boolean;

  satPerVb: number;
  vbytesPerTx: number;
  txBorrow: number;
  txRepay: number;

  includeDcaFees: boolean;
  dcaTxCount: number;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    csvPath: null,
    start: null,
    end: null,

    initialBTC: 0,
    initialUSD: 0,

    apr: 0.04,
    maxDebtPct: 0.15,
    band: 0.02,

    payInterestDaily: true,
    borrowToMax: true,

    satPerVb: 20,
    vbytesPerTx: 180,
    txBorrow: 1,
    txRepay: 1,

    includeDcaFees: true,
    dcaTxCount: 1,
  };

  const positional: string[] = [];

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];

    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      if (v === undefined) continue;
      if (!(k in args)) continue;

      if (v === "true") (args as any)[k] = true;
      else if (v === "false") (args as any)[k] = false;
      else {
        const num = Number(v);
        (args as any)[k] = Number.isFinite(num) ? num : v;
      }
    } else {
      positional.push(a);
    }
  }

  args.csvPath = positional[0] || null;
  if (!args.csvPath) {
    throw new Error(
      "Usage: npm run cli -- <path/to.csv> [--start=YYYY-MM-DD --end=YYYY-MM-DD --initialUSD=... ...]",
    );
  }
  return args;
}

/* =========================
   Table printing (CLI)
   ========================= */

function fmtNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "NaN";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
function fmtInt(n: number): string {
  if (!Number.isFinite(n)) return "NaN";
  return Math.round(n).toLocaleString("en-US");
}
function fmtBTC(n: number): string {
  const abs = Math.abs(n);
  const digits = abs >= 100 ? 4 : abs >= 1 ? 6 : 8;
  return fmtNum(n, digits);
}

type Column<T> = {
  key: keyof T;
  label: string;
  align?: "left" | "right";
  format?: (v: any, row: T) => string;
};

function printTable<T extends Record<string, any>>(
  title: string,
  columns: Column<T>[],
  rows: T[],
) {
  const formattedRows = rows.map((r) => {
    const out: Record<string, string> = {};
    for (const c of columns) {
      const raw = r[c.key as string];
      out[c.key as string] = c.format ? c.format(raw, r) : String(raw ?? "");
    }
    return out;
  });

  const widths: Record<string, number> = {};
  for (const c of columns) {
    const k = c.key as string;
    let maxLen = c.label.length;
    for (const r of formattedRows)
      maxLen = Math.max(maxLen, (r[k] ?? "").length);
    widths[k] = maxLen;
  }

  const pad = (s: string, w: number, align: "left" | "right") => {
    if (s.length >= w) return s;
    const spaces = " ".repeat(w - s.length);
    return align === "right" ? spaces + s : s + spaces;
  };

  const separator = () =>
    columns.map((c) => "-".repeat(widths[c.key as string])).join("-+-");

  console.log(`\n=== ${title} ===`);
  console.log(
    columns
      .map((c) => pad(c.label, widths[c.key as string], c.align ?? "left"))
      .join(" | "),
  );
  console.log(separator());

  for (const r of formattedRows) {
    console.log(
      columns
        .map((c) =>
          pad(r[c.key as string], widths[c.key as string], c.align ?? "left"),
        )
        .join(" | "),
    );
  }
}

/* =========================
   Path resolution helper
   ========================= */

/**
 * When running via npm workspace, cwd is typically packages/cli.
 * This resolves relative CSV paths against the REPO ROOT, so "assets/..." works.
 */
function resolveCsvPath(csvPathArg: string): string {
  if (path.isAbsolute(csvPathArg)) return csvPathArg;

  // packages/cli -> repo root
  const repoRoot = path.resolve(process.cwd(), "../..");
  return path.resolve(repoRoot, csvPathArg);
}

/* =========================
   Main (CLI)
   ========================= */

function main() {
  const args = parseArgs(process.argv);

  const csvPath = resolveCsvPath(args.csvPath!);
  const csvText = fs.readFileSync(csvPath, "utf8");

  const { header, rows } = parseCSV(csvText);
  const { dateCol, priceCol } = detectColumns(header);

  const fullSeries: SeriesPoint[] = rows
    .map((r) => ({
      date: toISODate(r[dateCol] ?? ""),
      price: Number(r[priceCol]),
    }))
    .filter((p) => Number.isFinite(p.price) && p.price > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const series = filterRange(fullSeries, args.start, args.end);

  const cfg: CoreConfig = {
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

  const dcaOpts = {
    includeFees: Boolean(args.includeDcaFees),
    dcaTxCount: Number(args.dcaTxCount),
  };

  console.log("=== BACKTEST CONFIG (CLI) ===");
  console.log(`CSV: ${csvPath}`);
  console.log(
    `Range: ${series[0].date} -> ${series.at(-1)!.date} (${series.length} days)`,
  );
  console.log(
    `Start price: $${fmtNum(series[0].price)} | End price: $${fmtNum(series.at(-1)!.price)}`,
  );
  console.log(
    `Initial: initialBTC=${cfg.initialBTC} initialUSD=$${fmtNum(cfg.initialUSD)}`,
  );
  console.log(
    `Debt: APR=${fmtNum(cfg.apr * 100)}% maxDebtPct=${cfg.maxDebtPct} band=${cfg.band}`,
  );
  console.log(
    `Fees: sat/vB=${cfg.satPerVb} vbytes=${cfg.vbytesPerTx} txBorrow=${cfg.txBorrow} txRepay=${cfg.txRepay}`,
  );
  console.log(
    `DCA fees: includeFees=${dcaOpts.includeFees} dcaTxCount=${dcaOpts.dcaTxCount}`,
  );

  const debtResults = FREQUENCIES.map((f: Frequency) =>
    simulateDebtStrategy(series, cfg, f),
  );
  const debtRows = buildDebtReportRows(debtResults);
  const headRows = buildHeadToHeadRows(series, cfg, debtResults, dcaOpts);
  const crossRows = buildDcaCrossRows(series, cfg, debtResults, dcaOpts);

  printTable(
    "Debt Strategy Report",
    [
      { key: "freq", label: "Freq", align: "left", format: (v) => String(v) },
      {
        key: "btcFinal",
        label: "BTC",
        align: "right",
        format: (v) => fmtBTC(v),
      },
      {
        key: "finalValueUSD",
        label: "Final $",
        align: "right",
        format: (v) => fmtInt(v),
      },
      {
        key: "debtFinal",
        label: "Debt $",
        align: "right",
        format: (v) => fmtInt(v),
      },
      {
        key: "netValueUSD",
        label: "Net $",
        align: "right",
        format: (v) => fmtInt(v),
      },
      {
        key: "externalTotalUSD",
        label: "External $",
        align: "right",
        format: (v) => fmtInt(v),
      },
      {
        key: "interestUSD",
        label: "Interest $",
        align: "right",
        format: (v) => fmtInt(v),
      },
      {
        key: "principalUSD",
        label: "Principal $",
        align: "right",
        format: (v) => fmtInt(v),
      },
      {
        key: "feesUSD",
        label: "Fees $",
        align: "right",
        format: (v) => fmtInt(v),
      },
      {
        key: "borrows",
        label: "Borrows",
        align: "right",
        format: (v) => fmtInt(v),
      },
      {
        key: "repays",
        label: "Repays",
        align: "right",
        format: (v) => fmtInt(v),
      },
    ],
    debtRows,
  );

  printTable(
    "Head-to-Head (Debt vs DCA same freq)",
    [
      { key: "freq", label: "Freq", align: "left", format: (v) => String(v) },
      {
        key: "debtBTC",
        label: "Debt BTC",
        align: "right",
        format: (v) => fmtBTC(v),
      },
      {
        key: "dcaBTC",
        label: "DCA BTC",
        align: "right",
        format: (v) => fmtBTC(v),
      },
      {
        key: "deltaBTC",
        label: "Δ BTC",
        align: "right",
        format: (v) => fmtBTC(v),
      },
      {
        key: "debtNetUSD",
        label: "Debt Net $",
        align: "right",
        format: (v) => fmtInt(v),
      },
      {
        key: "dcaValueUSD",
        label: "DCA $",
        align: "right",
        format: (v) => fmtInt(v),
      },
      {
        key: "deltaNetUSD",
        label: "Δ Net $",
        align: "right",
        format: (v) => fmtInt(v),
      },
      {
        key: "externalUSD",
        label: "External $",
        align: "right",
        format: (v) => fmtInt(v),
      },
      {
        key: "dcaFeesUSD",
        label: "DCA Fees $",
        align: "right",
        format: (v) => fmtInt(v),
      },
    ],
    headRows,
  );

  printTable(
    "DCA Cross-Table (budget from Debt Freq)",
    [
      {
        key: "debtFreq",
        label: "Debt Freq",
        align: "left",
        format: (v) => String(v),
      },
      {
        key: "dcaFreq",
        label: "DCA Freq",
        align: "left",
        format: (v) => String(v),
      },
      {
        key: "budgetUSD",
        label: "Budget $",
        align: "right",
        format: (v) => fmtInt(v),
      },
      {
        key: "dcaBTCFinal",
        label: "DCA BTC",
        align: "right",
        format: (v) => fmtBTC(v),
      },
      {
        key: "dcaBuys",
        label: "Buys",
        align: "right",
        format: (v) => fmtInt(v),
      },
      {
        key: "dcaFeesUSD",
        label: "Fees $",
        align: "right",
        format: (v) => fmtInt(v),
      },
      {
        key: "dcaValueFinalUSD",
        label: "Final $",
        align: "right",
        format: (v) => fmtInt(v),
      },
    ],
    crossRows,
  );
}

main();
