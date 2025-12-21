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

export type DebtState = {
  btc: number;
  debtUSD: number;
};

export type DebtLedger = {
  interestUSD: number;
  principalUSD: number;
  feesUSD: number;
  borrows: number;
  repays: number;
  maxDebtSeen: number;
};

export type DebtPolicy = {
  maxDebtPct: number;
  band: number;
  payInterestDaily: boolean;
  borrowToMax: boolean;
};

export type DebtSimulationOutcome = DebtResult & {
  ledger: DebtLedger;
  state: DebtState;
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
