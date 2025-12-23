import React from "react";
import type { HeadRow } from "@/types";
import type { LtvEvent, PricePoint } from "@/hooks/useBacktest.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CombinedBtcChart } from "./CombinedBtcChart.js";
import { HeadHeatmap } from "./HeadHeatmap.js";
import { PriceChart } from "./PriceChart.js";
import { PieComparison } from "./PieComparison.js";
import { freqLabel, freqColor, sortByFrequency } from "@/lib/frequency.js";
import { fmtAsset, fmtUSD } from "@/lib/utils.js";

type Props = {
  combinedBtcChart: Record<string, number | string>[] | null;
  ltvEvents: LtvEvent[] | null;
  priceSeries: PricePoint[] | null;
  headRows: HeadRow[] | null;
};

export function ChartsPanel({
  combinedBtcChart,
  ltvEvents,
  priceSeries,
  headRows,
}: Props) {
  const hasData = Boolean(
    combinedBtcChart || ltvEvents || headRows || priceSeries,
  );

  if (!hasData) return null;

  const summaryContent = headRows
    ? buildSummary(headRows)
    : { title: "Summary", body: "Run the backtest to see the summary." };

  return (
    <div className="space-y-6">
      <PriceChart data={priceSeries} ltvEvents={ltvEvents} />
      <CombinedBtcChart data={combinedBtcChart} />
      <Card>
        <CardHeader>
          <CardTitle>Performance overview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Net value deltas and win counts across cadences.
          </p>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <PieComparison headRows={headRows} embedded />
            <HeadHeatmap headRows={headRows} embedded />
          </div>
          <div className="space-y-3 rounded-lg border border-border/70 p-4 text-sm">
            <div className="text-xs uppercase text-muted-foreground tracking-wide">
              Summary
            </div>
            <div className="font-semibold">{summaryContent.title}</div>
            <div className="text-muted-foreground text-xs leading-relaxed">
              {summaryContent.body}
            </div>
            <div className="space-y-2">
              {headRows &&
                sortByFrequency(headRows).map((row) => (
                  <div
                    key={row.freq}
                    className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: freqColor[row.freq] }}
                      />
                      <div>
                        <div className="font-medium">{freqLabel[row.freq]}</div>
                        <div className="text-muted-foreground text-xs">
                          Debt {fmtAsset(row.debtBTC)} vs DCA {fmtAsset(row.dcaBTC)}
                        </div>
                      </div>
                    </div>
                    <div
                      className="text-right text-xs font-medium"
                      style={{
                        color:
                          row.deltaNetUSD > 0
                            ? "var(--color-chart-1)"
                            : row.deltaNetUSD < 0
                              ? "var(--color-chart-2)"
                              : "var(--muted-foreground)",
                      }}
                    >
                      Delta Net: {fmtUSD(row.deltaNetUSD, 0, 0)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function buildSummary(headRows: HeadRow[]) {
  const debtWins = headRows.filter((r) => r.deltaNetUSD > 0).length;
  const dcaWins = headRows.filter((r) => r.deltaNetUSD < 0).length;
  const best = [...headRows].sort((a, b) => b.deltaNetUSD - a.deltaNetUSD)[0];

  return {
    title: best
      ? `${freqLabel[best.freq]} leads by ${fmtUSD(best.deltaNetUSD, 0, 0)}`
      : "No data",
    body: `Debt better in ${debtWins} cadences, DCA better in ${dcaWins}. Best delta: ${
      freqLabel[best?.freq ?? "daily"] ?? ""
    } (${fmtUSD(best?.deltaNetUSD ?? 0, 0, 0)}).`,
  };
}
