export type DateTimeInputs = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
};

/**
 * Returns an empty set of segmented date inputs.
 */
export const createEmptyDateTimeInputs = (): DateTimeInputs => ({
  year: "",
  month: "",
  day: "",
  hour: "",
  minute: "",
});

/**
 * Keeps only numeric characters and trims the result to the provided length.
 */
export const sanitizeNumericInput = (value: string, maxLength: number): string =>
  value.replace(/\D/g, "").slice(0, maxLength);

/**
 * Builds a valid Date instance from text inputs or returns null when incomplete/invalid.
 */
export const buildDateFromInputs = (inputs: DateTimeInputs): Date | null => {
  const { year, month, day, hour, minute } = inputs;
  if (!year || !month || !day || !hour || !minute) {
    return null;
  }

  const yearNum = Number(year);
  const monthNum = Number(month);
  const dayNum = Number(day);
  const hourNum = Number(hour);
  const minuteNum = Number(minute);

  if (
    Number.isNaN(yearNum) ||
    Number.isNaN(monthNum) ||
    Number.isNaN(dayNum) ||
    Number.isNaN(hourNum) ||
    Number.isNaN(minuteNum)
  ) {
    return null;
  }

  const candidate = new Date(yearNum, monthNum - 1, dayNum, hourNum, minuteNum);

  const isValidDate =
    candidate.getFullYear() === yearNum &&
    candidate.getMonth() === monthNum - 1 &&
    candidate.getDate() === dayNum &&
    candidate.getHours() === hourNum &&
    candidate.getMinutes() === minuteNum;

  return isValidDate ? candidate : null;
};

/**
 * Converts an ISO date string into segmented date/time inputs.
 */
export const decomposeDateToInputs = (isoDate?: string | null): DateTimeInputs => {
  if (!isoDate) {
    return createEmptyDateTimeInputs();
  }

  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return createEmptyDateTimeInputs();
  }

  const pad = (value: number, digits: number) => value.toString().padStart(digits, "0");

  return {
    year: `${parsed.getFullYear()}`,
    month: pad(parsed.getMonth() + 1, 2),
    day: pad(parsed.getDate(), 2),
    hour: pad(parsed.getHours(), 2),
    minute: pad(parsed.getMinutes(), 2),
  };
};

