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
    // Diverging palette tuned for contrast in light/dark.
    const scaled = Math.tanh(delta / 180000); // compress extremes
    const pos = { h: 156, s: 62, l: 40 }; // teal-ish green
    const neg = { h: 12, s: 75, l: 46 }; // warm red
    const spread = 10; // adjust lightness by magnitude

    const src = scaled >= 0 ? pos : neg;
    const l = Math.max(
      28,
      Math.min(70, src.l + Math.round(spread * Math.abs(scaled))),
    );
    const s = Math.max(
      45,
      Math.min(80, src.s + Math.round(12 * Math.abs(scaled))),
    );

    return `hsl(${src.h} ${s}% ${l}%)`;
  };

  const content = (
    <div className="grid gap-3 sm:grid-cols-3">
      {rows.map((row) => {
        const delta = row.deltaNetUSD;
        const bg = scaleColor(delta);
        const lightMatch = Number(bg.match(/(\d+)%\)$/)?.[1] ?? 50);
        const textColor = lightMatch >= 50 ? "#0b1221" : "#f5f7fb";
        return (
          <div
            key={row.freq}
            className="rounded-lg border border-border/70 p-3 text-sm shadow-sm"
            style={{
              backgroundColor: bg,
              color: textColor,
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
