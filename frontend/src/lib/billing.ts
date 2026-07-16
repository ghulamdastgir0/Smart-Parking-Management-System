export function estimateCost(hourlyRate: number, durationMinutes: number): number {
  const hours = Math.max(1, Math.ceil(durationMinutes / 60));
  return hourlyRate * hours;
}
