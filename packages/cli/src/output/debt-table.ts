import kleur from "kleur";
import type { DebtReportRow } from "@dca-vs-debt/core";
import type { Column } from "./types.js";
import { fmtAsset, fmtInt } from "../format/index.js";

export function getDebtTableColumns(): Column<DebtReportRow>[] {
  return [
    {
      label: "Freq",
      align: "left",
      cell: (r) => kleur.cyan(String(r.freq)),
    },
    { label: "Asset", align: "right", cell: (r) => fmtAsset(r.btcFinal) },
    {
      label: "Final $",
      align: "right",
      cell: (r) => fmtInt(r.finalValueUSD),
    },
    {
      label: "Debt $",
      align: "right",
      cell: (r) => fmtInt(r.debtFinal),
    },
    {
      label: "Net $",
      align: "right",
      cell: (r) => fmtInt(r.netValueUSD),
    },
    {
      label: "External $",
      align: "right",
      cell: (r) => fmtInt(r.externalTotalUSD),
    },
    {
      label: "Interest $",
      align: "right",
      cell: (r) => fmtInt(r.interestUSD),
    },
    {
      label: "Principal $",
      align: "right",
      cell: (r) => fmtInt(r.principalUSD),
    },
    { label: "Fees $", align: "right", cell: (r) => fmtInt(r.feesUSD) },
    { label: "Borrows", align: "right", cell: (r) => fmtInt(r.borrows) },
    { label: "Repays", align: "right", cell: (r) => fmtInt(r.repays) },
  ];
}
