import { useState } from "react";
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
  isRebalanceDay,
} from "@dca-vs-debt/core";
import type { DebtRow, HeadRow, CrossRow } from "../types/index.js";

type ChartRow = Record<string, number | string>;
export type LtvEvent = { date: string; freq: Frequency; ltv: number };
export type PricePoint = { date: string; price: number };

export function useBacktest() {
  const [debtRows, setDebtRows] = useState<DebtRow[] | null>(null);
  const [headRows, setHeadRows] = useState<HeadRow[] | null>(null);
  const [crossRows, setCrossRows] = useState<CrossRow[] | null>(null);
  const [combinedBtcChart, setCombinedBtcChart] = useState<ChartRow[] | null>(
    null,
  );
  const [ltvEvents, setLtvEvents] = useState<LtvEvent[] | null>(null);
  const [priceSeries, setPriceSeries] = useState<PricePoint[] | null>(null);
  const [status, setStatus] = useState<string>("");

  const runBacktest = (
    rawSeries: SeriesPoint[],
    cfg: CoreConfig,
    start: string,
    end: string,
    includeDcaFees: boolean,
  ) => {
    if (!rawSeries) return;

    try {
      const series = filterRange(rawSeries, start || null, end || null);

      const debtResults = FREQUENCIES.map((f: Frequency) =>
        simulateDebtStrategy(series, cfg, f),
      );
      const debt = buildDebtReportRows(debtResults);
      const head = buildHeadToHeadRows(series, cfg, debtResults, {
        includeFees: includeDcaFees,
        dcaTxCount: 1,
      });
      const cross = buildDcaCrossRows(series, cfg, debtResults, {
        includeFees: includeDcaFees,
        dcaTxCount: 1,
      });

      const { combinedRows, events } = buildTimelineCharts(
        series,
        cfg,
        debtResults,
        {
          includeFees: includeDcaFees,
          dcaTxCount: 1,
        },
      );
      setPriceSeries(series.map((s) => ({ date: s.date, price: s.price })));

      setDebtRows(debt);
      setHeadRows(head);
      setCrossRows(cross);
      setCombinedBtcChart(combinedRows);
      setLtvEvents(events);

      setStatus(
        `Backtest ran on ${series.length.toLocaleString(
          "en-US",
        )} days (${series[0].date} - ${series.at(-1)!.date}).`,
      );
    } catch (e: any) {
      setStatus(`Error: ${String(e?.message ?? e)}`);
      setDebtRows(null);
      setHeadRows(null);
      setCrossRows(null);
      setCombinedBtcChart(null);
      setLtvEvents(null);
      setPriceSeries(null);
    }
  };

  return {
    debtRows,
    headRows,
    crossRows,
    combinedBtcChart,
    ltvEvents,
    priceSeries,
    status,
    runBacktest,
  };
}

type DebtTimelinePoint = { date: string; btc: number; ltv: number };
type DcaTimelinePoint = { date: string; btc: number };

function buildTimelineCharts(
  series: SeriesPoint[],
  cfg: CoreConfig,
  debtResults: ReturnType<typeof simulateDebtStrategy>[],
  opts: { includeFees: boolean; dcaTxCount: number },
) {
  const combined = new Map<string, ChartRow>();
  const events: LtvEvent[] = [];

  // Budget per frequency comes from debt strategy external spend.
  const budgetByFreq = new Map<Frequency, number>();
  for (const dr of debtResults)
    budgetByFreq.set(dr.freq as Frequency, dr.externalTotalUSD);

  for (const freq of FREQUENCIES) {
    const debtTimeline = simulateDebtTimeline(series, cfg, freq);
    const dcaTimeline = simulateDcaTimeline(
      series,
      cfg,
      freq,
      budgetByFreq.get(freq) ?? 0,
      opts,
    );

    for (const p of debtTimeline) {
      const row = combined.get(p.date) ?? { date: p.date };
      row[`debt-${freq}-btc`] = p.btc;
      row[`debt-${freq}-ltv`] = p.ltv;
      combined.set(p.date, row);
      if (p.ltv >= 0.5) events.push({ date: p.date, freq, ltv: p.ltv });
    }

    for (const p of dcaTimeline) {
      const row = combined.get(p.date) ?? { date: p.date };
      row[`dca-${freq}-btc`] = p.btc;
      combined.set(p.date, row);
    }
  }

  const combinedRows = Array.from(combined.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );

  return { combinedRows, events };
}

function simulateDebtTimeline(
  series: SeriesPoint[],
  cfg: CoreConfig,
  freq: Frequency,
): DebtTimelinePoint[] {
  const {
    initialBTC,
    initialUSD,
    apr,
    maxDebtPct,
    band,
    amortizationFeeUSD,
    refinancingFeeUSD,
    payInterestDaily,
    borrowToMax,
  } = cfg;

  let btc = initialBTC;
  let debt = 0;
  if (initialUSD > 0) btc += initialUSD / series[0].price;

  let interestUSD = 0;
  let principalUSD = 0;
  let feesUSD = 0;

  const dailyRate = apr / 365;
  const points: DebtTimelinePoint[] = [];

  for (const { date, price } of series) {
    if (debt > 0) {
      const interest = debt * dailyRate;
      if (payInterestDaily) interestUSD += interest;
      else debt += interest;
    }

    if (isRebalanceDay(freq, date)) {
      const collateralValue = btc * price;
      const maxDebt = maxDebtPct * collateralValue;

      if (debt > maxDebt) {
        const repay = debt - maxDebt;
        debt -= repay;
        principalUSD += repay;

        feesUSD += amortizationFeeUSD;
      }

      const lowerBound = maxDebt * (1 - band);
      if (debt < lowerBound) {
        const target = borrowToMax ? maxDebt : lowerBound;
        const borrow = target - debt;

        if (borrow > 0) {
          debt += borrow;
          btc += borrow / price;

          feesUSD += refinancingFeeUSD;
        }
      }
    }

    const collateralUSD = btc * price;
    const ltv = collateralUSD > 0 ? debt / collateralUSD : 0;

    points.push({
      date,
      btc,
      ltv,
    });
  }

  return points;
}

function simulateDcaTimeline(
  series: SeriesPoint[],
  cfg: CoreConfig,
  freq: Frequency,
  externalBudgetUSD: number,
  opts: { includeFees: boolean; dcaTxCount: number },
): DcaTimelinePoint[] {
  const { includeFees = false, dcaTxCount = 1 } = opts;

  let btc = cfg.initialBTC;
  if (cfg.initialUSD > 0) btc += cfg.initialUSD / series[0].price;

  const buyDays = series.filter((d) => isRebalanceDay(freq, d.date));
  const perBuy = buyDays.length > 0 ? externalBudgetUSD / buyDays.length : 0;

  let feesUSD = 0;
  const points: DcaTimelinePoint[] = [];

  for (const d of series) {
    if (isRebalanceDay(freq, d.date) && perBuy > 0) {
      let netBuyUSD = perBuy;

      if (includeFees) {
        const fee = cfg.transactionFeeUSD * dcaTxCount;
        feesUSD += fee;
        netBuyUSD = Math.max(perBuy - fee, 0);
      }

      btc += netBuyUSD / d.price;
    }

    points.push({
      date: d.date,
      btc,
    });
  }

  return points;
}
