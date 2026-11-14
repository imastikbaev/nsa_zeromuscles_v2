import test from "node:test";
import assert from "node:assert/strict";
import { defaultDesign, missions } from "../lib/data";
import { designForMission } from "../lib/engineering";
import {
  encodeDesign,
  decodeDesign,
  createProject,
  readProjects,
  writeProjects,
  prepareProjectLoad,
  compareDesigns,
  PROJECTS_KEY,
  PROJECT_LIMIT,
  MAX_IMPORT_BYTES,
} from "../lib/projects";

test("every destination round-trips through portable design files without score or flight data", () => {
  for (const mission of missions) {
    const d = designForMission(mission.id);
    const text = encodeDesign(d);
    assert.deepEqual(decodeDesign(text), d);
    const file = JSON.parse(text);
    file.design.score = 100;
    file.design.extra = { untrusted: true };
    file.flight = { phase: 7 };
    assert.deepEqual(decodeDesign(JSON.stringify(file)), d);
  }
});
test("imports reject oversized, malformed, duplicate, unsupported and invalid challenge data", () => {
  const file = JSON.parse(encodeDesign(defaultDesign));
  assert.throws(() => decodeDesign("x".repeat(MAX_IMPORT_BYTES + 1)), /64 KB/);
  assert.throws(() => decodeDesign("{"), /valid JSON/);
  for (const bad of [null, {}, { ...file, version: 2 }])
    assert.throws(() => decodeDesign(JSON.stringify(bad)), /Unsupported/);
  for (const patch of [
    { fuel: -1 },
    { fuel: 1501 },
    { panels: 51 },
    { battery: 0 },
    { systems: {} },
    { instruments: ["camera", "camera"] },
    { instruments: ["imaginary"] },
    { objectives: ["imaging", "imaging"] },
    { objectives: ["minerals"] },
    { scenario: "mars500", mode: "challenge" },
    { scenario: "budget", mode: "sandbox" },
    { name: "x".repeat(81) },
  ])
    assert.throws(
      () =>
        decodeDesign(
          JSON.stringify({ ...file, design: { ...file.design, ...patch } }),
        ),
      /design contains/,
    );
});
test("unfinished engineering designs can be transferred and checked after import", () => {
  const d = { ...defaultDesign, instruments: [], objectives: [], panels: 0 };
  assert.deepEqual(decodeDesign(encodeDesign(d)), d);
});
test("opening a saved design preserves an independent copy of current work", () => {
  const current = structuredClone(defaultDesign);
  const saved = createProject(designForMission("mars"));
  const next = prepareProjectLoad([saved], current);
  assert.equal(next.length, 2);
  assert.deepEqual(next[0].design, current);
  current.instruments.push("spectrometer");
  assert.notDeepEqual(next[0].design.instruments, current.instruments);
  assert.equal(
    prepareProjectLoad(next, next[0].design),
    next,
    "No redundant backup",
  );
});
test("full libraries block opening unsaved work instead of evicting a project", () => {
  const projects = Array.from({ length: PROJECT_LIMIT }, (_, i) =>
    createProject({ ...defaultDesign, name: `Variant ${i}` }),
  );
  assert.throws(() => prepareProjectLoad(projects, defaultDesign), /full/);
  assert.equal(projects.length, PROJECT_LIMIT);
  assert.equal(prepareProjectLoad(projects, projects[0].design), projects);
});
test("comparison captures solar panel power, mass, cost, and reliability trade-offs", () => {
  const a = { ...defaultDesign, panels: 10 },
    b = { ...defaultDesign, panels: 20 };
  const rows = compareDesigns(a, b);
  const change = (label: string) => rows.find((r) => r.label === label)!.delta;
  assert.equal(change("Launch mass"), 70);
  assert(Math.abs(change("Total cost") - 8) < 1e-8);
  assert(change("Power margin") > 0);
  assert(change("Reliability") < 0);
  assert.equal(change("Science potential"), 0);
  assert(
    change("Delta-v") < 0,
    "Extra dry mass reduces delta-v for unchanged fuel",
  );
});
test("project storage rejects corruption, deduplicates IDs, and reports quota failures", () => {
  const values = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
    },
  });
  try {
    const p = createProject(defaultDesign);
    assert(writeProjects([p]));
    assert.deepEqual(readProjects(), [p]);
    values.set(
      PROJECTS_KEY,
      JSON.stringify([p, p, { ...p, id: "bad", design: {} }]),
    );
    assert.deepEqual(readProjects(), [p]);
    assert.equal(writeProjects(Array(PROJECT_LIMIT + 1).fill(p)), false);
    values.set(PROJECTS_KEY, "{broken");
    assert.deepEqual(readProjects(), []);
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: () => {
          throw Error("blocked");
        },
        setItem: () => {
          throw Error("quota");
        },
      },
    });
    assert.deepEqual(readProjects(), []);
    assert.equal(writeProjects([p]), false);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
