import { translate, preferredLocale } from "./i18n";
import { Design } from "./data";
import { calculate, designForMission } from "./engineering";
import { configurationKey } from "./design-identity";
import { validDesign } from "./storage";
import { Result } from "./simulation";

export const LEARNING_KEY = "mission-architect:climate-lab:v1";
export const climateBrief = {
  title: "Climate Watch",
  duration: "20–30 min",
  budget: 180,
  mass: 850,
  story:
    "A student research team wants to compare surface temperatures with visible images of the same region. Design an Earth-observation mission that can collect both types of data without exceeding its resource limits.",
  objectives: ["imaging", "climate"],
  questions: [
    {
      id: "decision",
      label: "Why did you choose this design?",
      prompt:
        "Name the objective you prioritized and cite a number from your comparison.",
    },
    {
      id: "tradeoff",
      label: "What did you give up?",
      prompt:
        "Explain a cost, mass, power, data, or reliability disadvantage of your choice.",
    },
    {
      id: "reflection",
      label: "What would you change after the flight?",
      prompt:
        "Use one actual event or outcome as evidence. A failed flight can be a useful experiment.",
    },
  ] as const,
};
export type NoteKey = (typeof climateBrief.questions)[number]["id"];
export interface LearningSnapshot {
  design: Design;
  capturedAt: string;
}
export interface LearningSession {
  version: 1;
  startedAt: string;
  original: Design;
  a: LearningSnapshot | null;
  b: LearningSnapshot | null;
  selected: "a" | "b" | null;
  notes: Record<NoteKey, string>;
  reflectionFor?: string | null;
}
export function climateStarter(): Design {
  return {
    ...designForMission("earth"),
    name: "Climate Watch",
    objectives: [...climateBrief.objectives],
    panels: 1,
    requirements: { massReserve: 10, powerReserve: 20, solarDegradation: 2 },
  };
}
export function newLearningSession(original: Design): LearningSession {
  return {
    version: 1,
    startedAt: new Date().toISOString(),
    original: structuredClone(original),
    a: null,
    b: null,
    selected: null,
    notes: { decision: "", tradeoff: "", reflection: "" },
    reflectionFor: null,
  };
}
export function briefIssues(d: Design): string[] {
  const m = calculate(d);
  const issues: string[] = [];
  if (d.mission !== "earth")
    issues.push("Choose an Earth observation mission.");
  if (d.mode !== "guided" || d.scenario !== null)
    issues.push(
      "Use Guided mode outside a preset challenge for a fair comparison.",
    );
  if (d.orbit !== "sso")
    issues.push("Use Sun-synchronous orbit for both concepts.");
  if (climateBrief.objectives.some((o) => !d.objectives.includes(o)))
    issues.push("Keep both imaging and climate objectives selected.");
  if (m.cost > climateBrief.budget)
    issues.push("Keep total mission cost at or below $180M.");
  if (m.mass > climateBrief.mass)
    issues.push("Keep spacecraft mass at or below 850 kg.");
  if (d.durationMonths !== undefined) issues.push("Use catalog duration for a fair comparison in Climate Watch.");
  const r = d.requirements;
  if (!r || r.massReserve < 10 || r.powerReserve < 20 || r.solarDegradation < 2)
    issues.push(
      "Keep at least 10% mass reserve, 20% power reserve, and 2% annual solar degradation.",
    );
  return issues;
}
export function captureConcept(
  s: LearningSession,
  slot: "a" | "b",
  d: Design,
): LearningSession {
  const issues = briefIssues(d);
  if (issues.length) throw Error(issues[0]);
  if (calculate(d).issues.length)
    throw Error(
      "Resolve the current launch checks before recording a viable concept.",
    );
  const other = s[slot === "a" ? "b" : "a"];
  if (other && configurationKey(other.design) === configurationKey(d))
    throw Error(
      "Change an engineering choice before recording the second concept. Renaming alone is not a different design.",
    );
  return {
    ...s,
    [slot]: {
      design: structuredClone(d),
      capturedAt: new Date().toISOString(),
    },
    selected: null,
    reflectionFor: null,
    notes: { ...s.notes, reflection: "" },
  };
}
export function evaluateLearning(s: LearningSession, records: Result[]) {
  const viable = (snapshot: LearningSnapshot | null) =>
    !!snapshot &&
    briefIssues(snapshot.design).length === 0 &&
    calculate(snapshot.design).issues.length === 0;
  const compared =
    viable(s.a) &&
    viable(s.b) &&
    configurationKey(s.a!.design) !== configurationKey(s.b!.design);
  const chosen = s.selected ? s[s.selected] : null;
  const result = chosen
    ? records
        .filter(
          (r) =>
            r.configurationKey === configurationKey(chosen.design) &&
            Date.parse(r.date) >= Date.parse(chosen.capturedAt),
        )
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0]
    : undefined;
  const checkpoints = [
    {
      id: "concept",
      name: "Build a viable concept",
      done: viable(s.a),
      detail: "Record Concept A after resolving every launch check.",
    },
    {
      id: "compare",
      name: "Compare two alternatives",
      done: compared,
      detail: "Record a different, viable Concept B under the same brief.",
    },
    {
      id: "defend",
      name: "Choose and explain",
      done:
        compared &&
        !!chosen &&
        !!s.notes.decision.trim() &&
        !!s.notes.tradeoff.trim(),
      detail: "Choose A or B and record your reasoning and its disadvantage.",
    },
    {
      id: "fly",
      name: "Test the chosen configuration",
      done: !!result,
      detail: "Complete a flight using exactly the configuration you selected.",
    },
    {
      id: "reflect",
      name: "Learn from the result",
      done:
        !!result &&
        s.reflectionFor === result.id &&
        !!s.notes.reflection.trim(),
      detail: "Record what you would change using flight evidence.",
    },
  ];
  return {
    checkpoints,
    complete: checkpoints.every((c) => c.done),
    count: checkpoints.filter((c) => c.done).length,
    chosen,
    result,
    compared,
  };
}
const validDate = (v: unknown) =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
export function validLearningSession(value: unknown): value is LearningSession {
  if (!value || typeof value !== "object") return false;
  const s = value as LearningSession;
  const snapshot = (p: LearningSnapshot | null) =>
    p === null ||
    (!!p &&
      validDesign(p.design) &&
      validDate(p.capturedAt) &&
      Date.parse(p.capturedAt) >= Date.parse(s.startedAt));
  return (
    s.version === 1 &&
    validDate(s.startedAt) &&
    validDesign(s.original) &&
    snapshot(s.a) &&
    snapshot(s.b) &&
    (s.selected === null ||
      (s.selected === "a" && !!s.a) ||
      (s.selected === "b" && !!s.b)) &&
    (s.reflectionFor === undefined ||
      s.reflectionFor === null ||
      (typeof s.reflectionFor === "string" && s.reflectionFor.length <= 100)) &&
    !!s.notes &&
    climateBrief.questions.every(
      (q) => typeof s.notes[q.id] === "string" && s.notes[q.id].length <= 1500,
    )
  );
}
export function readLearningSession(): LearningSession | null {
  try {
    const s = JSON.parse(localStorage.getItem(LEARNING_KEY) ?? "null");
    return validLearningSession(s) ? s : null;
  } catch {
    return null;
  }
}
export function saveLearningSession(s: LearningSession): boolean {
  try {
    localStorage.setItem(LEARNING_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
export function learningReport(s: LearningSession, records: Result[]) {
  const e = evaluateLearning(s, records);
  return [
    "MISSION ARCHITECT — CLIMATE WATCH LAB",
    `${e.count}/5 learning checkpoints evidenced${e.complete ? " — Activity complete" : ""}`,
    "This is a record of learning evidence, not an automatically graded assessment of written reasoning.",
    "\nBRIEF",
    climateBrief.story,
    "Earth / SSO / imaging + climate / Guided mode / $180M / 850 kg / 10% mass reserve / 20% power reserve / 2% annual solar loss",
    ...(["a", "b"] as const).flatMap((key) => {
      const p = s[key];
      if (!p) return [`\nCONCEPT ${key.toUpperCase()}: not recorded`];
      const m = calculate(p.design);
      return [
        `\nCONCEPT ${key.toUpperCase()}: ${p.design.name}`,
        `Recorded: ${p.capturedAt}`,
        `$${m.cost.toFixed(1)}M | ${m.mass.toFixed(1)} kg | ${m.science.toFixed(1)} potential science | ${m.designPowerMargin.toFixed(1)} W after reserve | ${m.reliability.toFixed(1)}% reliability index`,
        `Payload: ${m.payload.map((p) => p.name).join(", ")}`,
        `Systems: ${m.selected.map((p) => p.name).join(", ")}`,
        `Fuel ${p.design.fuel} kg / battery ${p.design.battery} kWh / array ${p.design.panels} m²`,
      ];
    }),
    `\nSELECTED: ${s.selected?.toUpperCase() ?? "Not chosen"}`,
    ...climateBrief.questions.flatMap((q) => [
      `\n${q.label}`,
      s.notes[q.id] || "Not recorded",
    ]),
    "\nFLIGHT EVIDENCE",
    e.result
      ? `${e.result.name} | ${e.result.date} | ${e.result.grade} | ${e.result.science} science | ${e.result.health}% health\n${e.result.decisions?.map((d) => `${d.event}: ${d.choice}; science ${d.science}; fuel ${d.fuel} kg; damage ${d.damage}%`).join("\n") ?? e.result.reasons.join("\n")}`
      : "No completed flight matching the selected configuration.",
    "\nCHECKPOINTS",
    ...e.checkpoints.map(
      (c) => `${c.done ? "RECORDED" : "PENDING"}: ${c.name}`,
    ),
    "\nDISCUSSION RUBRIC (human review)",
    "Does the explanation cite a measured difference? Does it connect the difference to the science goal? Does it acknowledge a disadvantage? Does the reflection use actual flight evidence?",
    "\nEducational model; fictional equipment specifications. No real climate data or orbit-coverage predictions are generated.",
  ].join("\n");
}
export function downloadLearningReport(s: LearningSession, records: Result[]) {
  const url = URL.createObjectURL(
    new Blob([translate(learningReport(s, records), preferredLocale())], {
      type: "text/plain;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "climate-watch-learning-report.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
