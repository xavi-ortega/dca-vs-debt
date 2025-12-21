export type CliArgs = {
  start: string | null;
  end: string | null;

  initialBTC: number;
  initialUSD: number;

  apr: number;
  maxDebtPct: number;
  band: number;

  payInterestDaily: boolean;
  borrowToMax: boolean;

  satPerVb: number;
  vbytesPerTx: number;
  txBorrow: number;
  txRepay: number;

  includeDcaFees: boolean;
  dcaTxCount: number;

  // If provided, skip interactive selection
  dataset: string | null;
};
