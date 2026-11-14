import test from 'node:test';
import assert from 'node:assert/strict';
import { firstMission, sufficientPanels } from '../lib/first-mission';
import { type Flight, advanceByCommand, createFlight, pendingEvent, respondByCommand, scoreFlight, setFlightOperations } from '../lib/simulation';
import { readFlight, readRecords, saveFlight, saveResult } from '../lib/storage';

for (const camera of ['camera', 'hires'] as const) {
  test(`tutorial ${camera}: checkpoints survive repeated workspace handoffs through debrief`, () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const data = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    } });
    try {
      const initial = firstMission(camera);
      const design = { ...initial, panels: sufficientPanels(initial), durationMonths: 1 };
      let flight: Flight = { ...createFlight(design, () => .9), paused: true };
      // An instrument disabled in one workspace must remain visible and reversible
      // after restoring in the other; full duty is not an instrument enable command.
      flight = setFlightOperations(flight, { disabledInstruments: [camera], duty: .5, priority: camera, downlink: false });
      assert(saveFlight(design, flight));
      flight = readFlight()!.flight;
      flight = setFlightOperations(flight, { duty: 1 });
      assert.deepEqual(flight.operations!.disabledInstruments, [camera]);
      assert.equal(flight.operations!.priority, camera);
      assert.equal(flight.operations!.downlink, false);
      flight = setFlightOperations(flight, { disabledInstruments: [], downlink: true });
      assert.equal(flight.operations!.elapsedHours, 0);
      assert.deepEqual(flight.operations!.disabledInstruments, []);
      for (let commands = 0; !flight.completed; commands++) {
        assert(commands < 20, 'flight must finish, including restored event decisions');
        assert(saveFlight(design, flight));
        const checkpoint = readFlight();
        assert(checkpoint);
        assert.deepEqual(checkpoint.design, design);
        assert.deepEqual(checkpoint.flight, flight);
        flight = checkpoint.flight;
        const elapsed: number = flight.operations!.elapsedHours;
        flight = setFlightOperations(flight, { duty: .5, downlink: true });
        assert.equal(flight.operations!.elapsedHours, elapsed, 'planning must not consume mission time');
        const event = pendingEvent(flight);
        flight = event
          ? respondByCommand(flight, design, event.choices.findIndex(choice => choice.fuel <= flight.fuel))
          : advanceByCommand(flight, design);
        assert(flight.paused);
      }
      const result = scoreFlight(design, flight);
      assert.equal(flight.operations!.elapsedHours, 724);
      assert(result.lastInterval);
      assert(flight.operations!.data.find(row => row.id === camera)!.generated > 0, 're-enabled camera must collect data');
      assert(saveResult(result));
      assert.deepEqual(readRecords()[0], result);
      assert(saveResult(result));
      assert.equal(readRecords().length, 1, 'a restored debrief must not duplicate results');
    } finally {
      if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });
}
