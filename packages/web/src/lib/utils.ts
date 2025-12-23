import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatting utilities
const units = [
  { value: 1e24, suffix: "Sp" },
  { value: 1e21, suffix: "Sx" },
  { value: 1e18, suffix: "Qn" },
  { value: 1e15, suffix: "Qd" },
  { value: 1e12, suffix: "T" },
  { value: 1e9, suffix: "B" },
  { value: 1e6, suffix: "M" },
  { value: 1e3, suffix: "k" },
];

const formatWithUnits = (
  n: number,
  {
    prefix = "",
    suffix = "",
    smallMinFraction = 0,
    smallMaxFraction = 2,
  }: {
    prefix?: string;
    suffix?: string;
    smallMinFraction?: number;
    smallMaxFraction?: number;
  } = {},
) => {
  if (!Number.isFinite(n)) return "NaN";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  for (const unit of units) {
    if (abs >= unit.value) {
      const scaled = abs / unit.value;
      const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
      const formatted = scaled.toFixed(decimals).replace(/\.0$/, "");
      return `${sign}${prefix}${formatted}${unit.suffix}${suffix}`;
    }
  }

  const formattedSmall = abs.toLocaleString("en-US", {
    minimumFractionDigits: smallMinFraction,
    maximumFractionDigits: smallMaxFraction,
  });
  return `${sign}${prefix}${formattedSmall}${suffix}`;
};

export const fmtInt = (n: number) =>
  formatWithUnits(n, { smallMinFraction: 0, smallMaxFraction: 0 });

export const fmtNum = (n: number, d = 2) =>
  Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      })
    : "NaN";

export const fmtAsset = (n: number) =>
  formatWithUnits(n, {
    prefix: "",
    suffix: "",
    smallMinFraction: 2,
    smallMaxFraction: 6,
  });

export const fmtUSD = (n: number, minFraction = 0, maxFraction = 0) =>
  formatWithUnits(n, {
    prefix: "$",
    suffix: "",
    smallMinFraction: minFraction,
    smallMaxFraction: maxFraction,
  });
