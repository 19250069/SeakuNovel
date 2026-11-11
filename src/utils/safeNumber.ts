/**
 * Safely format a numeric value that could be null, undefined, string, or number.
 * Prevents crashes like "average_rating?.toFixed is not a function".
 */
export function safeToFixed(value: unknown, decimals: number = 1): string {
  if (value === null || value === undefined) return '0.0';
  if (typeof value === 'number') return value.toFixed(decimals);
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? '0.0' : parsed.toFixed(decimals);
  }
  return '0.0';
}

/**
 * Safely parse a numeric value to a number.
 */
export function safeNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}