export function fmtBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let b = bytes;
  let u = 0;
  while (b >= 1024 && u < units.length - 1) {
    b /= 1024;
    u++;
  }
  return `${b.toFixed(u === 0 ? 0 : 1)} ${units[u]}`;
}
