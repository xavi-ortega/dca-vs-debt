import type { SeriesPoint, CoreConfig, Frequency } from "../types/common.js";
import type {
  DebtLedger,
  DebtPolicy,
  DebtResult,
  DebtState,
} from "../types/debt.js";
import { buildRebalanceSchedule } from "../utils/frequency.js";

type DebtEngineOptions = {
  series: SeriesPoint[];
  config: CoreConfig;
  freq: Frequency;
};

const INITIAL_LEDGER: DebtLedger = {
  interestUSD: 0,
  principalUSD: 0,
  feesUSD: 0,
  borrows: 0,
  repays: 0,
  maxDebtSeen: 0,
};

export class DebtEngine {
  private readonly series: SeriesPoint[];
  private readonly freq: Frequency;
  private readonly policy: DebtPolicy;
  private readonly feeInputs: Pick<
    CoreConfig,
    "amortizationFeeUSD" | "refinancingFeeUSD"
  >;
  private readonly dailyRate: number;

  private state: DebtState;
  private ledger: DebtLedger;

  constructor({ series, config, freq }: DebtEngineOptions) {
    this.series = series;
    this.freq = freq;
    this.policy = {
      maxDebtPct: config.maxDebtPct,
      band: config.band,
      payInterestDaily: config.payInterestDaily,
      borrowToMax: config.borrowToMax,
    };
    this.feeInputs = {
      amortizationFeeUSD: config.amortizationFeeUSD,
      refinancingFeeUSD: config.refinancingFeeUSD,
    };
    this.dailyRate = config.apr / 365;

    const startingBTC =
      config.initialBTC +
      (config.initialUSD > 0 ? config.initialUSD / series[0].price : 0);

    this.state = { btc: startingBTC, debtUSD: 0 };
    this.ledger = { ...INITIAL_LEDGER };
  }

  run(): DebtResult {
    const schedule = buildRebalanceSchedule(this.series, this.freq);
    let ptr = 0;
    for (const point of this.series) {
      this.accrueInterest();
      this.trackMaxDebt();

      while (ptr < schedule.length && this.series[schedule[ptr]].date === point.date) {
        this.rebalance(point);
        this.trackMaxDebt();
        ptr++;
      }
    }

    const finalPrice = this.series.at(-1)!.price;
    return this.toResult(finalPrice);
  }

  private accrueInterest() {
    if (this.state.debtUSD <= 0) return;
    const interest = this.state.debtUSD * this.dailyRate;
    if (this.policy.payInterestDaily) this.ledger.interestUSD += interest;
    else this.state.debtUSD += interest;
  }

  private rebalance(point: SeriesPoint) {
    const collateralValue = this.state.btc * point.price;
    const maxDebt = this.policy.maxDebtPct * collateralValue;

    if (this.state.debtUSD > maxDebt) {
      const repayUSD = this.state.debtUSD - maxDebt;
      this.applyRepay(repayUSD);
    }

    const lowerBound = maxDebt * (1 - this.policy.band);
    if (this.state.debtUSD < lowerBound) {
      const target = this.policy.borrowToMax ? maxDebt : lowerBound;
      const borrowUSD = target - this.state.debtUSD;
      if (borrowUSD > 0) this.applyBorrow(borrowUSD, point.price);
    }
  }

  private applyBorrow(amountUSD: number, btcPriceUSD: number) {
    this.state.debtUSD += amountUSD;
    this.state.btc += amountUSD / btcPriceUSD;
    this.ledger.borrows += 1;
    this.ledger.feesUSD += this.feeInputs.refinancingFeeUSD;
  }

  private applyRepay(amountUSD: number) {
    this.state.debtUSD -= amountUSD;
    this.ledger.principalUSD += amountUSD;
    this.ledger.repays += 1;
    this.ledger.feesUSD += this.feeInputs.amortizationFeeUSD;
  }

  private trackMaxDebt() {
    if (this.state.debtUSD > this.ledger.maxDebtSeen) {
      this.ledger.maxDebtSeen = this.state.debtUSD;
    }
  }

  private toResult(finalPrice: number): DebtResult {
    const finalValueUSD = this.state.btc * finalPrice;
    const externalTotalUSD =
      this.ledger.interestUSD + this.ledger.principalUSD + this.ledger.feesUSD;

    return {
      freq: this.freq,
      btcFinal: this.state.btc,
      debtFinal: this.state.debtUSD,
      finalValueUSD,
      externalTotalUSD,
      interestUSD: this.ledger.interestUSD,
      principalUSD: this.ledger.principalUSD,
      feesUSD: this.ledger.feesUSD,
      borrows: this.ledger.borrows,
      repays: this.ledger.repays,
      maxDebtSeen: this.ledger.maxDebtSeen,
    };
  }
}
