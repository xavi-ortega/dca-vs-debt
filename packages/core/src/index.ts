export type Frequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export const FREQUENCIES: Frequency[] = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
];

export type SeriesPoint = {
  date: string; // ISO YYYY-MM-DD
  price: number; // USD
};

export type CoreConfig = {
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
};

export type DebtResult = {
  freq: Frequency;

  btcFinal: number;
  debtFinal: number;
  finalValueUSD: number;

  externalTotalUSD: number;
  interestUSD: number;
  principalUSD: number;
  feesUSD: number;

  borrows: number;
  repays: number;
  maxDebtSeen: number;
};

export type DcaOptions = {
  includeFees?: boolean;
  dcaTxCount?: number;
};

export type DcaResult = {
  freq: Frequency;
  btcFinal: number;
  buys: number;
  spentUSD: number;
  feesUSD: number;
  finalValueUSD: number;
};

export type DebtReportRow = {
  freq: Frequency;
  btcFinal: number;
  finalValueUSD: number;
  debtFinal: number;
  netValueUSD: number;

  externalTotalUSD: number;
  interestUSD: number;
  principalUSD: number;
  feesUSD: number;

  borrows: number;
  repays: number;
  maxDebtSeen: number;
};

export type HeadToHeadRow = {
  freq: Frequency;

  debtBTC: number;
  dcaBTC: number;
  deltaBTC: number;

  debtNetUSD: number;
  dcaValueUSD: number;
  deltaNetUSD: number;

  externalUSD: number;
  dcaFeesUSD: number;
};

export type DcaCrossRow = {
  debtFreq: Frequency;
  dcaFreq: Frequency;

  budgetUSD: number;
  dcaBTCFinal: number;
  dcaBuys: number;
  dcaFeesUSD: number;
  dcaValueFinalUSD: number;
};

export function filterRange(
  series: SeriesPoint[],
  start: string | null,
  end: string | null,
): SeriesPoint[] {
  let out = series;
  if (start) out = out.filter((x) => x.date >= start);
  if (end) out = out.filter((x) => x.date <= end);

  if (out.length < 10) {
    throw new Error(
      `Filtered range too short. start=${start} end=${end} -> ${out.length} rows`,
    );
  }
  return out;
}

export function isRebalanceDay(freq: Frequency, isoDate: string): boolean {
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

export function btcFeeUSD(params: {
  satPerVb: number;
  vbytes: number;
  txCount: number;
  btcPriceUSD: number;
}): number {
  const sats = params.satPerVb * params.vbytes * params.txCount;
  return (sats / 1e8) * params.btcPriceUSD;
}

export function simulateDebtStrategy(
  series: SeriesPoint[],
  cfg: CoreConfig,
  freq: Frequency,
): DebtResult {
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

  if (initialUSD > 0) btc += initialUSD / series[0].price;

  let interestUSD = 0;
  let principalUSD = 0;
  let feesUSD = 0;

  let borrows = 0;
  let repays = 0;
  let maxDebtSeen = 0;

  const dailyRate = apr / 365;

  for (const { date, price } of series) {
    if (debt > 0) {
      const interest = debt * dailyRate;
      if (payInterestDaily) interestUSD += interest;
      else debt += interest;
    }

    if (debt > maxDebtSeen) maxDebtSeen = debt;

    if (!isRebalanceDay(freq, date)) continue;

    const collateralValue = btc * price;
    const maxDebt = maxDebtPct * collateralValue;

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

  const finalPrice = series.at(-1)!.price;
  const finalValueUSD = btc * finalPrice;
  const externalTotalUSD = interestUSD + principalUSD + feesUSD;

  return {
    freq,
    btcFinal: btc,
    debtFinal: debt,
    finalValueUSD,
    externalTotalUSD,
    interestUSD,
    principalUSD,
    feesUSD,
    borrows,
    repays,
    maxDebtSeen,
  };
}

export function simulateDCA(
  series: SeriesPoint[],
  cfg: CoreConfig,
  freq: Frequency,
  externalBudgetUSD: number,
  opts: DcaOptions = {},
): DcaResult {
  const { includeFees = false, dcaTxCount = 1 } = opts;

  let btc = cfg.initialBTC;
  if (cfg.initialUSD > 0) btc += cfg.initialUSD / series[0].price;

  const buyDays = series.filter((d) => isRebalanceDay(freq, d.date));
  const perBuy = externalBudgetUSD / buyDays.length;

  let feesUSD = 0;

  for (const d of buyDays) {
    let netBuyUSD = perBuy;

    if (includeFees) {
      const fee = btcFeeUSD({
        satPerVb: cfg.satPerVb,
        vbytes: cfg.vbytesPerTx,
        txCount: dcaTxCount,
        btcPriceUSD: d.price,
      });
      feesUSD += fee;
      netBuyUSD = Math.max(perBuy - fee, 0);
    }

    btc += netBuyUSD / d.price;
  }

  return {
    freq,
    btcFinal: btc,
    buys: buyDays.length,
    spentUSD: externalBudgetUSD,
    feesUSD,
    finalValueUSD: btc * series.at(-1)!.price,
  };
}

export function buildDebtReportRows(
  debtResults: DebtResult[],
): DebtReportRow[] {
  return debtResults.map((dr) => ({
    freq: dr.freq,
    btcFinal: dr.btcFinal,
    finalValueUSD: dr.finalValueUSD,
    debtFinal: dr.debtFinal,
    netValueUSD: dr.finalValueUSD - dr.debtFinal,

    externalTotalUSD: dr.externalTotalUSD,
    interestUSD: dr.interestUSD,
    principalUSD: dr.principalUSD,
    feesUSD: dr.feesUSD,

    borrows: dr.borrows,
    repays: dr.repays,
    maxDebtSeen: dr.maxDebtSeen,
  }));
}

export function buildHeadToHeadRows(
  series: SeriesPoint[],
  cfg: CoreConfig,
  debtResults: DebtResult[],
  opts: DcaOptions = {},
): HeadToHeadRow[] {
  return debtResults.map((dr) => {
    const dcaSame = simulateDCA(
      series,
      cfg,
      dr.freq,
      dr.externalTotalUSD,
      opts,
    );

    const debtNetUSD = dr.finalValueUSD - dr.debtFinal;
    const dcaNetUSD = dcaSame.finalValueUSD;

    return {
      freq: dr.freq,
      debtBTC: dr.btcFinal,
      dcaBTC: dcaSame.btcFinal,
      deltaBTC: dr.btcFinal - dcaSame.btcFinal,

      debtNetUSD,
      dcaValueUSD: dcaSame.finalValueUSD,
      deltaNetUSD: debtNetUSD - dcaNetUSD,

      externalUSD: dr.externalTotalUSD,
      dcaFeesUSD: dcaSame.feesUSD,
    };
  });
}

export function buildDcaCrossRows(
  series: SeriesPoint[],
  cfg: CoreConfig,
  debtResults: DebtResult[],
  opts: DcaOptions = {},
): DcaCrossRow[] {
  const rows: DcaCrossRow[] = [];

  for (const dr of debtResults) {
    for (const dcaFreq of FREQUENCIES) {
      const dca = simulateDCA(series, cfg, dcaFreq, dr.externalTotalUSD, opts);
      rows.push({
        debtFreq: dr.freq,
        dcaFreq,
        budgetUSD: dr.externalTotalUSD,
        dcaBTCFinal: dca.btcFinal,
        dcaBuys: dca.buys,
        dcaFeesUSD: dca.feesUSD,
        dcaValueFinalUSD: dca.finalValueUSD,
      });
    }
  }
  return rows;
}
