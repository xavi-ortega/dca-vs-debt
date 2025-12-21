import type { SeriesPoint, CoreConfig, Frequency } from "../types/index.js";
import type { DebtResult } from "../types/debt.js";
import { isRebalanceDay } from "../utils/frequency.js";
import { btcFeeUSD } from "../utils/fees.js";

export function simulateDebtStrategy(
  series: SeriesPoint[],
  cfg: CoreConfig,
  freq: Frequency,
): DebtResult {
  const {
    initialBTC,
    initialUSD,
    apr,
    maxDebtPct,
    band,
    satPerVb,
    vbytesPerTx,
    txBorrow,
    txRepay,
    payInterestDaily,
    borrowToMax,
  } = cfg;

  let btc = initialBTC;
  let debt = 0;

  if (initialUSD > 0) btc += initialUSD / series[0].price;

  let interestUSD = 0;
  let principalUSD = 0;
  let feesUSD = 0;

  let borrows = 0;
  let repays = 0;
  let maxDebtSeen = 0;

  const dailyRate = apr / 365;

  for (const { date, price } of series) {
    if (debt > 0) {
      const interest = debt * dailyRate;
      if (payInterestDaily) interestUSD += interest;
      else debt += interest;
    }

    if (debt > maxDebtSeen) maxDebtSeen = debt;

    if (!isRebalanceDay(freq, date)) continue;

    const collateralValue = btc * price;
    const maxDebt = maxDebtPct * collateralValue;

    if (debt > maxDebt) {
      const repay = debt - maxDebt;
      debt -= repay;
      principalUSD += repay;

      feesUSD += btcFeeUSD({
        satPerVb,
        vbytes: vbytesPerTx,
        txCount: txRepay,
        btcPriceUSD: price,
      });
      repays++;
    }

    const lowerBound = maxDebt * (1 - band);
    if (debt < lowerBound) {
      const target = borrowToMax ? maxDebt : lowerBound;
      const borrow = target - debt;

      if (borrow > 0) {
        debt += borrow;
        btc += borrow / price;

        feesUSD += btcFeeUSD({
          satPerVb,
          vbytes: vbytesPerTx,
          txCount: txBorrow,
          btcPriceUSD: price,
        });
        borrows++;
      }
    }

    if (debt > maxDebtSeen) maxDebtSeen = debt;
  }

  const finalPrice = series.at(-1)!.price;
  const finalValueUSD = btc * finalPrice;
  const externalTotalUSD = interestUSD + principalUSD + feesUSD;

  return {
    freq,
    btcFinal: btc,
    debtFinal: debt,
    finalValueUSD,
    externalTotalUSD,
    interestUSD,
    principalUSD,
    feesUSD,
    borrows,
    repays,
    maxDebtSeen,
  };
}
