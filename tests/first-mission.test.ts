import test from 'node:test';
import assert from 'node:assert/strict';
import { firstMission, sufficientPanels, type TutorialCameraId } from '../lib/first-mission';
import { calculate } from '../lib/engineering';
import { createFlight, advanceFlight } from '../lib/simulation';

for (const camera of ['camera', 'radiometer', 'spectrometer', 'hires', 'radar'] as const satisfies readonly TutorialCameraId[]) {
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

test('first mission supports custom orbit, secondary sensor, comms, propulsion, and launcher options', () => {
  const custom = firstMission('spectrometer', 3.5, {
    orbit: 'sso',
    secondaryInstrument: 'particles',
    powerType: 'solar',
    battery: 1.4,
    communications: 'xband',
    antenna: 'dish',
    computer: 'redundant',
    propulsion: 'chemical',
    fuel: 110,
    thermal: 'active',
    launcher: 'swift',
  });
  const m = calculate(custom);
  assert.deepEqual(m.issues, []);
  assert.equal(custom.instruments.length, 2);
  assert.equal(custom.systems.antenna, 'dish');
  assert.equal(custom.launcher, 'swift');
});

test('first mission supports switching planets and challenge briefs', () => {
  const marsChallenge = firstMission('spectrometer', 8, {
    mission: 'mars',
    mode: 'challenge',
    scenario: 'mars500',
    orbit: 'mars',
    secondaryInstrument: 'camera',
    powerType: 'solar',
    battery: 1.4,
    communications: 'xband',
    antenna: 'dish',
    computer: 'redundant',
    propulsion: 'ion',
    fuel: 180,
    thermal: 'active',
    launcher: 'titan',
  });
  assert.equal(marsChallenge.mission, 'mars');
  assert.equal(marsChallenge.mode, 'challenge');
  assert.equal(marsChallenge.scenario, 'mars500');
  const poweredMars = { ...marsChallenge, panels: sufficientPanels(marsChallenge) };
  assert.deepEqual(calculate(poweredMars).issues, []);
});

