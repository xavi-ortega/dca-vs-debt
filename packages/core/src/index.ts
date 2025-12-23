// Re-export all types
export type {
  Frequency,
  SeriesPoint,
  CoreConfig,
  DebtResult,
  DebtReportRow,
  DcaOptions,
  DcaResult,
  HeadToHeadRow,
  DcaCrossRow,
} from "./types/index.js";

// Re-export all utilities
export { FREQUENCIES, isRebalanceDay, filterRange } from "./utils/index.js";

// Re-export all simulations
export { simulateDebtStrategy, simulateDCA } from "./simulation/index.js";

// Re-export all reports
export {
  buildDebtReportRows,
  buildHeadToHeadRows,
  buildDcaCrossRows,
} from "./reports/index.js";
