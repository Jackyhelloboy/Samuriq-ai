export function csvCell(value) {
  let text = String(value ?? '');
  // Spreadsheet applications can ignore leading whitespace before a formula.
  if (/^(?:[\s\x00-\x1f]*[=+@-]|[\t\r\n])/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
