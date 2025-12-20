import Papa from "papaparse";
import type { SeriesPoint } from "@bitcoin-strategy/core";

export async function fetchCsvSeries(url: string): Promise<SeriesPoint[]> {
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
