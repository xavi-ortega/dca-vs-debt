import React, { useMemo, useState } from "react";
import Papa from "papaparse";
import {
  FREQUENCIES,
  filterRange,
  simulateDebtStrategy,
  buildDebtReportRows,
  buildHeadToHeadRows,
  type CoreConfig,
  type SeriesPoint,
  type Frequency,
} from "@bitcoin-strategy/core";

type DebtRow = ReturnType<typeof buildDebtReportRows>[number];
type HeadRow = ReturnType<typeof buildHeadToHeadRows>[number];

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

function Table<T extends Record<string, any>>({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: {
    key: keyof T;
    label: string;
    align?: "left" | "right";
    render?: (row: T) => React.ReactNode;
  }[];
  rows: T[];
}) {
  return (
    <div style={{ marginTop: 18 }}>
      <h2 style={{ margin: "10px 0" }}>{title}</h2>
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 10,
          overflowX: "auto",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
        >
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={String(c.key)}
                  style={{
                    textAlign: c.align ?? "left",
                    padding: 10,
                    borderBottom: "1px solid #eee",
                  }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                {columns.map((c) => (
                  <td
                    key={String(c.key)}
                    style={{
                      textAlign: c.align ?? "left",
                      padding: 10,
                      borderBottom: "1px solid #f3f3f3",
                    }}
                  >
                    {c.render ? c.render(r) : String(r[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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

  // Your CSV columns: Start, End, Open, High, Low, Close, Volume, Market Cap
  const rows = parsed.data;

  const series: SeriesPoint[] = rows
    .map((r) => {
      const dateRaw = r.Start || r.Date || r.date || r.End;
      const priceRaw = r.Close || r.close || r.Price || r.price;
      if (!dateRaw || !priceRaw) return null;

      const d = new Date(dateRaw);
      if (Number.isNaN(d.getTime())) return null;

      const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

      const price = Number(priceRaw);
      if (!Number.isFinite(price) || price <= 0) return null;

      return { date: iso, price };
    })
    .filter((x): x is SeriesPoint => Boolean(x))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (series.length < 10) throw new Error("CSV parsed series too short.");
  return series;
}

export default function App() {
  // You can expand this list any time
  const datasets = useMemo(
    () => [
      {
        label: "BTC daily (2010-07-17 → 2025-12-20)",
        url: "/datasets/bitcoin_2010-07-17_2025-12-20.csv",
      },
    ],
    []
  );

  const [datasetUrl, setDatasetUrl] = useState(datasets[0]?.url ?? "");
  const [rawSeries, setRawSeries] = useState<SeriesPoint[] | null>(null);
  const [status, setStatus] = useState<string>("");

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

  const [debtRows, setDebtRows] = useState<DebtRow[] | null>(null);
  const [headRows, setHeadRows] = useState<HeadRow[] | null>(null);

  async function loadDataset() {
    try {
      setStatus("Loading CSV…");
      setDebtRows(null);
      setHeadRows(null);

      const series = await fetchCsvSeries(datasetUrl);
      setRawSeries(series);

      setStatus(
        `Loaded ${series.length.toLocaleString("en-US")} rows (${series[0].date} → ${series.at(-1)!.date})`
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

      setDebtRows(debt);
      setHeadRows(head);

      setStatus(
        `Ran backtest on ${series.length.toLocaleString("en-US")} days (${series[0].date} → ${series.at(-1)!.date})`
      );
    } catch (e: any) {
      setStatus(`Error: ${String(e?.message ?? e)}`);
      setDebtRows(null);
      setHeadRows(null);
    }
  }

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: 20,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto",
      }}
    >
      <h1 style={{ margin: "8px 0" }}>Bitcoin Strategy Backtest</h1>
      <div style={{ color: "#555", marginBottom: 14 }}>
        Static UI (no backend). Uses <code>@bitcoin-strategy/core</code>.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div
          style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}
        >
          <h3 style={{ marginTop: 0 }}>Dataset</h3>

          <select
            value={datasetUrl}
            onChange={(e) => setDatasetUrl(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          >
            {datasets.map((d) => (
              <option key={d.url} value={d.url}>
                {d.label}
              </option>
            ))}
          </select>

          <button
            onClick={loadDataset}
            style={{
              marginTop: 10,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #111",
            }}
          >
            Load
          </button>

          {rawSeries && (
            <div style={{ marginTop: 10, fontSize: 13, color: "#333" }}>
              First: {rawSeries[0].date} @ ${fmtNum(rawSeries[0].price)} <br />
              Last: {rawSeries.at(-1)!.date} @ $
              {fmtNum(rawSeries.at(-1)!.price)}
            </div>
          )}
        </div>

        <div
          style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}
        >
          <h3 style={{ marginTop: 0 }}>Run</h3>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <label>
              Start
              <input
                value={start}
                onChange={(e) => setStart(e.target.value)}
                style={{ width: "100%", padding: 8 }}
              />
            </label>
            <label>
              End
              <input
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                style={{ width: "100%", padding: 8 }}
              />
            </label>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginTop: 10,
            }}
          >
            <label>
              initialUSD
              <input
                type="number"
                value={initialUSD}
                onChange={(e) => setInitialUSD(Number(e.target.value))}
                style={{ width: "100%", padding: 8 }}
              />
            </label>
            <label>
              initialBTC
              <input
                type="number"
                value={initialBTC}
                onChange={(e) => setInitialBTC(Number(e.target.value))}
                style={{ width: "100%", padding: 8 }}
              />
            </label>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              marginTop: 10,
            }}
          >
            <label>
              APR
              <input
                type="number"
                step="0.001"
                value={apr}
                onChange={(e) => setApr(Number(e.target.value))}
                style={{ width: "100%", padding: 8 }}
              />
            </label>
            <label>
              maxDebtPct
              <input
                type="number"
                step="0.01"
                value={maxDebtPct}
                onChange={(e) => setMaxDebtPct(Number(e.target.value))}
                style={{ width: "100%", padding: 8 }}
              />
            </label>
            <label>
              band
              <input
                type="number"
                step="0.01"
                value={band}
                onChange={(e) => setBand(Number(e.target.value))}
                style={{ width: "100%", padding: 8 }}
              />
            </label>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              marginTop: 10,
            }}
          >
            <label>
              sat/vB
              <input
                type="number"
                value={satPerVb}
                onChange={(e) => setSatPerVb(Number(e.target.value))}
                style={{ width: "100%", padding: 8 }}
              />
            </label>
            <label>
              vbytes/tx
              <input
                type="number"
                value={vbytesPerTx}
                onChange={(e) => setVbytesPerTx(Number(e.target.value))}
                style={{ width: "100%", padding: 8 }}
              />
            </label>
            <label>
              DCA fees?
              <div>
                <input
                  type="checkbox"
                  checked={includeDcaFees}
                  onChange={(e) => setIncludeDcaFees(e.target.checked)}
                />
              </div>
            </label>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginTop: 10,
            }}
          >
            <label>
              txBorrow
              <input
                type="number"
                value={txBorrow}
                onChange={(e) => setTxBorrow(Number(e.target.value))}
                style={{ width: "100%", padding: 8 }}
              />
            </label>
            <label>
              txRepay
              <input
                type="number"
                value={txRepay}
                onChange={(e) => setTxRepay(Number(e.target.value))}
                style={{ width: "100%", padding: 8 }}
              />
            </label>
          </div>

          <button
            disabled={!rawSeries}
            onClick={runBacktest}
            style={{
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #111",
              background: rawSeries ? "#111" : "#aaa",
              color: "white",
              cursor: rawSeries ? "pointer" : "not-allowed",
            }}
          >
            Run backtest
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          color: status.startsWith("Error") ? "crimson" : "#333",
        }}
      >
        {status}
      </div>

      {debtRows && (
        <Table<DebtRow>
          title="Debt Strategy Report"
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
          ]}
          rows={debtRows}
        />
      )}

      {headRows && (
        <Table<HeadRow>
          title="Head-to-Head (Debt vs DCA same freq)"
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
    </div>
  );
}
