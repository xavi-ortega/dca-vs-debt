import type { AssetDataset } from "./types.js";

export function resolveDatasetByName(
  datasets: AssetDataset[],
  name: string,
): AssetDataset | null {
  // Accept both "name" (without .csv) and "file" (with .csv)
  const direct = datasets.find((d) => d.name === name || d.file === name);
  if (direct) return direct;

  // Small convenience: allow prefix match if unambiguous
  const prefix = datasets.filter(
    (d) => d.name.startsWith(name) || d.file.startsWith(name),
  );
  if (prefix.length === 1) return prefix[0];

  return null;
}
