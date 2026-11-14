import test from "node:test";
import assert from "node:assert/strict";
import { defaultDesign, missions, Design, scenarios } from "../lib/data";
import { calculate, designForMission } from "../lib/engineering";
import {
  advanceFlight,
  createFlight,
  pendingEvent,
  resolveEvent,
  scoreFlight,
  Flight,
  events,
} from "../lib/simulation";
import { validDesign } from "../lib/storage";
const copy = () => structuredClone(defaultDesign);
test("default mission is flight-ready and every destination has a feasible starter", () => {
  assert.deepEqual(calculate(copy()).issues, []);
  for (const mission of missions) {
    const d = designForMission(mission.id);
    assert.deepEqual(calculate(d).issues, [], mission.name);
  }
});
test("mass, power, cost, and objective constraints block launch", () => {
  const d = copy();
  d.instruments = ["radar", "hires"];
  d.panels = 1;
  d.fuel = 700;
  const m = calculate(d);
  assert(m.issues.some((i) => i.label.includes("Mass limit")));
  assert(m.issues.some((i) => i.label.includes("Power deficit")));
  assert(m.issues.some((i) => i.label.includes("Budget")));
  assert.throws(() => createFlight(d));
  d.instruments = [];
  assert(
    calculate(d).issues.some((i) => i.label.includes("lack an instrument")),
  );
});
test("fuel follows the rocket equation and ion engine improves delta-v", () => {
  const d = copy();
  const base = calculate(d);
  d.fuel += 100;
  const more = calculate(d);
  assert(more.mass > base.mass);
  assert(more.deltaV > base.deltaV);
  d.systems.propulsion = "ion";
  assert(calculate(d).deltaV > more.deltaV);
  assert(
    Math.abs(base.deltaV - 320 * 9.80665 * Math.log(base.mass / base.dryMass)) <
      1e-8,
  );
});
test("distant missions need stronger links and a viable power source", () => {
  const d = designForMission("deep");
  d.systems.antenna = "patch";
  assert(calculate(d).issues.some((i) => i.label.includes("link too weak")));
  d.systems.power = "solar";
  assert(calculate(d).issues.some((i) => i.label.includes("Power deficit")));
});
test("battery, storage, destination and orbit compatibility are enforced", () => {
  const d = copy();
  d.instruments = ["radar", "hires"];
  d.battery = 0.2;
  d.launcher = "swift";
  d.mission = "mars";
  const issues = calculate(d).issues.map((i) => i.label);
  assert(issues.includes("Battery reserve insufficient"));
  assert(issues.includes("Science data exceeds storage capacity"));
  assert(issues.includes("Launcher cannot reach destination"));
  assert(issues.includes("Orbit does not match mission destination"));
});
test("sandbox removes budget restrictions, challenge tightens limits", () => {
  const d = copy();
  d.mode = "sandbox";
  assert.equal(calculate(d).budget, Infinity);
  d.mode = "challenge";
  assert(calculate(d).budget < calculate(copy()).budget);
  assert(calculate(d).requiredDeltaV > calculate(copy()).requiredDeltaV);
});
test("events pause progress until a response, fuel cannot go negative", () => {
  const d = copy();
  let f = createFlight(d, () => 0.8);
  f = { ...f, phase: 2, eventIds: ["debris", "storm", "battery"], fuel: 1 };
  assert(pendingEvent(f));
  assert.equal(advanceFlight(f, d), f);
  assert.throws(() => resolveEvent(f, d, 0));
  const next = resolveEvent(f, d, 2, () => 0.99);
  assert.equal(next.resolved, 1);
  assert.equal(next.fuel, 1);
  assert(!pendingEvent(next));
  assert(advanceFlight(next, d, () => 0).phase === 3);
});
test("all eight events have valid choices and bounded damage outcomes", () => {
  const d = copy();
  for (const e of events)
    for (let choice = 0; choice < e.choices.length; choice++) {
      const f = {
        ...createFlight(d, () => 0.8),
        phase: 2,
        eventIds: [e.id, "storm", "thermal"],
        fuel: 100,
      };
      const result = resolveEvent(f, d, choice, () => 0);
      assert(result.health >= 0 && result.health <= 100);
      assert(result.fuel >= 0);
      assert.equal(result.resolved, 1);
    }
});
test("complete flight produces bounded and explainable scoring", () => {
  const d = copy();
  let f = createFlight(d, () => 0.9);
  let guard = 0;
  while (!f.completed && guard++ < 30) {
    const event = pendingEvent(f);
    f = event
      ? resolveEvent(
          f,
          d,
          event.choices.findIndex((c) => c.fuel <= f.fuel),
          () => 0.99,
        )
      : advanceFlight(f, d, () => 0);
  }
  assert(f.completed);
  assert.equal(f.resolved, 3);
  const r = scoreFlight(d, f);
  assert(r.score >= 0 && r.score <= 100);
  assert(r.success <= 100);
  assert.equal(r.objectives.length, 2);
  assert(r.reasons.length >= 4);
  assert.notEqual(r.grade, "Mission Failed");
});
test("damage lowers science and score; loss of spacecraft fails mission", () => {
  const d = copy();
  const f = { ...createFlight(d), completed: true, phase: 7 };
  const good = scoreFlight(d, f);
  const bad = scoreFlight(d, { ...f, health: 30 });
  assert(bad.science < good.science);
  assert(bad.score < good.score);
  const fail = scoreFlight(d, { ...f, health: 0 });
  assert.equal(fail.grade, "Mission Failed");
  assert(fail.score <= 30);
  assert.equal(fail.objectives.length, 0);
});
test("stored design validation rejects corrupt, unknown, and out-of-range fields", () => {
  assert(validDesign(copy()));
  assert(!validDesign(null));
  assert(!validDesign({ ...copy(), fuel: -1 }));
  assert(!validDesign({ ...copy(), mission: "jupiter" }));
  assert(!validDesign({ ...copy(), systems: {} }));
  assert(!validDesign({ ...copy(), battery: NaN }));
  assert(!validDesign({ ...copy(), scenario: "unknown" }));
});
