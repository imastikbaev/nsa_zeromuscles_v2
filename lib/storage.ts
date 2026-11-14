import { validTelemetry } from "./telemetry";
import {
  Design,
  missions,
  instruments,
  systems,
  Category,
  launchers,
  orbits,
  scenarios,
} from "./data";
import { Result, Flight, events } from "./simulation";
export const DESIGN_KEY = "mission-architect:design:v1";
export const RECORDS_KEY = "mission-architect:records:v1";
export function validDesign(value: unknown): value is Design {
  if (!value || typeof value !== "object") return false;
  const d = value as Design;
  return (
    (d.requirements === undefined ||
      (!!d.requirements &&
        Number.isFinite(d.requirements.massReserve) &&
        d.requirements.massReserve >= 0 &&
        d.requirements.massReserve <= 30 &&
        Number.isFinite(d.requirements.powerReserve) &&
        d.requirements.powerReserve >= 0 &&
        d.requirements.powerReserve <= 50 &&
        Number.isFinite(d.requirements.solarDegradation) &&
        d.requirements.solarDegradation >= 0 &&
        d.requirements.solarDegradation <= 5)) &&
    typeof d.name === "string" &&
    d.name.length <= 80 &&
    missions.some((m) => m.id === d.mission) &&
    ["guided", "challenge", "sandbox"].includes(d.mode) &&
    Array.isArray(d.objectives) &&
    d.objectives.every((o) =>
      [
        "imaging",
        "climate",
        "terrain",
        "minerals",
        "atmosphere",
        "radiation",
      ].includes(o),
    ) &&
    Array.isArray(d.instruments) &&
    d.instruments.every((i) => instruments.some((p) => p.id === i)) &&
    !!d.systems &&
    (Object.keys(systems) as Category[]).every((k) =>
      systems[k].some((s) => s.id === d.systems[k]),
    ) &&
    Number.isFinite(d.fuel) &&
    d.fuel >= 0 &&
    d.fuel <= 1500 &&
    Number.isFinite(d.battery) &&
    d.battery >= 0.2 &&
    d.battery <= 10 &&
    Number.isFinite(d.panels) &&
    d.panels >= 0 &&
    d.panels <= 50 &&
    launchers.some((l) => l.id === d.launcher) &&
    orbits.some((o) => o.id === d.orbit) &&
    (d.scenario === null || scenarios.some((s) => s.id === d.scenario))
  );
}
export const FLIGHT_KEY = "mission-architect:flight:v1";
export interface FlightCheckpoint {
  version: 1;
  design: Design;
  flight: Flight;
  savedAt: string;
}
const finite = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);
const within = (n: unknown, min: number, max: number) =>
  finite(n) && n >= min && n <= max;
export function validCheckpoint(value: unknown): value is FlightCheckpoint {
  if (!value || typeof value !== "object") return false;
  const c = value as FlightCheckpoint;
  if (
    c.version !== 1 ||
    !validDesign(c.design) ||
    !c.flight ||
    typeof c.savedAt !== "string" ||
    !Number.isFinite(Date.parse(c.savedAt))
  )
    return false;
  const f = c.flight;
  const maxResolved = Math.min(3, Math.floor(f.phase / 2));
  const minResolved = Math.max(0, Math.ceil(f.phase / 2) - 1);
  return (
    (f.telemetry === undefined || validTelemetry(f.telemetry)) &&
    typeof f.id === "string" &&
    f.id.length > 0 &&
    f.id.length <= 100 &&
    Number.isInteger(f.phase) &&
    within(f.phase, 0, 7) &&
    within(f.health, 0, 100) &&
    within(f.fuel, 0, c.design.fuel) &&
    within(f.scienceDelta, -1000, 1000) &&
    within(f.powerDelta, -10000, 10000) &&
    Number.isInteger(f.resolved) &&
    within(f.resolved, minResolved, maxResolved) &&
    Number.isInteger(f.anomalies) &&
    within(f.anomalies, 0, f.resolved) &&
    Number.isInteger(f.randomState) &&
    within(f.randomState, 0, 4294967295) &&
    typeof f.completed === "boolean" &&
    typeof f.paused === "boolean" &&
    f.completed === (f.phase === 7 || f.health === 0) &&
    Array.isArray(f.eventIds) &&
    f.eventIds.length === 3 &&
    new Set(f.eventIds).size === 3 &&
    f.eventIds.every((id) => events.some((e) => e.id === id)) &&
    Array.isArray(f.decisions) &&
    f.decisions.length === f.resolved &&
    f.decisions.every(
      (d) =>
        d &&
        typeof d.event === "string" &&
        typeof d.choice === "string" &&
        finite(d.science) &&
        within(d.fuel, 0, 1500) &&
        within(d.damage, 0, 100) &&
        within(d.risk, 0, 1),
    ) &&
    Array.isArray(f.log) &&
    f.log.length > 0 &&
    f.log.length <= 32 &&
    f.log.every(
      (l) =>
        l &&
        typeof l.phase === "string" &&
        typeof l.text === "string" &&
        l.text.length <= 2000 &&
        ["info", "good", "warning"].includes(l.kind),
    )
  );
}
export function saveFlight(design: Design, flight: Flight): boolean {
  try {
    localStorage.setItem(
      FLIGHT_KEY,
      JSON.stringify({
        version: 1,
        design,
        flight,
        savedAt: new Date().toISOString(),
      }),
    );
    return true;
  } catch {
    return false;
  }
}
export function readFlight(): FlightCheckpoint | null {
  try {
    const c = JSON.parse(localStorage.getItem(FLIGHT_KEY) ?? "null");
    return validCheckpoint(c) ? c : null;
  } catch {
    return null;
  }
}
export function clearFlight(): boolean {
  try {
    localStorage.removeItem(FLIGHT_KEY);
    return true;
  } catch {
    return false;
  }
}
export function readDesign(): Design | null {
  try {
    const d = JSON.parse(localStorage.getItem(DESIGN_KEY) ?? "null");
    return validDesign(d) ? d : null;
  } catch {
    return null;
  }
}
export function readRecords(): Result[] {
  try {
    const r = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? "[]");
    return Array.isArray(r)
      ? r
          .filter(
            (x) =>
              x &&
              typeof x.id === "string" &&
              typeof x.score === "number" &&
              Number.isFinite(x.score) &&
              Array.isArray(x.reasons) &&
              Array.isArray(x.objectives) &&
              Array.isArray(x.log) &&
              (x.telemetry === undefined || validTelemetry(x.telemetry)),
          )
          .slice(0, 50)
      : [];
  } catch {
    return [];
  }
}
export function saveResult(r: Result): boolean {
  try {
    localStorage.setItem(
      RECORDS_KEY,
      JSON.stringify(
        [r, ...readRecords().filter((v) => v.id !== r.id)].slice(0, 50),
      ),
    );
    return true;
  } catch {
    return false;
  }
}
export function downloadReport(result: Result) {
  const text = `MISSION ARCHITECT — FLIGHT REPORT\n${result.name}\n${result.mission} | ${result.mode} mode\n\nGrade: ${result.grade} | Score: ${result.score}/100\nMission success: ${result.success}%\nScience: ${result.science}\nEngineering efficiency: ${result.engineering}%\nBudget efficiency: ${result.budgetEfficiency}%\nReliability: ${result.reliability.toFixed(1)}%\nObjectives: ${result.objectives.length}/${result.objectiveCount}\nCost: $${result.cost.toFixed(1)}M\nFinal spacecraft mass: ${result.mass.toFixed(1)} kg\nPower margin: ${Math.round(result.powerMargin)} W\nAnomalies survived: ${result.anomalies}\n\n${result.reasons.join("\n\n")}\n\nMISSION LOG\n${result.log.map((l) => `[${l.phase}] ${l.text}`).join("\n")}\n\nFLIGHT RECORDER (phase / label / health % / fuel kg / projected science / nominal power headroom W)\n${result.telemetry?.map((s) => `${s.phase + 1} | ${s.label} | ${s.health.toFixed(1)} | ${s.fuel.toFixed(1)} | ${s.science.toFixed(1)} | ${s.power.toFixed(1)}`).join("\n") ?? "No recorder data in this legacy report."}\n\nEducational simulation. These simplified values are not flight-design predictions.`;
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `mission-report-${result.id}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
