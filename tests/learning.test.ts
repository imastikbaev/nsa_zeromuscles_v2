import test from "node:test";
import assert from "node:assert/strict";
import { Design, defaultDesign } from "../lib/data";
import { calculate } from "../lib/engineering";
import { configurationKey } from "../lib/design-identity";
import {
  createFlight,
  advanceFlight,
  pendingEvent,
  resolveEvent,
  scoreFlight,
  Result,
} from "../lib/simulation";
import {
  climateStarter,
  newLearningSession,
  captureConcept,
  evaluateLearning,
  briefIssues,
  validLearningSession,
  readLearningSession,
  saveLearningSession,
  learningReport,
  LEARNING_KEY,
} from "../lib/learning";
const a = (): Design => ({ ...climateStarter(), panels: 6 });
const b = (): Design => ({ ...a(), instruments: ["hires", "radiometer"] });
function session() {
  let s = newLearningSession(defaultDesign);
  s = captureConcept(s, "a", a());
  s = captureConcept(s, "b", b());
  return {
    ...s,
    selected: "a" as const,
    notes: {
      decision: "A saves $30M while covering both objectives.",
      tradeoff: "Lower image detail and less potential science.",
      reflection: "",
    },
  };
}
function finish(d: Design): Result {
  let f = createFlight(d, () => 0.5);
  for (let i = 0; i < 20 && !f.completed; i++) {
    const event = pendingEvent(f);
    f = event
      ? resolveEvent(f, d, 0, () => 0.99)
      : advanceFlight(f, d, () => 0);
  }
  return scoreFlight(d, f);
}
test("starter teaches power repair, and both suggested designs are viable under the brief", () => {
  assert.equal(briefIssues(climateStarter()).length, 0);
  assert(
    calculate(climateStarter()).issues.some((i) => i.label.includes("Power")),
  );
  for (const d of [a(), b()]) {
    assert.deepEqual(briefIssues(d), []);
    assert.deepEqual(calculate(d).issues, []);
  }
  assert(calculate(b()).science > calculate(a()).science);
  assert(calculate(b()).cost > calculate(a()).cost);
});
test("configuration identity ignores names and selection order but tracks engineering inputs and rules", () => {
  const d = a();
  assert.equal(
    configurationKey(d),
    configurationKey({
      ...d,
      name: "Other",
      instruments: [...d.instruments].reverse(),
      objectives: [...d.objectives].reverse(),
    }),
  );
  for (const patch of [
    { panels: 8 },
    { mode: "sandbox" as const },
    { requirements: { ...d.requirements!, powerReserve: 21 } },
    { instruments: ["radar"] },
  ])
    assert.notEqual(configurationKey(d), configurationKey({ ...d, ...patch }));
});
test("recording concepts rejects unresolved constraints and cosmetic-only alternatives", () => {
  let s = newLearningSession(defaultDesign);
  assert.throws(
    () => captureConcept(s, "a", climateStarter()),
    /launch checks/,
  );
  s = captureConcept(s, "a", a());
  assert.throws(
    () => captureConcept(s, "b", { ...a(), name: "Renamed" }),
    /engineering choice/,
  );
  assert.throws(
    () => captureConcept(s, "b", { ...b(), mode: "sandbox" }),
    /Guided/,
  );
  assert.throws(
    () => captureConcept(s, "b", { ...b(), requirements: undefined }),
    /reserve/,
  );
});
test("learning progress requires two concepts, written reasoning, exact flight evidence and reflection", () => {
  let s = session();
  assert.equal(evaluateLearning(s, []).count, 3);
  const unrelated = finish(b());
  assert.equal(evaluateLearning(s, [unrelated]).count, 3);
  const result = finish({ ...a(), name: "Renamed after selection" });
  assert.equal(evaluateLearning(s, [result]).count, 4);
  s = {
    ...s,
    reflectionFor: result.id,
    notes: {
      ...s.notes,
      reflection:
        "The safe-mode response reduced science. I would preserve a larger science margin.",
    },
  };
  assert(evaluateLearning(s, [result]).complete);
  assert(
    !evaluateLearning({ ...s, notes: { ...s.notes, decision: "   " } }, [
      result,
    ]).complete,
  );
  const historical = { ...result, date: "2020-01-01T00:00:00.000Z" };
  assert(!evaluateLearning(s, [historical]).result);
  const legacy = { ...result, configurationKey: undefined };
  assert(!evaluateLearning(s, [legacy]).result);
});
test("failed flights count as experiments and reflection is never evaluated as prose quality", () => {
  const s = session();
  const r = { ...finish(a()), grade: "Mission Failed", health: 0 };
  assert.equal(evaluateLearning(s, [r]).count, 4);
  assert(
    evaluateLearning(
      {
        ...s,
        reflectionFor: r.id,
        notes: { ...s.notes, reflection: "I learned something." },
      },
      [r],
    ).complete,
  );
});
test("updating a concept invalidates selection, isolates saved data, and clears flight reflection", () => {
  const s = session();
  const d = { ...a(), panels: 7 };
  const next = captureConcept(
    { ...s, notes: { ...s.notes, reflection: "Old result" } },
    "a",
    d,
  );
  assert.equal(next.selected, null);
  assert.equal(next.notes.reflection, "");
  d.instruments.push("radar");
  assert.notDeepEqual(next.a!.design.instruments, d.instruments);
  assert.equal(s.a!.design.panels, 6);
});
test("corrupt learning sessions are rejected and storage failures reported", () => {
  const s = session();
  assert(validLearningSession(JSON.parse(JSON.stringify(s))));
  for (const bad of [
    null,
    {},
    { ...s, version: 2 },
    { ...s, original: {} },
    { ...s, notes: null },
    { ...s, notes: { ...s.notes, decision: "x".repeat(1501) } },
    { ...s, selected: "c" },
    { ...s, a: null },
    { ...s, startedAt: "bad" },
    { ...s, a: { design: a(), capturedAt: "bad" } },
  ])
    assert(!validLearningSession(bad));
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
    assert(saveLearningSession(s));
    assert.deepEqual(readLearningSession(), s);
    values.set(LEARNING_KEY, "{");
    assert.equal(readLearningSession(), null);
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: () => {
          throw Error("blocked");
        },
        setItem: () => {
          throw Error("full");
        },
      },
    });
    assert(!saveLearningSession(s));
    assert.equal(readLearningSession(), null);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
test("learning report exports actual concepts, reasoning, flight evidence and human discussion rubric", () => {
  const s = session(),
    r = finish(a());
  const report = learningReport(s, [r]);
  assert(report.includes("CONCEPT A"));
  assert(report.includes("CONCEPT B"));
  assert(report.includes("DISCUSSION RUBRIC"));
  assert(report.includes(s.notes.decision));
  assert(report.includes(r.grade));
  assert(report.includes("not an automatically graded assessment"));
});

test("a new flight requires a reflection linked to its own evidence", () => {
  const s = session(),
    first = finish(a());
  const reflected = {
    ...s,
    reflectionFor: first.id,
    notes: { ...s.notes, reflection: "My first-flight reflection" },
  };
  assert(evaluateLearning(reflected, [first]).complete);
  const next = {
    ...first,
    id: "second-flight",
    date: new Date(Date.parse(first.date) + 1000).toISOString(),
  };
  assert(!evaluateLearning(reflected, [first, next]).complete);
  assert(
    evaluateLearning({ ...reflected, reflectionFor: next.id }, [first, next])
      .complete,
  );
});
