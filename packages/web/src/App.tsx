import React, { useMemo, useState, useEffect } from "react";
import type { CoreConfig } from "@bitcoin-strategy/core";
import { Header } from "./components/Header.js";
import { ConfigCards } from "./components/ConfigCards.js";
import { ResultsTabs } from "./components/ResultsTabs.js";
import { ChartsPanel } from "./components/charts/ChartsPanel.js";
import { useDatasets, useDatasetLoader, useBacktest } from "./hooks/index.js";

export default function App() {
  const datasets = useDatasets();
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? "");
  const dataset = datasets.find((d) => d.id === datasetId)!;

  const { rawSeries, status, loadDataset } = useDatasetLoader();
  const {
    debtRows,
    headRows,
    crossRows,
    combinedBtcChart,
    ltvEvents,
    priceSeries,
    status: backtestStatus,
    runBacktest,
  } = useBacktest();

  const [darkMode, setDarkMode] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);

  // Inputs
  const [start, setStart] = useState("2023-01-01");
  const [end, setEnd] = useState("2025-12-20");

  const [initialBTC, setInitialBTC] = useState(0);
  const [initialUSD, setInitialUSD] = useState(25000);

  const [apr, setApr] = useState(0.04);
  const [maxDebtPct, setMaxDebtPct] = useState(0.15);
  const [band, setBand] = useState(0.02);

  const [satPerVb, setSatPerVb] = useState(20);
  const [vbytesPerTx, setVbytesPerTx] = useState(180);
  const [txBorrow, setTxBorrow] = useState(1);
  const [txRepay, setTxRepay] = useState(1);

  const [activeTab, setActiveTab] = useState<
    "charts" | "debt" | "head" | "cross"
  >("charts");

  const cfg: CoreConfig = useMemo(
    () => ({
      initialBTC: Number(initialBTC),
      initialUSD: Number(initialUSD),

      apr: Number(apr),
      maxDebtPct: Number(maxDebtPct),
      band: Number(band),

      payInterestDaily: true,
      borrowToMax: true,

      satPerVb: Number(satPerVb),
      vbytesPerTx: Number(vbytesPerTx),
      txBorrow: Number(txBorrow),
      txRepay: Number(txRepay),
    }),
    [
      initialBTC,
      initialUSD,
      apr,
      maxDebtPct,
      band,
      satPerVb,
      vbytesPerTx,
      txBorrow,
      txRepay,
    ],
  );

  // Apply dark mode to <html>
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const handleLoad = () => {
    loadDataset(dataset);
  };

  const handleRun = () => {
    if (!rawSeries) return;
    runBacktest(rawSeries, cfg, start, end, true);
  };

  const canRun = Boolean(rawSeries);
  const displayStatus = backtestStatus || status;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Header
          datasets={datasets}
          datasetId={datasetId}
          onDatasetChange={setDatasetId}
          darkMode={darkMode}
          onDarkModeChange={setDarkMode}
          onLoad={handleLoad}
          onRun={handleRun}
          canRun={canRun}
        />

        <div className="mt-4 rounded-lg border bg-card px-4 py-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Status:</span>{" "}
            <span
              className={
                displayStatus.startsWith("Error:") ? "text-destructive" : ""
              }
            >
              {displayStatus}
            </span>
          </div>
        </div>

        <ConfigCards
          start={start}
          end={end}
          initialBTC={initialBTC}
          initialUSD={initialUSD}
          apr={apr}
          maxDebtPct={maxDebtPct}
          band={band}
          satPerVb={satPerVb}
          vbytesPerTx={vbytesPerTx}
          txBorrow={txBorrow}
          txRepay={txRepay}
          advancedMode={advancedMode}
          onStartChange={setStart}
          onEndChange={setEnd}
          onInitialBTCChange={setInitialBTC}
          onInitialUSDChange={setInitialUSD}
          onAprChange={setApr}
          onMaxDebtPctChange={setMaxDebtPct}
          onBandChange={setBand}
          onSatPerVbChange={setSatPerVb}
          onVbytesPerTxChange={setVbytesPerTx}
          onTxBorrowChange={setTxBorrow}
          onTxRepayChange={setTxRepay}
          onAdvancedModeChange={setAdvancedMode}
        />

        <ResultsTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          debtRows={debtRows}
          headRows={headRows}
          crossRows={crossRows}
          hasResults={Boolean(
            debtRows ||
            headRows ||
            crossRows ||
            combinedBtcChart ||
            priceSeries,
          )}
          chartsContent={
            <ChartsPanel
              combinedBtcChart={combinedBtcChart}
              ltvEvents={ltvEvents}
              priceSeries={priceSeries}
              headRows={headRows}
            />
          }
        />
      </div>
    </div>
  );
}
