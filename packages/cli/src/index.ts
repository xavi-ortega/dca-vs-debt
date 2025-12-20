#!/usr/bin/env node
import fs from "fs";
import path from "path";
import kleur from "kleur";
import Table from "cli-table3";
import select from "@inquirer/select";

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

/* =========================
   CSV parsing (CLI)
   ========================= */

function parseCSV(text: string): {
  header: string[];
  rows: Record<string, string>[];
} {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV file too short.");

  const header = lines[0].split(",").map((s) => s.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts.length !== header.length) continue;

    const obj: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) obj[header[j]] = parts[j].trim();
    rows.push(obj);
  }
  return { header, rows };
}

function detectColumns(header: string[]): {
  dateCol: string;
  priceCol: string;
} {
  const norm = (s: string) => s.toLowerCase().trim();
  const h = header.map(norm);

  const findAny = (candidates: string[]) => {
    for (const c of candidates) {
      const idx = h.indexOf(norm(c));
      if (idx !== -1) return header[idx];
    }
    for (const c of candidates) {
      const idx = h.findIndex((x) => x.includes(norm(c)));
      if (idx !== -1) return header[idx];
    }
    return null;
  };

  const dateCol = findAny([
    "date",
    "timestamp",
    "time",
    "datetime",
    "start",
    "end",
  ]);
  const priceCol = findAny(["close", "adj close", "price", "close_usd"]);

  if (!dateCol || !priceCol) {
    throw new Error(
      `Could not detect required columns.\nFound header: ${header.join(", ")}\nNeed date column (Start/End/Date/...) and price column (Close/Price/...).`
    );
  }
  return { dateCol, priceCol };
}

function toISODate(value: string): string {
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  throw new Error(`Unparseable date: ${value}`);
}

/* =========================
   CLI args
   ========================= */

type CliArgs = {
  start: string | null;
  end: string | null;

  initialBTC: number;
  initialUSD: number;

  apr: number;
  maxDebtPct: number;
  band: number;

  payInterestDaily: boolean;
  borrowToMax: boolean;

  satPerVb: number;
  vbytesPerTx: number;
  txBorrow: number;
  txRepay: number;

  includeDcaFees: boolean;
  dcaTxCount: number;

  // If provided, skip interactive selection
  dataset: string | null;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    start: null,
    end: null,

    initialBTC: 0,
    initialUSD: 0,

    apr: 0.04,
    maxDebtPct: 0.15,
    band: 0.02,

    payInterestDaily: true,
    borrowToMax: true,

    satPerVb: 20,
    vbytesPerTx: 180,
    txBorrow: 1,
    txRepay: 1,

    includeDcaFees: true,
    dcaTxCount: 1,

    dataset: null,
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];

    if (!a.startsWith("--")) continue;

    const [k, v] = a.slice(2).split("=");
    if (v === undefined) continue;
    if (!(k in args)) continue;

    if (v === "true") (args as any)[k] = true;
    else if (v === "false") (args as any)[k] = false;
    else {
      const num = Number(v);
      (args as any)[k] = Number.isFinite(num) ? num : v;
    }
  }

  return args;
}

/* =========================
   Formatting helpers
   ========================= */

function fmtNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "NaN";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
function fmtInt(n: number): string {
  if (!Number.isFinite(n)) return "NaN";
  return Math.round(n).toLocaleString("en-US");
}
function fmtBTC(n: number): string {
  const abs = Math.abs(n);
  const digits = abs >= 100 ? 4 : abs >= 1 ? 6 : 8;
  return fmtNum(n, digits);
}
function fmtBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let b = bytes;
  let u = 0;
  while (b >= 1024 && u < units.length - 1) {
    b /= 1024;
    u++;
  }
  return `${b.toFixed(u === 0 ? 0 : 1)} ${units[u]}`;
}

/* =========================
   Repo/assets helpers
   ========================= */

function repoRootDir(): string {
  // packages/cli -> repo root
  return path.resolve(process.cwd(), "../..");
}

type AssetDataset = {
  name: string; // filename without .csv
  file: string; // filename
  fullPath: string;
  bytes: number;
};

function listAssetDatasets(): AssetDataset[] {
  const root = repoRootDir();
  const assetsDir = path.join(root, "assets");
  if (!fs.existsSync(assetsDir)) return [];

  const files = fs
    .readdirSync(assetsDir)
    .filter((f) => f.toLowerCase().endsWith(".csv"))
    .sort((a, b) => a.localeCompare(b));

  return files.map((file) => {
    const fullPath = path.join(assetsDir, file);
    const st = fs.statSync(fullPath);
    return {
      name: file.replace(/\.csv$/i, ""),
      file,
      fullPath,
      bytes: st.size,
    };
  });
}

function printDatasetTable(datasets: AssetDataset[]) {
  const t = new Table({
    head: [kleur.bold("Dataset"), kleur.bold("File"), kleur.bold("Size")],
    colAligns: ["left", "left", "right"],
    style: { head: [], border: [] },
  });

  for (const d of datasets) {
    t.push([kleur.cyan(d.name), kleur.gray(d.file), fmtBytes(d.bytes)]);
  }

  console.log(kleur.bold().underline("Datasets (./assets)"));
  console.log(t.toString());
}

function resolveDatasetByName(
  datasets: AssetDataset[],
  name: string
): AssetDataset | null {
  // Accept both "name" (without .csv) and "file" (with .csv)
  const direct = datasets.find((d) => d.name === name || d.file === name);
  if (direct) return direct;

  // Small convenience: allow prefix match if unambiguous
  const prefix = datasets.filter(
    (d) => d.name.startsWith(name) || d.file.startsWith(name)
  );
  if (prefix.length === 1) return prefix[0];

  return null;
}

async function chooseDataset(
  datasets: AssetDataset[],
  preferred: string | null
): Promise<AssetDataset> {
  if (datasets.length === 0) {
    throw new Error(
      `No datasets found in ${path.join(repoRootDir(), "assets")}\nPut one or more *.csv files there.`
    );
  }

  // If dataset flag provided, resolve it and skip interactive selector
  if (preferred) {
    const found = resolveDatasetByName(datasets, preferred);
    if (!found) {
      const names = datasets.map((d) => d.name).join(", ");
      throw new Error(`Unknown --dataset=${preferred}\nAvailable: ${names}`);
    }
    return found;
  }

  // If exactly one dataset, auto-select
  if (datasets.length === 1) return datasets[0];

  // Otherwise, show table + interactive selector
  printDatasetTable(datasets);

  const chosenName = await select({
    message: "Select dataset",
    choices: datasets.map((d) => ({
      name: `${d.name}  (${fmtBytes(d.bytes)})`,
      value: d.name,
    })),
  });

  const found = resolveDatasetByName(datasets, chosenName);
  if (!found) throw new Error("Internal error: selected dataset not found.");
  return found;
}

/* =========================
   Pretty tables
   ========================= */

type AnyRow = Record<string, any>;
type Column<T extends AnyRow> = {
  label: string;
  align?: "left" | "right";
  cell: (row: T) => string;
};

function printTable<T extends AnyRow>(
  title: string,
  columns: Column<T>[],
  rows: T[]
) {
  console.log("\n" + kleur.bold().underline(title));

  const t = new Table({
    head: columns.map((c) => kleur.bold(c.label)),
    colAligns: columns.map((c) => (c.align === "right" ? "right" : "left")),
    style: { head: [], border: [] },
  });

  for (const r of rows) {
    t.push(columns.map((c) => c.cell(r)));
  }

  console.log(t.toString());
}

/* =========================
   Main (CLI)
   ========================= */

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
    kleur.gray(`Dataset: ${chosen.name}  (${fmtBytes(chosen.bytes)})`)
  );
  console.log(kleur.gray(`File:    ${csvPath}`));
  console.log(
    kleur.gray(
      `Range:   ${series[0].date} -> ${series.at(-1)!.date} (${series.length.toLocaleString("en-US")} days)`
    )
  );
  console.log(
    kleur.gray(
      `Price:   $${fmtNum(series[0].price)} -> $${fmtNum(series.at(-1)!.price)}`
    )
  );
  console.log(
    kleur.gray(
      `Init:    initialBTC=${cfg.initialBTC}  initialUSD=$${fmtNum(cfg.initialUSD)}`
    )
  );
  console.log(
    kleur.gray(
      `Debt:    APR=${fmtNum(cfg.apr * 100)}%  maxDebtPct=${cfg.maxDebtPct}  band=${cfg.band}`
    )
  );
  console.log(
    kleur.gray(
      `Fees:    sat/vB=${cfg.satPerVb}  vbytes=${cfg.vbytesPerTx}  txBorrow=${cfg.txBorrow}  txRepay=${cfg.txRepay}`
    )
  );
  console.log(
    kleur.gray(
      `DCA:     includeFees=${dcaOpts.includeFees}  dcaTxCount=${dcaOpts.dcaTxCount}`
    )
  );

  const debtResults = FREQUENCIES.map((f: Frequency) =>
    simulateDebtStrategy(series, cfg, f)
  );
  const debtRows = buildDebtReportRows(debtResults);
  const headRows = buildHeadToHeadRows(series, cfg, debtResults, dcaOpts);
  const crossRows = buildDcaCrossRows(series, cfg, debtResults, dcaOpts);

  printTable(
    "Debt Strategy Report",
    [
      {
        label: "Freq",
        align: "left",
        cell: (r: any) => kleur.cyan(String(r.freq)),
      },
      { label: "BTC", align: "right", cell: (r: any) => fmtBTC(r.btcFinal) },
      {
        label: "Final $",
        align: "right",
        cell: (r: any) => fmtInt(r.finalValueUSD),
      },
      {
        label: "Debt $",
        align: "right",
        cell: (r: any) => fmtInt(r.debtFinal),
      },
      {
        label: "Net $",
        align: "right",
        cell: (r: any) => fmtInt(r.netValueUSD),
      },
      {
        label: "External $",
        align: "right",
        cell: (r: any) => fmtInt(r.externalTotalUSD),
      },
      {
        label: "Interest $",
        align: "right",
        cell: (r: any) => fmtInt(r.interestUSD),
      },
      {
        label: "Principal $",
        align: "right",
        cell: (r: any) => fmtInt(r.principalUSD),
      },
      { label: "Fees $", align: "right", cell: (r: any) => fmtInt(r.feesUSD) },
      { label: "Borrows", align: "right", cell: (r: any) => fmtInt(r.borrows) },
      { label: "Repays", align: "right", cell: (r: any) => fmtInt(r.repays) },
    ],
    debtRows
  );

  printTable(
    "Head-to-Head (Debt vs DCA same freq)",
    [
      {
        label: "Freq",
        align: "left",
        cell: (r: any) => kleur.cyan(String(r.freq)),
      },
      {
        label: "Debt BTC",
        align: "right",
        cell: (r: any) => fmtBTC(r.debtBTC),
      },
      { label: "DCA BTC", align: "right", cell: (r: any) => fmtBTC(r.dcaBTC) },
      {
        label: "Δ BTC",
        align: "right",
        cell: (r: any) => {
          const v = r.deltaBTC as number;
          const s = fmtBTC(v);
          return v > 0 ? kleur.green(s) : v < 0 ? kleur.red(s) : s;
        },
      },
      {
        label: "Debt Net $",
        align: "right",
        cell: (r: any) => fmtInt(r.debtNetUSD),
      },
      {
        label: "DCA $",
        align: "right",
        cell: (r: any) => fmtInt(r.dcaValueUSD),
      },
      {
        label: "Δ Net $",
        align: "right",
        cell: (r: any) => {
          const v = r.deltaNetUSD as number;
          const s = fmtInt(v);
          return v > 0 ? kleur.green(s) : v < 0 ? kleur.red(s) : s;
        },
      },
      {
        label: "External $",
        align: "right",
        cell: (r: any) => fmtInt(r.externalUSD),
      },
      {
        label: "DCA Fees $",
        align: "right",
        cell: (r: any) => fmtInt(r.dcaFeesUSD),
      },
    ],
    headRows
  );

  printTable(
    "DCA Cross-Table (budget from Debt Freq)",
    [
      {
        label: "Debt Freq",
        align: "left",
        cell: (r: any) => kleur.cyan(String(r.debtFreq)),
      },
      { label: "DCA Freq", align: "left", cell: (r: any) => String(r.dcaFreq) },
      {
        label: "Budget $",
        align: "right",
        cell: (r: any) => fmtInt(r.budgetUSD),
      },
      {
        label: "DCA BTC",
        align: "right",
        cell: (r: any) => fmtBTC(r.dcaBTCFinal),
      },
      { label: "Buys", align: "right", cell: (r: any) => fmtInt(r.dcaBuys) },
      {
        label: "Fees $",
        align: "right",
        cell: (r: any) => fmtInt(r.dcaFeesUSD),
      },
      {
        label: "Final $",
        align: "right",
        cell: (r: any) => fmtInt(r.dcaValueFinalUSD),
      },
    ],
    crossRows
  );
}

// Nice error output
main().catch((err) => {
  console.error(kleur.red(`\nError: ${err?.message ?? String(err)}`));
  process.exit(1);
});
