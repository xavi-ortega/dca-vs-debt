import kleur from "kleur";
import type { HeadToHeadRow } from "@bitcoin-strategy/core";
import type { Column } from "./types.js";
import { fmtBTC, fmtInt } from "../format/index.js";

export function getHeadToHeadTableColumns(): Column<HeadToHeadRow>[] {
  return [
    {
      label: "Freq",
      align: "left",
      cell: (r) => kleur.cyan(String(r.freq)),
    },
    {
      label: "Debt BTC",
      align: "right",
      cell: (r) => fmtBTC(r.debtBTC),
    },
    { label: "DCA BTC", align: "right", cell: (r) => fmtBTC(r.dcaBTC) },
    {
      label: "Δ BTC",
      align: "right",
      cell: (r) => {
        const v = r.deltaBTC as number;
        const s = fmtBTC(v);
        return v > 0 ? kleur.green(s) : v < 0 ? kleur.red(s) : s;
      },
    },
    {
      label: "Debt Net $",
      align: "right",
      cell: (r) => fmtInt(r.debtNetUSD),
    },
    {
      label: "DCA $",
      align: "right",
      cell: (r) => fmtInt(r.dcaValueUSD),
    },
    {
      label: "Δ Net $",
      align: "right",
      cell: (r) => {
        const v = r.deltaNetUSD as number;
        const s = fmtInt(v);
        return v > 0 ? kleur.green(s) : v < 0 ? kleur.red(s) : s;
      },
    },
    {
      label: "External $",
      align: "right",
      cell: (r) => fmtInt(r.externalUSD),
    },
    {
      label: "DCA Fees $",
      align: "right",
      cell: (r) => fmtInt(r.dcaFeesUSD),
    },
  ];
}
