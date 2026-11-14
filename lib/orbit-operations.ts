/** Teaching schedules on a representative 6-hour cycle, not real orbital predictions. */
export const orbitOperations: Record<string, {
    observation: number;
    eclipse: number;
    contact: number;
}> = {
    leo: { observation: .5, eclipse: 1 / 3, contact: 1 / 3 },
    sso: { observation: 2 / 3, eclipse: 1 / 3, contact: 1 / 3 },
    geo: { observation: 5 / 6, eclipse: 1 / 12, contact: 5 / 6 },
    lunar: { observation: .5, eclipse: 1 / 3, contact: .5 },
    mars: { observation: .5, eclipse: 1 / 3, contact: 1 / 3 },
    asteroid: { observation: 2 / 3, eclipse: 1 / 6, contact: 1 / 4 },
    solar: { observation: 5 / 6, eclipse: 0, contact: 1 / 3 },
    deep: { observation: 5 / 6, eclipse: 0, contact: 1 / 6 },
};
export const operatingProfile = (orbit: string) => orbitOperations[orbit] ?? { observation: .5, eclipse: 1 / 6, contact: 1 / 4 };
