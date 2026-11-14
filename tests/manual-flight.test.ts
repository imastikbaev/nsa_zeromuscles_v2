import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultDesign, orbits } from '../lib/data';
import { advanceByCommand, advanceFlight, createFlight, nextIntervalHours, pendingEvent, respondByCommand, scoreFlight, setFlightOperations } from '../lib/simulation';
import { validCheckpoint } from '../lib/storage';
import { dataTotals } from '../lib/operations';
import { operatingProfile, orbitOperations } from '../lib/orbit-operations';

test('manual commands advance one interval, hold at events and resume from saved planning state', () => {
  const d = { ...defaultDesign, durationMonths: 6 };
  let f = { ...createFlight(d, () => .9), paused: true };
  assert.equal(nextIntervalHours(f, d), 1);
  assert.equal(advanceFlight(f, d), f);
  f = advanceByCommand(f, d);
  assert.equal(f.phase, 1);
  assert.equal(f.operations!.elapsedHours, 1);
  assert.equal(f.paused, true);
  assert.equal(f.lastInterval!.scienceActive, false);
  assert.equal(f.lastInterval!.generated, 0);
  f = advanceByCommand(f, d);
  assert(pendingEvent(f));
  assert.equal(advanceByCommand(f, d), f);
  const elapsed = f.operations!.elapsedHours;
  f = respondByCommand(f, d, 0);
  assert.equal(f.paused, true);
  assert.equal(f.operations!.elapsedHours, elapsed);
  assert.equal(f.resolved, 1);
  f = setFlightOperations(f, { duty: .5, disabledInstruments: ['camera'] });
  const checkpoint = JSON.parse(JSON.stringify({ version: 2, design: d, flight: f, savedAt: new Date().toISOString() }));
  assert(validCheckpoint(checkpoint));
  assert(!validCheckpoint({ ...checkpoint, flight: { ...f, lastInterval: { ...f.lastInterval, hours: -1 } } }));
  f = checkpoint.flight;
  assert.equal(advanceFlight(f, d), f);
  assert.equal(f.operations!.duty, .5);
  while (!f.completed) {
    const event = pendingEvent(f);
    const previous = f;
    if (event) f = respondByCommand(f, d, event.choices.findIndex(c => c.fuel <= f.fuel));
    else {
      const hours = nextIntervalHours(f, d);
      f = advanceByCommand(f, d);
      assert.equal(f.operations!.elapsedHours - previous.operations!.elapsedHours, hours);
      const a = dataTotals(previous.operations!), b = dataTotals(f.operations!);
      assert.equal(f.lastInterval!.delivered, b.delivered - a.delivered);
      assert.equal(f.lastInterval!.generated, b.generated - a.generated);
    }
    assert(f.paused);
    assert(validCheckpoint({ version: 2, design: d, flight: f, savedAt: new Date().toISOString() }));
  }
  assert.equal(f.operations!.elapsedHours, 4 + 6 * 720);
  assert.equal(f.operations!.data.find(r => r.id === 'camera')!.generated, 0);
  assert.equal(nextIntervalHours(f, d), 0);
  assert.equal(advanceByCommand(f, d), f);
  assert.deepEqual(scoreFlight(d, f).lastInterval, f.lastInterval);
});

test('every catalog orbit has an explicit operating profile, including asteroid transfer', () => {
  for (const orbit of orbits) assert(Object.hasOwn(orbitOperations, orbit.id), orbit.id);
  assert.equal(operatingProfile('transfer').observation, 2 / 3);
});
