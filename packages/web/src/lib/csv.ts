import Papa from "papaparse";
import type { SeriesPoint } from "@dca-vs-debt/core";

export async function fetchCsvSeries(url: string): Promise<SeriesPoint[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch CSV: ${url} (${res.status})`);
  const text = await res.text();

  const parsePrice = (raw: string | number | undefined): number | null => {
    if (raw === undefined) return null;
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Common USD-style: strip currency symbols and thousands separators.
    const cleaned = trimmed.replace(/[$€£,\s]/g, "");
    const num = Number(cleaned);
    if (Number.isFinite(num)) return num;

    // Fallback for EU-style decimals (e.g., 6.849,09).
    const euroClean = cleaned.replace(/\./g, "").replace(/,/g, ".");
    const numEuro = Number(euroClean);
    return Number.isFinite(numEuro) ? numEuro : null;
  };

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: ",",
  });
  if (parsed.errors?.length) throw new Error(parsed.errors[0].message);

  const rows = parsed.data;

  const series: SeriesPoint[] = rows
    .map((r) => {
      const dateRaw = r.Start || r.Date || r.date || r.End;
      const priceRaw = r.Close || r.close || r.Price || r.price;
      if (!dateRaw || !priceRaw) return null;

      const d = new Date(dateRaw);
      if (Number.isNaN(d.getTime())) return null;

      const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
        d.getUTCDate(),
      ).padStart(2, "0")}`;

      const price = parsePrice(priceRaw);
      if (price === null || price <= 0) return null;

      return { date: iso, price };
    })
    .filter((x): x is SeriesPoint => Boolean(x))
    .sort((a, b) => a.date.localeCompare(b.date));


  console.log("Fetched CSV series:", { url, length: series.length });

  if (series.length < 10) throw new Error("CSV parsed series too short.");
  return series;
}
