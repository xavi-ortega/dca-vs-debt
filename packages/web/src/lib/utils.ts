import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatting utilities
export const fmtInt = (n: number) =>
  Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "NaN";

export const fmtNum = (n: number, d = 2) =>
  Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      })
    : "NaN";

export const fmtBTC = (n: number) => {
  const a = Math.abs(n);
  const d = a >= 100 ? 4 : a >= 1 ? 6 : 8;
  return fmtNum(n, d);
};
