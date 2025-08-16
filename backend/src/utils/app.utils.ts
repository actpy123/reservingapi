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

  try {
    return typeof value === 'number' ? value : parseFloat(value);
  } catch {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.endsWith('%')) {
        const num = parseFloat(trimmed.replace('%', '').trim());
        return isNaN(num) ? 0 : num / 100;
      }
    }
    return 0;
  }
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
