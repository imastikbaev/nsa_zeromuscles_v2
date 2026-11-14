/** Display-only reference geometry for the educational catalog; not orbit propagation. */
export const referenceGeometry: Record<
  string,
  { inclination: number; eccentricity: number }
> = {
  leo: { inclination: 51.6, eccentricity: 0.001 },
  sso: { inclination: 97.6, eccentricity: 0.0012 },
  geo: { inclination: 0, eccentricity: 0.0001 },
  lunar: { inclination: 90, eccentricity: 0.002 },
  mars: { inclination: 93, eccentricity: 0.008 },
};
/** Reserve 25% headroom and round up to a readable scale, without clipping bars. */
export function allocationScale(values: number[]) {
  const peak = Math.max(1, ...values);
  const magnitude = 10 ** Math.floor(Math.log10(peak / 3));
  const step = Math.ceil(peak / 3 / magnitude) * magnitude;
  return { max: step * 4, ticks: [4, 3, 2, 1, 0].map((n) => step * n) };
}
export function allocationPercent(value: number, total: number) {
  return total > 0 && Number.isFinite(total)
    ? Math.max(0, Math.min(100, (value / total) * 100))
    : 0;
}
