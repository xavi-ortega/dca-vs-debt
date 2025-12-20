import type { CliArgs } from "./types.js";

export function parseArgs(argv: string[]): CliArgs {
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

