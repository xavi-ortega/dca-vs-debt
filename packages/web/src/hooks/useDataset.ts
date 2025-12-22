import { useState, useMemo } from "react";
import type { SeriesPoint } from "@bitcoin-strategy/core";
import { fetchCsvSeries } from "@/lib/csv";
import type { Dataset } from "../types/index.js";

export function useDatasets(): Dataset[] {
  return useMemo(
    () => [
      {
        id: "btc_2010_2025",
        label: "BTC daily (2010-07-17 → 2025-12-20)",
        url: "/datasets/bitcoin_2010-07-17_2025-12-20.csv",
      },
      {
        id: "btc_2026_2040",
        label: "BTC GPT-5.2 bullish forecast (2026-01-01 → 2040-12-20)",
        url: "/datasets/btc_daily_ohlc_2026_2040_bull_bear_fibonacci.csv",
      },
    ],
    [],
  );
}

export function useDatasetLoader() {
  const [rawSeries, setRawSeries] = useState<SeriesPoint[] | null>(null);
  const [status, setStatus] = useState<string>(
    "Select a dataset and click Load.",
  );

  const loadDataset = async (dataset: Dataset) => {
    try {
      setStatus("Loading CSV…");
      setRawSeries(null);

      const series = await fetchCsvSeries(dataset.url);
      setRawSeries(series);

      setStatus(
        `Loaded ${series.length.toLocaleString("en-US")} rows (${series[0].date} → ${series.at(-1)!.date}).`,
      );
    } catch (e: any) {
      setStatus(`Error: ${String(e?.message ?? e)}`);
      setRawSeries(null);
    }
  };

  return { rawSeries, status, loadDataset };
}
