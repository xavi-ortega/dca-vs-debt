import React, { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HeadRow } from "@/types";
import { fmtBTC, fmtInt } from "@/lib/utils";
import { freqColor, freqLabel, sortByFrequency } from "@/lib/frequency";

type Props = { headRows: HeadRow[] | null; embedded?: boolean };

const emptyState = (
  <div className="text-sm text-muted-foreground">
    Run the backtest to see charts.
  </div>
);

export function PieComparison({ headRows, embedded = false }: Props) {
  const { slices } = useMemo(() => {
    if (!headRows) return { slices: [] };

    const wins = { debt: 0, dca: 0, tie: 0 };

    for (const row of headRows) {
      if (row.deltaNetUSD > 0) wins.debt++;
      else if (row.deltaNetUSD < 0) wins.dca++;
      else wins.tie++;
    }

    const slices = [
      {
        name: "Debt wins",
        key: "debt",
        value: wins.debt,
        color: "var(--color-chart-1)",
      },
      {
        name: "DCA wins",
        key: "dca",
        value: wins.dca,
        color: "var(--color-chart-2)",
      },
      {
        name: "Tie",
        key: "tie",
        value: wins.tie,
        color: "var(--color-muted-foreground)",
      },
    ].filter((s) => s.value > 0);

    return { slices };
  }, [headRows]);

  const content = !headRows ? (
    emptyState
  ) : (
    <div className="grid gap-4 md:grid-cols-[1fr,1.2fr]">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={80}
            >
              {slices.map((slice) => (
                <Cell key={slice.key} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v: any, name) => [`${v} freq`, name]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Who wins more often?</CardTitle>
        <p className="text-sm text-muted-foreground">
          Counts by rebalance cadence based on net USD outcome.
        </p>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
