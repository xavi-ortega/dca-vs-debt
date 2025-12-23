export function fmtNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "NaN";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtInt(n: number): string {
  if (!Number.isFinite(n)) return "NaN";
  return Math.round(n).toLocaleString("en-US");
}

export function fmtAsset(n: number): string {
  const abs = Math.abs(n);
  const digits = abs >= 100 ? 4 : abs >= 1 ? 6 : 8;
  return fmtNum(n, digits);
}
