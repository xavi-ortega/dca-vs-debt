import React from "react";
import type { HeadRow } from "@/types";
import type { LtvEvent, PricePoint } from "@/hooks/useBacktest.js";
import { CombinedBtcChart, HeadHeatmap, LtvAlertChart, PriceChart } from "./ComparisonCharts";
import { PieComparison } from "./PieComparison";

type Props = {
  combinedBtcChart: Record<string, number | string>[] | null;
  ltvEvents: LtvEvent[] | null;
  priceSeries: PricePoint[] | null;
  headRows: HeadRow[] | null;
};

export function ChartsPanel({ combinedBtcChart, ltvEvents, priceSeries, headRows }: Props) {
  const hasData = Boolean(combinedBtcChart || ltvEvents || headRows || priceSeries);

  if (!hasData) return null;

  return (
    <div className="mt-10 space-y-6">
      <PriceChart data={priceSeries} />
      <CombinedBtcChart data={combinedBtcChart} />
      <div className="grid gap-6 lg:grid-cols-2">
        <LtvAlertChart events={ltvEvents} />
        <HeadHeatmap headRows={headRows} />
      </div>
      <PieComparison headRows={headRows} />
    </div>
  );
}
