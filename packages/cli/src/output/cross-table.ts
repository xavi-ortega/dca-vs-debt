import kleur from "kleur";
import type { DcaCrossRow } from "@dca-vs-debt/core";
import type { Column } from "./types.js";
import { fmtAsset, fmtInt } from "../format/index.js";

export function getDcaCrossTableColumns(): Column<DcaCrossRow>[] {
  return [
    {
      label: "Debt Freq",
      align: "left",
      cell: (r) => kleur.cyan(String(r.debtFreq)),
    },
    { label: "DCA Freq", align: "left", cell: (r) => String(r.dcaFreq) },
    {
      label: "Budget $",
      align: "right",
      cell: (r) => fmtInt(r.budgetUSD),
    },
    {
      label: "DCA asset",
      align: "right",
      cell: (r) => fmtAsset(r.dcaBTCFinal),
    },
    { label: "Buys", align: "right", cell: (r) => fmtInt(r.dcaBuys) },
    {
      label: "Fees $",
      align: "right",
      cell: (r) => fmtInt(r.dcaFeesUSD),
    },
    {
      label: "Final $",
      align: "right",
      cell: (r) => fmtInt(r.dcaValueFinalUSD),
    },
  ];
}
