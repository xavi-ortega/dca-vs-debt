import type { SeriesPoint, CoreConfig, Frequency } from "../types/index.js";
import type { DcaOptions, DcaResult } from "../types/dca.js";
import { isRebalanceDay } from "../utils/frequency.js";
import { btcFeeUSD } from "../utils/fees.js";

export function simulateDCA(
  series: SeriesPoint[],
  cfg: CoreConfig,
  freq: Frequency,
  externalBudgetUSD: number,
  opts: DcaOptions = {},
): DcaResult {
  const { includeFees = false, dcaTxCount = 1 } = opts;

  let btc = cfg.initialBTC;
  if (cfg.initialUSD > 0) btc += cfg.initialUSD / series[0].price;

  const buyDays = series.filter((d) => isRebalanceDay(freq, d.date));
  const perBuy = externalBudgetUSD / buyDays.length;

  let feesUSD = 0;

  for (const d of buyDays) {
    let netBuyUSD = perBuy;

    if (includeFees) {
      const fee = btcFeeUSD({
        satPerVb: cfg.satPerVb,
        vbytes: cfg.vbytesPerTx,
        txCount: dcaTxCount,
        btcPriceUSD: d.price,
      });
      feesUSD += fee;
      netBuyUSD = Math.max(perBuy - fee, 0);
    }

    btc += netBuyUSD / d.price;
  }

  return {
    freq,
    btcFinal: btc,
    buys: buyDays.length,
    spentUSD: externalBudgetUSD,
    feesUSD,
    finalValueUSD: btc * series.at(-1)!.price,
  };
}

