import type { SeriesPoint } from "../types/common.js";

export function filterRange(
  series: SeriesPoint[],
  start: string | null,
  end: string | null,
): SeriesPoint[] {
  let out = series;
  if (start) out = out.filter((x) => x.date >= start);
  if (end) out = out.filter((x) => x.date <= end);

  if (out.length < 10) {
    throw new Error(
      `Filtered range too short. start=${start} end=${end} -> ${out.length} rows`,
    );
  }
  return out;
}

