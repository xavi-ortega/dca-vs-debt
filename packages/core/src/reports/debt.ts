import type { DebtResult, DebtReportRow } from "../types/debt.js";

export function buildDebtReportRows(
  debtResults: DebtResult[],
): DebtReportRow[] {
  return debtResults.map((dr) => ({
    freq: dr.freq,
    btcFinal: dr.btcFinal,
    finalValueUSD: dr.finalValueUSD,
    debtFinal: dr.debtFinal,
    netValueUSD: dr.finalValueUSD - dr.debtFinal,

    externalTotalUSD: dr.externalTotalUSD,
    interestUSD: dr.interestUSD,
    principalUSD: dr.principalUSD,
    feesUSD: dr.feesUSD,

    borrows: dr.borrows,
    repays: dr.repays,
    maxDebtSeen: dr.maxDebtSeen,
  }));
}
