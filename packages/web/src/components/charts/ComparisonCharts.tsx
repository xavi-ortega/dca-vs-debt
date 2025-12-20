import React, { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
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
  const [freq, setFreq] = useState(FREQ_ORDER[0]);

  const rows = useMemo(() => {
    if (!data) return [];
    return data
      .map((row) => ({
        date: row.date as string,
        debt: row[`debt-${freq}-btc`] as number | undefined,
        dca: row[`dca-${freq}-btc`] as number | undefined,
      }))
      .filter((r) => typeof r.debt === "number" && typeof r.dca === "number");
  }, [data, freq]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>BTC exposure over time</CardTitle>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Compare BTC holdings for Debt vs DCA on the selected cadence.
          </p>
          <FreqSelect value={freq} onChange={setFreq} />
        </div>
      </CardHeader>
      <CardContent className="h-96">
        {!data ? (
          emptyState
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" minTickGap={28} />
              <YAxis tickFormatter={(v) => fmtBTC(Number(v))} width={90} />
              <Tooltip
                formatter={(value: any, name: string) => [fmtBTC(Number(value)), name]}
                labelFormatter={(lbl) => `Date: ${lbl}`}
              />
              <Legend />
              <Line
                dataKey="debt"
                name={`${freqLabel[freq]} Debt BTC`}
                stroke={freqColor[freq]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                dataKey="dca"
                name={`${freqLabel[freq]} DCA BTC`}
                stroke={freqColor[freq]}
                strokeDasharray="6 4"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function PriceChart({
  data,
  ltvEvents,
}: {
  data: PricePoint[] | null;
  ltvEvents: LtvEvent[] | null;
}) {
  const [freq, setFreq] = useState(FREQ_ORDER[0]);
  const filteredEvents = useMemo(
    () => (ltvEvents ? ltvEvents.filter((e) => e.freq === freq) : []),
    [ltvEvents, freq]
  );
  const rows = useMemo(
    () =>
      data?.map((d) => ({
        ...d,
        ts: new Date(d.date + "T00:00:00Z").getTime(),
      })) ?? [],
    [data]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>BTC price</CardTitle>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Spot BTC and liquidation-risk moments for the selected cadence.
          </p>
          <FreqSelect value={freq} onChange={setFreq} />
        </div>
      </CardHeader>
      <CardContent className="h-64">
        {!data ? (
          emptyState
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                type="number"
                dataKey="ts"
                tickFormatter={(v) => new Date(Number(v)).toISOString().slice(0, 10)}
                domain={["dataMin", "dataMax"]}
                minTickGap={28}
              />
              <YAxis tickFormatter={(v) => fmtInt(Number(v))} width={80} />
              <Tooltip
                formatter={(value: any) => fmtInt(Number(value))}
                labelFormatter={(lbl) => `Date: ${new Date(Number(lbl)).toISOString().slice(0, 10)}`}
              />
              {filteredEvents.map((e) => (
                <ReferenceLine
                  key={`${e.date}-${e.freq}`}
                  x={new Date(e.date + "T00:00:00Z").getTime()}
                  stroke="var(--color-destructive)"
                  strokeDasharray="3 3"
                  strokeOpacity={0.6}
                  ifOverflow="extendDomain"
                />
              ))}
              <Line type="monotone" dataKey="price" stroke="var(--color-chart-3)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

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
            title={`Debt: ${fmtInt(row.debtNetUSD)} | DCA: ${fmtInt(
              row.dcaValueUSD
            )} | Delta: ${fmtInt(delta)}`}
          >
            <div className="font-semibold">{freqLabel[row.freq]}</div>
            <div className="text-xs">Δ Net $: {fmtInt(delta)}</div>
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

function FreqSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: any) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">Cadence:</span>
      <div className="flex rounded-md border border-border bg-card px-1 py-0.5">
        {FREQ_ORDER.map((f) => (
          <button
            key={f}
            className={`px-2 py-1 rounded-sm text-xs ${value === f ? "bg-primary text-primary-foreground" : "text-foreground/80"}`}
            onClick={() => onChange(f)}
            type="button"
          >
            {freqLabel[f]}
          </button>
        ))}
      </div>
    </div>
  );
}
