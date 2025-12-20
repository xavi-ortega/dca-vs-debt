import React, { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtBTC, fmtInt } from "@/lib/utils";
import { FREQ_ORDER, freqColor, freqLabel } from "@/lib/frequency";
import type { HeadRow } from "@/types";
import type { LtvEvent, PricePoint } from "@/hooks/useBacktest.js";

type ChartRow = Record<string, number | string>;

const emptyState = (
  <div className="text-sm text-muted-foreground">Run the backtest to see charts.</div>
);

export function CombinedBtcChart({ data }: { data: ChartRow[] | null }) {
  const lines = useMemo(
    () =>
      FREQ_ORDER.flatMap((freq) => [
        {
          key: `debt-${freq}-btc`,
          name: `${freqLabel[freq]} Debt BTC`,
          color: freqColor[freq],
          dash: "0",
        },
        {
          key: `dca-${freq}-btc`,
          name: `${freqLabel[freq]} DCA BTC`,
          color: freqColor[freq],
          dash: "6 4",
        },
      ]),
    []
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>BTC exposure over time</CardTitle>
        <p className="text-sm text-muted-foreground">
          Compare BTC holdings for Debt (solid) vs DCA (dashed) across all cadences.
        </p>
      </CardHeader>
      <CardContent className="h-96">
        {!data ? (
          emptyState
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" minTickGap={28} />
              <YAxis tickFormatter={(v) => fmtBTC(Number(v))} width={90} />
              <Tooltip
                formatter={(value: any, name: string) => [fmtBTC(Number(value)), name]}
                labelFormatter={(lbl) => `Date: ${lbl}`}
              />
              <Legend />
              {lines.map((line) => (
                <Line
                  key={line.key}
                  dataKey={line.key}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={2}
                  strokeDasharray={line.dash}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function PriceChart({ data }: { data: PricePoint[] | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>BTC price</CardTitle>
        <p className="text-sm text-muted-foreground">Spot BTC price over the selected period.</p>
      </CardHeader>
      <CardContent className="h-64">
        {!data ? (
          emptyState
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" minTickGap={28} />
              <YAxis tickFormatter={(v) => fmtInt(Number(v))} width={80} />
              <Tooltip
                formatter={(value: any) => fmtInt(Number(value))}
                labelFormatter={(lbl) => `Date: ${lbl}`}
              />
              <Line type="monotone" dataKey="price" stroke="var(--color-chart-3)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function LtvAlertChart({ events }: { events: LtvEvent[] | null }) {
  const grouped = useMemo(() => {
    if (!events) return null;
    const freqToIndex = new Map(FREQ_ORDER.map((f, i) => [f, i]));
    const toTs = (d: string) => new Date(d + "T00:00:00Z").getTime();
    let minTs = Infinity;
    let maxTs = -Infinity;
    const byFreq = new Map<
      string,
      { freqLabel: string; color: string; points: Array<{ ts: number; date: string; freqIndex: number; freqLabel: string; ltv: number; size: number }> }
    >();

    for (const e of events) {
      const key = e.freq;
      if (!byFreq.has(key)) {
        byFreq.set(key, {
          freqLabel: freqLabel[e.freq],
          color: freqColor[e.freq],
          points: [],
        });
      }
      const entry = byFreq.get(key)!;
      const ts = toTs(e.date);
      if (ts < minTs) minTs = ts;
      if (ts > maxTs) maxTs = ts;

      entry.points.push({
        date: e.date,
        ts,
        freqLabel: freqLabel[e.freq],
        freqIndex: freqToIndex.get(e.freq) ?? 0,
        ltv: e.ltv,
        size: 8 + (e.ltv - 0.5) * 20,
      });
    }

    // Sort points within each series to keep X-axis monotone
    for (const entry of byFreq.values()) {
      entry.points.sort((a, b) => a.ts - b.ts);
    }

    const series = Array.from(byFreq.values());
    return { series, minTs, maxTs };
  }, [events]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Near-liquidation moments</CardTitle>
        <p className="text-sm text-muted-foreground">
          Points where Debt LTV ≥ 0.5. Larger markers indicate higher LTV.
        </p>
      </CardHeader>
      <CardContent className="h-80">
        {!grouped ? (
          emptyState
        ) : grouped.series.length === 0 ? (
          <div className="text-sm text-muted-foreground">No LTV ≥ 0.5 in this range.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                type="number"
                dataKey="ts"
                domain={[grouped.minTs, grouped.maxTs]}
                tickFormatter={(v) => new Date(Number(v)).toISOString().slice(0, 10)}
                tick={{ fontSize: 11 }}
                minTickGap={24}
                allowDataOverflow={false}
              />
              <YAxis
                type="number"
                dataKey="freqIndex"
                domain={[0, FREQ_ORDER.length - 1]}
                ticks={FREQ_ORDER.map((_, i) => i)}
                tickFormatter={(v) => freqLabel[FREQ_ORDER[v] as any] ?? ""}
                width={80}
              />
              <ZAxis type="number" dataKey="size" range={[6, 22]} />
              <Tooltip content={(props) => <LtvTooltip {...props} grouped={grouped.series} />} />
              <Legend />
              {grouped.series.map((series) => (
                <Scatter
                  key={series.freqLabel}
                  data={series.points}
                  name={`LTV≥0.5 • ${series.freqLabel}`}
                  fill={series.color}
                  shape={(props: any) => {
                    const payload = props.payload as any;
                    const size = payload?.size ?? 10;
                    return (
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={size / 2}
                        fill={series.color}
                        fillOpacity={0.8}
                      />
                    );
                  }}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function LtvTooltip({ active, label, payload, grouped }: any) {
  if (!active || !grouped) return null;

  const date =
    label ??
    (payload?.[0]?.payload?.ts
      ? new Date(Number(payload[0].payload.ts)).toISOString().slice(0, 10)
      : payload?.[0]?.payload?.date);
  if (!date) return null;

  const items = grouped
    .flatMap((g: any) => g.points)
    .filter((p: any) => p.date === date)
    .sort((a: any, b: any) => (a.freqIndex ?? 0) - (b.freqIndex ?? 0));

  if (items.length === 0) return null;

  return (
    <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-sm">
      <div className="font-semibold">Date: {date}</div>
      <div className="mt-1 space-y-1">
        {items.map((it: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: it.color }}
            />
            <span className="font-medium">{it.freqLabel}</span>
            <span className="text-muted-foreground">
              LTV {(it.ltv * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeadHeatmap({ headRows }: { headRows: HeadRow[] | null }) {
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

  const rows = FREQ_ORDER.map((freq) => headRows.find((r) => r.freq === freq)).filter(
    Boolean
  ) as HeadRow[];

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Debt vs DCA heatmap</CardTitle>
        <p className="text-sm text-muted-foreground">
          Net USD delta (Debt - DCA). Hover for details.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
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
              title={`Debt: ${fmtInt(row.debtNetUSD)} | DCA: ${fmtInt(
                row.dcaValueUSD
              )} | Delta: ${fmtInt(delta)}`}
            >
              <div className="font-semibold">{freqLabel[row.freq]}</div>
              <div className="text-xs">Δ Net $: {fmtInt(delta)}</div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
