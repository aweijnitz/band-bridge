export function parseSize(value: string): number {
  const trimmed = value.trim().toUpperCase();
  const match = trimmed.match(/^([0-9]*\.?[0-9]+)\s*(KB|MB|GB)?$/);
  if (!match) {
    throw new Error(`Invalid size: ${value}`);
  }
  const number = parseFloat(match[1]);
  const unit = match[2] || 'B';
  switch (unit) {
    case 'KB':
      return Math.floor(number * 1024);
    case 'MB':
      return Math.floor(number * 1024 ** 2);
    case 'GB':
      return Math.floor(number * 1024 ** 3);
    default:
      return Math.floor(number);
  }
}
