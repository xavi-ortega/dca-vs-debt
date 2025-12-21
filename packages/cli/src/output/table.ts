import kleur from "kleur";
import Table from "cli-table3";
import type { AnyRow, Column } from "./types.js";

export function printTable<T extends AnyRow>(
  title: string,
  columns: Column<T>[],
  rows: T[],
) {
  console.log("\n" + kleur.bold().underline(title));

  const t = new Table({
    head: columns.map((c) => kleur.bold(c.label)),
    colAligns: columns.map((c) => (c.align === "right" ? "right" : "left")),
    style: { head: [], border: [] },
  });

  for (const r of rows) {
    t.push(columns.map((c) => c.cell(r)));
  }

  console.log(t.toString());
}
