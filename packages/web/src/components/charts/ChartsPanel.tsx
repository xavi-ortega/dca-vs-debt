import React from "react";
import type { HeadRow } from "@/types";
import type { LtvEvent, PricePoint } from "@/hooks/useBacktest.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CombinedBtcChart } from "./CombinedBtcChart";
import { HeadHeatmap } from "./ComparisonCharts";
import { PriceChart } from "./PriceChart";
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
      <PriceChart data={priceSeries} ltvEvents={ltvEvents} />
      <CombinedBtcChart data={combinedBtcChart} />
      <Card>
        <CardHeader>
          <CardTitle>Performance overview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Net value deltas and win counts across cadences.
          </p>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PieComparison headRows={headRows} embedded />
          </div>
          <HeadHeatmap headRows={headRows} embedded />
        </CardContent>
      </Card>
    </div>
  );
}
