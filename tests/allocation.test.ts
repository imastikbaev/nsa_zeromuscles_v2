import test from "node:test";
import assert from "node:assert/strict";
import { resourceAllocation } from "../lib/allocation";
import { missions } from "../lib/data";
import { calculate, designForMission } from "../lib/engineering";

test("dashboard mass and power reconcile with full engineering ledger for every destination", () => {
  for (const mission of missions) {
    const m = calculate(designForMission(mission.id));
    for (const metric of ["mass", "power"] as const) {
      const bars = resourceAllocation(m.ledger, metric);
      const total = bars.reduce((sum, bar) => sum + bar.value, 0);
      assert(
        Math.abs(total - (metric === "mass" ? m.mass : m.consumption)) < 1e-8,
        `${mission.id} ${metric}`,
      );
      const communications = m.ledger
        .filter((r) => ["Communications", "Antenna"].includes(r.group))
        .reduce((n, r) => n + r[metric], 0);
      assert.equal(
        bars.find((b) => b.group === "Communications")?.value,
        communications,
      );
    }
  }
});

test("demonstration mass series remains separate from the engineering ledger", async () => {
  const { demonstrationMassAllocation: bars } = await import(
    "../lib/allocation"
  );
  assert.deepEqual(
    bars.map((b) => b.value),
    [80, 168, 94, 78, 52, 48, 42],
  );
  const total = bars.reduce((n, b) => n + b.value, 0);
  assert.equal(total, 562);
  assert.equal(((bars[0].value / total) * 100).toFixed(1), "14.2");
  assert(bars.every((b) => b.value < 220));
  const original = calculate(designForMission("earth"));
  const changed = designForMission("earth");
  changed.fuel += 100;
  assert(calculate(changed).mass > original.mass);
  assert.equal(
    bars.reduce((n, b) => n + b.value, 0),
    562,
  );
});
