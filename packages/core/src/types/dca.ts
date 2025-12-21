import type { Frequency } from "./common.js";

export type DcaOptions = {
  includeFees?: boolean;
  dcaTxCount?: number;
};

export type DcaResult = {
  freq: Frequency;
  btcFinal: number;
  buys: number;
  spentUSD: number;
  feesUSD: number;
  finalValueUSD: number;
};

export type DcaState = {
  btc: number;
};

export type DcaLedger = {
  feesUSD: number;
  buys: number;
  spentUSD: number;
};

export type DcaSimulationOutcome = DcaResult & {
  state: DcaState;
  ledger: DcaLedger;
};

export type HeadToHeadRow = {
  freq: Frequency;

  debtBTC: number;
  dcaBTC: number;
  deltaBTC: number;

  debtNetUSD: number;
  dcaValueUSD: number;
  deltaNetUSD: number;

  externalUSD: number;
  dcaFeesUSD: number;
};

export type DcaCrossRow = {
  debtFreq: Frequency;
  dcaFreq: Frequency;

  budgetUSD: number;
  dcaBTCFinal: number;
  dcaBuys: number;
  dcaFeesUSD: number;
  dcaValueFinalUSD: number;
};
