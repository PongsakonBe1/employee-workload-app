export function normalizeFiscalYear(input) {
  const year = Number(input);

  if (!Number.isInteger(year)) {
    throw new Error("Fiscal year must be an integer");
  }

  // Thailand often stores fiscal years in Buddhist Era.
  // FY 2569 corresponds to Gregorian FY ending in 2026.
  if (year >= 2400) {
    return year - 543;
  }

  return year;
}

export function getFiscalYearRange(input) {
  const gregorianFiscalYear = normalizeFiscalYear(input);
  const start = new Date(Date.UTC(gregorianFiscalYear - 1, 9, 1, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(gregorianFiscalYear, 9, 1, 0, 0, 0));

  return {
    gregorianFiscalYear,
    buddhistFiscalYear: gregorianFiscalYear + 543,
    start,
    endExclusive,
    startDate: start.toISOString().slice(0, 10),
    endDateInclusive: new Date(endExclusive.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  };
}

export function parseDateOnly(value) {
  if (!value) return null;
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error("Date must use YYYY-MM-DD format");
  }

  return new Date(`${text}T00:00:00.000Z`);
}
