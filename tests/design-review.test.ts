import test from "node:test";
import assert from "node:assert/strict";
import { defaultDesign, missions, nominalRequirements } from "../lib/data";
import { calculate, designForMission } from "../lib/engineering";
import { reviewDesign, engineeringReport } from "../lib/design-review";
import { validDesign } from "../lib/storage";
import { decodeDesign, encodeDesign, copyDesign } from "../lib/projects";
const near = (a: number, b: number) =>
  assert(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

test("equipment ledger reconciles all resource totals for every destination", () => {
  for (const mission of missions) {
    const d = designForMission(mission.id),
      m = calculate(d);
    near(
      m.ledger.reduce((n, r) => n + r.mass, 0),
      m.mass,
    );
    near(
      m.ledger.reduce((n, r) => n + r.cost, 0),
      m.cost,
    );
    near(
      m.ledger.reduce((n, r) => n + r.power, 0),
      m.consumption,
    );
    near(m.dryMass + d.fuel, m.mass);
    assert.equal(new Set(m.ledger.map((r) => r.id)).size, m.ledger.length);
    assert.equal(m.ledger.find((r) => r.id === "launch")!.mass, 0);
    assert.equal(m.ledger.find((r) => r.id === "operations")!.power, 0);
  }
});
test("nominal legacy designs preserve original feasibility and generation", () => {
  for (const mission of missions) {
    const m = calculate(designForMission(mission.id));
    near(m.generation, m.endOfLifeGeneration);
    near(m.margin, m.designPowerMargin);
    assert.equal(m.issues.length, 0);
  }
});
test("power reserve and aging block a nominally feasible design, repaired by solar area", () => {
  const d = {
    ...designForMission("mars"),
    requirements: { massReserve: 10, powerReserve: 50, solarDegradation: 5 },
  };
  const m = calculate(d);
  assert(m.margin > 0);
  assert(m.designPowerMargin < 0);
  assert(m.issues.some((i) => i.label.includes("End-of-life")));
  assert(!reviewDesign(d).checks.find((c) => c.id === "REQ-03")!.pass);
  const repaired = { ...d, panels: 24 };
  assert(calculate(repaired).designPowerMargin > 0);
  assert(
    !calculate(repaired).issues.some((i) => i.label.includes("End-of-life")),
  );
});
test("mass reserve is withheld from usable launch capacity and blocks overload", () => {
  const d = {
    ...defaultDesign,
    fuel: 220,
    requirements: { ...nominalRequirements, massReserve: 30 },
  };
  const m = calculate(d);
  near(m.massLimit, m.launchMassLimit * 0.7);
  assert(m.mass < m.launchMassLimit && m.mass > m.massLimit);
  assert(m.issues.some((i) => i.label.includes("Mass limit")));
});
test("solar degradation compounds and RTG production is preserved in the stated model", () => {
  const d = {
    ...designForMission("mars"),
    requirements: { ...nominalRequirements, solarDegradation: 2 },
  };
  const m = calculate(d);
  near(m.endOfLifeGeneration, m.generation * 0.98 ** (m.duration / 12));
  const nuclear = calculate({
    ...designForMission("deep"),
    panels: 0,
    requirements: { ...nominalRequirements, solarDegradation: 5 },
  });
  near(nuclear.endOfLifeGeneration, nuclear.generation);
});
test("trade alternatives are immutable, bounded and report coupled consequences", () => {
  const d = { ...defaultDesign, panels: 12 };
  const original = structuredClone(d);
  const a = reviewDesign(d).alternatives.find((a) => a.id === "array")!;
  near(a.mass, 14);
  near(a.cost, 1.6);
  assert(a.deltaV < 0);
  assert(a.power > 0);
  assert(a.reliability < 0);
  assert.deepEqual(d, original);
  assert.equal(
    reviewDesign({ ...d, panels: 50, fuel: 1500, battery: 10 }).alternatives
      .length,
    0,
  );
});
test("design requirements round-trip, reject invalid values, and copy independently", () => {
  const d = {
    ...defaultDesign,
    requirements: { massReserve: 10, powerReserve: 20, solarDegradation: 2 },
  };
  assert(validDesign(d));
  assert.deepEqual(decodeDesign(encodeDesign(d)), d);
  const copied = copyDesign(d);
  copied.requirements!.massReserve = 30;
  assert.equal(d.requirements.massReserve, 10);
  for (const requirements of [
    null,
    {},
    { massReserve: -1, powerReserve: 0, solarDegradation: 0 },
    { massReserve: 0, powerReserve: 51, solarDegradation: 0 },
    { massReserve: 0, powerReserve: 0, solarDegradation: 6 },
  ])
    assert(!validDesign({ ...d, requirements }));
});
test("review export includes requirement evidence, totals, failures and model limitations", () => {
  const d = { ...defaultDesign, panels: 0 };
  const r = engineeringReport(d);
  assert(r.includes("REQ-03 FAIL"));
  assert(r.includes("TOTAL |"));
  assert(r.includes("Power deficit"));
  assert(r.includes("OBJECTIVE TRACEABILITY"));
  assert(r.includes("not a validated mission survival probability"));
  const coverage = reviewDesign({ ...d, instruments: [] }).coverage;
  assert(coverage.every((c) => c.instruments.length === 0));
});
