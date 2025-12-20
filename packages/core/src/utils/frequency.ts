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

