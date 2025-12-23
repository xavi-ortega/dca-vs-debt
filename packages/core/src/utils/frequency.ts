import type { Frequency } from "../types/common.js";

export const FREQUENCIES: Frequency[] = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
];

export function isRebalanceDay(freq: Frequency, isoDate: string): boolean {
  const d = new Date(isoDate + "T00:00:00Z");

  if (freq === "daily") return true;
  if (freq === "weekly") return d.getUTCDay() === 1; // Monday
  if (freq === "monthly") return d.getUTCDate() === 1;
  if (freq === "quarterly") {
    const m = d.getUTCMonth() + 1;
    return d.getUTCDate() === 1 && [1, 4, 7, 10].includes(m);
  }
  if (freq === "yearly") return d.getUTCDate() === 1 && d.getUTCMonth() === 0;

  return false;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildRebalanceSchedule(
  series: { date: string }[],
  freq: Frequency,
): number[] {
  if (!series.length) return [];

  const toTs = (iso: string) => new Date(iso + "T00:00:00Z").getTime();
  const tsList = series
    .map((s, idx) => ({ date: s.date, ts: toTs(s.date), idx }))
    .sort((a, b) => a.ts - b.ts);
  const startTs = tsList[0].ts;
  const endTs = tsList[tsList.length - 1].ts;

  const findClosestIndex = (target: number, floorIdx: number): number => {
    let lo = 0;
    let hi = tsList.length - 1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const midTs = tsList[mid].ts;
      if (midTs === target) return mid;
      if (midTs < target) lo = mid + 1;
      else hi = mid - 1;
    }
    const candidates: { idx: number; ts: number }[] = [];
    if (lo < tsList.length) candidates.push({ idx: lo, ts: tsList[lo].ts });
    if (hi >= 0) candidates.push({ idx: hi, ts: tsList[hi].ts });
    if (!candidates.length) return floorIdx;
    candidates.sort((a, b) => Math.abs(a.ts - target) - Math.abs(b.ts - target));
    return Math.max(candidates[0].idx, floorIdx);
  };

  const schedule: number[] = [];
  let lastIdx = 0;

  const addMonths = (d: Date, months: number) => {
    const nd = new Date(d.getTime());
    nd.setUTCMonth(nd.getUTCMonth() + months, 1);
    return nd;
  };

  switch (freq) {
    case "daily":
      for (let t = startTs; t <= endTs; t += DAY_MS) {
        const idx = findClosestIndex(t, lastIdx);
        schedule.push(idx);
        lastIdx = idx;
      }
      break;
    case "weekly":
      for (let t = startTs; t <= endTs; t += 7 * DAY_MS) {
        const idx = findClosestIndex(t, lastIdx);
        schedule.push(idx);
        lastIdx = idx;
      }
      break;
    case "monthly": {
      let cursor = new Date(startTs);
      while (cursor.getTime() <= endTs) {
        const idx = findClosestIndex(cursor.getTime(), lastIdx);
        schedule.push(idx);
        lastIdx = idx;
        cursor = addMonths(cursor, 1);
      }
      break;
    }
    case "quarterly": {
      let cursor = new Date(startTs);
      while (cursor.getTime() <= endTs) {
        const idx = findClosestIndex(cursor.getTime(), lastIdx);
        schedule.push(idx);
        lastIdx = idx;
        cursor = addMonths(cursor, 3);
      }
      break;
    }
    case "yearly": {
      let cursor = new Date(startTs);
      while (cursor.getTime() <= endTs) {
        const idx = findClosestIndex(cursor.getTime(), lastIdx);
        schedule.push(idx);
        lastIdx = idx;
        cursor.setUTCFullYear(cursor.getUTCFullYear() + 1);
      }
      break;
    }
  }

  return schedule;
}

export function buildRebalanceDates(
  series: { date: string }[],
  freq: Frequency,
): Set<string> {
  const schedule = buildRebalanceSchedule(series, freq);
  const dates = new Set<string>();
  schedule.forEach((idx) => {
    const d = series[idx]?.date;
    if (d) dates.add(d);
  });
  return dates;
}
