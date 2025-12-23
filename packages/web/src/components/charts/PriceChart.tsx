import React, { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  Scatter,
  ResponsiveContainer,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtUSD } from "@/lib/utils";
import { FreqSelect } from "./FreqSelect.js";
import type {
  LtvEvent,
  PricePoint,
  StrategyEvent,
} from "@/hooks/useBacktest.js";
import { FREQ_ORDER } from "@/lib/frequency";

const emptyState = (
  <div className="text-sm text-muted-foreground">
    Run the backtest to see charts.
  </div>
);

const PRICE_COLOR = "#8b5cf6";
const LIQUIDATION_COLOR = "rgba(239, 68, 68, 0.18)";
const AMORTIZATION_COLOR = "#14b8a6";
const REFINANCE_COLOR = "#38bdf8";
const DAY_MS = 24 * 60 * 60 * 1000;

export function PriceChart({
  data,
  ltvEvents,
  amortizationEvents,
  refinanceEvents,
}: {
  data: PricePoint[] | null;
  ltvEvents: LtvEvent[] | null;
  amortizationEvents: StrategyEvent[] | null;
  refinanceEvents: StrategyEvent[] | null;
}) {
  const [freq, setFreq] = useState(FREQ_ORDER[0]);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const filteredEvents = useMemo(
    () => (ltvEvents ? ltvEvents.filter((e) => e.freq === freq) : []),
    [ltvEvents, freq],
  );
  const rows = useMemo(
    () =>
      data?.map((d) => ({
        ...d,
        ts: new Date(d.date + "T00:00:00Z").getTime(),
        priceValue: Number(d.price),
      })) ?? [],
    [data],
  );
  const priceLookup = useMemo(() => {
    const map = new Map<string, { ts: number; priceValue: number }>();
    rows.forEach((r) => {
      map.set(r.date, { ts: r.ts, priceValue: r.priceValue });
    });
    return map;
  }, [rows]);
  const xDomain = useMemo(
    () =>
      rows.length
        ? [rows[0].ts, rows[rows.length - 1].ts]
        : (["dataMin", "dataMax"] as const),
    [rows],
  );
  const priceStats = useMemo(() => {
    if (!rows.length) return null;
    let min = rows[0].priceValue;
    let max = rows[0].priceValue;
    for (const r of rows) {
      if (r.priceValue < min) min = r.priceValue;
      if (r.priceValue > max) max = r.priceValue;
    }
    return { min, max };
  }, [rows]);
  const priceByDate = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      map.set(r.date, Number(r.price));
    });
    return map;
  }, [rows]);

  const liquidationSpans = useMemo(() => {
    if (!filteredEvents.length) return [];
    const sorted = [...filteredEvents]
      .map((e) => new Date(e.date + "T00:00:00Z").getTime())
      .sort((a, b) => a - b);
    const spans: { start: number; end: number }[] = [];
    let start = sorted[0];
    let end = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const ts = sorted[i];
      if (ts - end <= DAY_MS * 1.01) {
        end = ts;
      } else {
        spans.push({ start, end });
        start = ts;
        end = ts;
      }
    }
    spans.push({ start, end });
    return spans;
  }, [filteredEvents]);

  const filteredAmortizations = useMemo(
    () =>
      amortizationEvents
        ? amortizationEvents.filter((e) => e.freq === freq)
        : [],
    [amortizationEvents, freq],
  );
  const filteredRefinances = useMemo(
    () =>
      refinanceEvents ? refinanceEvents.filter((e) => e.freq === freq) : [],
    [refinanceEvents, freq],
  );

  const amortizationPoints = useMemo(() => {
    const toPoint = (d: string) => priceLookup.get(d) ?? null;
    return filteredAmortizations
      .map((e) => toPoint(e.date))
      .filter(Boolean) as {
      ts: number;
      priceValue: number;
    }[];
  }, [filteredAmortizations, priceLookup]);

  const refinancePoints = useMemo(() => {
    const toPoint = (d: string) => priceLookup.get(d) ?? null;
    return filteredRefinances
      .map((e) => toPoint(e.date))
      .filter(Boolean) as {
      ts: number;
      priceValue: number;
    }[];
  }, [filteredRefinances, priceLookup]);

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
      stroke: PRICE_COLOR,
      dashed: false,
      type: "line",
    },
    {
      key: "liquidation",
      label: "Liquidation risk",
      stroke: LIQUIDATION_COLOR,
      dashed: false,
      type: "area",
    },
    {
      key: "amortization",
      label: "Amortization",
      stroke: AMORTIZATION_COLOR,
      dashed: false,
      type: "dot",
    },
    {
      key: "refinance",
      label: "Refinance",
      stroke: REFINANCE_COLOR,
      dashed: false,
      type: "dot",
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
    const priceEntry = payload.find(
      (p) => p.dataKey === "priceValue" || p.name === "Price",
    );
    if (!priceEntry) return null;

    const dateLabel =
      typeof label === "number"
        ? new Date(Number(label)).toISOString().slice(0, 10)
        : label;

    return (
      <div className="rounded-md border bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
        <div className="mb-1 text-[11px] font-semibold text-muted-foreground">
          {dateLabel}
        </div>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 18,
              borderTop: `3px solid ${PRICE_COLOR}`,
            }}
          />
          <span className="font-medium">Price</span>
          <span className="text-muted-foreground">
            {fmtUSD(Number(priceEntry.value), 0, 0)}
          </span>
        </div>
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
            {item.type === "line" && (
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
            )}
            {item.type === "dot" && (
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: item.stroke,
                  opacity: isHidden ? 0.35 : 1,
                  border: `1px solid ${item.stroke}`,
                }}
              />
            )}
            {item.type === "area" && (
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
                domain={xDomain}
                minTickGap={28}
              />
              <YAxis
                type="number"
                tickFormatter={(v) => fmtUSD(Number(v), 0, 0)}
                width={90}
                domain={
                  priceStats
                    ? [
                        Math.max(0, priceStats.min * 0.98),
                        priceStats.max * 1.02,
                      ]
                    : ["auto", "auto"]
                }
                yAxisId="price"
              />
              <Tooltip content={renderTooltip} />
              <Legend content={renderLegend} />
              {!hiddenKeys.has("liquidation") &&
                priceStats &&
                liquidationSpans.map((span, idx) => {
                  const x1 = span.start;
                  const x2 = Math.max(span.end, span.start + DAY_MS * 0.8);
                  return (
                    <ReferenceArea
                      key={`liq-${idx}`}
                      x1={x1}
                      x2={x2}
                      y1={Math.max(0, priceStats.min * 0.98)}
                      y2={priceStats.max * 1.02}
                      stroke={LIQUIDATION_COLOR}
                      fill={LIQUIDATION_COLOR}
                      fillOpacity={0.3}
                      yAxisId="price"
                      ifOverflow="hidden"
                      isFront={false}
                    />
                  );
                })}
              {!hiddenKeys.has("amortization") &&
                amortizationPoints.length > 0 && (
                  <Scatter
                    name="Amortization"
                    data={amortizationPoints}
                    fill={AMORTIZATION_COLOR}
                    stroke={AMORTIZATION_COLOR}
                    dataKey="priceValue"
                    yAxisId="price"
                    line={false}
                    isAnimationActive={false}
                  />
                )}
              {!hiddenKeys.has("refinance") &&
                refinancePoints.length > 0 && (
                  <Scatter
                    name="Refinance"
                    data={refinancePoints}
                    fill={REFINANCE_COLOR}
                    stroke={REFINANCE_COLOR}
                    dataKey="priceValue"
                    yAxisId="price"
                    line={false}
                    isAnimationActive={false}
                  />
                )}
              {!hiddenKeys.has("price") && (
                <Line
                  type="monotone"
                  dataKey="priceValue"
                  stroke={PRICE_COLOR}
                  strokeWidth={2}
                  strokeOpacity={0.9}
                  dot={false}
                  connectNulls
                  yAxisId="price"
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
