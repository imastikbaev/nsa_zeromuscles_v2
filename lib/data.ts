export type Mode = "guided" | "challenge" | "sandbox";
export type MissionId =
  | "earth"
  | "lunar"
  | "mars"
  | "asteroid"
  | "solar"
  | "deep";
export type Category =
  | "propulsion"
  | "power"
  | "communications"
  | "computer"
  | "thermal"
  | "antenna";
export interface Mission {
  id: MissionId;
  name: string;
  description: string;
  label: string;
  budget: number;
  duration: number;
  orbit: string;
  objectives: string[];
  color: string;
}
export const missions: Mission[] = [
  {
    id: "earth",
    name: "Earth Observation",
    description: "Image Earth’s surface and monitor climate.",
    label: "EARTH SCIENCE / REMOTE SENSING",
    budget: 180,
    duration: 12,
    orbit: "sso",
    objectives: ["imaging", "climate", "terrain"],
    color: "#6dbbdf",
  },
  {
    id: "lunar",
    name: "Lunar Mission",
    description: "Map lunar terrain and identify surface minerals.",
    label: "LUNAR SCIENCE / ORBITAL SURVEY",
    budget: 300,
    duration: 18,
    orbit: "lunar",
    objectives: ["minerals", "terrain", "radiation"],
    color: "#b6b5c0",
  },
  {
    id: "mars",
    name: "Mars Orbiter",
    description: "Study the atmosphere and map the Martian surface.",
    label: "MARS SCIENCE / ORBITAL SURVEY",
    budget: 500,
    duration: 30,
    orbit: "mars",
    objectives: ["atmosphere", "minerals", "terrain"],
    color: "#d8835d",
  },
  {
    id: "asteroid",
    name: "Asteroid Explorer",
    description: "Survey a small body’s shape and composition.",
    label: "SMALL BODIES / RENDEZVOUS",
    budget: 550,
    duration: 36,
    orbit: "transfer",
    objectives: ["minerals", "imaging", "terrain"],
    color: "#9e9486",
  },
  {
    id: "solar",
    name: "Solar Observation",
    description: "Measure solar radiation and plasma conditions.",
    label: "HELIOPHYSICS / SOLAR MONITORING",
    budget: 450,
    duration: 24,
    orbit: "solar",
    objectives: ["radiation", "atmosphere"],
    color: "#ffbd5a",
  },
  {
    id: "deep",
    name: "Deep Space Mission",
    description: "Measure radiation beyond the inner solar system.",
    label: "THE NEXT FRONTIER",
    budget: 800,
    duration: 72,
    orbit: "deep",
    objectives: ["radiation", "imaging", "minerals"],
    color: "#b0a1e0",
  },
];
export const objectives = [
  {
    id: "imaging",
    name: "High-resolution imaging",
    description: "Resolve fine surface details from orbit.",
  },
  {
    id: "atmosphere",
    name: "Study the atmosphere",
    description: "Measure gases and atmospheric composition.",
  },
  {
    id: "minerals",
    name: "Detect water & minerals",
    description: "Read spectral signatures of ice and rock.",
  },
  {
    id: "climate",
    name: "Monitor climate",
    description: "Track long-term changes in temperature.",
  },
  {
    id: "radiation",
    name: "Study radiation",
    description: "Measure energetic particles in space.",
  },
  {
    id: "terrain",
    name: "Map the terrain",
    description: "Build detailed elevation maps.",
  },
];
export interface Component {
  id: string;
  name: string;
  description: string;
  mass: number;
  cost: number;
  power: number;
  reliability: number;
  science: number;
  bandwidth: number;
  data: number;
  supports: string[];
  pro: string;
  con: string;
  isp?: number;
  generation?: number;
  storage?: number;
  protection?: number;
}
export const instruments: Component[] = [
  {
    id: "camera",
    name: "Optical camera",
    description: "Multispectral imaging · 5 m resolution",
    mass: 45,
    cost: 18,
    power: 90,
    reliability: 0.985,
    science: 22,
    bandwidth: 0,
    data: 8,
    supports: ["imaging", "terrain"],
    pro: "Lightweight, versatile imaging",
    con: "Cannot see through cloud cover",
  },
  {
    id: "hires",
    name: "High-resolution camera",
    description: "Precision optics · 0.5 m resolution",
    mass: 125,
    cost: 48,
    power: 250,
    reliability: 0.96,
    science: 40,
    bandwidth: 0,
    data: 32,
    supports: ["imaging", "terrain"],
    pro: "Exceptional surface detail",
    con: "High power and data demand",
  },
  {
    id: "spectrometer",
    name: "Spectrometer",
    description: "Infrared analysis · 400 spectral bands",
    mass: 60,
    cost: 30,
    power: 110,
    reliability: 0.975,
    science: 30,
    bandwidth: 0,
    data: 10,
    supports: ["minerals", "atmosphere"],
    pro: "Reveals water and chemical composition",
    con: "Needs precise thermal stability",
  },
  {
    id: "radiometer",
    name: "Thermal radiometer",
    description: "Surface temperature · ±0.3 K precision",
    mass: 35,
    cost: 22,
    power: 65,
    reliability: 0.985,
    science: 24,
    bandwidth: 0,
    data: 6,
    supports: ["climate", "atmosphere"],
    pro: "Day and night climate measurements",
    con: "Less spatial detail than a camera",
  },
  {
    id: "radar",
    name: "Synthetic aperture radar",
    description: "All-weather mapping · 3 m resolution",
    mass: 180,
    cost: 62,
    power: 420,
    reliability: 0.955,
    science: 42,
    bandwidth: 0,
    data: 40,
    supports: ["terrain", "climate"],
    pro: "Sees through clouds and darkness",
    con: "Heavy, power-hungry payload",
  },
  {
    id: "particles",
    name: "Particle detector",
    description: "Radiation monitoring · 1 keV–100 MeV",
    mass: 22,
    cost: 14,
    power: 35,
    reliability: 0.99,
    science: 20,
    bandwidth: 0,
    data: 2,
    supports: ["radiation"],
    pro: "Low-power space-weather science",
    con: "Specialized to particle measurements",
  },
];
const c = (
  id: string,
  name: string,
  mass: number,
  cost: number,
  power: number,
  reliability: number,
  pro: string,
  con: string,
  extra: Partial<Component> = {},
): Component => ({
  id,
  name,
  mass,
  cost,
  power,
  reliability,
  pro,
  con,
  description: pro,
  science: 0,
  bandwidth: 0,
  data: 0,
  supports: [],
  ...extra,
});
export const systems: Record<Category, Component[]> = {
  propulsion: [
    c(
      "chemical",
      "Chemical thruster",
      65,
      12,
      25,
      0.985,
      "Fast maneuvers and high thrust",
      "Uses more propellant",
      { isp: 320 },
    ),
    c(
      "ion",
      "Ion propulsion",
      90,
      32,
      320,
      0.98,
      "Very efficient: 2,400 s specific impulse",
      "Low thrust increases travel time",
      { isp: 2400 },
    ),
    c(
      "hybrid",
      "Hybrid propulsion",
      130,
      48,
      160,
      0.992,
      "Balances thrust and efficiency",
      "More mass and expense",
      { isp: 950 },
    ),
  ],
  power: [
    c(
      "solar",
      "Solar array",
      25,
      8,
      8,
      0.99,
      "Affordable renewable power near the Sun",
      "Generation falls with distance",
      { generation: 0 },
    ),
    c(
      "rtg",
      "Radioisotope generator",
      120,
      85,
      5,
      0.998,
      "Steady 950 W, even in deep space",
      "Expensive and heavy",
      { generation: 950 },
    ),
    c(
      "advanced",
      "Advanced solar array",
      40,
      24,
      10,
      0.975,
      "45% more output per square meter",
      "Complex deployment reduces reliability",
      { generation: 0 },
    ),
  ],
  communications: [
    c(
      "xband",
      "X-band transceiver",
      22,
      10,
      45,
      0.99,
      "Reliable, proven communication",
      "Moderate data throughput",
      { bandwidth: 32 },
    ),
    c(
      "kaband",
      "Ka-band transceiver",
      40,
      24,
      85,
      0.98,
      "High science-data throughput",
      "More power and precise pointing",
      { bandwidth: 100 },
    ),
    c(
      "laser",
      "Optical laser link",
      30,
      40,
      120,
      0.965,
      "Exceptional bandwidth",
      "Sensitive alignment and deployment",
      { bandwidth: 220 },
    ),
  ],
  computer: [
    c(
      "standard",
      "Flight computer",
      12,
      6,
      22,
      0.98,
      "Lightweight and economical",
      "Limited storage and redundancy",
      { storage: 128 },
    ),
    c(
      "redundant",
      "Redundant computer",
      24,
      16,
      40,
      0.998,
      "Backup processor and error correction",
      "Extra mass and power",
      { storage: 512 },
    ),
    c(
      "science",
      "Science processor",
      28,
      25,
      75,
      0.985,
      "Large buffer for rich science data",
      "Higher continuous power draw",
      { storage: 2048 },
    ),
  ],
  thermal: [
    c(
      "passive",
      "Passive insulation",
      18,
      4,
      0,
      0.975,
      "No power consumption",
      "Limited radiation and heat protection",
      { protection: 0.35 },
    ),
    c(
      "active",
      "Active thermal control",
      45,
      15,
      80,
      0.995,
      "Protects electronics and instruments",
      "Consumes power continuously",
      { protection: 0.85 },
    ),
    c(
      "shield",
      "Radiation & heat shield",
      95,
      35,
      45,
      0.998,
      "Excellent protection in harsh environments",
      "Substantial mass penalty",
      { protection: 1 },
    ),
  ],
  antenna: [
    c(
      "patch",
      "Patch antenna",
      4,
      2,
      2,
      0.995,
      "Compact with no deployment mechanism",
      "Weak at interplanetary distances",
      { bandwidth: 1 },
    ),
    c(
      "dish",
      "High-gain dish",
      25,
      12,
      10,
      0.98,
      "12× link gain for distant missions",
      "Requires accurate Earth pointing",
      { bandwidth: 12 },
    ),
    c(
      "array",
      "Phased array",
      42,
      28,
      35,
      0.99,
      "30× link gain and electronic steering",
      "Expensive and power-intensive",
      { bandwidth: 30 },
    ),
  ],
};
export const categoryLabels: Record<Category, string> = {
  propulsion: "Propulsion",
  power: "Power system",
  communications: "Communications",
  computer: "Onboard computer",
  thermal: "Thermal control",
  antenna: "Antenna",
};
export interface Launcher {
  id: string;
  name: string;
  class: string;
  payload: number;
  cost: number;
  reliability: number;
  destinations: MissionId[];
  description: string;
}
export const launchers: Launcher[] = [
  {
    id: "swift",
    name: "Swift 1",
    class: "LIGHT LIFT",
    payload: 850,
    cost: 18,
    reliability: 0.965,
    destinations: ["earth"],
    description: "A compact, affordable ride to low Earth orbit.",
  },
  {
    id: "atlas",
    name: "Atlas Nova",
    class: "MEDIUM LIFT",
    payload: 2200,
    cost: 42,
    reliability: 0.985,
    destinations: ["earth", "lunar", "solar"],
    description: "A dependable workhorse for near-Earth exploration.",
  },
  {
    id: "titan",
    name: "Titan Heavy",
    class: "HEAVY LIFT",
    payload: 6000,
    cost: 85,
    reliability: 0.975,
    destinations: ["earth", "lunar", "mars", "asteroid", "solar"],
    description: "Serious lift for ambitious interplanetary missions.",
  },
  {
    id: "horizon",
    name: "Horizon X",
    class: "DEEP SPACE",
    payload: 9500,
    cost: 130,
    reliability: 0.99,
    destinations: ["earth", "lunar", "mars", "asteroid", "solar", "deep"],
    description: "High-energy departure for the furthest frontiers.",
  },
];
export interface Orbit {
  id: string;
  name: string;
  short: string;
  destinations: MissionId[];
  altitude: string;
  period: string;
  delay: number;
  radiation: number;
  sun: number;
  science: number;
  duration: number;
  deltaV: number;
  distance: number;
  description: string;
}
export const orbits: Orbit[] = [
  {
    id: "leo",
    name: "Low Earth Orbit",
    short: "LEO",
    destinations: ["earth"],
    altitude: "400 km",
    period: "92 min",
    delay: 0.003,
    radiation: 0.1,
    sun: 1,
    science: 1,
    duration: 1,
    deltaV: 250,
    distance: 1,
    description:
      "Close to Earth: sharp images, strong links, frequent eclipses.",
  },
  {
    id: "sso",
    name: "Sun-Synchronous Orbit",
    short: "SSO",
    destinations: ["earth"],
    altitude: "550 km",
    period: "96 min",
    delay: 0.004,
    radiation: 0.15,
    sun: 1,
    science: 1.18,
    duration: 1,
    deltaV: 350,
    distance: 1.2,
    description:
      "Pass each location at the same solar time for consistent measurements.",
  },
  {
    id: "geo",
    name: "Geostationary Orbit",
    short: "GEO",
    destinations: ["earth"],
    altitude: "35,786 km",
    period: "24 h",
    delay: 0.12,
    radiation: 0.5,
    sun: 1.1,
    science: 0.95,
    duration: 1.2,
    deltaV: 1600,
    distance: 6,
    description:
      "Stay above one location, with higher radiation and fuel requirements.",
  },
  {
    id: "lunar",
    name: "Lunar Orbit",
    short: "LLO",
    destinations: ["lunar"],
    altitude: "100 km",
    period: "118 min",
    delay: 1.3,
    radiation: 0.4,
    sun: 0.95,
    science: 1.15,
    duration: 1,
    deltaV: 900,
    distance: 9,
    description: "Survey the Moon with modest delays and challenging shadows.",
  },
  {
    id: "mars",
    name: "Mars Orbit",
    short: "MRO",
    destinations: ["mars"],
    altitude: "300 km",
    period: "113 min",
    delay: 720,
    radiation: 0.65,
    sun: 0.43,
    science: 1.4,
    duration: 1.15,
    deltaV: 1300,
    distance: 25,
    description:
      "Rich science rewards; weak sunlight and long communication delays.",
  },
  {
    id: "transfer",
    name: "Asteroid Transfer Orbit",
    short: "HEO",
    destinations: ["asteroid"],
    altitude: "2.2 AU",
    period: "3.3 yr",
    delay: 1100,
    radiation: 0.75,
    sun: 0.24,
    science: 1.5,
    duration: 1.3,
    deltaV: 2100,
    distance: 40,
    description: "A fuel-intensive rendezvous with a small, distant target.",
  },
  {
    id: "solar",
    name: "Solar Observation Orbit",
    short: "HELIO",
    destinations: ["solar"],
    altitude: "0.7 AU",
    period: "214 d",
    delay: 150,
    radiation: 1,
    sun: 1.8,
    science: 1.35,
    duration: 1.1,
    deltaV: 1500,
    distance: 15,
    description:
      "Ample sunlight but extreme heat and radiation demand protection.",
  },
  {
    id: "deep",
    name: "Deep-space Trajectory",
    short: "ESC",
    destinations: ["deep"],
    altitude: "5.2 AU",
    period: "Escape",
    delay: 2600,
    radiation: 0.9,
    sun: 0.037,
    science: 1.8,
    duration: 1.5,
    deltaV: 3000,
    distance: 80,
    description:
      "Beyond the inner planets: bring autonomous systems and nuclear power.",
  },
];
export interface EngineeringRequirements {
  massReserve: number; // % of launch capacity held for growth
  powerReserve: number; // % of operating load required as end-of-life headroom
  solarDegradation: number; // % annual compound loss of solar output
}
export const nominalRequirements: EngineeringRequirements = {
  massReserve: 0,
  powerReserve: 0,
  solarDegradation: 0,
};
export interface Design {
  requirements?: EngineeringRequirements;
  name: string;
  mission: MissionId;
  mode: Mode;
  objectives: string[];
  instruments: string[];
  systems: Record<Category, string>;
  fuel: number;
  battery: number;
  panels: number;
  launcher: string;
  orbit: string;
  scenario: string | null;
}
export const defaultDesign: Design = {
  name: "Terra Pathfinder",
  mission: "earth",
  mode: "guided",
  objectives: ["imaging", "climate"],
  instruments: ["camera", "radiometer"],
  systems: {
    propulsion: "chemical",
    power: "solar",
    communications: "xband",
    computer: "standard",
    thermal: "passive",
    antenna: "patch",
  },
  fuel: 100,
  battery: 1.2,
  panels: 6,
  launcher: "swift",
  orbit: "sso",
  scenario: null,
};
export const scenarios = [
  {
    id: "budget",
    name: "Small budget. Big picture.",
    description: "Build the cheapest successful Earth observation satellite.",
    mission: "earth" as MissionId,
    budget: 140,
    mass: Infinity,
    goal: "Minimize mission cost",
    icon: "coins",
  },
  {
    id: "mars500",
    name: "The $500M Mars challenge",
    description: "Maximize science on the red planet under $500M.",
    mission: "mars" as MissionId,
    budget: 500,
    mass: Infinity,
    goal: "Earn at least 100 science",
    icon: "planet",
  },
  {
    id: "lightmoon",
    name: "A lighter lunar footprint",
    description: "Explore the Moon with a spacecraft under 1,500 kg.",
    mission: "lunar" as MissionId,
    budget: 300,
    mass: 1500,
    goal: "Complete every objective",
    icon: "moon",
  },
  {
    id: "voyager",
    name: "The long way home",
    description: "Survive a long-duration deep-space mission.",
    mission: "deep" as MissionId,
    budget: 800,
    mass: Infinity,
    goal: "Finish with ≥ 70% health",
    icon: "orbit",
  },
  {
    id: "reliable",
    name: "Failure is not an option",
    description: "Design a satellite with maximum reliability.",
    mission: "earth" as MissionId,
    budget: 300,
    mass: Infinity,
    goal: "Reach ≥ 95% design reliability",
    icon: "shield",
  },
];
export const glossary: Record<string, string> = {
  Payload:
    "The instruments your spacecraft carries to do its job. The launch vehicle must lift the entire spacecraft, not just its payload.",
  "Delta-v":
    "Your spacecraft’s speed-change budget. More delta-v means more ability to change orbit. It depends on fuel and engine efficiency.",
  "Orbital altitude":
    "Height above the surface. Low orbits give detailed images; high orbits see more area at once.",
  Thrust:
    "The push an engine produces. High thrust makes quick maneuvers; low-thrust engines may burn for months.",
  "Specific impulse":
    "A measure of fuel efficiency, in seconds. A higher value means you get more speed change from the same propellant.",
  Radiation:
    "Fast particles that can damage electronics. Shielding and redundant computers improve survival.",
  Telemetry:
    "Health reports sent by a spacecraft, including temperature, battery level, and instrument status.",
  "Link budget":
    "Whether a radio signal remains strong enough after spreading across space. Antenna gain helps; distance hurts.",
  "Power margin":
    "Generated power minus power used. A positive margin lets you charge batteries and handle unexpected demand.",
  Redundancy:
    "Carrying a backup so the mission can continue when one component fails. Backups add cost, mass, and power use.",
  "Payload mass fraction":
    "Instrument mass divided by total spacecraft mass. A higher fraction means more of your spacecraft is doing science.",
};
