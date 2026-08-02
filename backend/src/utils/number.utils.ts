export function toNumber(value: any): number {
  const num = typeof value === 'number' ? value : parseInt(value, 10);

  if (isNaN(num)) {
    throw new Error(`Invalid number: ${value}`);
  }

  return num;
}

export function percentToDecimal(value: string | number): number {
  const num =
    typeof value === 'string'
      ? parseFloat(value.replace('%', ''))
      : Number(value);

  if (isNaN(num)) {
    return 0;
  }

  // Already a decimal percentage (0.25 = 25%)
  if (num >= 0 && num <= 1) {
    return num;
  }

  return num / 100;
}