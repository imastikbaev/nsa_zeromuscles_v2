import { translate, preferredLocale } from "./i18n";
import { Design, objectives } from "./data";
import { calculate } from "./engineering";

export function reviewDesign(d: Design) {
  const m = calculate(d);
  const checks = [
    {
      id: "REQ-01",
      name: "Cost allocation",
      actual: m.cost,
      limit: m.budget,
      unit: "$M",
      direction: "max",
      step: 1,
      source: "Integration + equipment + launch + operations",
    },
    {
      id: "REQ-02",
      name: "Launch mass with growth reserve",
      actual: m.mass,
      limit: m.massLimit,
      unit: "kg",
      direction: "max",
      step: 2,
      source: `${m.launchMassLimit.toFixed(0)} kg available × (1 − ${m.requirements.massReserve}% reserve)`,
    },
    {
      id: "REQ-03",
      name: "End-of-life power with load reserve",
      actual: m.endOfLifeGeneration,
      limit: m.requiredGeneration,
      unit: "W",
      direction: "min",
      step: 1,
      source: `${m.consumption.toFixed(0)} W operating load × (1 + ${m.requirements.powerReserve}% reserve)`,
    },
    {
      id: "REQ-04",
      name: "Maneuver capability",
      actual: m.deltaV,
      limit: m.requiredDeltaV,
      unit: "m/s",
      direction: "min",
      step: 1,
      source: "Isp × g₀ × ln(wet mass / dry mass)",
    },
    {
      id: "REQ-05",
      name: "Eclipse battery capacity",
      actual: d.battery,
      limit: m.batteryNeed,
      unit: "kWh",
      direction: "min",
      step: 1,
      source:
        d.systems.power === "rtg"
          ? "Operating load × 0.15 h backup"
          : "Operating load × 0.6 h eclipse",
    },
    {
      id: "REQ-06",
      name: "Telemetry throughput",
      actual: m.bandwidth,
      limit: m.requiredBandwidth,
      unit: "Mbps",
      direction: "min",
      step: 1,
      source: "Transmitter × antenna factor / destination attenuation",
    },
    {
      id: "REQ-07",
      name: "Science data buffer",
      actual: m.storage,
      limit: m.dataNeed,
      unit: "GB",
      direction: "min",
      step: 1,
      source: "Two days of catalog instrument data at full duty",
    },
  ].map((c) => ({
    ...c,
    pass:
      c.direction === "max"
        ? c.actual <= c.limit + 1e-8
        : c.actual >= c.limit - 1e-8,
    margin: c.direction === "max" ? c.limit - c.actual : c.actual - c.limit,
  }));
  const coverage = d.objectives.map((id) => ({
    id,
    name: objectives.find((o) => o.id === id)?.name ?? id,
    instruments: m.payload
      .filter((p) => p.supports.includes(id))
      .map((p) => p.name),
  }));
  // A sensitivity study, not an optimizer: perturb one variable, recalculate all coupled budgets.
  const alternatives = [
    {
      id: "array",
      name: "Add 2 m² solar array",
      change: { panels: Math.min(50, d.panels + 2) },
      available: d.panels < 50,
    },
    {
      id: "fuel",
      name: "Add 25 kg propellant",
      change: { fuel: Math.min(1500, d.fuel + 25) },
      available: d.fuel < 1500,
    },
    {
      id: "battery",
      name: "Add 0.5 kWh battery",
      change: {
        battery: Math.min(10, Math.round((d.battery + 0.5) * 10) / 10),
      },
      available: d.battery < 10,
    },
  ]
    .filter((a) => a.available)
    .map((a) => {
      const design = { ...d, ...a.change };
      const next = calculate(design);
      return {
        ...a,
        design,
        cost: next.cost - m.cost,
        mass: next.mass - m.mass,
        power: next.designPowerMargin - m.designPowerMargin,
        deltaV: next.deltaV - m.deltaV,
        reliability: next.reliability - m.reliability,
        issues: next.issues,
      };
    });
  return { metrics: m, checks, coverage, alternatives };
}
export function engineeringReport(d: Design) {
  const { metrics: m, checks, coverage } = reviewDesign(d);
  return [
    "MISSION ARCHITECT — PRELIMINARY DESIGN REVIEW",
    d.name,
    `${m.mission.name} | ${m.orbit.name} | ${m.launcher.name} | ${d.mode}`,
    `Readiness: ${m.issues.length ? `${m.issues.length} unresolved checks` : "All configured checks passed"}`,
    `Duration: ${m.duration.toFixed(1)} months`,
    "\nREQUIREMENTS",
    ...checks.map(
      (c) =>
        `${c.id} ${c.pass ? "PASS" : "FAIL"} ${c.name}: ${c.actual.toFixed(2)} ${c.unit}; ${c.direction === "max" ? "maximum" : "minimum"} ${Number.isFinite(c.limit) ? c.limit.toFixed(2) : "unlimited"} ${c.unit}. Basis: ${c.source}`,
    ),
    "\nASSUMPTIONS",
    `Mass reserve: ${m.requirements.massReserve}%; load reserve: ${m.requirements.powerReserve}%; annual solar loss: ${m.requirements.solarDegradation}%.`,
    `Beginning-of-life generation: ${m.generation.toFixed(1)} W; end-of-life: ${m.endOfLifeGeneration.toFixed(1)} W; operating load: ${m.consumption.toFixed(1)} W.`,
    "\nEQUIPMENT & RESOURCE LEDGER (kg / $M / W)",
    ...m.ledger.map(
      (r) =>
        `${r.group} | ${r.name} | ${r.mass.toFixed(2)} | ${r.cost.toFixed(2)} | ${r.power.toFixed(2)}`,
    ),
    `TOTAL | ${m.mass.toFixed(2)} kg | $${m.cost.toFixed(2)}M | ${m.consumption.toFixed(2)} W`,
    "\nOBJECTIVE TRACEABILITY",
    ...coverage.map(
      (c) =>
        `${c.name}: ${c.instruments.join(", ") || "NO COVERING INSTRUMENT"}`,
    ),
    "\nUNRESOLVED CHECKS",
    ...m.issues.map((i) => `${i.label}: ${i.fix}`),
    "\nMODEL LIMITS",
    "Preliminary educational sizing with fictional component specifications. Not a flight-qualified engineering analysis.",
    "Catalog trajectories, illumination and attenuation; no ephemeris propagation, detailed RF link budget, thermal solver, structure loads, attitude dynamics, or launch performance curves.",
    "All selected loads operate simultaneously. Solar degradation compounds annually; nuclear decay, battery aging, conversion losses, duty cycles and eclipse geometry are not modeled.",
    "Delta-v covers spacecraft maneuvers after launcher delivery. Reliability is an educational index, not a validated mission survival probability.",
  ].join("\n");
}
export function downloadEngineeringReport(d: Design) {
  const url = URL.createObjectURL(
    new Blob([translate(engineeringReport(d), preferredLocale())], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "mission-design-review.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
