import React, { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtAsset } from "@/lib/utils";
import { freqColor, freqLabel, FREQ_ORDER } from "@/lib/frequency";
import { FreqSelect } from "./FreqSelect.js";

type ChartRow = Record<string, number | string>;

const emptyState = (
  <div className="text-sm text-muted-foreground">
    Run the backtest to see charts.
  </div>
);

export function CombinedBtcChart({ data }: { data: ChartRow[] | null }) {
  const [freq, setFreq] = useState<string>("all");
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Reset hidden series when cadence changes.
    setHiddenKeys(new Set());
  }, [freq]);

  const lines = useMemo(() => {
    if (!data) return [];
    if (freq === "all") {
      return FREQ_ORDER.flatMap((f) => [
        {
          key: `debt-${f}`,
          dataKey: `debt-${f}-btc`,
          name: `${freqLabel[f]} Debt`,
          stroke: freqColor[f],
          dashed: false,
        },
        {
          key: `dca-${f}`,
          dataKey: `dca-${f}-btc`,
          name: `${freqLabel[f]} DCA`,
          stroke: freqColor[f],
          dashed: true,
        },
      ]);
    }

    const color = freqColor[freq as keyof typeof freqColor];
    return [
      {
        key: `debt-${freq}`,
        dataKey: "debt",
        name: `${freqLabel[freq as keyof typeof freqLabel]} Debt`,
        stroke: color,
        dashed: false,
      },
      {
        key: `dca-${freq}`,
        dataKey: "dca",
        name: `${freqLabel[freq as keyof typeof freqLabel]} DCA`,
        stroke: color,
        dashed: true,
      },
    ];
  }, [data, freq]);

  const lineLookup = useMemo(() => {
    const m = new Map<string, { stroke: string; dashed: boolean; name: string }>();
    lines.forEach((l) =>
      m.set(l.dataKey, { stroke: l.stroke, dashed: l.dashed, name: l.name }),
    );
    return m;
  }, [lines]);

  const chartData = useMemo(() => {
    if (!data) return [];
    if (freq === "all") return data;
    return data
      .map((row) => ({
        date: row.date as string,
        debt: row[`debt-${freq}-btc`] as number | undefined,
        dca: row[`dca-${freq}-btc`] as number | undefined,
      }))
      .filter((r) => typeof r.debt === "number" && typeof r.dca === "number");
  }, [data, freq]);

  const toggleSeries = (key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: any[];
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;

    const visible = payload.filter(
      (p) => p.dataKey && !hiddenKeys.has(p.dataKey as string),
    );
    if (!visible.length) return null;

    const sorted = [...visible].sort(
      (a, b) => Number(b.value ?? 0) - Number(a.value ?? 0),
    );

    return (
      <div className="rounded-md border bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
        <div className="mb-1 text-[11px] font-semibold text-muted-foreground">
          {label}
        </div>
        <div className="space-y-1">
          {sorted.map((entry) => {
            const meta = lineLookup.get(entry.dataKey as string);
            const stroke = meta?.stroke ?? entry.color;
            const dashed = meta?.dashed ?? Boolean(entry.strokeDasharray);
            const name = meta?.name ?? entry.name;
            return (
              <div key={entry.dataKey} className="flex items-center gap-2">
                <span
                  className="inline-block"
                  style={{
                    width: 18,
                    borderTop: `3px ${dashed ? "dashed" : "solid"} ${stroke}`,
                  }}
                />
                <span className="font-medium">{name}</span>
                <span className="text-muted-foreground">
                  {fmtAsset(Number(entry.value))}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderLegend = () => (
    <div className="flex flex-wrap gap-3 text-xs">
      {lines.map((line) => {
        const isHidden = hiddenKeys.has(line.dataKey);
        return (
          <button
            key={line.dataKey}
            type="button"
            onClick={() => toggleSeries(line.dataKey)}
            className={`flex items-center gap-2 rounded-md border px-2 py-1 transition-colors ${
              isHidden
                ? "border-border/60 text-muted-foreground"
                : "border-border text-foreground"
            }`}
            aria-pressed={!isHidden}
          >
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 20,
                borderTop: `3px ${line.dashed ? "dashed" : "solid"} ${
                  line.stroke
                }`,
                opacity: isHidden ? 0.35 : 1,
              }}
            />
            <span className={isHidden ? "line-through opacity-60" : ""}>
              {line.name}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset exposure over time</CardTitle>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Compare asset holdings for Debt vs DCA by cadence (or all at once).
          </p>
          <FreqSelect value={freq} onChange={setFreq} includeAll />
        </div>
      </CardHeader>
      <CardContent className="h-96">
        {!data ? (
          emptyState
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" minTickGap={28} />
              <YAxis tickFormatter={(v) => fmtAsset(Number(v))} width={90} />
              <Tooltip content={renderTooltip} />
              <Legend content={renderLegend} />
              {lines.map((line) =>
                hiddenKeys.has(line.dataKey) ? null : (
                  <Line
                    key={line.dataKey}
                    dataKey={line.dataKey}
                    name={line.name}
                    stroke={line.stroke}
                    strokeDasharray={line.dashed ? "6 4" : undefined}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                ),
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
