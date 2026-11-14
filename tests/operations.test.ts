import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultDesign } from '../lib/data';
import { createOperations, operatePower, validOperations } from '../lib/operations';
import { createFlight, setFlightOperations } from '../lib/simulation';
test('battery covers a short deficit, depletes under sustained loss and recharges', () => {
    const d = defaultDesign, initial = createOperations(d);
    const short = operatePower(d, initial, -10000, 0.1);
    assert(short.batteryKWh < d.battery);
    assert(!short.safeMode);
    const depleted = operatePower(d, short, -10000, 20);
    assert.equal(depleted.batteryKWh, 0);
    assert(depleted.safeMode);
    assert(depleted.unservedKWh > 0);
    const recovered = operatePower(d, depleted, 0, 20);
    assert.equal(recovered.batteryKWh, d.battery);
    assert(!recovered.safeMode);
    assert(validOperations(recovered, d));
    assert(!validOperations({ ...recovered, batteryKWh: 100 }, d));
});
test('duty control lowers load; paused and completed flights reject changes', () => {
    const f = createFlight(defaultDesign);
    const reduced = setFlightOperations(f, { duty: 0.5, downlink: false });
    assert(operatePower(defaultDesign, reduced.operations!, 0, 1).loadW < operatePower(defaultDesign, f.operations!, 0, 1).loadW);
    const paused = { ...f, paused: true };
    assert.equal(setFlightOperations(paused, { duty: 0 }), paused);
    const done = { ...f, completed: true };
    assert.equal(setFlightOperations(done, { duty: 0 }), done);
    assert.throws(() => setFlightOperations(f, { duty: 2 }));
});
test('data is conserved through finite storage, downlink and discard', async () => {
    const { operateData, dataTotals, discardBuffered } = await import('../lib/operations');
    let o = createOperations(defaultDesign);
    o = operateData(defaultDesign, { ...o, downlink: false }, 1000, 1);
    const full = dataTotals(o);
    assert(full.lost > 0);
    assert.equal(full.delivered, 0);
    assert(Math.abs(full.generated - full.buffered - full.lost) < 1e-6);
    o = operateData(defaultDesign, { ...o, duty: 0, downlink: true }, 1000, 1);
    assert(dataTotals(o).delivered > 0);
    assert.equal(dataTotals(o).buffered, 0);
    assert(validOperations(o, defaultDesign));
    o = discardBuffered(operateData(defaultDesign, { ...o, duty: 1, downlink: false }, 1, 1));
    assert.equal(dataTotals(o).buffered, 0);
    assert(validOperations(o, defaultDesign));
    const unpowered = operateData(defaultDesign, createOperations(defaultDesign), 24, 0);
    assert.equal(dataTotals(unpowered).generated, 0);
});
test('orbit windows and duration affect science, power and cost; duration is portable', async () => {
    const { operateInterval, dataTotals } = await import('../lib/operations');
    const { calculate } = await import('../lib/engineering');
    const { encodeDesign, decodeDesign } = await import('../lib/projects');
    const { configurationKey } = await import('../lib/design-identity');
    const d = { ...defaultDesign, durationMonths: 6 };
    const sso = operateInterval(d, createOperations(d), 0, 24);
    const geoD = { ...d, orbit: 'geo' };
    const geo = operateInterval(geoD, createOperations(geoD), 0, 24);
    assert.notEqual(dataTotals(sso).generated, dataTotals(geo).generated);
    const longer = { ...d, durationMonths: 24 };
    assert(calculate(longer).cost > calculate(d).cost);
    assert.equal(decodeDesign(encodeDesign(d)).durationMonths, 6);
    assert.notEqual(configurationKey(d), configurationKey(longer));
    const zero = operateInterval(d, createOperations(d), -10000, 24);
    assert(dataTotals(zero).generated < dataTotals(sso).generated);
    assert(validOperations(sso, d));
});
test('delivered data gates science and legacy completed flights retain v1 scoring', async () => {
    const { advanceFlight, pendingEvent, resolveEvent, scoreFlight } = await import('../lib/simulation');
    const finish = (transmit: boolean) => {
        let f = setFlightOperations(createFlight(defaultDesign, () => .9), { downlink: transmit });
        while (!f.completed) {
            const e = pendingEvent(f);
            f = e ? resolveEvent(f, defaultDesign, e.choices.findIndex(c => c.fuel <= f.fuel), () => .99) : advanceFlight(f, defaultDesign, () => 0);
        }
        return f;
    };
    const delivered = scoreFlight(defaultDesign, finish(true)), silent = scoreFlight(defaultDesign, finish(false));
    assert(delivered.science > silent.science);
    assert.equal(silent.science, 0);
    assert.equal(silent.grade, 'Mission Failed');
    assert.equal(delivered.scoringVersion, 2);
    const legacy = scoreFlight(defaultDesign, { ...finish(true), operations: undefined });
    assert.equal(legacy.scoringVersion, 1);
});
test('individual instruments can be disabled and commands cannot inject simulator state', async () => {
    const { operateData } = await import('../lib/operations');
    const f = createFlight(defaultDesign);
    const changed = setFlightOperations(f, { disabledInstruments: ['camera'], ...({ elapsedHours: 9999, data: [] } as {}) });
    assert.equal(changed.operations!.elapsedHours, 0);
    assert.equal(changed.operations!.data.length, 2);
    const o = operateData(defaultDesign, changed.operations!, 24, 1);
    assert.equal(o.data.find(r => r.id === 'camera')!.generated, 0);
    assert(o.data.find(r => r.id === 'radiometer')!.generated > 0);
    assert(!validOperations({ ...o, data: [null, null] }, defaultDesign));
});

test('versioned exports and checkpoints keep legacy imports readable', async () => {
 const {encodeDesign,decodeDesign}=await import('../lib/projects');
 const {validCheckpoint}=await import('../lib/storage');
 const file=JSON.parse(encodeDesign({...defaultDesign,durationMonths:24}));
 assert.equal(file.version,2); assert.equal(decodeDesign(JSON.stringify(file)).durationMonths,24);
 const old={...file,version:1,design:defaultDesign};assert.deepEqual(decodeDesign(JSON.stringify(old)),defaultDesign);
 const c={version:2,design:defaultDesign,flight:createFlight(defaultDesign),savedAt:new Date().toISOString()};
 assert(validCheckpoint(c));assert(!validCheckpoint({...c,flight:{...c.flight,operations:undefined}}));
 assert(validCheckpoint({...c,version:1,flight:{...c.flight,operations:undefined}}));
});
