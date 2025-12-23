import React, { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Legend,
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
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
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

  const toggleSeries = (key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const legendItems = [
    {
      key: "price",
      label: "Price",
      stroke: "var(--color-chart-3)",
      dashed: false,
      type: "line",
    },
    {
      key: "ltv",
      label: "Liquidation zones",
      stroke: "var(--color-destructive)",
      dashed: true,
      type: "area",
    },
  ];

  const renderTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: any[];
    label?: string | number;
  }) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="rounded-md border bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
        <div className="mb-1 text-[11px] font-semibold text-muted-foreground">
          {typeof label === "number"
            ? new Date(Number(label)).toISOString().slice(0, 10)
            : label}
        </div>
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 18,
                borderTop: `3px solid ${entry.color ?? "var(--color-chart-3)"}`,
              }}
            />
            <span className="font-medium">Price</span>
            <span className="text-muted-foreground">
              {fmtUSD(Number(entry.value), 0, 0)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderLegend = () => (
    <div className="flex flex-wrap gap-3 text-xs">
      {legendItems.map((item) => {
        const isHidden = hiddenKeys.has(item.key);
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => toggleSeries(item.key)}
            className={`flex items-center gap-2 rounded-md border px-2 py-1 transition-colors ${
              isHidden
                ? "border-border/60 text-muted-foreground"
                : "border-border text-foreground"
            }`}
            aria-pressed={!isHidden}
          >
            {item.type === "line" ? (
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: 18,
                  borderTop: `3px ${item.dashed ? "dashed" : "solid"} ${
                    item.stroke
                  }`,
                  opacity: isHidden ? 0.35 : 1,
                }}
              />
            ) : (
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: 16,
                  height: 10,
                  borderRadius: 3,
                  backgroundColor: item.stroke,
                  opacity: isHidden ? 0.2 : 0.15,
                  outline: `1px solid ${item.stroke}`,
                  outlineOffset: -1,
                }}
              />
            )}
            <span className={isHidden ? "line-through opacity-60" : ""}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
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
              <Tooltip content={renderTooltip} />
              <Legend content={renderLegend} />
              {!hiddenKeys.has("ltv") &&
                eventSpans.map((span, idx) => (
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
              {!hiddenKeys.has("price") && (
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="var(--color-chart-3)"
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
