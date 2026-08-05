const currencyFormatter = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatMoney(value: number): string {
  return currencyFormatter.format(value);
}

export function formatMoneyCompact(value: number): string {
  return compactCurrencyFormatter.format(value);
}

/** Convierte "12,111.11", "$2,482.94", " - ", "$-" a número. */
export function parseExcelNumber(value: unknown): number {
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const s = value.trim();
  if (!s || s === '-' || s === '$-' || s === '#N/A' || s === '\\#N/A') return 0;
  const cleaned = s.replace(/[^0-9.\-]/g, '');
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : 0;
}
