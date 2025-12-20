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
  return (
    <div className="w-full overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((c) => (
              <th
                key={String(c.key)}
                className={`px-3 py-2 font-medium ${c.align === "right" ? "text-right" : "text-left"}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="border-t">
              {columns.map((c) => (
                <td
                  key={String(c.key)}
                  className={`px-3 py-2 ${c.align === "right" ? "text-right tabular-nums" : "text-left"}`}
                >
                  {c.render ? c.render(r) : String(r[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

