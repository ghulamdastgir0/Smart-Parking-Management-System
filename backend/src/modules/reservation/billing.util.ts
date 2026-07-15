const MINUTES_PER_HOUR = 60;

/**
 * Hour-based billing with round-up: any partially used hour is charged as a full hour,
 * with a 1-hour minimum. E.g. 61 minutes -> 2 hours, 121 minutes -> 3 hours.
 */
export function roundUpHours(minutes: number): number {
  return Math.max(1, Math.ceil(minutes / MINUTES_PER_HOUR));
}

export function calculateBaseCharge(
  hourlyRate: number,
  durationMinutes: number,
): number {
  const hours = roundUpHours(durationMinutes);
  return Math.round(hourlyRate * hours * 100) / 100;
}
