import type { SeriesPoint, CoreConfig, Frequency } from "../types/common.js";
import type {
  DcaLedger,
  DcaOptions,
  DcaResult,
  DcaState,
} from "../types/dca.js";
import { isRebalanceDay } from "../utils/frequency.js";

type DcaEngineParams = {
  series: SeriesPoint[];
  config: CoreConfig;
  freq: Frequency;
  externalBudgetUSD: number;
  options?: DcaOptions;
};

const DEFAULT_OPTS: Required<DcaOptions> = {
  includeFees: false,
  dcaTxCount: 1,
};

export class DcaEngine {
  private readonly series: SeriesPoint[];
  private readonly freq: Frequency;
  private readonly cfg: CoreConfig;
  private readonly budgetUSD: number;
  private readonly opts: Required<DcaOptions>;

  private state: DcaState;
  private ledger: DcaLedger;

  constructor({
    series,
    config,
    freq,
    externalBudgetUSD,
    options,
  }: DcaEngineParams) {
    this.series = series;
    this.freq = freq;
    this.cfg = config;
    this.budgetUSD = externalBudgetUSD;
    this.opts = { ...DEFAULT_OPTS, ...(options ?? {}) };

    const startingBTC =
      config.initialBTC +
      (config.initialUSD > 0 ? config.initialUSD / series[0].price : 0);

    this.state = { btc: startingBTC };
    this.ledger = { buys: 0, feesUSD: 0, spentUSD: externalBudgetUSD };
  }

  run(): DcaResult {
    const buyDays = this.series.filter((d) =>
      isRebalanceDay(this.freq, d.date),
    );
    if (buyDays.length === 0) return this.toResult(this.series.at(-1)!.price);

    const perBuy = this.budgetUSD / buyDays.length;

    for (const day of buyDays) {
      this.applyBuy(perBuy, day.price);
    }

    return this.toResult(this.series.at(-1)!.price);
  }

  private applyBuy(perBuyUSD: number, btcPriceUSD: number) {
    let netBuyUSD = perBuyUSD;
    if (this.opts.includeFees) {
      const fee = this.cfg.transactionFeeUSD * this.opts.dcaTxCount;
      this.ledger.feesUSD += fee;
      netBuyUSD = Math.max(perBuyUSD - fee, 0);
    }

    this.state.btc += netBuyUSD / btcPriceUSD;
    this.ledger.buys += 1;
  }

  private toResult(finalPrice: number): DcaResult {
    return {
      freq: this.freq,
      btcFinal: this.state.btc,
      buys: this.ledger.buys,
      spentUSD: this.ledger.spentUSD,
      feesUSD: this.ledger.feesUSD,
      finalValueUSD: this.state.btc * finalPrice,
    };
  }
}
