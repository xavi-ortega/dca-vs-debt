import type { SeriesPoint, CoreConfig, Frequency } from "../types/index.js";
import type { DebtResult } from "../types/debt.js";
import { DebtEngine } from "./debt-engine.js";

export function simulateDebtStrategy(
  series: SeriesPoint[],
  cfg: CoreConfig,
  freq: Frequency,
): DebtResult {
  const engine = new DebtEngine({ series, config: cfg, freq });
  return engine.run();
}
