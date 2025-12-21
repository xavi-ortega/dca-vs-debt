import type { Frequency } from "@bitcoin-strategy/core";

export const FREQ_ORDER: Frequency[] = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
];

export const freqLabel: Record<Frequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export const freqColor: Record<Frequency, string> = {
  daily: "var(--color-chart-1)",
  weekly: "var(--color-chart-2)",
  monthly: "var(--color-chart-3)",
  quarterly: "var(--color-chart-4)",
  yearly: "var(--color-chart-5)",
};

export function sortByFrequency<T extends { freq: Frequency }>(
  rows: T[] | null | undefined,
): T[] {
  if (!rows) return [];
  const order = new Map(FREQ_ORDER.map((f, i) => [f, i]));
  return [...rows].sort(
    (a, b) => (order.get(a.freq) ?? 0) - (order.get(b.freq) ?? 0),
  );
}
