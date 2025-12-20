import type { Frequency } from "./common.js";

export type DebtResult = {
  freq: Frequency;

  btcFinal: number;
  debtFinal: number;
  finalValueUSD: number;

  externalTotalUSD: number;
  interestUSD: number;
  principalUSD: number;
  feesUSD: number;

  borrows: number;
  repays: number;
  maxDebtSeen: number;
};

export type DebtReportRow = {
  freq: Frequency;
  btcFinal: number;
  finalValueUSD: number;
  debtFinal: number;
  netValueUSD: number;

  externalTotalUSD: number;
  interestUSD: number;
  principalUSD: number;
  feesUSD: number;

  borrows: number;
  repays: number;
  maxDebtSeen: number;
};

