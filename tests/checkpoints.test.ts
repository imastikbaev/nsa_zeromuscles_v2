import test from "node:test";
import assert from "node:assert/strict";
import { defaultDesign } from "../lib/data";
import { calculate, designForMission } from "../lib/engineering";
import {
  createFlight,
  advanceFlight,
  pendingEvent,
  resolveEvent,
  scoreFlight,
  Flight,
} from "../lib/simulation";
import {
  validCheckpoint,
  saveFlight,
  readFlight,
  clearFlight,
  saveResult,
  readRecords,
  FLIGHT_KEY,
} from "../lib/storage";
const design = () => structuredClone(defaultDesign);
const checkpoint = (flight: Flight, d = design()) => ({
  version: 1,
  design: d,
  flight,
  savedAt: new Date().toISOString(),
});
function finish(d = design()) {
  let f = createFlight(d, () => 0.9);
  for (let i = 0; i < 20 && !f.completed; i++) {
    const e = pendingEvent(f);
    f = e
      ? resolveEvent(
          f,
          d,
          e.choices.findIndex((c) => c.fuel <= f.fuel),
          () => 0.99,
        )
      : advanceFlight(f, d, () => 0);
  }
  return f;
}
test("every phase and event boundary round-trips through validated checkpoints", () => {
  const d = design();
  let f = createFlight(d, () => 0.9);
  for (let i = 0; i < 20; i++) {
    const restored = JSON.parse(JSON.stringify(checkpoint(f)));
    assert(
      validCheckpoint(restored),
      `Invalid checkpoint at phase ${f.phase}, ${f.resolved} responses`,
    );
    assert.deepEqual(restored.flight, f);
    if (f.completed) break;
    const e = pendingEvent(f);
    f = e
      ? resolveEvent(
          f,
          d,
          e.choices.findIndex((c) => c.fuel <= f.fuel),
          () => 0.99,
        )
      : advanceFlight(f, d, () => 0);
  }
  assert(f.completed);
});
test("reload cannot reroll an unresolved event or phase anomaly", () => {
  const d = design();
  const f = createFlight(d, () => 0.42);
  const restored = JSON.parse(JSON.stringify(f));
  assert.deepEqual(advanceFlight(f, d), advanceFlight(restored, d));
  const waiting = { ...f, phase: 2 };
  assert.deepEqual(
    resolveEvent(waiting, d, 2),
    resolveEvent(JSON.parse(JSON.stringify(waiting)), d, 2),
  );
  assert.notEqual(advanceFlight(f, d).randomState, f.randomState);
});
test("a restored paused flight stays frozen until explicitly resumed", () => {
  const d = design();
  const f = { ...createFlight(d), paused: true };
  assert.equal(advanceFlight(f, d), f);
  assert.equal(advanceFlight({ ...f, paused: false }, d).phase, 1);
});
test("corrupt checkpoints are rejected without restoring partial flight data", () => {
  const c = checkpoint(createFlight(design()));
  for (const bad of [
    null,
    {},
    { ...c, version: 99 },
    { ...c, design: {} },
    { ...c, savedAt: "invalid" },
    ...[
      { phase: 99 },
      { health: -1 },
      { fuel: Infinity },
      { fuel: 9999 },
      { resolved: 2 },
      { eventIds: ["storm", "storm", "storm"] },
      { randomState: -1 },
      { randomState: NaN },
      { randomState: 1.5 },
      { decisions: null },
      { log: [] },
      { completed: true },
    ].map((p) => ({ ...c, flight: { ...c.flight, ...p } })),
  ])
    assert(!validCheckpoint(bad));
});
test("decision ledger matches actual science, propellant, and damage changes", () => {
  const d = design();
  const f = {
    ...createFlight(d),
    phase: 2,
    eventIds: ["storm", "debris", "comms"],
  };
  const after = resolveEvent(f, d, 1, () => 0);
  assert.equal(after.decisions[0].science, after.scienceDelta - f.scienceDelta);
  assert.equal(after.decisions[0].damage, f.health - after.health);
  assert.equal(after.decisions[0].fuel, f.fuel - after.fuel);
  assert.equal(after.decisions[0].damage, 32);
  assert.equal(f.decisions.length, 0, "Input state remains immutable");
});
test("score contributions reproduce the grade score and science calculation", () => {
  const d = design();
  const f = finish(d);
  const r = scoreFlight(d, f);
  const b = r.breakdown!;
  assert.equal(
    r.score,
    Math.round(b.contributions.reduce((n, c) => n + c.points, 0)),
  );
  assert.equal(
    r.science,
    Math.max(
      0,
      Math.round((b.baseScience + b.decisionScience) * b.healthMultiplier * (b.deliveryMultiplier ?? 1)),
    ),
  );
  assert.equal(r.decisions?.length, 3);
  assert.throws(() => scoreFlight(d, createFlight(d)), /Complete the mission/);
});
test("challenge completion cannot be earned in sandbox or the wrong destination", () => {
  const d = { ...designForMission("earth", "challenge"), scenario: "budget" };
  const f = finish(d);
  assert(scoreFlight(d, f).challengePassed);
  assert(!scoreFlight({ ...d, mode: "sandbox" }, f).challengePassed);
  assert(!scoreFlight({ ...d, scenario: "mars500" }, f).challengePassed);
  assert(!scoreFlight(design(), finish()).challengePassed);
});
test("checkpoints survive storage round-trip and completed reports are deduplicated", () => {
  const values = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
      removeItem: (k: string) => values.delete(k),
    },
  });
  try {
    const d = design(),
      f = createFlight(d);
    assert(saveFlight(d, f));
    assert.deepEqual(readFlight()?.flight, f);
    values.set(FLIGHT_KEY, "{malformed");
    assert.equal(readFlight(), null);
    assert(saveFlight(d, f));
    assert(clearFlight());
    assert.equal(readFlight(), null);
    const r = scoreFlight(d, finish(d));
    assert(saveResult(r));
    assert(saveResult(r));
    assert.equal(readRecords().length, 1);
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: () => {
          throw Error("blocked");
        },
        setItem: () => {
          throw Error("full");
        },
        removeItem: () => {
          throw Error("blocked");
        },
      },
    });
    assert.equal(saveFlight(d, f), false);
    assert.equal(readFlight(), null);
    assert.equal(clearFlight(), false);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("failed-flight score breakdown matches displayed success and explains lost objectives", () => {
  const d = design();
  const r = scoreFlight(d, { ...finish(d), health: 30 });
  assert.equal(r.grade, "Mission Failed");
  assert.equal(r.breakdown!.contributions[0].points, r.success * 0.4);
  assert.equal(
    r.score,
    Math.min(
      30,
      Math.round(r.breakdown!.contributions.reduce((n, c) => n + c.points, 0)),
    ),
  );
  assert(r.reasons[0].includes("35% science threshold"));
});
