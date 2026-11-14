import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultDesign } from '../lib/data';
import { calculate } from '../lib/engineering';
import { createFlight, responseRisk, events } from '../lib/simulation';
import { onboardAdvice, engineerEndpoint, type AdviceTopic } from '../lib/onboard-advice';

test('offline advice explains actual pending choices and never changes flight state', () => {
  const flight = { ...createFlight(defaultDesign), phase: 2, eventIds: ['battery', 'storm', 'debris'], paused: true };
  const before = JSON.stringify({ flight, design: defaultDesign });
  const advice = onboardAdvice(defaultDesign, flight, 'risk', 'ru');
  assert(advice.includes('Ёмкость аккумулятора снижается'));
  const choice = events.find(e => e.id === 'battery')!.choices[1];
  const probability = new Intl.NumberFormat('ru', { maximumFractionDigits: 2 }).format(responseRisk(choice.risk, calculate(defaultDesign).reliability, defaultDesign.mode) * 100);
  assert(advice.includes(`${probability}%`));
  assert(onboardAdvice(defaultDesign, flight, 'phase', 'ru').includes('До решения следующий интервал недоступен'));
  for (const topic of ['phase', 'risk', 'data', 'power'] as AdviceTopic[]) {
    for (const locale of ['ru', 'en', 'kk'] as const) assert(onboardAdvice(defaultDesign, flight, topic, locale).length > 40);
  }
  assert.equal(JSON.stringify({ flight, design: defaultDesign }), before);
});

test('data advice reflects disabled downlink and updated data, not a cached template', () => {
  const flight = createFlight(defaultDesign);
  flight.operations!.downlink = false;
  flight.operations!.data[0].delivered = 12;
  flight.operations!.data[0].buffered = 7;
  flight.operations!.data[0].lost = 3;
  let advice = onboardAdvice(defaultDesign, flight, 'data', 'ru');
  assert(advice.includes('Передано: 12 ГБ'));
  assert(advice.includes('На борту: 7'));
  assert(advice.includes('Потеряно или удалено: 3 ГБ'));
  assert(advice.includes('Передача выключена'));
  flight.operations!.downlink = true;
  advice = onboardAdvice(defaultDesign, flight, 'data', 'ru');
  assert(advice.includes('Передача включена'));
  assert(!advice.includes('Передача выключена'));
});

test('completed and legacy flights get no invented measurements or unavailable commands', () => {
  const flight = { ...createFlight(defaultDesign), completed: true, phase: 7 };
  for (const topic of ['phase', 'data', 'power'] as AdviceTopic[]) {
    const advice = onboardAdvice(defaultDesign, flight, topic, 'ru');
    assert(advice.includes('Полёт завершён'));
    assert(!advice.includes('перед следующим интервалом'));
  }
  assert(onboardAdvice(defaultDesign, { ...flight, operations: undefined }, 'power', 'ru').includes('показатели для него недоступны'));
});

test('power advice separates cumulative shortfalls from remaining charge', () => {
  const flight = createFlight(defaultDesign);
  flight.operations!.batteryKWh = 0.25;
  flight.operations!.duty = 0.5;
  flight.operations!.unservedKWh = 1.75;
  const advice = onboardAdvice(defaultDesign, flight, 'power', 'en');
  assert(advice.includes('Battery: 0.25'));
  assert(advice.includes('duty: 50%'));
  assert(advice.includes('Cumulative unmet energy: 1.75'));
});

test('public deployments never implicitly call visitor localhost', () => {
  assert.equal(engineerEndpoint('example.org'), null);
  assert.equal(engineerEndpoint('localhost'), 'http://127.0.0.1:3013/ask');
  assert.equal(engineerEndpoint('example.org', 'https://api.example.org/ask'), 'https://api.example.org/ask');
});
