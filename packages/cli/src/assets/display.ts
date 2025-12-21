import kleur from "kleur";
import Table from "cli-table3";
import type { AssetDataset } from "./types.js";
import { fmtBytes } from "../format/index.js";

export function printDatasetTable(datasets: AssetDataset[]) {
  const t = new Table({
    head: [kleur.bold("Dataset"), kleur.bold("File"), kleur.bold("Size")],
    colAligns: ["left", "left", "right"],
    style: { head: [], border: [] },
  });

  for (const d of datasets) {
    t.push([kleur.cyan(d.name), kleur.gray(d.file), fmtBytes(d.bytes)]);
  }

  console.log(kleur.bold().underline("Datasets (./assets)"));
  console.log(t.toString());
}
