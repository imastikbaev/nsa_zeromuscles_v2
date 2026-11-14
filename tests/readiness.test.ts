import test from "node:test";
import assert from "node:assert/strict";
import { defaultDesign, Design } from "../lib/data";
import { calculate } from "../lib/engineering";

test("readiness fixes route to the stage that owns the invalid requirement", () => {
  const cases: [Partial<Design>, string, number][] = [
    [{ objectives: [] }, "Choose at least one mission objective", 0],
    [{ instruments: [] }, "No scientific instruments installed", 1],
    [{ battery: 0.2, instruments: ["radar", "hires"] }, "Battery reserve insufficient", 1],
    [{ fuel: 1500 }, "Mass limit exceeded", 2],
    [{ orbit: "mars" }, "Orbit does not match", 3],
    [{ mission: "deep" }, "Launcher cannot reach", 2],
  ];
  for (const [patch, label, step] of cases) {
    const m = calculate({ ...structuredClone(defaultDesign), ...patch });
    const issue = m.issues.find(i => i.label.startsWith(label));
    assert(issue, label);
    assert.equal(issue.step, step, label);
    for (const blocker of m.issues) assert([0,1,2,3].includes(blocker.step));
  }
});
