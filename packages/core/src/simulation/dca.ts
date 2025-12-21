import type { SeriesPoint, CoreConfig, Frequency } from "../types/index.js";
import type { DcaOptions, DcaResult } from "../types/dca.js";
import { DcaEngine } from "./dca-engine.js";

export function simulateDCA(
  series: SeriesPoint[],
  cfg: CoreConfig,
  freq: Frequency,
  externalBudgetUSD: number,
  opts: DcaOptions = {},
): DcaResult {
  const engine = new DcaEngine({
    series,
    config: cfg,
    freq,
    externalBudgetUSD,
    options: opts,
  });
  return engine.run();
}
