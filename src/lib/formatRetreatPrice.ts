export function formatRetreatPrice(price: string | number | undefined | null): string {
  if (price === undefined || price === null || price === '') return '0';
  if (typeof price === 'number' && Number.isFinite(price)) return price.toLocaleString();
  const raw = String(price).trim();
  if (/^\d+$/.test(raw)) return Number(raw).toLocaleString();
  return raw;
}

export function formatRetreatPriceWithSymbol(price: string | number | undefined | null): string {
  const formatted = formatRetreatPrice(price);
  const raw = String(price ?? '').trim();
  const isNumeric = typeof price === 'number' || /^\d+$/.test(raw);
  return isNumeric ? `₮${formatted}` : formatted;
}
