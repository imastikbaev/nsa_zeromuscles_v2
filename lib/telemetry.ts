import type { Design } from "./data";
import type { Flight } from "./simulation";
import { calculate } from "./engineering";

export interface TelemetrySample {
  phase: number;
  label: string;
  health: number;
  fuel: number;
  science: number;
  power: number;
}
// Record actual simulator state at transitions, never invented high-frequency readings.
// Science is a projected return at current health; it is not collected bytes or imagery.
export function sampleFlight(
  f: Flight,
  d: Design,
  label: string,
): TelemetrySample {
  const m = calculate(d);
  return {
    phase: f.phase,
    label,
    health: f.health,
    fuel: f.fuel,
    science: Math.max(0, ((m.science + f.scienceDelta) * f.health) / 100),
    power: m.margin + f.powerDelta,
  };
}
export function recordTelemetry(f: Flight, d: Design, label: string): Flight {
  return {
    ...f,
    telemetry: [...(f.telemetry ?? []), sampleFlight(f, d, label)].slice(-32),
  };
}
export function validTelemetry(value: unknown): value is TelemetrySample[] {
  if (!Array.isArray(value) || value.length > 32) return false;
  return value.every(
    (p, i) =>
      p &&
      Number.isInteger(p.phase) &&
      p.phase >= 0 &&
      p.phase <= 7 &&
      (!i || p.phase >= value[i - 1].phase) &&
      typeof p.label === "string" &&
      p.label.length > 0 &&
      p.label.length <= 200 &&
      Number.isFinite(p.health) &&
      p.health >= 0 &&
      p.health <= 100 &&
      Number.isFinite(p.fuel) &&
      p.fuel >= 0 &&
      p.fuel <= 1500 &&
      Number.isFinite(p.science) &&
      p.science >= 0 &&
      p.science <= 10000 &&
      Number.isFinite(p.power) &&
      p.power >= -10000 &&
      p.power <= 100000,
  );
}
