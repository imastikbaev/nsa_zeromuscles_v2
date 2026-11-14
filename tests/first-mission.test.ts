import test from 'node:test';
import assert from 'node:assert/strict';
import { firstMission, sufficientPanels } from '../lib/first-mission';
import { calculate } from '../lib/engineering';
import { createFlight, advanceFlight } from '../lib/simulation';
for (const camera of ['camera', 'hires'] as const) {
  test(`first mission: ${camera} teaches power shortage and can clear every launch gate`, () => {
    const initial = firstMission(camera);
    assert.ok(calculate(initial).designPowerMargin < 0);
    const fixed = { ...initial, panels: sufficientPanels(initial) };
    assert.deepEqual(calculate(fixed).issues, []);
    assert.ok(fixed.panels >= 1 && fixed.panels <= 12);
    const flight = createFlight(fixed);
    assert.equal(flight.operations?.version, 2);
    assert.ok(advanceFlight(flight, fixed));
  });
}
