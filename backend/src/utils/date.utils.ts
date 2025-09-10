import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

export function safeParseDate(dateStr: string): dayjs.Dayjs {
  const formats = ['DD-MMM-YYYY', 'DD-MMM-YY', 'DD-MM-YYYY', 'DD/MM/YYYY'];

  for (const fmt of formats) {
    const parsed = dayjs(dateStr, fmt, true); // strict parsing
    if (parsed.isValid()) {
      return parsed;
    }
  }

  throw new Error(`Date format not recognized: ${dateStr}`);
}
