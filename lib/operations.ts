import type { Design } from "./data";
import { operatingProfile } from "./orbit-operations";
import { calculate, type Metrics } from "./engineering";
export interface Operations {
    version: 2;
    data: {
        id: string;
        generated: number;
        buffered: number;
        delivered: number;
        lost: number;
    }[];
    priority: string | null;
    disabledInstruments?: string[];
    elapsedHours: number;
    batteryKWh: number;
    duty: number;
    downlink: boolean;
    safeMode: boolean;
    poweredHours: number;
    requestedHours: number;
    generationW: number;
    loadW: number;
    unservedKWh: number;
}
export function createOperations(d: Design): Operations {
    const m = calculate(d);
    return { version: 2, data: m.payload.map(p => ({ id: p.id, generated: 0, buffered: 0, delivered: 0, lost: 0 })), priority: null, disabledInstruments: [], elapsedHours: 0, batteryKWh: d.battery, duty: 1,
        downlink: true, safeMode: false, poweredHours: 0, requestedHours: 0,
        generationW: m.generation, loadW: m.consumption, unservedKWh: 0 };
}
/** Educational energy balance. W × hours / 1000 = kWh. */
export function operatePower(d: Design, state: Operations, damageW: number, hours: number, m: Metrics = calculate(d), generationOverride?: number): Operations {
    const payloadW = m.payload.reduce((n, p) => n + p.power, 0);
    const disabledW = m.payload.filter(p => (state.disabledInstruments ?? []).includes(p.id)).reduce((n, p) => n + p.power, 0);
    const radioW = m.selected[2].power;
    const loadW = m.consumption - payloadW * (1 - state.duty) - disabledW * state.duty - (state.downlink ? 0 : radioW);
    const generationW = Math.max(0, (generationOverride ?? m.generation) + damageW);
    const need = Math.max(0, loadW - generationW) * hours / 1000;
    const shortage = Math.max(0, need - state.batteryKWh);
    const served = loadW > 0 ? Math.max(0, 1 - shortage / (loadW * hours / 1000 || 1)) : 1;
    return { ...state, elapsedHours: state.elapsedHours + hours, generationW, loadW,
        batteryKWh: Math.max(0, Math.min(d.battery, state.batteryKWh + (generationW - loadW) * hours / 1000)),
        safeMode: shortage > 0, unservedKWh: state.unservedKWh + shortage,
        requestedHours: state.requestedHours + hours,
        poweredHours: state.poweredHours + hours * served * state.duty };
}
export function validOperations(o: unknown, d: Design): o is Operations {
    if (!o || typeof o !== "object")
        return false;
    const s = o as Operations;
    const ids = new Set(d.instruments);
    return Array.isArray(s.data) && s.data.length === ids.size && new Set(s.data.map(r => r?.id)).size === ids.size &&
        s.data.every(r => r && ids.has(r.id) && [r.generated, r.buffered, r.delivered, r.lost].every(n => Number.isFinite(n) && n >= 0) && Math.abs(r.generated - r.buffered - r.delivered - r.lost) < 1e-5 * Math.max(1, r.generated)) &&
        s.data.reduce((n, r) => n + r.buffered, 0) <= calculate(d).storage + 1e-7 &&
        (s.disabledInstruments === undefined || (Array.isArray(s.disabledInstruments) && s.disabledInstruments.every(id => ids.has(id)) && new Set(s.disabledInstruments).size === s.disabledInstruments.length)) &&
        (s.priority === null || ids.has(s.priority)) && s.version === 2 && typeof s.downlink === "boolean" && typeof s.safeMode === "boolean" &&
        [s.elapsedHours, s.batteryKWh, s.duty, s.poweredHours, s.requestedHours, s.generationW, s.loadW, s.unservedKWh].every(n => Number.isFinite(n) && n >= 0) &&
        s.batteryKWh <= d.battery && s.duty <= 1 && s.poweredHours <= s.requestedHours + 1e-8;
}
/** Catalog instrument data is interpreted as GB per 24 hours at full observation duty. */
export function operateData(d: Design, state: Operations, hours: number, poweredFraction: number, observing = 1, contact = 1, m: Metrics = calculate(d)): Operations {
    const data = state.data.map(r => ({ ...r }));
    let free = Math.max(0, m.storage - data.reduce((n, r) => n + r.buffered, 0));
    for (const row of data) {
        const instrument = m.payload.find(p => p.id === row.id)!;
        const generated = instrument.data / 24 * hours * state.duty * poweredFraction * observing * ((state.disabledInstruments ?? []).includes(row.id) ? 0 : 1);
        const kept = Math.min(free, generated);
        row.generated += generated;
        row.buffered += kept;
        row.lost += generated - kept;
        free -= kept;
    }
    let capacity = state.downlink ? m.bandwidth * 3600 / 8000 * hours * contact * poweredFraction : 0;
    const ordered = [...data].sort((a, b) => Number(b.id === state.priority) - Number(a.id === state.priority));
    for (const row of ordered) {
        const sent = Math.min(capacity, row.buffered);
        row.buffered -= sent;
        row.delivered += sent;
        capacity -= sent;
    }
    return { ...state, data };
}
export function discardBuffered(state: Operations): Operations {
    return { ...state, data: state.data.map(r => ({ ...r, lost: r.lost + r.buffered, buffered: 0 })) };
}
export function dataTotals(state: Operations) {
    return state.data.reduce((a, r) => ({ generated: a.generated + r.generated, buffered: a.buffered + r.buffered, delivered: a.delivered + r.delivered, lost: a.lost + r.lost }), { generated: 0, buffered: 0, delivered: 0, lost: 0 });
}
export interface IntervalReport {
    hours: number;
    scienceActive: boolean;
    generated: number;
    delivered: number;
    lost: number;
    buffered: number;
    batteryBefore: number;
    batteryAfter: number;
    unservedKWh: number;
    duty: number;
    downlink: boolean;
    disabledCount: number;
}
export function intervalReport(before: Operations, after: Operations, scienceActive: boolean): IntervalReport {
    const a = dataTotals(before), b = dataTotals(after);
    return {
        hours: after.elapsedHours - before.elapsedHours, scienceActive,
        generated: Math.max(0, b.generated - a.generated),
        delivered: Math.max(0, b.delivered - a.delivered),
        lost: Math.max(0, b.lost - a.lost), buffered: b.buffered,
        batteryBefore: before.batteryKWh, batteryAfter: after.batteryKWh,
        unservedKWh: Math.max(0, after.unservedKWh - before.unservedKWh),
        duty: before.duty, downlink: before.downlink,
        disabledCount: before.disabledInstruments?.length ?? 0,
    };
}
export function validIntervalReport(value: unknown): value is IntervalReport {
    if (!value || typeof value !== 'object') return false;
    const r = value as IntervalReport;
    return typeof r.scienceActive === 'boolean' && typeof r.downlink === 'boolean' &&
        [r.hours, r.generated, r.delivered, r.lost, r.buffered, r.batteryBefore, r.batteryAfter, r.unservedKWh, r.duty, r.disabledCount].every(n => Number.isFinite(n) && n >= 0) &&
        r.hours > 0 && r.duty <= 1 && Number.isInteger(r.disabledCount);
}
export function operateInterval(d: Design, state: Operations, damageW: number, hours: number, scienceActive = true): Operations {
    const m = calculate(d), profile = operatingProfile(d.orbit);
    let o = state;
    const steps = Math.ceil(hours / 0.5), dt = hours / steps;
    for (let i = 0; i < steps; i++) {
        const cycle = ((o.elapsedHours + dt / 2) % 6) / 6;
        const sunlight = cycle < 1 - profile.eclipse;
        const contact = cycle >= 1 - profile.contact;
        const observing = scienceActive && cycle < profile.observation;
        const age = (1 - (d.requirements?.solarDegradation ?? 0) / 100) ** (o.elapsedHours / (24 * 360));
        const rtg = m.selected[1].generation ?? 0;
        const generation = rtg + (sunlight ? (m.generation - rtg) * age : 0);
        const before = o;
        // Only scheduled payload/radio loads draw power; preserve requested settings afterwards.
        const scheduled = { ...o, duty: observing ? o.duty : 0, downlink: contact && o.downlink };
        const powered = operatePower(d, scheduled, damageW, dt, m, generation);
        const missing = powered.unservedKWh - before.unservedKWh;
        const fraction = powered.loadW ? Math.max(0, 1 - missing / (powered.loadW * dt / 1000)) : 1;
        o = operateData(d, powered, dt, fraction, observing ? 1 : 0, contact ? 1 : 0, m);
        o = { ...o, duty: before.duty, downlink: before.downlink };
    }
    return o;
}
/** Delivered yield relative to the planned observation campaign, weighted by science value. */
export function scienceYield(d: Design, o: Operations): number {
    const m = calculate(d), hours = m.duration * 30 * 24, profile = operatingProfile(d.orbit);
    const value = m.payload.reduce((n, p) => n + p.science, 0);
    const yieldFraction = m.payload.reduce((n, p) => {
        const delivered = o.data.find(r => r.id === p.id)?.delivered ?? 0;
        const target = p.data / 24 * hours * profile.observation;
        return n + p.science * (target > 0 ? Math.min(1, delivered / target) : 0);
    }, 0) / Math.max(1, value);
    const baseline = calculate({ ...d, durationMonths: undefined }).duration;
    return yieldFraction * Math.min(2, Math.sqrt(m.duration / baseline));
}
export function operationalAdvice(d: Design, o: Operations): string[] {
    const m = calculate(d), totals = dataTotals(o), result: string[] = [];
    if (o.unservedKWh > 0)
        result.push("Energy shortfalls reduced powered observation time. Reduce instrument duty during outages.");
    if (totals.lost > 0)
        result.push("Storage overflow or discarded buffers lost science data. Prioritize downlink before collecting more.");
    if (totals.buffered > 0)
        result.push("Some science remained onboard at mission end. Reserve contact windows for transmission.");
    const candidates = [
        { name: "Solar array +2 m²", design: { ...d, panels: Math.min(50, d.panels + 2) } },
        { name: "Battery +1 kWh", design: { ...d, battery: Math.min(10, d.battery + 1) } },
        { name: "Ka-band downlink", design: { ...d, systems: { ...d.systems, communications: "kaband" } } },
    ];
    // Only suggest recognized, launch-feasible alternatives. Recompute coupled budgets.
    for (const candidate of candidates) {
        if (result.length >= 5)
            break;
        let next: ReturnType<typeof calculate>;
        try {
            next = calculate(candidate.design);
        }
        catch {
            continue;
        }
        if (next.issues.length || (next.mass === m.mass && next.cost === m.cost))
            continue;
        result.push(`${candidate.name}: launch checks pass; mass ${next.mass - m.mass >= 0 ? "+" : ""}${(next.mass - m.mass).toFixed(1)} kg, cost ${next.cost - m.cost >= 0 ? "+" : ""}$${(next.cost - m.cost).toFixed(1)}M. Compare before adopting; this does not guarantee a higher score.`);
    }
    return result;
}
