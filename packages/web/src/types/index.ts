import type {
  buildDebtReportRows,
  buildHeadToHeadRows,
  buildDcaCrossRows,
} from "@dca-vs-debt/core";

export type DebtRow = ReturnType<typeof buildDebtReportRows>[number];
export type HeadRow = ReturnType<typeof buildHeadToHeadRows>[number];
export type CrossRow = ReturnType<typeof buildDcaCrossRows>[number];

export type Dataset = {
  id: string;
  label: string;
  url: string;
};
