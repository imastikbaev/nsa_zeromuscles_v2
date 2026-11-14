import { translate } from "./i18n";
import {
  Design,
  Category,
  missions,
  instruments,
  systems,
  launchers,
  orbits,
  scenarios,
  nominalRequirements,
  categoryLabels,
} from "./data";
export const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));
export function calculate(d: Design) {
  const requirements = d.requirements ?? nominalRequirements;
  const mission = missions.find((m) => m.id === d.mission)!;
  const orbit = orbits.find((o) => o.id === d.orbit)!;
  const launcher = launchers.find((l) => l.id === d.launcher)!;
  const payload = instruments.filter((i) => d.instruments.includes(i.id));
  const selected = (Object.keys(systems) as Category[]).map(
    (k) => systems[k].find((s) => s.id === d.systems[k])!,
  );
  const parts = [...payload, ...selected];
  const propulsion = selected[0],
    power = selected[1],
    comms = selected[2],
    computer = selected[3],
    thermal = selected[4],
    antenna = selected[5];
  const scenario = scenarios.find((s) => s.id === d.scenario);
  const budget =
    d.mode === "sandbox"
      ? Infinity
      : (scenario?.budget ??
        mission.budget * (d.mode === "challenge" ? 0.82 : 1));
  const duration =
    d.durationMonths ?? mission.duration * orbit.duration * (propulsion.id === "ion" ? 1.35 : 1);
  // A single auditable ledger drives all mass, cost and operating power totals.
  // Bus cost represents integration; operations and launch are not spacecraft mass.
  const ledger = [
    {
      id: "bus",
      name: "Structure, avionics bus & integration",
      group: "Platform",
      mass: 180,
      cost: 15,
      power: 55,
    },
    ...payload.map((p) => ({
      id: p.id,
      name: p.name,
      group: "Payload",
      mass: p.mass,
      cost: p.cost,
      power: p.power,
    })),
    ...selected.map((p, i) => ({
      id: p.id,
      name: p.name,
      group: categoryLabels[(Object.keys(systems) as Category[])[i]],
      mass: p.mass,
      cost: p.cost,
      power: p.power,
    })),
    {
      id: "array-area",
      name: `Solar array · ${d.panels} m²`,
      group: "Resources",
      mass: d.panels * 7,
      cost: d.panels * 0.8,
      power: 0,
    },
    {
      id: "battery-capacity",
      name: `Battery · ${d.battery} kWh`,
      group: "Resources",
      mass: d.battery * 12,
      cost: d.battery * 1.5,
      power: 0,
    },
    {
      id: "propellant",
      name: `Propellant · ${d.fuel} kg`,
      group: "Resources",
      mass: d.fuel,
      cost: d.fuel * 0.015,
      power: 0,
    },
    {
      id: "launch",
      name: launcher.name,
      group: "Launch",
      mass: 0,
      cost: launcher.cost,
      power: 0,
    },
    {
      id: "operations",
      name: `Operations · ${duration.toFixed(1)} months`,
      group: "Operations",
      mass: 0,
      cost: duration * 0.3,
      power: 0,
    },
  ];
  const mass = ledger.reduce((n, r) => n + r.mass, 0);
  const dryMass = mass - d.fuel;
  const launchMassLimit =
    Math.min(launcher.payload, scenario?.mass ?? Infinity) *
    (d.mode === "challenge" ? 0.95 : 1);
  const massLimit = launchMassLimit * (1 - requirements.massReserve / 100);
  const cost = ledger.reduce((n, r) => n + r.cost, 0);
  // Solar flux scales approximately with inverse-square distance (captured by orbit.sun).
  const generation =
    (power.generation ?? 0) +
    d.panels * 155 * orbit.sun * (power.id === "advanced" ? 1.45 : 1);
  const consumption = ledger.reduce((n, r) => n + r.power, 0);
  // Compound solar loss over mission duration. RTG decay is not modeled.
  const solarRetention =
    (1 - requirements.solarDegradation / 100) ** (duration / 12);
  const endOfLifeGeneration =
    (power.generation ?? 0) +
    (generation - (power.generation ?? 0)) * solarRetention;
  const requiredGeneration =
    consumption * (1 + requirements.powerReserve / 100);
  const endOfLifeMargin = endOfLifeGeneration - consumption;
  const designPowerMargin = endOfLifeGeneration - requiredGeneration;
  const margin = generation - consumption;
  const eclipseNeed = (consumption * 0.6) / 1000; // 36 min eclipse, kWh; RTG supplies continuous power.
  const batteryNeed =
    power.id === "rtg" ? (consumption * 0.15) / 1000 : eclipseNeed;
  // Tsiolkovsky rocket equation: dv = Isp * g0 * ln(wet mass / dry mass).
  const deltaV = (propulsion.isp ?? 320) * 9.80665 * Math.log(mass / dryMass);
  const requiredDeltaV = orbit.deltaV * (d.mode === "challenge" ? 1.15 : 1);
  const fuelNeeded =
    dryMass *
    (Math.exp(requiredDeltaV / ((propulsion.isp ?? 320) * 9.80665)) - 1);
  const bandwidth = (comms.bandwidth * antenna.bandwidth) / orbit.distance;
  const data = payload.reduce((n, p) => n + p.data, 0);
  const storage = computer.storage ?? 128;
  const dataNeed = data * 2; // two days at full observation duty, GB.
  const requiredBandwidth = Math.max(0.8, data * 0.12);
  const linkQuality = clamp((bandwidth / requiredBandwidth) * 100);
  // Reliability uses the geometric mean of subsystem survival, launcher reliability,
  // radiation protection and deployment penalties. Educational, not flight prediction.
  const partReliability = Math.pow(
    parts.reduce((n, p) => n * p.reliability, 1),
    1 / Math.max(1, parts.length),
  );
  const reliability = clamp(
    partReliability * launcher.reliability * 100 -
      orbit.radiation * (1 - (thermal.protection ?? 0)) * 9 -
      Math.max(0, d.panels - 10) * 0.25 -
      Math.max(0, duration - 36) * 0.015,
  );
  const covered = d.objectives.filter((id) =>
    payload.some((i) => i.supports.includes(id)),
  );
  const science =
    payload.reduce((n, p) => n + p.science, 0) *
    orbit.science *
    (1 + covered.length * 0.08);
  const issues: { label: string; fix: string; step: 0 | 1 | 2 | 3 }[] = [];
  if (!d.objectives.length)
    issues.push({
      label: "Choose at least one mission objective",
      step: 0,
      fix: "Set an objective in Mission brief.",
    });
  if (!payload.length)
    issues.push({
      label: "No scientific instruments installed",
      step: 1,
      fix: "Add a payload in Spacecraft.",
    });
  if (covered.length < d.objectives.length)
    issues.push({
      label: `${d.objectives.length - covered.length} objective(s) lack an instrument`,
      step: 1,
      fix: "Choose instruments that support every selected objective.",
    });
  if (cost > budget)
    issues.push({
      label: `Budget exceeded by $${(cost - budget).toFixed(1)}M`,
      step: 1,
      fix: "Use lighter instruments, simpler systems, or a cheaper launcher.",
    });
  if (mass > massLimit)
    issues.push({
      label: `Mass limit exceeded by ${Math.ceil(mass - massLimit)} kg`,
      step: 2,
      fix: "Remove mass or choose a heavier launch vehicle.",
    });
  if (margin < 0)
    issues.push({
      label: `Power deficit: ${Math.ceil(-margin)} W`,
      step: 1,
      fix: "Increase solar area, choose an RTG, or reduce instrument power.",
    });
  if (margin >= 0 && designPowerMargin < -1e-8)
    issues.push({
      label: `End-of-life power requirement shortfall: ${Math.ceil(-designPowerMargin)} W`,
      step: 1,
      fix: `Provide at least ${Math.ceil(requiredGeneration)} W after ${duration.toFixed(1)} months, including ${requirements.powerReserve}% load reserve. Increase array area or reduce operating loads.`,
    });
  if (d.battery < batteryNeed)
    issues.push({
      label: "Battery reserve insufficient",
      step: 1,
      fix: `Increase capacity to at least ${batteryNeed.toFixed(2)} kWh.`,
    });
  if (deltaV < requiredDeltaV)
    issues.push({
      label: `Delta-v shortfall: ${Math.ceil(requiredDeltaV - deltaV)} m/s`,
      step: 1,
      fix: `Add fuel (at least ${Math.ceil(fuelNeeded)} kg total) or use a more efficient engine.`,
    });
  if (bandwidth < requiredBandwidth)
    issues.push({
      label: "Communication link too weak",
      step: 1,
      fix: "Choose a high-gain antenna or a faster transceiver.",
    });
  if (storage < dataNeed)
    issues.push({
      label: "Science data exceeds storage capacity",
      step: 1,
      fix: "Upgrade the onboard computer or reduce data-heavy instruments.",
    });
  if (!launcher.destinations.includes(d.mission))
    issues.push({
      label: "Launcher cannot reach destination",
      step: 2,
      fix: "Select a launch vehicle rated for this mission.",
    });
  if (!orbit.destinations.includes(d.mission))
    issues.push({
      label: "Orbit does not match mission destination",
      step: 3,
      fix: "Select a compatible orbit in Trajectory.",
    });
  if (orbit.radiation >= 0.85 && (thermal.protection ?? 0) < 0.8)
    issues.push({
      label: "Thermal and radiation protection insufficient",
      step: 1,
      fix: "Use active thermal control or a radiation & heat shield.",
    });
  return {
    requirements,
    ledger,
    launchMassLimit,
    endOfLifeGeneration,
    requiredGeneration,
    endOfLifeMargin,
    designPowerMargin,
    solarRetention,
    mission,
    orbit,
    launcher,
    payload,
    selected,
    mass,
    dryMass,
    massLimit,
    cost,
    budget,
    generation,
    consumption,
    margin,
    batteryNeed,
    deltaV,
    requiredDeltaV,
    fuelNeeded,
    bandwidth,
    requiredBandwidth,
    linkQuality,
    data,
    dataNeed,
    storage,
    reliability,
    risk: 100 - reliability,
    science,
    covered,
    issues,
    duration,
    payloadFraction: (payload.reduce((n, p) => n + p.mass, 0) / mass) * 100,
  };
}
export type Metrics = ReturnType<typeof calculate>;
export function designForMission(
  id: Design["mission"],
  mode: Design["mode"] = "guided",
): Design {
  const mission = missions.find((m) => m.id === id)!;
  const far = ["mars", "asteroid", "deep"].includes(id);
  return {
    name:
      id === "earth"
        ? "Терра — Первопроходец"
        : translate(`${mission.name.split(" ")[0]} Pathfinder`, "ru"),
    mission: id,
    mode,
    objectives: [mission.objectives[0]],
    instruments:
      id === "solar" || id === "deep"
        ? ["particles"]
        : id === "mars" || id === "asteroid" || id === "lunar"
          ? ["spectrometer"]
          : ["camera", "radiometer"],
    systems: {
      propulsion: far ? "ion" : id === "solar" ? "hybrid" : "chemical",
      power: id === "deep" ? "rtg" : "solar",
      communications: "xband",
      computer: far ? "redundant" : "standard",
      thermal: ["deep", "solar"].includes(id)
        ? "shield"
        : far
          ? "active"
          : "passive",
      antenna: id === "earth" ? "patch" : "dish",
    },
    fuel: id === "earth" ? 100 : id === "lunar" ? 300 : 220,
    battery: 1.2,
    panels: id === "deep" ? 2 : id === "asteroid" ? 20 : far ? 16 : 8,
    launcher:
      id === "deep"
        ? "horizon"
        : far
          ? "titan"
          : id === "earth"
            ? "swift"
            : "atlas",
    orbit: mission.orbit,
    scenario: null,
  };
}
