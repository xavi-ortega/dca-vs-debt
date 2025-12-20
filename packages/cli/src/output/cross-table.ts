import kleur from "kleur";
import type { DcaCrossRow } from "@bitcoin-strategy/core";
import type { Column } from "./types.js";
import { fmtBTC, fmtInt } from "../format/index.js";

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
      label: "DCA BTC",
      align: "right",
      cell: (r) => fmtBTC(r.dcaBTCFinal),
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

