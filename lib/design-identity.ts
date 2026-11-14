import { Design, nominalRequirements, systems, Category } from "./data";

// Configuration identity ignores the callsign and selection order, but includes all
// engineering inputs and game rules. It links a flight to the design actually flown.
export function configurationKey(d: Design): string {
  return JSON.stringify({
    mission: d.mission,
    mode: d.mode,
    scenario: d.scenario,
    objectives: [...new Set(d.objectives)].sort(),
    instruments: [...new Set(d.instruments)].sort(),
    systems: (Object.keys(systems) as Category[])
      .sort()
      .map((k) => [k, d.systems[k]]),
    fuel: d.fuel,
    battery: d.battery,
    panels: d.panels,
    launcher: d.launcher,
    orbit: d.orbit,
    requirements: [
      (d.requirements ?? nominalRequirements).massReserve,
      (d.requirements ?? nominalRequirements).powerReserve,
      (d.requirements ?? nominalRequirements).solarDegradation,
    ],
  });
}
