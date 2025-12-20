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
      // Add more files later:
      // { id: "btc_2020_2025", label: "BTC daily (2020-01-01 → 2025-12-20)", url: "/data/bitcoin_2020-01-01_2025-12-20.csv" },
    ],
    []
  );
}

export function useDatasetLoader() {
  const [rawSeries, setRawSeries] = useState<SeriesPoint[] | null>(null);
  const [status, setStatus] = useState<string>(
    "Select a dataset and click Load."
  );

  const loadDataset = async (dataset: Dataset) => {
    try {
      setStatus("Loading CSV…");
      setRawSeries(null);

      const series = await fetchCsvSeries(dataset.url);
      setRawSeries(series);

      setStatus(
        `Loaded ${series.length.toLocaleString("en-US")} rows (${series[0].date} → ${series.at(-1)!.date}).`
      );
    } catch (e: any) {
      setStatus(`Error: ${String(e?.message ?? e)}`);
      setRawSeries(null);
    }
  };

  return { rawSeries, status, loadDataset };
}

