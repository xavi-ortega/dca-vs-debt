import path from "path";
import select from "@inquirer/select";
import type { AssetDataset } from "./types.js";
import { fmtBytes } from "../format/index.js";
import { printDatasetTable } from "./display.js";
import { resolveDatasetByName } from "./resolution.js";
import { repoRootDir } from "./paths.js";

export async function chooseDataset(
  datasets: AssetDataset[],
  preferred: string | null,
): Promise<AssetDataset> {
  if (datasets.length === 0) {
    throw new Error(
      `No datasets found in ${path.join(repoRootDir(), "assets")}\nPut one or more *.csv files there.`,
    );
  }

  // If dataset flag provided, resolve it and skip interactive selector
  if (preferred) {
    const found = resolveDatasetByName(datasets, preferred);
    if (!found) {
      const names = datasets.map((d) => d.name).join(", ");
      throw new Error(`Unknown --dataset=${preferred}\nAvailable: ${names}`);
    }
    return found;
  }

  // If exactly one dataset, auto-select
  if (datasets.length === 1) return datasets[0];

  // Otherwise, show table + interactive selector
  printDatasetTable(datasets);

  const chosenName = await select({
    message: "Select dataset",
    choices: datasets.map((d) => ({
      name: `${d.name}  (${fmtBytes(d.bytes)})`,
      value: d.name,
    })),
  });

  const found = resolveDatasetByName(datasets, chosenName);
  if (!found) throw new Error("Internal error: selected dataset not found.");
  return found;
}
