import test from "node:test";
import assert from "node:assert/strict";
import { allocationScale, allocationPercent } from "../lib/workbench";
import { resourceAllocation } from "../lib/allocation";
import { calculate, designForMission } from "../lib/engineering";
import { missions } from "../lib/data";

test("workbench scale never clips actual subsystem budgets and has equally spaced ticks", () => {
  for (const mission of missions) {
    const m = calculate(designForMission(mission.id));
    for (const metric of ["mass", "power"] as const) {
      const values = resourceAllocation(m.ledger, metric).map(b => b.value);
      const scale = allocationScale(values);
      assert(scale.max >= Math.max(...values) / 0.75);
      assert.equal(scale.ticks.at(-1), 0);
      assert.equal(scale.ticks[0], scale.max);
      assert.equal(scale.ticks[1] - scale.ticks[2], scale.max / 4);
      const sum = values.reduce((a,b) => a+b,0);
      assert(Math.abs(values.reduce((a,b) => a+allocationPercent(b,sum),0)-100)<1e-8);
    }
  }
});
test("resource meters remain bounded for overloaded and unlimited designs", () => {
  assert.equal(allocationPercent(120, 100), 100);
  assert.equal(allocationPercent(10, Infinity), 0);
  assert.equal(allocationPercent(0, 0), 0);
  assert.equal(allocationPercent(-10, 100), 0);
  assert(allocationScale([0,0]).max > 0);
});
