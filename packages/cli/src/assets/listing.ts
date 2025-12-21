import fs from "fs";
import path from "path";
import type { AssetDataset } from "./types.js";
import { repoRootDir } from "./paths.js";

export function listAssetDatasets(): AssetDataset[] {
  const root = repoRootDir();
  const assetsDir = path.join(root, "assets");
  if (!fs.existsSync(assetsDir)) return [];

  const files = fs
    .readdirSync(assetsDir)
    .filter((f) => f.toLowerCase().endsWith(".csv"))
    .sort((a, b) => a.localeCompare(b));

  return files.map((file) => {
    const fullPath = path.join(assetsDir, file);
    const st = fs.statSync(fullPath);
    return {
      name: file.replace(/\.csv$/i, ""),
      file,
      fullPath,
      bytes: st.size,
    };
  });
}
