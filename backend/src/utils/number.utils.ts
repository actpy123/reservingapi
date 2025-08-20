export function toNumber(value: any): number {
  const num = typeof value === 'number' ? value : parseInt(value, 10);

  if (isNaN(num)) {
    throw new Error(`Invalid number: ${value}`);
  }

  return num;
}
