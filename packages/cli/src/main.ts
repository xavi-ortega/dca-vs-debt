#!/usr/bin/env node
import fs from "fs";
import kleur from "kleur";
import {
  FREQUENCIES,
  filterRange,
  simulateDebtStrategy,
  buildDebtReportRows,
  buildHeadToHeadRows,
  buildDcaCrossRows,
  type CoreConfig,
  type SeriesPoint,
  type Frequency,
} from "@bitcoin-strategy/core";

import { parseCSV, detectColumns, toISODate } from "./csv/index.js";
import { parseArgs } from "./args/index.js";
import { fmtNum, fmtInt, fmtBTC, fmtBytes } from "./format/index.js";
import { listAssetDatasets, chooseDataset } from "./assets/index.js";
import {
  printTable,
  getDebtTableColumns,
  getHeadToHeadTableColumns,
  getDcaCrossTableColumns,
} from "./output/index.js";

async function main() {
  const args = parseArgs(process.argv);

  const datasets = listAssetDatasets();
  const chosen = await chooseDataset(datasets, args.dataset);

  const csvPath = chosen.fullPath;
  const csvText = fs.readFileSync(csvPath, "utf8");

  const { header, rows } = parseCSV(csvText);
  const { dateCol, priceCol } = detectColumns(header);

  const fullSeries: SeriesPoint[] = rows
    .map((r) => ({
      date: toISODate(r[dateCol] ?? ""),
      price: Number(r[priceCol]),
    }))
    .filter((p) => Number.isFinite(p.price) && p.price > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const series = filterRange(fullSeries, args.start, args.end);

  const cfg: CoreConfig = {
    initialBTC: Number(args.initialBTC),
    initialUSD: Number(args.initialUSD),

    apr: Number(args.apr),
    maxDebtPct: Number(args.maxDebtPct),
    band: Number(args.band),

    payInterestDaily: Boolean(args.payInterestDaily),
    borrowToMax: Boolean(args.borrowToMax),

    satPerVb: Number(args.satPerVb),
    vbytesPerTx: Number(args.vbytesPerTx),
    txBorrow: Number(args.txBorrow),
    txRepay: Number(args.txRepay),
  };

  const dcaOpts = {
    includeFees: Boolean(args.includeDcaFees),
    dcaTxCount: Number(args.dcaTxCount),
  };

  // Header / config
  console.log(kleur.bold("\nBitcoin Strategy CLI"));
  console.log(
    kleur.gray(`Dataset: ${chosen.name}  (${fmtBytes(chosen.bytes)})`),
  );
  console.log(kleur.gray(`File:    ${csvPath}`));
  console.log(
    kleur.gray(
      `Range:   ${series[0].date} -> ${series.at(-1)!.date} (${series.length.toLocaleString("en-US")} days)`,
    ),
  );
  console.log(
    kleur.gray(
      `Price:   $${fmtNum(series[0].price)} -> $${fmtNum(series.at(-1)!.price)}`,
    ),
  );
  console.log(
    kleur.gray(
      `Init:    initialBTC=${cfg.initialBTC}  initialUSD=$${fmtNum(cfg.initialUSD)}`,
    ),
  );
  console.log(
    kleur.gray(
      `Debt:    APR=${fmtNum(cfg.apr * 100)}%  maxDebtPct=${cfg.maxDebtPct}  band=${cfg.band}`,
    ),
  );
  console.log(
    kleur.gray(
      `Fees:    sat/vB=${cfg.satPerVb}  vbytes=${cfg.vbytesPerTx}  txBorrow=${cfg.txBorrow}  txRepay=${cfg.txRepay}`,
    ),
  );
  console.log(
    kleur.gray(
      `DCA:     includeFees=${dcaOpts.includeFees}  dcaTxCount=${dcaOpts.dcaTxCount}`,
    ),
  );

  const debtResults = FREQUENCIES.map((f: Frequency) =>
    simulateDebtStrategy(series, cfg, f),
  );
  const debtRows = buildDebtReportRows(debtResults);
  const headRows = buildHeadToHeadRows(series, cfg, debtResults, dcaOpts);
  const crossRows = buildDcaCrossRows(series, cfg, debtResults, dcaOpts);

  printTable("Debt Strategy Report", getDebtTableColumns(), debtRows);

  printTable(
    "Head-to-Head (Debt vs DCA same freq)",
    getHeadToHeadTableColumns(),
    headRows,
  );

  printTable(
    "DCA Cross-Table (budget from Debt Freq)",
    getDcaCrossTableColumns(),
    crossRows,
  );
}

// Export main for use in index.ts
export { main };
