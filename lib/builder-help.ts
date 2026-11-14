import { Design, Category, instruments, launchers, orbits, systems } from "./data";
import { calculate } from "./engineering";

export const compatibleOrbits = (d: Design) =>
  orbits.filter((o) => o.destinations.includes(d.mission));
export const compatibleLaunchers = (d: Design) =>
  launchers.filter((l) => l.destinations.includes(d.mission));

/** New wizard step (0 goal, 1 spacecraft, 2 rocket & orbit) for an engine issue step. */
export const issueStep = (engineStep: 0 | 1 | 2 | 3): 0 | 1 | 2 =>
  engineStep === 0 ? 0 : engineStep === 1 ? 1 : 2;

const clone = (d: Design): Design => ({
  ...d,
  objectives: [...d.objectives],
  instruments: [...d.instruments],
  systems: { ...d.systems },
});

/** Smallest solar area (m²) that covers the end-of-life power requirement, or null. */
export function sufficientArray(d: Design): number | null {
  for (let panels = Math.max(1, d.panels); panels <= 50; panels += 1) {
    const m = calculate({ ...d, panels });
    if (m.margin >= 0 && m.designPowerMargin >= -1e-8) return panels;
  }
  return null;
}

/**
 * Best-effort repair of every technical launch blocker. It never exceeds the
 * budget on purpose: a budget overrun is a real trade-off the player must decide.
 */
export function autoFix(input: Design): Design {
  let d = clone(input);
  if (!compatibleOrbits(d).some((o) => o.id === d.orbit)) {
    d.orbit = compatibleOrbits(d)[0]?.id ?? d.orbit;
  }
  if (!compatibleLaunchers(d).some((l) => l.id === d.launcher)) {
    const cheapest = [...compatibleLaunchers(d)].sort((a, b) => a.cost - b.cost)[0];
    if (cheapest) d.launcher = cheapest.id;
  }
  for (const objective of d.objectives) {
    const covered = instruments.some(
      (i) => d.instruments.includes(i.id) && i.supports.includes(objective),
    );
    if (!covered) {
      const cheapest = instruments
        .filter((i) => i.supports.includes(objective))
        .sort((a, b) => a.cost - b.cost)[0];
      if (cheapest) d.instruments.push(cheapest.id);
    }
  }
  for (let round = 0; round < 5; round++) {
    let m = calculate(d);
    if (!m.issues.length) break;
    const panels = sufficientArray(d);
    if (panels !== null) d.panels = panels;
    m = calculate(d);
    if (d.battery < m.batteryNeed) d.battery = Math.min(10, Math.ceil(m.batteryNeed * 10) / 10);
    m = calculate(d);
    if (m.deltaV < m.requiredDeltaV) d.fuel = Math.min(1500, Math.ceil(m.fuelNeeded) + 2);
    m = calculate(d);
    if (m.bandwidth < m.requiredBandwidth) {
      const options = systems.antenna
        .flatMap((a) => systems.communications.map((c) => ({ a: a.id, c: c.id, cost: a.cost + c.cost })))
        .sort((x, y) => x.cost - y.cost);
      const pick = options.find(
        (o) => calculate({ ...d, systems: { ...d.systems, antenna: o.a, communications: o.c } }).bandwidth >= m.requiredBandwidth,
      );
      if (pick) d.systems = { ...d.systems, antenna: pick.a, communications: pick.c };
    }
    m = calculate(d);
    if (m.storage < m.dataNeed) {
      const pick = [...systems.computer]
        .sort((a, b) => a.cost - b.cost)
        .find((c) => (c.storage ?? 0) >= m.dataNeed);
      if (pick) d.systems = { ...d.systems, computer: pick.id };
    }
    m = calculate(d);
    if (m.orbit.radiation >= 0.85 && (m.selected[4].protection ?? 0) < 0.8) {
      d.systems = { ...d.systems, thermal: "active" as Design["systems"][Category] };
    }
    m = calculate(d);
    if (m.mass > m.massLimit) {
      const bigger = [...compatibleLaunchers(d)]
        .sort((a, b) => a.payload - b.payload)
        .find((l) => calculate({ ...d, launcher: l.id }).mass <= calculate({ ...d, launcher: l.id }).massLimit);
      if (bigger) d.launcher = bigger.id;
    }
  }
  return d;
}
