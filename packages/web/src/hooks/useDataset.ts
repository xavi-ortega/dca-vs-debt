import { useState, useMemo } from "react";
import type { SeriesPoint } from "@dca-vs-debt/core";
import { fetchCsvSeries, parseCsvText } from "@/lib/csv";
import type { Dataset } from "../types/index.js";

export function useDatasets(): Dataset[] {
  return useMemo(
    () => [
      {
        id: "asset_2010_2025",
        label: "BTC daily (2010-07-17 → 2025-12-20)",
        url: "/datasets/bitcoin_2010-07-17_2025-12-20.csv",
      },
      {
        id: "asset_2026_2040",
        label: "BTC bullish forecast (2026-01-01 → 2040-12-20)",
        url: "/datasets/bitcoin_prediction_2026_2040.csv",
      },
      {
        id: "gold_2015_2025",
        label: "Gold daily (2000-08-30 → 2025-12-22)",
        url: "/datasets/gold_2000_08_30_2025_12_22.csv",
      },
      {
        id: "sp500_2010_2025",
        label: "S&P 500 daily (1927-12-30 → 2025-12-23)",
        url: "/datasets/sp500_1927_12_30_2025_12_19.csv",
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

  const loadFile = async (file: File) => {
    try {
      setStatus(`Loading CSV: ${file.name}…`);
      setRawSeries(null);
      const text = await file.text();
      const series = parseCsvText(text, file.name);
      setRawSeries(series);
      setStatus(
        `Loaded ${series.length.toLocaleString("en-US")} rows (${series[0].date} → ${series.at(-1)!.date}) from ${file.name}.`,
      );
    } catch (e: any) {
      setStatus(`Error: ${String(e?.message ?? e)}`);
      setRawSeries(null);
    }
  };

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

  return { rawSeries, status, loadDataset, loadFile };
}
