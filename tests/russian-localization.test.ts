import test from 'node:test';
import assert from 'node:assert/strict';
import * as data from '../lib/data';
import { events, phases, createFlight, pendingEvent, advanceByCommand, respondByCommand, scoreFlight } from '../lib/simulation';
import { translate } from '../lib/i18n';
import { engineeringReport } from '../lib/design-review';

const textFields = new Set(['name', 'description', 'pro', 'con', 'title', 'label', 'tagline', 'altitude', 'period', 'short', 'summary', 'goal', 'text']);
function assertTranslated(value: unknown, key = '') {
  if (typeof value === 'string' && textFields.has(key) && /[A-Za-z]{2}/.test(value)) {
    assert.notEqual(translate(value, 'ru'), value, `Missing Russian copy: ${value}`);
  } else if (Array.isArray(value)) value.forEach(item => assertTranslated(item, key));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => assertTranslated(item, key));
}
test('Russian covers catalog, hardware, all flight decisions and glossary', () => {
  assertTranslated(data);
  assertTranslated(events);
  for (const phase of phases) assertTranslated(phase, 'name');
  for (const [term, explanation] of Object.entries(data.glossary)) {
    assertTranslated(term, 'name');
    assertTranslated(explanation, 'description');
  }
});

test('Russian translates a complete flight log and debrief without English fallback', () => {
  const design = { ...data.defaultDesign, name: 'Проверка перевода' };
  let flight = createFlight(design, () => .9);
  while (!flight.completed) {
    const event = pendingEvent(flight);
    flight = event
      ? respondByCommand(flight, design, event.choices.findIndex(choice => choice.fuel <= flight.fuel))
      : advanceByCommand(flight, design);
  }
  for (const text of [...flight.log.map(row => row.text), ...scoreFlight(design, flight).reasons]) {
    assert.doesNotMatch(translate(text, 'ru'), /[A-Za-z]{2,}/, text);
  }
});

test('Russian report keeps numeric values and formatting without swallowing preceding fields', () => {
  const report = translate(engineeringReport(data.defaultDesign), 'ru');
  assert.match(report, /^REQ-02 ПРОЙДЕНО/m);
  assert.match(report, /Доступно 850 кг × \(1 − 0% запаса\)/);
  assert.match(report, /\n\nТРЕБОВАНИЯ\n/);
  assert.equal(translate('400 km', 'ru'), '400 км');
  assert.equal(translate('Aurora 2026 / Test-42', 'ru'), 'Aurora 2026 / Test-42');
  assert.equal(translate('Solar storm approaching', 'en'), 'Solar storm approaching');
});
