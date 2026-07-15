/**
 * Converts a 1-based row index to a spreadsheet-style letter label: 1 -> A, 26 -> Z, 27 -> AA.
 * Supports layouts beyond 26 rows without any special-casing at the call site.
 */
export function rowLabel(index: number): string {
  let label = '';
  let n = index;

  while (n > 0) {
    const remainder = (n - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    n = Math.floor((n - 1) / 26);
  }

  return label;
}
