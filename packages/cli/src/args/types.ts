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

  transactionFeeUSD: number;
  amortizationFeeUSD: number;
  refinancingFeeUSD: number;

  includeDcaFees: boolean;
  dcaTxCount: number;

  // If provided, skip interactive selection
  dataset: string | null;
};
