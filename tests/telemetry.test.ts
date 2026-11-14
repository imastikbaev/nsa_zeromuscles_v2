import test from "node:test";
import assert from "node:assert/strict";
import { defaultDesign } from "../lib/data";
import { calculate } from "../lib/engineering";
import {
  createFlight,
  advanceFlight,
  pendingEvent,
  resolveEvent,
  scoreFlight,
  responseRisk,
} from "../lib/simulation";
import { validTelemetry } from "../lib/telemetry";
import { validCheckpoint } from "../lib/storage";
test("flight recorder samples phases and commands and survives every checkpoint", () => {
  const d = structuredClone(defaultDesign);
  let f = createFlight(d, () => 0.9);
  let transitions = 1;
  assert.equal(f.telemetry!.length, 1);
  while (!f.completed) {
    const event = pendingEvent(f);
    f = event
      ? resolveEvent(
          f,
          d,
          event.choices.findIndex((c) => c.fuel <= f.fuel),
          () => 0.99,
        )
      : advanceFlight(f, d, () => 0);
    transitions++;
    assert.equal(f.telemetry!.length, transitions);
    assert(validTelemetry(f.telemetry));
    assert(
      validCheckpoint({
        version: 1,
        design: d,
        flight: f,
        savedAt: new Date().toISOString(),
      }),
    );
    const last = f.telemetry!.at(-1)!;
    assert.equal(last.health, f.health);
    assert.equal(last.fuel, f.fuel);
    assert.equal(last.power, calculate(d).margin + f.powerDelta);
  }
  assert.equal(f.telemetry!.length, 11);
  const r = scoreFlight(d, f);
  assert.deepEqual(r.telemetry, f.telemetry);
  assert.equal(Math.round(f.telemetry!.at(-1)!.science), r.science);
});
test("paused or completed simulation does not accept commands or invent new samples", () => {
  const d = structuredClone(defaultDesign);
  const f = { ...createFlight(d), phase: 2, paused: true };
  assert.equal(resolveEvent(f, d, 0), f);
  assert.equal(advanceFlight(f, d), f);
  const ended = { ...f, paused: false, completed: true };
  assert.equal(resolveEvent(ended, d, 0), ended);
  assert.equal(advanceFlight(ended, d), ended);
});
test("legacy checkpoint without recorder stays compatible, malformed histories are rejected", () => {
  const d = structuredClone(defaultDesign);
  const f = { ...createFlight(d), telemetry: undefined };
  assert(
    validCheckpoint({
      version: 1,
      design: d,
      flight: f,
      savedAt: new Date().toISOString(),
    }),
  );
  const resumed = advanceFlight(f, d, () => 0);
  assert.equal(resumed.telemetry!.length, 1);
  const sample = resumed.telemetry![0];
  for (const bad of [
    null,
    [{ ...sample, health: 101 }],
    [{ ...sample, phase: 99 }],
    [{ ...sample, fuel: -1 }],
    [{ ...sample, power: NaN }],
    Array(33).fill(sample),
    [
      { ...sample, phase: 2 },
      { ...sample, phase: 1 },
    ],
  ])
    assert(!validTelemetry(bad));
});
test("displayed damage risk and recorded damage match the actual event resolver", () => {
  const d = structuredClone(defaultDesign),
    m = calculate(d);
  const f = {
    ...createFlight(d),
    health: 10,
    phase: 2,
    eventIds: ["storm", "debris", "thermal"],
  };
  const after = resolveEvent(f, d, 1, () => 0);
  assert.equal(
    after.decisions[0].risk,
    responseRisk(0.55, m.reliability, d.mode),
  );
  assert.equal(after.decisions[0].damage, 10);
  assert.equal(after.health, 0);
  assert(
    responseRisk(0.55, m.reliability, "challenge") >
      responseRisk(0.55, m.reliability, "guided"),
  );
  assert.equal(responseRisk(1, 0, "challenge"), 1);
});
