import { createOperations, operateInterval, discardBuffered, scienceYield, dataTotals, operationalAdvice, Operations } from "./operations";
import { recordTelemetry, TelemetrySample } from "./telemetry";
import { configurationKey } from "./design-identity";
import { Design, objectives, scenarios } from "./data";
import { calculate, clamp } from "./engineering";
export const phases = [
  "Launch",
  "Stage separation",
  "Orbit insertion",
  "Array deployment",
  "Communication check",
  "Course corrections",
  "Science operations",
  "Mission completion",
];
export interface Choice {
  label: string;
  description: string;
  science: number;
  damage: number;
  risk: number;
  fuel: number;
  power?: number;
}
export interface MissionEvent {
  id: string;
  title: string;
  description: string;
  type: "warning" | "discovery";
  choices: Choice[];
}
export const events: MissionEvent[] = [
  {
    id: "storm",
    title: "Solar storm approaching",
    description:
      "A wave of energetic particles will reach the spacecraft. Protect your instruments or collect rare space-weather data.",
    type: "warning",
    choices: [
      {
        label: "Enter safe mode",
        description: "−8 science · 2% damage risk · safest option",
        science: -8,
        damage: 8,
        risk: 0.02,
        fuel: 0,
      },
      {
        label: "Continue observations",
        description: "+18 science · 55% damage risk",
        science: 18,
        damage: 32,
        risk: 0.55,
        fuel: 0,
      },
      {
        label: "Shield sensitive instruments",
        description: "−3 science · 15% damage risk",
        science: -3,
        damage: 16,
        risk: 0.15,
        fuel: 0,
      },
    ],
  },
  {
    id: "comms",
    title: "Downlink interrupted",
    description:
      "The ground station is receiving a weak, noisy signal. Your science data is waiting in onboard storage.",
    type: "warning",
    choices: [
      {
        label: "Repoint the antenna",
        description: "−4 science · 2 kg fuel · reliable recovery",
        science: -4,
        damage: 5,
        risk: 0.05,
        fuel: 2,
      },
      {
        label: "Boost transmitter power",
        description: "+4 science · 25% overheating risk",
        science: 4,
        damage: 20,
        risk: 0.25,
        fuel: 0,
      },
      {
        label: "Wait for the next pass",
        description: "−9 science · no added risk",
        science: -9,
        damage: 0,
        risk: 0,
        fuel: 0,
      },
    ],
  },
  {
    id: "battery",
    title: "Battery capacity falling",
    description:
      "Repeated charge cycles have reduced the energy reserve. Choose how to manage the next eclipse.",
    type: "warning",
    choices: [
      {
        label: "Reduce instrument duty cycle",
        description: "−7 science · preserve battery health",
        science: -7,
        damage: 0,
        risk: 0,
        fuel: 0,
      },
      {
        label: "Deep-cycle the battery",
        description: "+3 science · 35% battery damage risk",
        science: 3,
        damage: 25,
        risk: 0.35,
        fuel: 0,
        power: -40,
      },
      {
        label: "Warm and recalibrate",
        description: "−3 science · 10% recovery risk",
        science: -3,
        damage: 10,
        risk: 0.1,
        fuel: 0,
      },
    ],
  },
  {
    id: "propulsion",
    title: "Unexpected thruster vibration",
    description:
      "Telemetry shows an unstable burn. A correction is still needed to keep the planned trajectory.",
    type: "warning",
    choices: [
      {
        label: "Run a diagnostic burn",
        description: "−5 science · 3 kg fuel · low risk",
        science: -5,
        damage: 8,
        risk: 0.05,
        fuel: 3,
      },
      {
        label: "Switch to backup sequence",
        description: "−2 science · 6 kg fuel · 8% risk",
        science: -2,
        damage: 10,
        risk: 0.08,
        fuel: 6,
      },
      {
        label: "Push through the burn",
        description: "+5 science · 45% propulsion damage risk",
        science: 5,
        damage: 30,
        risk: 0.45,
        fuel: 1,
      },
    ],
  },
  {
    id: "instrument",
    title: "Instrument calibration drift",
    description:
      "One sensor is producing measurements outside its expected range. The next observation window is approaching.",
    type: "warning",
    choices: [
      {
        label: "Recalibrate the instrument",
        description: "−6 science · no damage risk",
        science: -6,
        damage: 0,
        risk: 0,
        fuel: 0,
      },
      {
        label: "Correct the data onboard",
        description: "+3 science · 20% risk of lost measurements",
        science: 3,
        damage: 14,
        risk: 0.2,
        fuel: 0,
      },
      {
        label: "Keep collecting data",
        description: "+12 science · 50% sensor damage risk",
        science: 12,
        damage: 26,
        risk: 0.5,
        fuel: 0,
      },
    ],
  },
  {
    id: "discovery",
    title: "An unexpected discovery",
    description:
      "Your instruments detected an unusual signal outside the planned survey. This could be worth a closer look.",
    type: "discovery",
    choices: [
      {
        label: "Investigate the signal",
        description: "+24 science · 4 kg fuel · 15% maneuver risk",
        science: 24,
        damage: 10,
        risk: 0.15,
        fuel: 4,
      },
      {
        label: "Record a quick observation",
        description: "+10 science · no added risk",
        science: 10,
        damage: 0,
        risk: 0,
        fuel: 0,
      },
      {
        label: "Stay on the original plan",
        description: "+3 science · protect the mission schedule",
        science: 3,
        damage: 0,
        risk: 0,
        fuel: 0,
      },
    ],
  },
  {
    id: "debris",
    title: "Object on an intercept course",
    description:
      "Navigation has identified debris crossing the projected path. Time to protect your spacecraft.",
    type: "warning",
    choices: [
      {
        label: "Perform avoidance maneuver",
        description: "−3 science · 5 kg fuel · safest option",
        science: -3,
        damage: 5,
        risk: 0.01,
        fuel: 5,
      },
      {
        label: "Make a small course change",
        description: "−1 science · 2 kg fuel · 12% collision risk",
        science: -1,
        damage: 24,
        risk: 0.12,
        fuel: 2,
      },
      {
        label: "Hold current course",
        description: "+4 science · 50% collision risk",
        science: 4,
        damage: 45,
        risk: 0.5,
        fuel: 0,
      },
    ],
  },
  {
    id: "thermal",
    title: "Temperature above limits",
    description:
      "A sun-facing panel is transferring too much heat into the instrument bay. Thermal protection needs your attention.",
    type: "warning",
    choices: [
      {
        label: "Rotate into shade",
        description: "−6 science · 2 kg fuel · no damage risk",
        science: -6,
        damage: 0,
        risk: 0,
        fuel: 2,
      },
      {
        label: "Reduce instrument power",
        description: "−9 science · protect thermal margin",
        science: -9,
        damage: 0,
        risk: 0,
        fuel: 0,
      },
      {
        label: "Keep the observation window",
        description: "+10 science · 40% thermal damage risk",
        science: 10,
        damage: 28,
        risk: 0.4,
        fuel: 0,
      },
    ],
  },
];
export interface LogEntry {
  phase: string;
  text: string;
  kind: "info" | "good" | "warning";
}
export interface DecisionRecord {
  event: string;
  choice: string;
  science: number;
  fuel: number;
  damage: number;
  risk: number;
}
export interface ScoreBreakdown {
  deliveryMultiplier?: number;
  baseScience: number;
  decisionScience: number;
  healthMultiplier: number;
  contributions: { label: string; points: number; maximum: number }[];
}
export interface Flight {
  operations?: Operations;
  telemetry?: TelemetrySample[];
  id: string;
  phase: number;
  health: number;
  scienceDelta: number;
  fuel: number;
  powerDelta: number;
  anomalies: number;
  eventIds: string[];
  resolved: number;
  log: LogEntry[];
  completed: boolean;
  paused: boolean;
  randomState: number;
  decisions: DecisionRecord[];
}
export function createFlight(d: Design, random = Math.random): Flight {
  const m = calculate(d);
  if (m.issues.length)
    throw new Error("Resolve critical constraints before launch.");
  const pool = [...events];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const shuffled = pool.slice(0, 3).map((e) => e.id);
  return recordTelemetry(
    {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${random()}`,
      phase: 0,
      operations: createOperations(d),
      health: 100,
      scienceDelta: 0,
      fuel: d.fuel - m.fuelNeeded,
      powerDelta: 0,
      anomalies: 0,
      eventIds: shuffled,
      resolved: 0,
      log: [
        {
          phase: phases[0],
          text: `${d.name}: launch clearance confirmed. ${m.fuelNeeded.toFixed(1)} kg propellant allocated to trajectory.`,
          kind: "good",
        },
      ],
      completed: false,
      paused: false,
      randomState: Math.floor(random() * 4294967296) >>> 0,
      decisions: [],
    },
    d,
    phases[0],
  );
}
export function pendingEvent(f: Flight): MissionEvent | undefined {
  return !f.completed &&
    [2, 4, 6].includes(f.phase) &&
    f.resolved < [2, 4, 6].indexOf(f.phase) + 1
    ? events.find((e) => e.id === f.eventIds[f.resolved])
    : undefined;
}
// A persisted generator makes a checkpoint replay deterministic. Reloading cannot
// reroll an unresolved maneuver or a decision. Explicit RNG injection is for tests.
function flightRandom(f: Flight, override?: () => number) {
  let state = f.randomState >>> 0;
  return {
    next() {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return override ? override() : state / 4294967296;
    },
    state: () => state,
  };
}
export function advanceFlight(
  f: Flight,
  d: Design,
  random?: () => number,
): Flight {
  if (f.completed || f.paused || pendingEvent(f)) return f;
  if (f.operations) {
    const hours = f.phase >= 4 ? calculate(d).duration * 30 * 24 / 3 : 1;
    f = {...f, operations: operateInterval(d, f.operations, f.powerDelta, hours, f.phase >= 4)};
  }
  const phase = f.phase + 1;
  const m = calculate(d);
  if (phase >= 7)
    return recordTelemetry(
      {
        ...f,
        phase: 7,
        completed: true,
        log: [
          ...f.log,
          {
            phase: phases[7],
            text: "Science campaign complete. Telemetry received; final mission report ready.",
            kind: "good",
          },
        ],
      },
      d,
      phases[7],
    );
  const rng = flightRandom(f, random);
  const anomaly = rng.next() > m.reliability / 100;
  const damage = anomaly
    ? Math.min(f.health, 4 + Math.round(rng.next() * 8))
    : 0;
  const health = clamp(f.health - damage);
  return recordTelemetry(
    {
      ...f,
      randomState: rng.state(),
      phase,
      health,
      completed: health <= 0,
      log: [
        ...f.log,
        {
          phase: phases[phase],
          text: anomaly
            ? `Minor subsystem anomaly: health −${damage}%. Redundancy maintained flight.`
            : `${phases[phase]} nominal. Spacecraft responding to commands.`,
          kind: anomaly ? "warning" : "info",
        },
      ],
    },
    d,
    phases[phase],
  );
}
export function setFlightOperations(f: Flight, patch: { duty?: number; downlink?: boolean; priority?: string | null; disabledInstruments?: string[]; discard?: boolean }): Flight {
  if (f.paused || f.completed || !f.operations) return f;
  if (patch.duty !== undefined && (![0, 0.5, 1].includes(patch.duty))) throw new Error("Invalid instrument duty cycle.");
  if (patch.downlink !== undefined && typeof patch.downlink !== "boolean") throw new Error("Invalid transmitter state.");
  if (patch.priority !== undefined && patch.priority !== null && !f.operations.data.some(r=>r.id===patch.priority)) throw new Error("Unknown data priority.");
  if (patch.disabledInstruments !== undefined && (!Array.isArray(patch.disabledInstruments) || patch.disabledInstruments.some(id=>!f.operations!.data.some(r=>r.id===id)) || new Set(patch.disabledInstruments).size!==patch.disabledInstruments.length)) throw new Error("Unknown disabled instrument.");
  if (patch.discard !== undefined && typeof patch.discard !== "boolean") throw new Error("Invalid discard command.");
  const o=patch.discard?discardBuffered(f.operations):f.operations;
  // Whitelist settings: a room command can never overwrite generated telemetry or scores.
  return { ...f, operations: { ...o,
    duty:patch.duty??o.duty, downlink:patch.downlink??o.downlink,
    priority:patch.priority===undefined?o.priority:patch.priority,
    disabledInstruments:patch.disabledInstruments?[...patch.disabledInstruments]:o.disabledInstruments,
  } };
}
export function responseRisk(
  baseRisk: number,
  reliability: number,
  mode: Design["mode"],
): number {
  return Math.min(
    1,
    Math.max(
      0,
      baseRisk *
        (1 + (100 - reliability) / 100) *
        (mode === "challenge" ? 1.25 : 1),
    ),
  );
}
export function resolveEvent(
  f: Flight,
  d: Design,
  choiceIndex: number,
  random?: () => number,
): Flight {
  const e = pendingEvent(f);
  if (!e || f.paused) return f;
  const choice = e.choices[choiceIndex];
  if (!choice || choice.fuel > f.fuel)
    throw new Error("Insufficient fuel for this response.");
  const m = calculate(d);
  const risk = responseRisk(choice.risk, m.reliability, d.mode);
  const rng = flightRandom(f, random);
  const hit = rng.next() < risk;
  const damage = hit ? Math.min(f.health, choice.damage) : 0;
  const health = clamp(f.health - damage);
  const text = `${e.title} → ${choice.label}. Science ${choice.science >= 0 ? "+" : ""}${choice.science}; fuel −${choice.fuel} kg. ${hit ? `Damage sustained: −${damage}% health.` : "Response successful; no damage."}`;
  return recordTelemetry(
    {
      ...f,
      randomState: rng.state(),
      decisions: [
        ...f.decisions,
        {
          event: e.title,
          choice: choice.label,
          science: choice.science,
          fuel: choice.fuel,
          damage,
          risk,
        },
      ],
      health,
      scienceDelta: f.scienceDelta + choice.science,
      fuel: f.fuel - choice.fuel,
      powerDelta: f.powerDelta + (hit ? (choice.power ?? 0) : 0),
      anomalies: f.anomalies + (e.type === "warning" && health > 0 ? 1 : 0),
      resolved: f.resolved + 1,
      completed: health <= 0,
      log: [
        ...f.log,
        { phase: phases[f.phase], text, kind: hit ? "warning" : "good" },
      ],
    },
    d,
    choice.label,
  );
}
export interface Result {
  scoringVersion?: 1 | 2;
  operations?: Operations;
  plannedDurationMonths?: number;
  telemetry?: TelemetrySample[];
  configurationKey?: string;
  id: string;
  name: string;
  mission: string;
  mode: Design["mode"];
  date: string;
  grade: string;
  score: number;
  success: number;
  science: number;
  engineering: number;
  budgetEfficiency: number;
  reliability: number;
  objectives: string[];
  objectiveCount: number;
  cost: number;
  mass: number;
  powerMargin: number;
  anomalies: number;
  health: number;
  reasons: string[];
  scenario: string | null;
  challengePassed: boolean;
  decisions?: DecisionRecord[];
  breakdown?: ScoreBreakdown;
  log: LogEntry[];
}
export function scoreFlight(d: Design, f: Flight): Result {
  if (!f.completed) throw new Error("Complete the mission before scoring.");
  const m = calculate(d);
  const healthFactor = f.health / 100;
  const science = Math.max(
    0,
    Math.round((m.science + f.scienceDelta) * healthFactor * (f.operations ? scienceYield(d, f.operations) : 1)),
  );
  const completed = m.covered.filter(id => f.health >= 35 && science >= 15 &&
    (!f.operations || m.payload.some(p=>p.supports.includes(id) && (f.operations!.data.find(r=>r.id===p.id)?.delivered??0)>0)));
  const completion = completed.length / Math.max(1, d.objectives.length);
  const engineering = clamp(
    40 +
      Math.min(20, ((f.operations ? Math.max(0, m.margin + f.powerDelta) : m.margin) / Math.max(1, m.generation)) * 40) +
      Math.min(20, (1 - m.mass / m.massLimit) * 35) +
      Math.min(20, m.payloadFraction),
  );
  const reference = Number.isFinite(m.budget) ? m.budget : m.mission.budget;
  const budgetEfficiency = clamp(100 * (1 - (m.cost / reference) * 0.65));
  const rawSuccess = Math.round(
    clamp(f.health * 0.5 + completion * 30 + m.reliability * 0.2),
  );
  const failed = f.health < 25 || completed.length === 0;
  const success = failed ? Math.min(rawSuccess, 24) : rawSuccess;
  const score = Math.round(
    clamp(
      success * 0.4 +
        Math.min(100, science) * 0.3 +
        engineering * 0.15 +
        budgetEfficiency * 0.15,
    ),
  );
  const grade = failed
    ? "Mission Failed"
    : score >= 88
      ? "S"
      : score >= 76
        ? "A"
        : score >= 62
          ? "B"
          : "C";
  const scenario = scenarios.find((s) => s.id === d.scenario);
  const challengePassed =
    !!scenario &&
    d.mode === "challenge" &&
    d.mission === scenario.mission &&
    m.cost <= scenario.budget &&
    m.mass <= scenario.mass &&
    m.issues.length === 0 &&
    !failed &&
    (!d.scenario ||
      (d.scenario === "budget" && m.cost <= 140) ||
      (d.scenario === "mars500" && m.cost <= 500 && science >= 100) ||
      (d.scenario === "lightmoon" &&
        m.mass <= 1500 &&
        completed.length === d.objectives.length) ||
      (d.scenario === "voyager" && f.health >= 70) ||
      (d.scenario === "reliable" && m.reliability >= 95));
  const reasons = [
    `${completed.length}/${d.objectives.length} objectives completed: ${completion === 1 ? "your instrument selection covered the full science plan" : m.covered.length < d.objectives.length ? "some objectives lacked matching instruments" : f.health < 35 ? "spacecraft health fell below the 35% science threshold" : "final science fell below the 15-point completion threshold"}.`,
    `Flight decisions ${f.scienceDelta >= 0 ? "added" : "cost"} ${Math.abs(f.scienceDelta)} science points before the ${Math.round(healthFactor * 100)}% health multiplier.`,
    `${m.reliability.toFixed(1)}% design reliability and ${f.health}% remaining health ${failed ? "could not preserve the science mission" : "kept the mission operational"}.`,
    `Engineering efficiency rewards usable power headroom, launch mass headroom, and scientific payload fraction. Budget efficiency rewards money saved against the mission allocation.`,
  ];
  if (f.operations) {
    const totals=dataTotals(f.operations);
    reasons.push(`Operations model v2: ${m.duration.toFixed(1)} planned months; ${(Math.max(0,f.operations.elapsedHours-4)/720).toFixed(1)} simulated science months.`,
      `Data: ${totals.generated.toFixed(1)} GB generated, ${totals.delivered.toFixed(1)} GB delivered, ${totals.buffered.toFixed(1)} GB buffered, ${totals.lost.toFixed(1)} GB lost.`,
      `Delivered science × duration multiplier: ${scienceYield(d,f.operations).toFixed(3)}. Unserved energy: ${f.operations.unservedKWh.toFixed(2)} kWh.`,
      ...operationalAdvice(d,f.operations));
  }
  if (d.scenario)
    reasons.push(
      `${scenarios.find((s) => s.id === d.scenario)?.name}: ${challengePassed ? "challenge completed" : "challenge target not met"}.`,
    );
  return {
    scoringVersion: f.operations ? 2 : 1,
    operations: f.operations,
    plannedDurationMonths: m.duration,
    id: f.id,
    configurationKey: configurationKey(d),
    telemetry: f.telemetry,
    name: d.name,
    mission: m.mission.name,
    mode: d.mode,
    date: new Date().toISOString(),
    grade,
    score: failed ? Math.min(30, score) : score,
    success,
    science,
    engineering: Math.round(engineering),
    budgetEfficiency: Math.round(budgetEfficiency),
    reliability: m.reliability,
    objectives: completed.map(
      (id) => objectives.find((o) => o.id === id)!.name,
    ),
    objectiveCount: d.objectives.length,
    cost: m.cost,
    mass: m.dryMass + f.fuel,
    powerMargin: m.margin + f.powerDelta,
    anomalies: f.anomalies,
    health: f.health,
    reasons,
    scenario: d.scenario,
    challengePassed,
    decisions: f.decisions,
    breakdown: {
      deliveryMultiplier: f.operations ? scienceYield(d,f.operations) : undefined,
      baseScience: m.science,
      decisionScience: f.scienceDelta,
      healthMultiplier: healthFactor,
      contributions: [
        { label: "Mission success", points: success * 0.4, maximum: 40 },
        {
          label: "Science return",
          points: Math.min(100, science) * 0.3,
          maximum: 30,
        },
        { label: "Engineering", points: engineering * 0.15, maximum: 15 },
        { label: "Budget", points: budgetEfficiency * 0.15, maximum: 15 },
      ],
    },
    log: f.log,
  };
}
