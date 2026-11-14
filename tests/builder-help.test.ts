import test from "node:test";
import assert from "node:assert/strict";
import { designForMission, calculate } from "../lib/engineering";
import { missions } from "../lib/data";
import { autoFix, compatibleLaunchers, compatibleOrbits, sufficientArray } from "../lib/builder-help";

test("autoFix repairs a deliberately broken design for every destination", () => {
  for (const mission of missions) {
    const base = designForMission(mission.id, "sandbox");
    const broken = {
      ...base,
      objectives: [...mission.objectives],
      instruments: [],
      panels: 1,
      fuel: 20,
      battery: 0.2,
      launcher: "swift",
      orbit: mission.id === "earth" ? "geo" : "leo",
    };
    const fixed = autoFix(broken);
    assert.deepEqual(calculate(fixed).issues, [], mission.id);
  }
});

test("autoFix never mutates its input", () => {
  const base = designForMission("mars", "sandbox");
  const snapshot = JSON.stringify(base);
  autoFix({ ...base, panels: 1 });
  assert.equal(JSON.stringify(base), snapshot);
});

test("compatibility lists only contain reachable launchers and orbits", () => {
  const d = designForMission("deep", "guided");
  assert.ok(compatibleLaunchers(d).every((l) => l.destinations.includes("deep")));
  assert.ok(compatibleOrbits(d).every((o) => o.destinations.includes("deep")));
});

test("sufficientArray returns an area that satisfies the power gates", () => {
  const d = { ...designForMission("earth", "guided"), panels: 1 };
  const panels = sufficientArray(d);
  assert.notEqual(panels, null);
  const m = calculate({ ...d, panels: panels! });
  assert.ok(m.margin >= 0 && m.designPowerMargin >= -1e-8);
});
