import type { SeriesPoint, CoreConfig } from "../types/common.js";
import type { DebtResult } from "../types/debt.js";
import type { DcaOptions, HeadToHeadRow, DcaCrossRow } from "../types/dca.js";
import { FREQUENCIES } from "../utils/frequency.js";
import { simulateDCA } from "../simulation/dca.js";

export function buildHeadToHeadRows(
  series: SeriesPoint[],
  cfg: CoreConfig,
  debtResults: DebtResult[],
  opts: DcaOptions = {},
): HeadToHeadRow[] {
  return debtResults.map((dr) => {
    const dcaSame = simulateDCA(
      series,
      cfg,
      dr.freq,
      dr.externalTotalUSD,
      opts,
    );

    const debtNetUSD = dr.finalValueUSD - dr.debtFinal;
    const dcaNetUSD = dcaSame.finalValueUSD;

    return {
      freq: dr.freq,
      debtBTC: dr.btcFinal,
      dcaBTC: dcaSame.btcFinal,
      deltaBTC: dr.btcFinal - dcaSame.btcFinal,

      debtNetUSD,
      dcaValueUSD: dcaSame.finalValueUSD,
      deltaNetUSD: debtNetUSD - dcaNetUSD,

      externalUSD: dr.externalTotalUSD,
      dcaFeesUSD: dcaSame.feesUSD,
    };
  });
}

export function buildDcaCrossRows(
  series: SeriesPoint[],
  cfg: CoreConfig,
  debtResults: DebtResult[],
  opts: DcaOptions = {},
): DcaCrossRow[] {
  const rows: DcaCrossRow[] = [];

  for (const dr of debtResults) {
    for (const dcaFreq of FREQUENCIES) {
      const dca = simulateDCA(series, cfg, dcaFreq, dr.externalTotalUSD, opts);
      rows.push({
        debtFreq: dr.freq,
        dcaFreq,
        budgetUSD: dr.externalTotalUSD,
        dcaBTCFinal: dca.btcFinal,
        dcaBuys: dca.buys,
        dcaFeesUSD: dca.feesUSD,
        dcaValueFinalUSD: dca.finalValueUSD,
      });
    }
  }
  return rows;
}

