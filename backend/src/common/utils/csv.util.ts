// Minimal CSV parsing — house rules forbid adding a heavy csv dep for the two
// admin import endpoints, so we split by lines and commas manually. Handles
// CRLF/LF, blank lines, and simple double-quoted fields (with "" escaping).
// Not a full RFC-4180 parser: quoted fields spanning multiple physical lines
// are not supported (admin geo CSVs are one record per line).

export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out.map((f) => f.trim());
}
