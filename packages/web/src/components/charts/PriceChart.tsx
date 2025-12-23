import React, { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtUSD } from "@/lib/utils";
import { FreqSelect } from "./FreqSelect.js";
import type { LtvEvent, PricePoint } from "@/hooks/useBacktest.js";
import { FREQ_ORDER } from "@/lib/frequency";

const emptyState = (
  <div className="text-sm text-muted-foreground">
    Run the backtest to see charts.
  </div>
);

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
    [ltvEvents, freq],
  );
  const eventSpans = useMemo(() => {
    if (!filteredEvents.length) return [];
    const sorted = [...filteredEvents].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const spans: { start: number; end: number }[] = [];
    const toTs = (d: string) => new Date(d + "T00:00:00Z").getTime();

    let current = { start: toTs(sorted[0].date), end: toTs(sorted[0].date) };
    for (let i = 1; i < sorted.length; i++) {
      const ts = toTs(sorted[i].date);
      const prev = toTs(sorted[i - 1].date);
      const oneDay = 24 * 60 * 60 * 1000;
      if (ts - prev <= oneDay * 1.1) {
        current.end = ts;
      } else {
        spans.push(current);
        current = { start: ts, end: ts };
      }
    }
    spans.push(current);
    return spans;
  }, [filteredEvents]);
  const rows = useMemo(
    () =>
      data?.map((d) => ({
        ...d,
        ts: new Date(d.date + "T00:00:00Z").getTime(),
      })) ?? [],
    [data],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset price</CardTitle>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Spot price with liquidation-risk moments for the selected cadence.
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
                tickFormatter={(v) =>
                  new Date(Number(v)).toISOString().slice(0, 10)
                }
                domain={["dataMin", "dataMax"]}
                minTickGap={28}
              />
              <YAxis
                tickFormatter={(v) => fmtUSD(Number(v), 0, 0)}
                width={90}
              />
              <Tooltip
                formatter={(value: any) => fmtUSD(Number(value), 0, 0)}
                labelFormatter={(lbl) =>
                  `Date: ${new Date(Number(lbl)).toISOString().slice(0, 10)}`
                }
              />
              {eventSpans.map((span, idx) => (
                <ReferenceArea
                  key={`span-${idx}`}
                  x1={span.start}
                  x2={span.end}
                  stroke="var(--color-destructive)"
                  fill="var(--color-destructive)"
                  fillOpacity={0.08}
                  strokeOpacity={0.5}
                  ifOverflow="extendDomain"
                />
              ))}
              <Line
                type="monotone"
                dataKey="price"
                stroke="var(--color-chart-3)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
