export function detectColumns(header: string[]): {
  dateCol: string;
  priceCol: string;
} {
  const norm = (s: string) => s.toLowerCase().trim();
  const h = header.map(norm);

  const findAny = (candidates: string[]) => {
    for (const c of candidates) {
      const idx = h.indexOf(norm(c));
      if (idx !== -1) return header[idx];
    }
    for (const c of candidates) {
      const idx = h.findIndex((x) => x.includes(norm(c)));
      if (idx !== -1) return header[idx];
    }
    return null;
  };

  const dateCol = findAny([
    "date",
    "timestamp",
    "time",
    "datetime",
    "start",
    "end",
  ]);
  const priceCol = findAny(["close", "adj close", "price", "close_usd"]);

  if (!dateCol || !priceCol) {
    throw new Error(
      `Could not detect required columns.\nFound header: ${header.join(", ")}\nNeed date column (Start/End/Date/...) and price column (Close/Price/...).`
    );
  }
  return { dateCol, priceCol };
}

