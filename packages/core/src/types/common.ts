export type Frequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export type SeriesPoint = {
  date: string; // ISO YYYY-MM-DD
  price: number; // USD
};

export type CoreConfig = {
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
};
