import React from "react";

export function DataTable<T extends Record<string, any>>(props: {
  columns: {
    key: keyof T;
    label: string;
    align?: "left" | "right";
    render?: (row: T) => React.ReactNode;
  }[];
  rows: T[];
}) {
  const { columns, rows } = props;

  // Identify numeric columns to allow simple highlighting
  const numericMeta = columns.reduce<
    Record<string, { min: number; max: number } | null>
  >((acc, c) => {
    const nums = rows
      .map((r) => r[c.key])
      .filter((v) => typeof v === "number") as number[];
    if (!nums.length) {
      acc[String(c.key)] = null;
    } else {
      acc[String(c.key)] = { min: Math.min(...nums), max: Math.max(...nums) };
    }
    return acc;
  }, {});

  const maybeHighlight = (col: string, raw: any) => {
    if (typeof raw !== "number") return "";
    const meta = numericMeta[col];
    const label =
      columns.find((c) => String(c.key) === col)?.label.toLowerCase() ?? col;

    // Delta-style columns: green for positive, red for negative
    if (label.includes("Δ") || label.includes("delta")) {
      if (raw > 0) return "text-emerald-600 font-semibold";
      if (raw < 0) return "text-rose-600 font-semibold";
    }

    // Net/value columns: highlight best/worst
    if (meta) {
      if (raw === meta.max) return "text-emerald-700 font-semibold";
      if (raw === meta.min) return "text-amber-700 font-semibold";
    }

    return "";
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border/70 bg-card/70 shadow-sm">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead className="bg-muted/60 text-muted-foreground">
          <tr>
            {columns.map((c) => (
              <th
                key={String(c.key)}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${c.align === "right" ? "text-right" : "text-left"} border-b border-border/80`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr
              key={idx}
              className={`hover:bg-accent/10 transition-colors ${idx % 2 === 0 ? "bg-muted/10" : "bg-card"}`}
            >
              {columns.map((c) => (
                <td
                  key={String(c.key)}
                  className={`px-4 py-3 ${
                    c.align === "right"
                      ? "text-right tabular-nums"
                      : "text-left"
                  } ${maybeHighlight(String(c.key), r[c.key])} border-b border-border/50`}
                >
                  <span className="whitespace-nowrap">
                    {c.render ? c.render(r) : String(r[c.key] ?? "")}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
