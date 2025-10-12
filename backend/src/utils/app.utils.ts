import AdmZip from 'adm-zip';

export function unzip(buffer: Buffer<ArrayBufferLike>) {
  try {
    const zip = new AdmZip(buffer);
    const extractedFiles = zip.getEntries().map((entry) => {
      return {
        fileName: entry.entryName,
        size: entry.header.size,
        content: entry.getData(), // Buffer of the file content
      };
    });

    return extractedFiles;
  } catch (err) {
    throw err;
  }
}

export function parsePercent(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
    return 0;
  }

  if (typeof value === 'number') {
    // If it's a number already between 0 and 1, return as-is
    // If it's 80, assume it's 80% → convert to 0.8
    return value > 1 ? value / 100 : value;
  }

  // Now handle string values
  const trimmed = value.trim();

  // Handle percent signs, e.g. "80%" → 0.8
  if (trimmed.endsWith('%')) {
    const num = parseFloat(trimmed.replace('%', '').trim());
    return isNaN(num) ? 0 : num / 100;
  }

  // Handle plain numbers in string form, e.g. "80" → 0.8
  const num = parseFloat(trimmed);
  if (isNaN(num)) {
    return 0;
  }

  // Always map string numbers to [0,1] range
  return num > 1 ? num / 100 : num;
}

export function toVariableName(key: string): string {
  // Case 1: If already PascalCase / camelCase
  if (/^[A-Za-z]+$/.test(key)) {
    return key.charAt(0).toLowerCase() + key.slice(1);
  }

  // Case 2: If key contains spaces, underscores, slashes, etc.
  return key
    .replace(/[^a-zA-Z0-9]+/g, ' ') // replace separators with space
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

export function getPremiumFrequencyValue(freq: string): number {
  switch (freq) {
    case 'Annual':
      return 1;
    case 'Half Yearly':
      return 2;
    case 'Quarterly':
      return 4;
    case 'Monthly':
      return 12;
    default:
      return 0;
  }
}
