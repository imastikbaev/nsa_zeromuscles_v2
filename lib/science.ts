/** Inverse-square irradiance relative to Earth's mean solar distance (1 AU).
 * Source: NASA/JPL, Calculating Solar Power in Space, updated 2024-10-21.
 * This isolated experiment ignores panel angle, temperature, eclipses and degradation.
 * It is not a replacement for the mission model's combined orbit.sun coefficient. */
export function relativeSolarFlux(distanceAU: number) {
  if (!Number.isFinite(distanceAU) || distanceAU <= 0)
    throw new RangeError("Distance must be positive.");
  return 1 / distanceAU ** 2;
}
export const scienceSources = [
  {
    title: "Solar power and distance",
    url: "https://www.jpl.nasa.gov/edu/resources/lesson-plan/calculating-solar-power-in-space/",
    principle:
      "Sunlight spreads with distance. Twice as far from the Sun means one quarter of the incoming solar energy per square meter.",
    model:
      "Our mission model uses panel area, a catalog orbit coefficient, and optional annual degradation. Panel orientation and temperature are not solved.",
  },
  {
    title: "Heat must leave the spacecraft",
    url: "https://www.nasa.gov/smallsat-institute/sst-soa/thermal-control/",
    principle:
      "Electronics produce heat. Spacecraft use coatings, insulation, heat paths, and radiators to keep equipment within operating temperatures.",
    model:
      "Our thermal systems use simplified protection ratings. The simulator does not calculate temperatures or prove thermal safety.",
  },
  {
    title: "Subsystems depend on each other",
    url: "https://science.nasa.gov/learn/basics-of-space-flight/chapter11-1/",
    principle:
      "A spacecraft needs power, communication, data handling, propulsion, and thermal control together. A scientific instrument cannot operate in isolation.",
    model:
      "Equipment masses, prices, science points, and reliability ratings in this catalog are fictional teaching assumptions, not NASA hardware specifications.",
  },
] as const;
