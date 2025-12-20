import React, { useMemo, useState } from "react";
import Papa from "papaparse";
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

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

type DebtRow = ReturnType<typeof buildDebtReportRows>[number];
type HeadRow = ReturnType<typeof buildHeadToHeadRows>[number];
type CrossRow = ReturnType<typeof buildDcaCrossRows>[number];

const fmtInt = (n: number) =>
  Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "NaN";
const fmtNum = (n: number, d = 2) =>
  Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      })
    : "NaN";
const fmtBTC = (n: number) => {
  const a = Math.abs(n);
  const d = a >= 100 ? 4 : a >= 1 ? 6 : 8;
  return fmtNum(n, d);
};

async function fetchCsvSeries(url: string): Promise<SeriesPoint[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch CSV: ${url} (${res.status})`);
  const text = await res.text();

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: ",",
  });
  if (parsed.errors?.length) throw new Error(parsed.errors[0].message);

  const rows = parsed.data;

  // Supports your format: Start/End + Close
  const series: SeriesPoint[] = rows
    .map((r) => {
      const dateRaw = r.Start || r.Date || r.date || r.End;
      const priceRaw = r.Close || r.close || r.Price || r.price;
      if (!dateRaw || !priceRaw) return null;

      const d = new Date(dateRaw);
      if (Number.isNaN(d.getTime())) return null;

      const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
        d.getUTCDate()
      ).padStart(2, "0")}`;

      const price = Number(priceRaw);
      if (!Number.isFinite(price) || price <= 0) return null;

      return { date: iso, price };
    })
    .filter((x): x is SeriesPoint => Boolean(x))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (series.length < 10) throw new Error("CSV parsed series too short.");
  return series;
}

function DataTable<T extends Record<string, any>>(props: {
  columns: {
    key: keyof T;
    label: string;
    align?: "left" | "right";
    render?: (row: T) => React.ReactNode;
  }[];
  rows: T[];
}) {
  const { columns, rows } = props;
  return (
    <div className="w-full overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((c) => (
              <th
                key={String(c.key)}
                className={`px-3 py-2 font-medium ${c.align === "right" ? "text-right" : "text-left"}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="border-t">
              {columns.map((c) => (
                <td
                  key={String(c.key)}
                  className={`px-3 py-2 ${c.align === "right" ? "text-right tabular-nums" : "text-left"}`}
                >
                  {c.render ? c.render(r) : String(r[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const datasets = useMemo(
    () => [
      {
        id: "btc_2010_2025",
        label: "BTC daily (2010-07-17 → 2025-12-20)",
        url: "/datasets/bitcoin_2010-07-17_2025-12-20.csv",
      },
      // Add more files later:
      // { id: "btc_2020_2025", label: "BTC daily (2020-01-01 → 2025-12-20)", url: "/data/bitcoin_2020-01-01_2025-12-20.csv" },
    ],
    []
  );

  const [darkMode, setDarkMode] = useState(false);

  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? "");
  const dataset = datasets.find((d) => d.id === datasetId)!;

  const [rawSeries, setRawSeries] = useState<SeriesPoint[] | null>(null);
  const [status, setStatus] = useState<string>(
    "Select a dataset and click Load."
  );

  // Inputs
  const [start, setStart] = useState("2023-01-01");
  const [end, setEnd] = useState("2025-12-20");

  const [initialBTC, setInitialBTC] = useState(0);
  const [initialUSD, setInitialUSD] = useState(25000);

  const [apr, setApr] = useState(0.04);
  const [maxDebtPct, setMaxDebtPct] = useState(0.15);
  const [band, setBand] = useState(0.02);

  const [satPerVb, setSatPerVb] = useState(20);
  const [vbytesPerTx, setVbytesPerTx] = useState(180);
  const [txBorrow, setTxBorrow] = useState(1);
  const [txRepay, setTxRepay] = useState(1);

  const [includeDcaFees, setIncludeDcaFees] = useState(true);

  const [activeTab, setActiveTab] = useState<"debt" | "head" | "cross">("debt");
  const [debtRows, setDebtRows] = useState<DebtRow[] | null>(null);
  const [headRows, setHeadRows] = useState<HeadRow[] | null>(null);
  const [crossRows, setCrossRows] = useState<CrossRow[] | null>(null);

  const cfg: CoreConfig = useMemo(
    () => ({
      initialBTC: Number(initialBTC),
      initialUSD: Number(initialUSD),

      apr: Number(apr),
      maxDebtPct: Number(maxDebtPct),
      band: Number(band),

      payInterestDaily: true,
      borrowToMax: true,

      satPerVb: Number(satPerVb),
      vbytesPerTx: Number(vbytesPerTx),
      txBorrow: Number(txBorrow),
      txRepay: Number(txRepay),
    }),
    [
      initialBTC,
      initialUSD,
      apr,
      maxDebtPct,
      band,
      satPerVb,
      vbytesPerTx,
      txBorrow,
      txRepay,
    ]
  );

  // Apply dark mode to <html>
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  async function loadDataset() {
    try {
      setStatus("Loading CSV…");
      setRawSeries(null);
      setDebtRows(null);
      setHeadRows(null);
      setCrossRows(null);

      const series = await fetchCsvSeries(dataset.url);
      setRawSeries(series);

      setStatus(
        `Loaded ${series.length.toLocaleString("en-US")} rows (${series[0].date} → ${series.at(-1)!.date}).`
      );
    } catch (e: any) {
      setStatus(`Error: ${String(e?.message ?? e)}`);
      setRawSeries(null);
    }
  }

  function runBacktest() {
    if (!rawSeries) return;

    try {
      const series = filterRange(rawSeries, start || null, end || null);

      const debtResults = FREQUENCIES.map((f: Frequency) =>
        simulateDebtStrategy(series, cfg, f)
      );
      const debt = buildDebtReportRows(debtResults);
      const head = buildHeadToHeadRows(series, cfg, debtResults, {
        includeFees: includeDcaFees,
        dcaTxCount: 1,
      });
      const cross = buildDcaCrossRows(series, cfg, debtResults, {
        includeFees: includeDcaFees,
        dcaTxCount: 1,
      });

      setDebtRows(debt);
      setHeadRows(head);
      setCrossRows(cross);

      setStatus(
        `Backtest ran on ${series.length.toLocaleString("en-US")} days (${series[0].date} → ${series.at(-1)!.date}).`
      );
    } catch (e: any) {
      setStatus(`Error: ${String(e?.message ?? e)}`);
      setDebtRows(null);
      setHeadRows(null);
      setCrossRows(null);
    }
  }

  const canRun = Boolean(rawSeries);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Bitcoin Strategy Backtest
            </h1>
            <p className="text-sm text-muted-foreground">
              Dashboard UI (no backend). Debt strategy vs DCA with optional
              on-chain fees.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Dark</span>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>

            <Select value={datasetId} onValueChange={setDatasetId}>
              <SelectTrigger className="w-[320px]">
                <SelectValue placeholder="Select dataset" />
              </SelectTrigger>
              <SelectContent>
                {datasets.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="secondary" onClick={loadDataset}>
              Load
            </Button>

            <Button onClick={runBacktest} disabled={!canRun}>
              Run
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-lg border bg-card px-4 py-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Status:</span>{" "}
            <span
              className={status.startsWith("Error:") ? "text-destructive" : ""}
            >
              {status}
            </span>
          </div>
        </div>

        {/* Top grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Range & Capital</CardTitle>
              <CardDescription>
                Subset the series and define initial allocation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start</Label>
                  <Input
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End</Label>
                  <Input
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>initialUSD</Label>
                  <Input
                    type="number"
                    value={initialUSD}
                    onChange={(e) => setInitialUSD(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>initialBTC</Label>
                  <Input
                    type="number"
                    value={initialBTC}
                    onChange={(e) => setInitialBTC(Number(e.target.value))}
                  />
                </div>
              </div>

              {rawSeries && (
                <div className="text-xs text-muted-foreground">
                  Loaded: {rawSeries.length.toLocaleString("en-US")} rows ·
                  First {rawSeries[0].date} @ ${fmtNum(rawSeries[0].price)} ·
                  Last {rawSeries.at(-1)!.date} @ $
                  {fmtNum(rawSeries.at(-1)!.price)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Debt Policy</CardTitle>
              <CardDescription>
                LTV constraint via maxDebtPct + hysteresis band.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>APR</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={apr}
                    onChange={(e) => setApr(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>maxDebtPct</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={maxDebtPct}
                    onChange={(e) => setMaxDebtPct(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>band</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={band}
                    onChange={(e) => setBand(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                Rule intuition: “-70% crash ⇒ collateral ratio ≥ 200%”
                corresponds roughly to{" "}
                <span className="font-medium text-foreground">
                  maxDebtPct ≈ 0.15
                </span>
                .
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Fees</CardTitle>
              <CardDescription>
                Bitcoin L1 fee model + apply to DCA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>sat/vB</Label>
                  <Input
                    type="number"
                    value={satPerVb}
                    onChange={(e) => setSatPerVb(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>vbytes/tx</Label>
                  <Input
                    type="number"
                    value={vbytesPerTx}
                    onChange={(e) => setVbytesPerTx(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>txBorrow</Label>
                  <Input
                    type="number"
                    value={txBorrow}
                    onChange={(e) => setTxBorrow(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>txRepay</Label>
                  <Input
                    type="number"
                    value={txRepay}
                    onChange={(e) => setTxRepay(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <div className="text-sm font-medium">Apply fees to DCA</div>
                  <div className="text-xs text-muted-foreground">
                    Subtract on-chain fee from each periodic buy.
                  </div>
                </div>
                <Switch
                  checked={includeDcaFees}
                  onCheckedChange={setIncludeDcaFees}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="debt">Debt report</TabsTrigger>
              <TabsTrigger value="head">Head-to-head</TabsTrigger>
              <TabsTrigger value="cross">DCA cross</TabsTrigger>
            </TabsList>

            <TabsContent value="debt" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Debt Strategy</CardTitle>
                  <CardDescription>
                    Breakdown of external costs and resulting BTC exposure.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!debtRows ? (
                    <div className="text-sm text-muted-foreground">
                      Run the backtest to see results.
                    </div>
                  ) : (
                    <DataTable<DebtRow>
                      columns={[
                        { key: "freq", label: "Freq" },
                        {
                          key: "btcFinal",
                          label: "BTC",
                          align: "right",
                          render: (r) => fmtBTC(r.btcFinal),
                        },
                        {
                          key: "finalValueUSD",
                          label: "Final $",
                          align: "right",
                          render: (r) => fmtInt(r.finalValueUSD),
                        },
                        {
                          key: "debtFinal",
                          label: "Debt $",
                          align: "right",
                          render: (r) => fmtInt(r.debtFinal),
                        },
                        {
                          key: "netValueUSD",
                          label: "Net $",
                          align: "right",
                          render: (r) => fmtInt(r.netValueUSD),
                        },
                        {
                          key: "externalTotalUSD",
                          label: "External $",
                          align: "right",
                          render: (r) => fmtInt(r.externalTotalUSD),
                        },
                        {
                          key: "interestUSD",
                          label: "Interest $",
                          align: "right",
                          render: (r) => fmtInt(r.interestUSD),
                        },
                        {
                          key: "principalUSD",
                          label: "Principal $",
                          align: "right",
                          render: (r) => fmtInt(r.principalUSD),
                        },
                        {
                          key: "feesUSD",
                          label: "Fees $",
                          align: "right",
                          render: (r) => fmtInt(r.feesUSD),
                        },
                        {
                          key: "borrows",
                          label: "Borrows",
                          align: "right",
                          render: (r) => fmtInt(r.borrows),
                        },
                        {
                          key: "repays",
                          label: "Repays",
                          align: "right",
                          render: (r) => fmtInt(r.repays),
                        },
                      ]}
                      rows={debtRows}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="head" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Debt vs DCA (same frequency)</CardTitle>
                  <CardDescription>
                    Compare BTC and net USD value using the same schedule.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!headRows ? (
                    <div className="text-sm text-muted-foreground">
                      Run the backtest to see results.
                    </div>
                  ) : (
                    <DataTable<HeadRow>
                      columns={[
                        { key: "freq", label: "Freq" },
                        {
                          key: "debtBTC",
                          label: "Debt BTC",
                          align: "right",
                          render: (r) => fmtBTC(r.debtBTC),
                        },
                        {
                          key: "dcaBTC",
                          label: "DCA BTC",
                          align: "right",
                          render: (r) => fmtBTC(r.dcaBTC),
                        },
                        {
                          key: "deltaBTC",
                          label: "Δ BTC",
                          align: "right",
                          render: (r) => fmtBTC(r.deltaBTC),
                        },
                        {
                          key: "debtNetUSD",
                          label: "Debt Net $",
                          align: "right",
                          render: (r) => fmtInt(r.debtNetUSD),
                        },
                        {
                          key: "dcaValueUSD",
                          label: "DCA $",
                          align: "right",
                          render: (r) => fmtInt(r.dcaValueUSD),
                        },
                        {
                          key: "deltaNetUSD",
                          label: "Δ Net $",
                          align: "right",
                          render: (r) => fmtInt(r.deltaNetUSD),
                        },
                        {
                          key: "externalUSD",
                          label: "External $",
                          align: "right",
                          render: (r) => fmtInt(r.externalUSD),
                        },
                        {
                          key: "dcaFeesUSD",
                          label: "DCA Fees $",
                          align: "right",
                          render: (r) => fmtInt(r.dcaFeesUSD),
                        },
                      ]}
                      rows={headRows}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cross" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>DCA Cross Table</CardTitle>
                  <CardDescription>
                    For each debt frequency budget, compare multiple DCA
                    schedules.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!crossRows ? (
                    <div className="text-sm text-muted-foreground">
                      Run the backtest to see results.
                    </div>
                  ) : (
                    <DataTable<CrossRow>
                      columns={[
                        { key: "debtFreq", label: "Debt Freq" },
                        { key: "dcaFreq", label: "DCA Freq" },
                        {
                          key: "budgetUSD",
                          label: "Budget $",
                          align: "right",
                          render: (r) => fmtInt(r.budgetUSD),
                        },
                        {
                          key: "dcaBTCFinal",
                          label: "DCA BTC",
                          align: "right",
                          render: (r) => fmtBTC(r.dcaBTCFinal),
                        },
                        {
                          key: "dcaBuys",
                          label: "Buys",
                          align: "right",
                          render: (r) => fmtInt(r.dcaBuys),
                        },
                        {
                          key: "dcaFeesUSD",
                          label: "Fees $",
                          align: "right",
                          render: (r) => fmtInt(r.dcaFeesUSD),
                        },
                        {
                          key: "dcaValueFinalUSD",
                          label: "Final $",
                          align: "right",
                          render: (r) => fmtInt(r.dcaValueFinalUSD),
                        },
                      ]}
                      rows={crossRows}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-10 text-xs text-muted-foreground">
          Tip: keep datasets in <code>packages/web/public/data</code> and
          reference them as <code>/data/&lt;file&gt;.csv</code>.
        </div>
      </div>
    </div>
  );
}
