export function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(rows, headers) {
  const headerLine = headers.map((h) => csvEscape(h.label)).join(",");
  const lines = rows.map((row) =>
    headers.map((h) => csvEscape(typeof h.value === "function" ? h.value(row) : row[h.value])).join(",")
  );

  // UTF-8 BOM makes Thai text display correctly in Microsoft Excel.
  return `\uFEFF${[headerLine, ...lines].join("\n")}`;
}
