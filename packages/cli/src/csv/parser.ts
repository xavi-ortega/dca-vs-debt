export function parseCSV(text: string): {
  header: string[];
  rows: Record<string, string>[];
} {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV file too short.");

  const header = lines[0].split(",").map((s) => s.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts.length !== header.length) continue;

    const obj: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) obj[header[j]] = parts[j].trim();
    rows.push(obj);
  }
  return { header, rows };
}
