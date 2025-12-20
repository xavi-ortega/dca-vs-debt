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
} from "@bitcoin-strategy/core";
import type { DebtRow, HeadRow, CrossRow } from "../types/index.js";

export function useBacktest() {
  const [debtRows, setDebtRows] = useState<DebtRow[] | null>(null);
  const [headRows, setHeadRows] = useState<HeadRow[] | null>(null);
  const [crossRows, setCrossRows] = useState<CrossRow[] | null>(null);
  const [status, setStatus] = useState<string>("");

  const runBacktest = (
    rawSeries: SeriesPoint[],
    cfg: CoreConfig,
    start: string,
    end: string,
    includeDcaFees: boolean
  ) => {
    if (!rawSeries) return;

    try {
      const series = filterRange(rawSeries, start || null, end || null);

      const debtResults = FREQUENCIES.map((f: Frequency) =>
        simulateDebtStrategy(series, cfg, f)
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

      setDebtRows(debt);
      setHeadRows(head);
      setCrossRows(cross);

      setStatus(
        `Backtest ran on ${series.length.toLocaleString("en-US")} days (${series[0].date} → ${series.at(-1)!.date}).`
      );
    } catch (e: any) {
      setStatus(`Error: ${String(e?.message ?? e)}`);
      setDebtRows(null);
      setHeadRows(null);
      setCrossRows(null);
    }
  };

  return { debtRows, headRows, crossRows, status, runBacktest };
}

