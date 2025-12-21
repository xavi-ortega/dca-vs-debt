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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtBTC } from "@/lib/utils";
import { freqColor, freqLabel, FREQ_ORDER } from "@/lib/frequency";
import { FreqSelect } from "./FreqSelect.js";

type ChartRow = Record<string, number | string>;

const emptyState = (
  <div className="text-sm text-muted-foreground">
    Run the backtest to see charts.
  </div>
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
                formatter={(value: any, name?: string) => [
                  fmtBTC(Number(value)),
                  name ?? "",
                ]}
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
