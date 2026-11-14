import { Design, Category, systems, missions, scenarios } from "./data";
import { calculate } from "./engineering";
import { validDesign } from "./storage";

export const PROJECTS_KEY = "mission-architect:projects:v1";
export const PROJECT_LIMIT = 100;
export const MAX_IMPORT_BYTES = 64 * 1024;
export interface Project {
  id: string;
  savedAt: string;
  design: Design;
}

// Copy only recognized design fields: imported files never supply scores or flight state.
export function copyDesign(d: Design): Design {
  return {
    name: d.name.trim() || "Untitled mission",
    ...(d.durationMonths !== undefined ? { durationMonths: d.durationMonths } : {}),
    mission: d.mission,
    mode: d.mode,
    objectives: [...d.objectives],
    instruments: [...d.instruments],
    systems: Object.fromEntries(
      (Object.keys(systems) as Category[]).map((k) => [k, d.systems[k]]),
    ) as Design["systems"],
    fuel: d.fuel,
    battery: d.battery,
    panels: d.panels,
    launcher: d.launcher,
    orbit: d.orbit,
    scenario: d.scenario,
    ...(d.requirements
      ? {
          requirements: {
            massReserve: d.requirements.massReserve,
            powerReserve: d.requirements.powerReserve,
            solarDegradation: d.requirements.solarDegradation,
          },
        }
      : {}),
  };
}
function validProjectDesign(value: unknown): value is Design {
  if (!validDesign(value)) return false;
  const m = missions.find((m) => m.id === value.mission)!;
  const s = scenarios.find((s) => s.id === value.scenario);
  return (
    new Set(value.instruments).size === value.instruments.length &&
    new Set(value.objectives).size === value.objectives.length &&
    value.objectives.every((o) => m.objectives.includes(o)) &&
    (!s || (value.mode === "challenge" && value.mission === s.mission))
  );
}
export function encodeDesign(d: Design): string {
  return JSON.stringify(
    { format: "mission-architect-design", version: 2, design: copyDesign(d) },
    null,
    2,
  );
}
export function decodeDesign(text: string): Design {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES)
    throw Error("Choose a mission file smaller than 64 KB.");
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw Error(
      "This file is not valid JSON. Export a design from Mission Architect and try again.",
    );
  }
  if (
    !value ||
    value.format !== "mission-architect-design" ||
    ![1, 2].includes(value.version)
  )
    throw Error(
      "Unsupported mission file. Use a Mission Architect design export (version 1 or 2).",
    );
  if (!validProjectDesign(value.design))
    throw Error(
      "The design contains missing, duplicate, or unsupported components or challenge settings.",
    );
  return copyDesign(value.design);
}
export function createProject(d: Design): Project {
  return {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    design: copyDesign(d),
  };
}
export function readProjects(): Project[] {
  try {
    const data = JSON.parse(localStorage.getItem(PROJECTS_KEY) ?? "[]");
    if (!Array.isArray(data)) return [];
    const ids = new Set<string>();
    return data
      .filter((p) => {
        if (
          !p ||
          typeof p.id !== "string" ||
          !p.id ||
          p.id.length > 100 ||
          ids.has(p.id) ||
          typeof p.savedAt !== "string" ||
          !Number.isFinite(Date.parse(p.savedAt)) ||
          !validProjectDesign(p.design)
        )
          return false;
        ids.add(p.id);
        return true;
      })
      .slice(0, PROJECT_LIMIT)
      .map((p) => ({
        id: p.id,
        savedAt: p.savedAt,
        design: copyDesign(p.design),
      }));
  } catch {
    return [];
  }
}
export function writeProjects(projects: Project[]): boolean {
  if (projects.length > PROJECT_LIMIT) return false;
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    return true;
  } catch {
    return false;
  }
}
export function sameDesign(a: Design, b: Design): boolean {
  return JSON.stringify(copyDesign(a)) === JSON.stringify(copyDesign(b));
}
// Loading a project first stores the working design, so switching never silently loses edits.
export function prepareProjectLoad(
  projects: Project[],
  current: Design,
): Project[] {
  if (projects.some((p) => sameDesign(p.design, current))) return projects;
  if (projects.length >= PROJECT_LIMIT)
    throw Error(
      "The library is full. Remove a saved project before opening another; your current work needs a backup slot.",
    );
  return [createProject(current), ...projects];
}
export function compareDesigns(current: Design, candidate: Design) {
  const a = calculate(current),
    b = calculate(candidate);
  return [
    {
      label: "Total cost",
      unit: "$M",
      current: a.cost,
      candidate: b.cost,
      digits: 1,
    },
    {
      label: "Launch mass",
      unit: "kg",
      current: a.mass,
      candidate: b.mass,
      digits: 0,
    },
    {
      label: "Power margin",
      unit: "W",
      current: a.margin,
      candidate: b.margin,
      digits: 0,
    },
    {
      label: "Power after EOL reserve",
      unit: "W",
      current: a.designPowerMargin,
      candidate: b.designPowerMargin,
      digits: 0,
    },
    {
      label: "Data buffer required",
      unit: "GB",
      current: a.dataNeed,
      candidate: b.dataNeed,
      digits: 0,
    },
    {
      label: "Required bandwidth",
      unit: "Mbps",
      current: a.requiredBandwidth,
      candidate: b.requiredBandwidth,
      digits: 1,
    },
    {
      label: "Delta-v",
      unit: "m/s",
      current: a.deltaV,
      candidate: b.deltaV,
      digits: 0,
    },
    {
      label: "Science potential",
      unit: "pts",
      current: a.science,
      candidate: b.science,
      digits: 1,
    },
    {
      label: "Reliability",
      unit: "%",
      current: a.reliability,
      candidate: b.reliability,
      digits: 1,
    },
    {
      label: "Bandwidth",
      unit: "Mbps",
      current: a.bandwidth,
      candidate: b.bandwidth,
      digits: 1,
    },
  ].map((row) => ({ ...row, delta: row.candidate - row.current }));
}
export function downloadDesign(d: Design) {
  const url = URL.createObjectURL(
    new Blob([encodeDesign(d)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `mission-${d.name.replace(/[^a-z0-9]+/gi, "-").slice(0, 60) || "design"}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
