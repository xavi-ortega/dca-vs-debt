import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtUSD } from "@/lib/utils";
import { FREQ_ORDER, freqLabel } from "@/lib/frequency";
import type { HeadRow } from "@/types";

const emptyState = (
  <div className="text-sm text-muted-foreground">
    Run the backtest to see charts.
  </div>
);

export function HeadHeatmap({
  headRows,
  embedded = false,
}: {
  headRows: HeadRow[] | null;
  embedded?: boolean;
}) {
  if (!headRows) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Debt vs DCA heatmap</CardTitle>
        </CardHeader>
        <CardContent>{emptyState}</CardContent>
      </Card>
    );
  }

  const rows = FREQ_ORDER.map((freq) =>
    headRows.find((r) => r.freq === freq),
  ).filter(Boolean) as HeadRow[];

  const scaleColor = (delta: number) => {
    // Smooth diverging palette using tanh to compress extremes.
    const scaled = Math.tanh(delta / 80000);
    if (scaled >= 0) {
      // green side
      const light = 70 + Math.round(25 * scaled);
      const sat = 55 + Math.round(25 * scaled);
      return `hsl(150 ${sat}% ${light}%)`;
    } else {
      const light = 70 + Math.round(25 * -scaled);
      const sat = 55 + Math.round(25 * -scaled);
      return `hsl(10 ${sat}% ${light}%)`;
    }
  };

  const content = (
    <div className="grid gap-3 sm:grid-cols-3">
      {rows.map((row) => {
        const delta = row.deltaNetUSD;
        const bg = scaleColor(delta);
        return (
          <div
            key={row.freq}
            className="rounded-lg p-3 text-sm shadow-sm"
            style={{
              backgroundColor: bg,
              color: "var(--foreground)",
            }}
            title={`Debt: ${fmtUSD(row.debtNetUSD, 0, 0)} | DCA: ${fmtUSD(
              row.dcaValueUSD,
              0,
              0,
            )} | Delta: ${fmtUSD(delta, 0, 0)}`}
          >
            <div className="font-semibold">{freqLabel[row.freq]}</div>
            <div className="text-xs">Δ Net $: {fmtUSD(delta, 0, 0)}</div>
          </div>
        );
      })}
    </div>
  );

  if (embedded) return content;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Debt vs DCA heatmap</CardTitle>
        <p className="text-sm text-muted-foreground">
          Net USD delta (Debt - DCA). Hover for details.
        </p>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
