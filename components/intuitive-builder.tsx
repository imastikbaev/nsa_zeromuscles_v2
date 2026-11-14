'use client';

import { useEffect, useState } from 'react';
import {
  categoryLabels,
  defaultDesign,
  instruments,
  launchers,
  missions,
  nominalRequirements,
  objectives,
  orbits,
  scenarios,
  systems,
  type Category,
  type Design,
  type MissionId,
  type Mode,
} from '@/lib/data';
import {
  autoFix,
  compatibleLaunchers,
  compatibleOrbits,
  issueStep,
  sufficientArray,
} from '@/lib/builder-help';
import { calculate } from '@/lib/engineering';
import { dataTotals } from '@/lib/operations';
import { operatingProfile } from '@/lib/orbit-operations';
import {
  advanceFlight,
  createFlight,
  pendingEvent,
  phases,
  resolveEvent,
  responseRisk,
  scoreFlight,
  setFlightOperations,
  type Flight,
  type Result,
} from '@/lib/simulation';
import {
  clearFlight,
  DESIGN_KEY,
  downloadReport,
  readDesign,
  readFlight,
  saveFlight,
  saveResult,
} from '@/lib/storage';
import { ExpeditionShell, useExpeditionCopy } from './expedition-shell';
import { FlightStageScene } from './flight-stage-scene';
import { LaunchSequence } from './launch-sequence';
import { useI18n } from './preferences';
import './intuitive-builder.css';

type BuilderStep = 0 | 1 | 2 | 3;

export function IntuitiveBuilder() {
  const c = useExpeditionCopy();
  const { t } = useI18n();

  const [design, setDesign] = useState<Design>(defaultDesign);
  const [step, setStep] = useState<BuilderStep>(0);
  const [expertMode, setExpertMode] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load saved design / active flight on mount
  useEffect(() => {
    const savedDesign = readDesign();
    if (savedDesign) {
      setDesign(savedDesign);
    }
    const checkpoint = readFlight();
    if (checkpoint) {
      setDesign(checkpoint.design);
      setFlight(checkpoint.flight);
      setStep(3);
      if (checkpoint.flight.completed) {
        setResult(scoreFlight(checkpoint.design, checkpoint.flight));
      }
    }
    setHydrated(true);
  }, []);

  // Persist design changes
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(DESIGN_KEY, JSON.stringify(design));
    } catch {
      // ignore storage quota errors
    }
  }, [design, hydrated]);

  const calc = calculate(design);
  const activeEvent = flight ? pendingEvent(flight) : null;

  // Auto-advance flight timer when autoAdvance is enabled and no event is blocking
  useEffect(() => {
    if (!flight || flight.completed || activeEvent || !autoAdvance || showLaunchModal) {
      return;
    }
    const timer = window.setTimeout(() => {
      const next = advanceFlight(flight, design);
      setFlight(next);
      saveFlight(design, next);
      if (next.completed) {
        const scored = scoreFlight(design, next);
        setResult(scored);
        saveResult(scored);
        clearFlight();
      }
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [flight, activeEvent, autoAdvance, showLaunchModal, design]);

  const updateDesign = (patch: Partial<Design>) => {
    setDesign((prev) => ({ ...prev, ...patch }));
  };

  const selectMission = (missionId: MissionId) => {
    const m = missions.find((item) => item.id === missionId) ?? missions[0];
    const nextLauncher =
      launchers.find(
        (l) => l.id === design.launcher && l.destinations.includes(missionId),
      ) ??
      launchers.find((l) => l.destinations.includes(missionId)) ??
      launchers[0];

    setDesign((prev) => ({
      ...prev,
      mission: missionId,
      orbit: m.orbit,
      launcher: nextLauncher.id,
      objectives: [...m.objectives],
      scenario: null,
    }));
  };

  const toggleObjective = (objId: string) => {
    setDesign((prev) => {
      const exists = prev.objectives.includes(objId);
      if (exists && prev.objectives.length <= 1) return prev;
      const nextObjectives = exists
        ? prev.objectives.filter((id) => id !== objId)
        : [...prev.objectives, objId];
      return { ...prev, objectives: nextObjectives };
    });
  };

  const toggleInstrument = (instId: string) => {
    setDesign((prev) => {
      const exists = prev.instruments.includes(instId);
      if (exists) {
        if (prev.instruments.length <= 1) return prev;
        return {
          ...prev,
          instruments: prev.instruments.filter((id) => id !== instId),
        };
      }
      if (prev.instruments.length >= 4) return prev;
      return { ...prev, instruments: [...prev.instruments, instId] };
    });
  };

  const handleAutoFix = () => {
    const fixed = autoFix(design);
    setDesign(fixed);
  };

  const startTestFlight = (withCinematic = true) => {
    if (calc.issues.length > 0) return;
    const newFlight = createFlight(design);
    setFlight(newFlight);
    setResult(null);
    saveFlight(design, newFlight);
    setStep(3);
    if (withCinematic) {
      setShowLaunchModal(true);
    }
  };

  const handleNextPhase = () => {
    if (!flight || flight.completed || activeEvent) return;
    const next = advanceFlight(flight, design);
    setFlight(next);
    saveFlight(design, next);
    if (next.completed) {
      const scored = scoreFlight(design, next);
      setResult(scored);
      saveResult(scored);
      clearFlight();
    }
  };

  const handleResolveChoice = (choiceIdx: number) => {
    if (!flight || !activeEvent) return;
    const next = resolveEvent(flight, design, choiceIdx);
    setFlight(next);
    saveFlight(design, next);
    if (next.completed) {
      const scored = scoreFlight(design, next);
      setResult(scored);
      saveResult(scored);
      clearFlight();
    }
  };

  const handleAbortFlight = () => {
    setFlight(null);
    setResult(null);
    setAutoAdvance(false);
    clearFlight();
  };

  const stepIssuesCount = (targetStep: 0 | 1 | 2) =>
    calc.issues.filter((iss) => issueStep(iss.step) === targetStep).length;

  const minPanels = sufficientArray(design);
  const availOrbits = expertMode ? orbits : compatibleOrbits(design);
  const availLaunchers = expertMode ? launchers : compatibleLaunchers(design);
  const orbitProfile = operatingProfile(design.orbit);
  const opsTotals = flight?.operations ? dataTotals(flight.operations) : null;

  return (
    <ExpeditionShell>
      <main id="exp-main" className="ib-main">
        {/* Top Header */}
        <header className="ib-header">
          <div className="ib-title-block">
            <h1>
              {c(
                'Интуитивный конструктор и тестовый полёт',
                'Intuitive Mission Builder & Test Flight',
                'Интуитивті миссия конструкторы және сынақ ұшуы',
              )}
            </h1>
            <p>
              {c(
                'Соберите космический аппарат шаг за шагом, проверьте баланс массы, энергии и связи, а затем запустите анимированную симуляцию полёта.',
                'Design your spacecraft step by step, balance mass, power, and downlink, then launch an animated flight simulation.',
                'Ғарыш аппаратын қадам бойынша құрастырып, масса, қуат және байланысты теңгеріп, анимациялық ұшу симуляциясын іске қосыңыз.',
              )}
            </p>
          </div>

          <div className="ib-header-controls">
            <div
              className="ib-mode-switch"
              role="group"
              aria-label={c('Режим сложности конструктора', 'Builder complexity mode', 'Конструктор режимі')}
            >
              <button
                type="button"
                className={`ib-mode-btn ${!expertMode ? 'is-active' : ''}`}
                onClick={() => setExpertMode(false)}
              >
                {c('Новичок (Пошагово)', 'Novice (Guided)', 'Бастаушы')}
              </button>
              <button
                type="button"
                className={`ib-mode-btn ${expertMode ? 'is-active' : ''}`}
                onClick={() => setExpertMode(true)}
              >
                {c('Эксперт (Все системы)', 'Expert (Full Systems)', 'Сарапшы')}
              </button>
            </div>

            {calc.issues.length > 0 && !flight && (
              <button type="button" className="ib-autofix-btn" onClick={handleAutoFix}>
                ✦ {c('Автоподбор параметров', 'Auto-balance Systems', 'Жүйелерді авто-теңгеру')} (
                {calc.issues.length})
              </button>
            )}

            <button
              type="button"
              className="ib-secondary-btn"
              onClick={() => setShowLaunchModal(true)}
            >
              🚀 {c('Кино-запуск ракеты', 'Preview Rocket Launch', 'Зымыран стартын көру')}
            </button>
          </div>
        </header>

        {/* 4-Step Guided Navigation */}
        <nav className="ib-stepper" aria-label={c('Этапы проектирования', 'Design steps', 'Жобалау қадамдары')}>
          {[
            {
              idx: 0 as BuilderStep,
              title: c('Миссия и цели', 'Mission & Goals', 'Миссия және мақсаттар'),
              sub: t(calc.mission.name),
              issues: stepIssuesCount(0),
            },
            {
              idx: 1 as BuilderStep,
              title: c('Спутник и приборы', 'Spacecraft & Payload', 'Аппарат және аспаптар'),
              sub: `${design.instruments.length} ${c('прибора', 'instruments', 'аспап')} · ${design.panels} m²`,
              issues: stepIssuesCount(1),
            },
            {
              idx: 2 as BuilderStep,
              title: c('Ракета и орбита', 'Rocket & Orbit', 'Зымыран және орбита'),
              sub: `${calc.launcher.name} · ${calc.orbit.short}`,
              issues: stepIssuesCount(2),
            },
            {
              idx: 3 as BuilderStep,
              title: c('Проверка и полёт', 'Readiness & Flight', 'Тексеру және ұшу'),
              sub: flight
                ? c('Полёт активен', 'Flight active', 'Ұшу белсенді')
                : calc.issues.length === 0
                  ? c('Готов к пуску', 'Ready for launch', 'Ұшуға дайын')
                  : `${calc.issues.length} ${c('замечаний', 'issues', 'ескерту')}`,
              issues: calc.issues.length,
            },
          ].map((item) => (
            <button
              key={item.idx}
              type="button"
              className={`ib-step-tab ${step === item.idx ? 'is-active' : ''}`}
              onClick={() => setStep(item.idx)}
            >
              <div className="ib-step-tab-left">
                <span className="ib-step-num">{item.idx + 1}</span>
                <div className="ib-step-label">
                  <strong>{item.title}</strong>
                  <span>{item.sub}</span>
                </div>
              </div>
              <span className={`ib-step-badge ${item.issues === 0 ? 'is-ok' : 'is-warn'}`}>
                {item.issues === 0 ? '✓' : item.issues}
              </span>
            </button>
          ))}
        </nav>

        {/* Main Workspace Grid */}
        <div className="ib-workspace">
          {/* Left Column: Active Step Controls */}
          <div className="ib-left-col">
            {step === 0 && (
              <>
                <section className="ib-panel">
                  <h2>{c('1. Выберите пункт назначения', '1. Choose Mission Destination', '1. Бағытты таңдаңыз')}</h2>
                  <p>
                    {c(
                      'Каждая цель задаёт бюджет, дальность радиосвязи, солнечный поток и минимальный запас скорости Δv.',
                      'Each destination sets your budget, radio distance, sunlight intensity, and required delta-v.',
                      'Әрбір бағыт бюджетті, радиобайланыс қашықтығын, күн ағынын және қажетті Δv мәнін белгілейді.',
                    )}
                  </p>

                  <div className="ib-field-row">
                    <div className="ib-field">
                      <label htmlFor="ib-mission-name">
                        {c('Название аппарата / миссии', 'Spacecraft / Mission Name', 'Миссия атауы')}
                      </label>
                      <input
                        id="ib-mission-name"
                        className="ib-input"
                        type="text"
                        maxLength={60}
                        value={design.name}
                        onChange={(e) => updateDesign({ name: e.target.value })}
                      />
                    </div>
                    {expertMode && (
                      <div className="ib-field">
                        <label htmlFor="ib-game-mode">
                          {c('Режим симуляции', 'Simulation Mode', 'Симуляция режимі')}
                        </label>
                        <select
                          id="ib-game-mode"
                          className="ib-select"
                          value={design.mode}
                          onChange={(e) => updateDesign({ mode: e.target.value as Mode })}
                        >
                          <option value="guided">{c('Обучение (Guided)', 'Guided', 'Оқыту')}</option>
                          <option value="challenge">{c('Испытание (Challenge)', 'Challenge', 'Сынақ')}</option>
                          <option value="sandbox">{c('Песочница (Sandbox)', 'Sandbox', 'Еркін режим')}</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="ib-card-grid">
                    {missions.map((m) => {
                      const selected = design.mission === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={`ib-choice-card ${selected ? 'is-selected' : ''}`}
                          onClick={() => selectMission(m.id)}
                        >
                          <div>
                            <h3>{t(m.name)}</h3>
                            <p>{t(m.description)}</p>
                          </div>
                          <div className="ib-chip-row">
                            <span className="ib-chip is-accent">${m.budget}M</span>
                            <span className="ib-chip">
                              {m.duration} {c('мес.', 'mo', 'ай')}
                            </span>
                            <span className="ib-chip">
                              {m.objectives.length} {c('цели', 'goals', 'мақсат')}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="ib-panel">
                  <h2>{c('2. Научные задачи миссии', '2. Science Objectives', '2. Миссияның ғылыми мақсаттары')}</h2>
                  <p>
                    {c(
                      'Отметьте исследования, которые должен выполнить спутник. На следующем шаге мы подберём под них научные приборы.',
                      'Select the scientific questions your spacecraft will answer. Next, you will pick instruments that cover them.',
                      'Аппарат орындайтын зерттеулерді белгілеңіз. Келесі қадамда сәйкес аспаптарды таңдаймыз.',
                    )}
                  </p>

                  <div className="ib-card-grid">
                    {objectives.map((obj) => {
                      const active = design.objectives.includes(obj.id);
                      const covered = calc.covered.includes(obj.id);
                      return (
                        <button
                          key={obj.id}
                          type="button"
                          className={`ib-choice-card ${active ? 'is-selected' : ''}`}
                          onClick={() => toggleObjective(obj.id)}
                        >
                          <div>
                            <h3>{t(obj.name)}</h3>
                            <p>{t(obj.description)}</p>
                          </div>
                          <div className="ib-chip-row">
                            {active ? (
                              <span className={`ib-chip ${covered ? 'is-good' : 'is-warn'}`}>
                                {covered
                                  ? c('✓ Закрыта прибором', '✓ Covered by payload', '✓ Аспаппен қамтылған')
                                  : c('Нужен прибор на шаге 2', 'Needs instrument in Step 2', '2-қадамда аспап қажет')}
                              </span>
                            ) : (
                              <span className="ib-chip">{c('Не выбрана', 'Not selected', 'Таңдалмаған')}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {expertMode && (
                    <div className="ib-slider-grid">
                      <div className="ib-slider-box">
                        <div className="ib-slider-top">
                          <span>{c('Длительность экспедиции', 'Planned Duration', 'Миссия ұзақтығы')}</span>
                          <strong>
                            {design.durationMonths ?? calc.mission.duration} {c('мес.', 'months', 'ай')}
                          </strong>
                        </div>
                        <input
                          type="range"
                          min={6}
                          max={96}
                          step={6}
                          value={design.durationMonths ?? calc.mission.duration}
                          onChange={(e) => updateDesign({ durationMonths: Number(e.target.value) })}
                        />
                      </div>

                      <div className="ib-slider-box">
                        <div className="ib-slider-top">
                          <span>{c('Инженерный резерв мощности', 'EOL Power Reserve', 'Қуат резерві')}</span>
                          <strong>{design.requirements?.powerReserve ?? 0}%</strong>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={35}
                          step={5}
                          value={design.requirements?.powerReserve ?? 0}
                          onChange={(e) =>
                            updateDesign({
                              requirements: {
                                ...(design.requirements ?? nominalRequirements),
                                powerReserve: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  )}

                  <div className="ib-step-footer">
                    <span />
                    <button type="button" className="ib-primary-btn" onClick={() => setStep(1)}>
                      {c('Далее: Спутник и приборы →', 'Next: Spacecraft & Payload →', 'Келесі: Аппарат және аспаптар →')}
                    </button>
                  </div>
                </section>
              </>
            )}

            {step === 1 && (
              <>
                <section className="ib-panel">
                  <h2>
                    {c(
                      '1. Научные приборы (до 4 приборов)',
                      '1. Scientific Instruments (up to 4)',
                      '1. Ғылыми аспаптар (4-ке дейін)',
                    )}
                  </h2>
                  <p>
                    {c(
                      'Каждый прибор приносит научные очки, но увеличивает массу, энергопотребление и поток данных на Землю.',
                      'Every instrument adds science value, but increases mass, power draw, and daily data volume.',
                      'Әрбір аспап ғылыми ұпай береді, бірақ массаны, қуатты және деректер көлемін арттырады.',
                    )}
                  </p>

                  <div className="ib-card-grid">
                    {instruments.map((inst) => {
                      const selected = design.instruments.includes(inst.id);
                      const matchesGoal = inst.supports.some((s) => design.objectives.includes(s));
                      return (
                        <button
                          key={inst.id}
                          type="button"
                          className={`ib-choice-card ${selected ? 'is-selected' : ''}`}
                          onClick={() => toggleInstrument(inst.id)}
                        >
                          <div>
                            <h3>{t(inst.name)}</h3>
                            <p>{t(inst.description)}</p>
                          </div>
                          <div className="ib-chip-row">
                            <span className="ib-chip is-accent">+{inst.science} sci</span>
                            <span className="ib-chip">{inst.mass} kg</span>
                            <span className="ib-chip">{inst.power} W</span>
                            <span className="ib-chip">{inst.data} GB/d</span>
                            {matchesGoal && (
                              <span className="ib-chip is-good">
                                {c('Подходит к цели', 'Matches goal', 'Мақсатқа сай')}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="ib-panel">
                  <h2>
                    {c(
                      '2. Запас энергии и топлива',
                      '2. Solar Power, Battery & Fuel Reserves',
                      '2. Энергия және отын қоры',
                    )}
                  </h2>
                  <p>
                    {c(
                      'Отрегулируйте площадь солнечных панелей, ёмкость аккумулятора для прохождения тени и запас топлива для манёвров.',
                      'Tune solar array area, battery capacity for eclipse shadow, and propellant mass for orbital maneuvers.',
                      'Күн панельдерінің ауданын, көлеңкеге арналған аккумулятор сыйымдылығын және отын қорын реттеңіз.',
                    )}
                  </p>

                  <div className="ib-slider-grid">
                    <div className="ib-slider-box">
                      <div className="ib-slider-top">
                        <span>{c('Солнечные панели', 'Solar Array Area', 'Күн панельдері')}</span>
                        <strong>{design.panels} m²</strong>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={40}
                        step={1}
                        value={design.panels}
                        onChange={(e) => updateDesign({ panels: Number(e.target.value) })}
                      />
                      <div className="ib-slider-hint">
                        <span>
                          {c('Баланс EOL:', 'EOL margin:', 'EOL балансы:')}{' '}
                          {calc.endOfLifeMargin >= 0 ? `+${Math.round(calc.endOfLifeMargin)}` : Math.round(calc.endOfLifeMargin)} W
                        </span>
                        {minPanels !== null && design.panels < minPanels && (
                          <button
                            type="button"
                            className="ib-inline-link"
                            onClick={() => updateDesign({ panels: minPanels })}
                          >
                            {c(`Выставить ${minPanels} m²`, `Set ${minPanels} m²`, `${minPanels} m² қою`)}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="ib-slider-box">
                      <div className="ib-slider-top">
                        <span>{c('Аккумулятор (тень)', 'Battery Capacity', 'Аккумулятор')}</span>
                        <strong>{design.battery.toFixed(1)} kWh</strong>
                      </div>
                      <input
                        type="range"
                        min={0.4}
                        max={6.0}
                        step={0.2}
                        value={design.battery}
                        onChange={(e) => updateDesign({ battery: Number(e.target.value) })}
                      />
                      <div className="ib-slider-hint">
                        <span>
                          {c('Минимум:', 'Required:', 'Минимум:')} {calc.batteryNeed.toFixed(1)} kWh
                        </span>
                        {design.battery < calc.batteryNeed && (
                          <button
                            type="button"
                            className="ib-inline-link"
                            onClick={() =>
                              updateDesign({
                                battery: Math.ceil(calc.batteryNeed * 5) / 5,
                              })
                            }
                          >
                            {c('Подобрать', 'Match need', 'Сәйкестендіру')}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="ib-slider-box">
                      <div className="ib-slider-top">
                        <span>{c('Топливо для манёвров', 'Propellant Load', 'Маневр отыны')}</span>
                        <strong>{design.fuel} kg</strong>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={900}
                        step={10}
                        value={design.fuel}
                        onChange={(e) => updateDesign({ fuel: Number(e.target.value) })}
                      />
                      <div className="ib-slider-hint">
                        <span>
                          Δv: {Math.round(calc.deltaV)} / {calc.requiredDeltaV} m/s
                        </span>
                        {design.fuel < calc.fuelNeeded && (
                          <button
                            type="button"
                            className="ib-inline-link"
                            onClick={() =>
                              updateDesign({
                                fuel: Math.min(900, Math.ceil((calc.fuelNeeded + 15) / 10) * 10),
                              })
                            }
                          >
                            {c(`Нужно ${calc.fuelNeeded} kg`, `Need ${calc.fuelNeeded} kg`, `${calc.fuelNeeded} kg қажет`)}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {expertMode && (
                  <section className="ib-panel">
                    <h2>
                      {c(
                        '3. Бортовые подсистемы (Режим Эксперта)',
                        '3. Spacecraft Bus Subsystems (Expert Mode)',
                        '3. Борттық ішкі жүйелер (Сарапшы режимі)',
                      )}
                    </h2>
                    <p>
                      {c(
                        'Выберите двигательную установку, источник питания, радиопередатчик, бортовой компьютер, термоконтроль и антенну.',
                        'Configure propulsion, primary power, transceiver, flight computer, thermal protection, and antenna.',
                        'Қозғалтқыш, қуат көзі, радиотаратқыш, борттық компьютер, жылу қорғанысы және антеннаны таңдаңыз.',
                      )}
                    </p>

                    {(Object.keys(systems) as Category[]).map((cat) => (
                      <div key={cat} style={{ marginBottom: 18 }}>
                        <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#d5e4fa' }}>
                          {t(categoryLabels[cat])}
                        </p>
                        <div className="ib-card-grid">
                          {systems[cat].map((comp) => {
                            const selected = design.systems[cat] === comp.id;
                            return (
                              <button
                                key={comp.id}
                                type="button"
                                className={`ib-choice-card ${selected ? 'is-selected' : ''}`}
                                onClick={() =>
                                  updateDesign({
                                    systems: { ...design.systems, [cat]: comp.id },
                                  })
                                }
                              >
                                <div>
                                  <h3>{t(comp.name)}</h3>
                                  <p>{t(comp.pro)}</p>
                                </div>
                                <div className="ib-chip-row">
                                  <span className="ib-chip">${comp.cost}M</span>
                                  <span className="ib-chip">{comp.mass} kg</span>
                                  <span className="ib-chip">{comp.power} W</span>
                                  {comp.isp && <span className="ib-chip is-accent">Isp {comp.isp}s</span>}
                                  {comp.storage && <span className="ib-chip is-accent">{comp.storage} GB</span>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </section>
                )}

                <div className="ib-step-footer">
                  <button type="button" className="ib-secondary-btn" onClick={() => setStep(0)}>
                    {c('← Назад к целям', '← Back to Goals', '← Мақсаттарға оралу')}
                  </button>
                  <button type="button" className="ib-primary-btn" onClick={() => setStep(2)}>
                    {c('Далее: Ракета и орбита →', 'Next: Rocket & Orbit →', 'Келесі: Зымыран және орбита →')}
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <section className="ib-panel">
                  <h2>{c('1. Ракета-носитель', '1. Launch Vehicle', '1. Зымыран-тасығыш')}</h2>
                  <p>
                    {c(
                      'Ракета должна поднять полную массу спутника с топливом и доставить его к выбранному небесному телу.',
                      'Your launch vehicle must lift the total wet mass of the spacecraft and reach your target destination.',
                      'Зымыран аппараттың отынмен қоса толық массасын көтеріп, таңдалған бағытқа жеткізуі керек.',
                    )}
                  </p>

                  <div className="ib-card-grid">
                    {availLaunchers.map((l) => {
                      const selected = design.launcher === l.id;
                      const fitsMass = calc.mass <= l.payload;
                      return (
                        <button
                          key={l.id}
                          type="button"
                          className={`ib-choice-card ${selected ? 'is-selected' : ''}`}
                          onClick={() => updateDesign({ launcher: l.id })}
                        >
                          <div>
                            <h3>{l.name}</h3>
                            <p>{t(l.description)}</p>
                          </div>
                          <div className="ib-chip-row">
                            <span className="ib-chip is-accent">${l.cost}M</span>
                            <span className={`ib-chip ${fitsMass ? 'is-good' : 'is-warn'}`}>
                              {c('До', 'Up to', 'Дейін')} {l.payload} kg
                            </span>
                            <span className="ib-chip">{Math.round(l.reliability * 100)}% rel</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="ib-panel">
                  <h2>{c('2. Целевая орбита', '2. Target Orbit', '2. Мақсатты орбита')}</h2>
                  <p>
                    {c(
                      'Орбита определяет освещённость солнечных панелей, длительность тени, задержку сигнала и множитель науки.',
                      'Your orbit determines solar illumination, eclipse duration, signal delay, and science multiplier.',
                      'Орбита күн сәулесін, көлеңке ұзақтығын, сигнал кідірісін және ғылыми коэффициентті анықтайды.',
                    )}
                  </p>

                  <div className="ib-card-grid">
                    {availOrbits.map((o) => {
                      const selected = design.orbit === o.id;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          className={`ib-choice-card ${selected ? 'is-selected' : ''}`}
                          onClick={() => updateDesign({ orbit: o.id })}
                        >
                          <div>
                            <h3>
                              {t(o.name)} ({o.short})
                            </h3>
                            <p>{t(o.description)}</p>
                          </div>
                          <div className="ib-chip-row">
                            <span className="ib-chip is-accent">×{o.science} sci</span>
                            <span className="ib-chip">{o.altitude}</span>
                            <span className="ib-chip">Δv {o.deltaV} m/s</span>
                            <span className="ib-chip">☀ {Math.round(o.sun * 100)}%</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="ib-step-footer">
                    <button type="button" className="ib-secondary-btn" onClick={() => setStep(1)}>
                      {c('← Назад к приборам', '← Back to Payload', '← Аспаптарға оралу')}
                    </button>
                    <button type="button" className="ib-primary-btn" onClick={() => setStep(3)}>
                      {c('Далее: Проверка и Тестовый полёт →', 'Next: Review & Test Flight →', 'Келесі: Тексеру және ұшу →')}
                    </button>
                  </div>
                </section>
              </>
            )}

            {step === 3 && (
              <>
                {/* Pre-Flight Readiness Review when no flight is active */}
                {!flight && (
                  <section className="ib-panel">
                    <h2>
                      {c(
                        'Предполётная проверка готовности',
                        'Pre-Flight Readiness Review',
                        'Ұшу алдындағы дайындықты тексеру',
                      )}
                    </h2>
                    <p>
                      {calc.issues.length === 0
                        ? c(
                            'Все инженерные системы сбалансированы! Вы можете запустить тестовый полёт с анимацией старта ракеты и работы на орбите.',
                            'All engineering constraints are satisfied! You are cleared to launch the animated test flight.',
                            'Барлық инженерлік жүйелер теңгерілді! Зымыран старты мен орбиталық жұмыс анимациясын іске қоса аласыз.',
                          )
                        : c(
                            'Перед стартом необходимо устранить несоответствия ниже — нажмите «Автоподбор» для мгновенного исправления или перейдите к нужному шагу.',
                            'Resolve the blockers below before launch — click Auto-balance for an instant fix or jump to the relevant step.',
                            'Ұшу алдында төмендегі ескертулерді түзетіңіз — авто-теңгеруді басыңыз немесе тиісті қадамға өтіңіз.',
                          )}
                    </p>

                    <div className="ib-check-list">
                      {calc.issues.length === 0 ? (
                        <div className="ib-check-item is-ready">
                          <div>
                            <strong>
                              ✓ {c('Все системы готовы к пуску', 'All Systems Go for Launch', 'Барлық жүйелер ұшуға дайын')}
                            </strong>
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#9cb0cc' }}>
                              {c(
                                `Масса ${calc.mass}/${calc.launchMassLimit} кг · Энергия EOL +${Math.round(calc.endOfLifeMargin)} Вт · Δv ${Math.round(calc.deltaV)}/${calc.requiredDeltaV} м/с`,
                                `Mass ${calc.mass}/${calc.launchMassLimit} kg · Power EOL +${Math.round(calc.endOfLifeMargin)} W · Δv ${Math.round(calc.deltaV)}/${calc.requiredDeltaV} m/s`,
                                `Масса ${calc.mass}/${calc.launchMassLimit} кг · Қуат EOL +${Math.round(calc.endOfLifeMargin)} Вт · Δv ${Math.round(calc.deltaV)}/${calc.requiredDeltaV} м/с`,
                              )}
                            </p>
                          </div>
                          <span className="ib-chip is-good">GO</span>
                        </div>
                      ) : (
                        calc.issues.map((iss, idx) => {
                          const targetStep = issueStep(iss.step);
                          return (
                            <div key={idx} className="ib-check-item is-issue">
                              <div>
                                <strong>⚠ {t(iss.label)}</strong>
                                <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#cbd5e1' }}>
                                  {t(iss.fix)}
                                </p>
                              </div>
                              <div className="ib-chip-row">
                                <button
                                  type="button"
                                  className="ib-secondary-btn"
                                  onClick={() => setStep(targetStep)}
                                >
                                  {c(`Шаг ${targetStep + 1}`, `Step ${targetStep + 1}`, `${targetStep + 1}-қадам`)}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="ib-step-footer">
                      <button type="button" className="ib-secondary-btn" onClick={() => setStep(2)}>
                        {c('← Назад к ракете и орбите', '← Back to Rocket & Orbit', '← Зымыран мен орбитаға оралу')}
                      </button>
                      <div className="ib-header-controls">
                        {calc.issues.length > 0 && (
                          <button type="button" className="ib-autofix-btn" onClick={handleAutoFix}>
                            ✦ {c('Исправить автоматически', 'Auto-Fix Blockers', 'Автоматты түзету')}
                          </button>
                        )}
                        <button
                          type="button"
                          className="ib-primary-btn"
                          disabled={calc.issues.length > 0}
                          onClick={() => startTestFlight(true)}
                        >
                          🚀 {c('Запустить тестовый полёт (с анимацией)', 'Launch Animated Test Flight', 'Анимациялық сынақ ұшуын бастау')}
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {/* Active Flight Console */}
                {flight && !flight.completed && (
                  <section className="ib-panel">
                    <h2>
                      {c('Центр управления полётом', 'Mission Control — Active Test Flight', 'Ұшуды басқару орталығы')}
                    </h2>
                    <p>
                      {c(
                        `Текущий этап: ${flight.phase + 1}/8 (${t(phases[flight.phase])}) · Здоровье аппарата: ${flight.health}% · Остаток топлива: ${Math.round(flight.fuel)} кг`,
                        `Current Phase: ${flight.phase + 1}/8 (${t(phases[flight.phase])}) · Spacecraft Health: ${flight.health}% · Remaining Fuel: ${Math.round(flight.fuel)} kg`,
                        `Ағымдағы кезең: ${flight.phase + 1}/8 (${t(phases[flight.phase])}) · Аппарат күйі: ${flight.health}% · Қалған отын: ${Math.round(flight.fuel)} кг`,
                      )}
                    </p>

                    {/* Active In-Flight Event Decision Card */}
                    {activeEvent && (
                      <div className="ib-event-card">
                        <h3>⚠ {t(activeEvent.title)}</h3>
                        <p style={{ margin: '0 0 14px', color: '#e8eef8', fontSize: '0.92rem' }}>
                          {t(activeEvent.description)}
                        </p>
                        <div className="ib-card-grid">
                          {activeEvent.choices.map((ch, idx) => {
                            const actualRisk = Math.round(
                              responseRisk(ch.risk, calc.reliability, design.mode) * 100,
                            );
                            const enoughFuel = flight.fuel >= ch.fuel;
                            return (
                              <button
                                key={idx}
                                type="button"
                                disabled={!enoughFuel}
                                className="ib-choice-card"
                                onClick={() => handleResolveChoice(idx)}
                              >
                                <div>
                                  <h3>{t(ch.label)}</h3>
                                  <p>{t(ch.description)}</p>
                                </div>
                                <div className="ib-chip-row">
                                  <span className="ib-chip is-accent">
                                    {ch.science >= 0 ? `+${ch.science}` : ch.science} sci
                                  </span>
                                  <span className="ib-chip">{ch.fuel} kg fuel</span>
                                  <span className={`ib-chip ${actualRisk <= 15 ? 'is-good' : 'is-warn'}`}>
                                    {actualRisk}% {c('риск', 'risk', 'тәуекел')}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Orbital Operations Duty & Downlink Controls */}
                    {flight.operations && (
                      <div className="ib-slider-grid" style={{ marginBottom: 18 }}>
                        <div className="ib-slider-box">
                          <div className="ib-slider-top">
                            <span>{c('Интенсивность съёмки приборов', 'Instrument Duty Cycle', 'Аспаптардың жұмыс режимі')}</span>
                            <strong>{Math.round(flight.operations.duty * 100)}%</strong>
                          </div>
                          <div className="ib-chip-row">
                            {[1, 0.5, 0].map((val) => (
                              <button
                                key={val}
                                type="button"
                                className={`ib-mode-btn ${flight.operations?.duty === val ? 'is-active' : ''}`}
                                onClick={() => {
                                  const next = setFlightOperations(flight, { duty: val });
                                  setFlight(next);
                                  saveFlight(design, next);
                                }}
                              >
                                {val === 1
                                  ? c('100% Полная', '100% Full', '100% Толық')
                                  : val === 0.5
                                    ? c('50% Эконом', '50% Half', '50% Үнемді')
                                    : c('0% Пауза', '0% Off', '0% Тоқтату')}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="ib-slider-box">
                          <div className="ib-slider-top">
                            <span>{c('Передача данных на Землю', 'Radio Downlink Transmitter', 'Жерге деректерді жіберу')}</span>
                            <strong>{flight.operations.downlink ? 'ON' : 'OFF'}</strong>
                          </div>
                          <div className="ib-chip-row">
                            <button
                              type="button"
                              className={`ib-mode-btn ${flight.operations.downlink ? 'is-active' : ''}`}
                              onClick={() => {
                                const next = setFlightOperations(flight, { downlink: true });
                                setFlight(next);
                                saveFlight(design, next);
                              }}
                            >
                              {c('Вкл (Передача в ЦУП)', 'Transmitting', 'Қосулы')}
                            </button>
                            <button
                              type="button"
                              className={`ib-mode-btn ${!flight.operations.downlink ? 'is-active' : ''}`}
                              onClick={() => {
                                const next = setFlightOperations(flight, { downlink: false });
                                setFlight(next);
                                saveFlight(design, next);
                              }}
                            >
                              {c('Выкл (Экономия энергии)', 'Standby (Save Power)', 'Өшірулі')}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Flight Log */}
                    <div className="ib-check-list">
                      {flight.log.slice(-4).map((entry, idx) => (
                        <div key={idx} className="ib-check-item">
                          <div>
                            <strong>[{t(entry.phase)}]</strong> {t(entry.text)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="ib-step-footer">
                      <button type="button" className="ib-secondary-btn" onClick={handleAbortFlight}>
                        {c('Вернуться к настройке спутника', 'Return to Spacecraft Design', 'Конструкторға оралу')}
                      </button>
                      <div className="ib-header-controls">
                        <button
                          type="button"
                          className="ib-secondary-btn"
                          onClick={() => setAutoAdvance((v) => !v)}
                        >
                          {autoAdvance
                            ? c('⏸ Пауза авто-полёта', '⏸ Pause Auto-Step', '⏸ Авто-ұшуды кідірту')
                            : c('▶ Авто-прохождение', '▶ Auto-Advance', '▶ Авто-жылжу')}
                        </button>
                        <button
                          type="button"
                          className="ib-primary-btn"
                          disabled={!!activeEvent}
                          onClick={handleNextPhase}
                        >
                          {activeEvent
                            ? c('Примите решение выше ↑', 'Resolve Event Above ↑', 'Жоғарыда шешім қабылдаңыз ↑')
                            : c('Следующий этап полёта →', 'Advance Flight Phase →', 'Келесі ұшу кезеңі →')}
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {/* Post-Flight Debrief */}
                {flight && flight.completed && result && (
                  <section className="ib-panel">
                    <h2>{c('Итоги тестового полёта', 'Post-Flight Mission Debrief', 'Сынақ ұшуының қорытындысы')}</h2>
                    <p>
                      {c(
                        'Анализ эффективности конструкции, переданных научных данных и пережитых нештатных ситуаций.',
                        'Complete evaluation of spacecraft performance, delivered science data, and anomaly handling.',
                        'Аппарат тиімділігі, жеткізілген ғылыми деректер және штаттан тыс жағдайлар талдауы.',
                      )}
                    </p>

                    <div className="ib-grade-banner">
                      <div>
                        <strong style={{ fontSize: '1.2rem', color: '#f4f8ff' }}>{result.name}</strong>
                        <p style={{ margin: '4px 0 0', color: '#9cb0cc' }}>
                          {c('Итоговый рейтинг:', 'Final Score:', 'Жалпы ұпай:')} {result.score}/100 ·{' '}
                          {c('Наука:', 'Science:', 'Ғылым:')} {result.science} pts ·{' '}
                          {c('Здоровье:', 'Health:', 'Күйі:')} {result.health}%
                        </p>
                      </div>
                      <div className="ib-grade-pill">{result.grade}</div>
                    </div>

                    {opsTotals && (
                      <div className="ib-meter-list" style={{ marginBottom: 18 }}>
                        <div className="ib-meter">
                          <div className="ib-meter-head">
                            <span>{c('Собрано приборами', 'Generated Data', 'Жиналған деректер')}</span>
                            <strong>{opsTotals.generated.toFixed(1)} GB</strong>
                          </div>
                        </div>
                        <div className="ib-meter">
                          <div className="ib-meter-head">
                            <span>{c('Передано на Землю', 'Delivered to Earth', 'Жерге жеткізілді')}</span>
                            <strong className="is-ok">{opsTotals.delivered.toFixed(1)} GB</strong>
                          </div>
                        </div>
                        <div className="ib-meter">
                          <div className="ib-meter-head">
                            <span>{c('Осталось в буфере', 'Remaining in Buffer', 'Буферде қалды')}</span>
                            <strong>{opsTotals.buffered.toFixed(1)} GB</strong>
                          </div>
                        </div>
                        <div className="ib-meter">
                          <div className="ib-meter-head">
                            <span>{c('Потеряно (переполнение)', 'Lost (Overflow)', 'Жоғалған деректер')}</span>
                            <strong className={opsTotals.lost > 0 ? 'is-bad' : 'is-ok'}>
                              {opsTotals.lost.toFixed(1)} GB
                            </strong>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="ib-check-list">
                      {result.reasons.map((r, idx) => (
                        <div key={idx} className="ib-check-item">
                          <span>{t(r)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="ib-step-footer">
                      <button type="button" className="ib-secondary-btn" onClick={handleAbortFlight}>
                        {c('← Изменить конструкцию спутника', '← Modify Spacecraft Design', '← Конструкцияны өзгерту')}
                      </button>
                      <div className="ib-header-controls">
                        <button
                          type="button"
                          className="ib-secondary-btn"
                          onClick={() => downloadReport(result)}
                        >
                          ⬇ {c('Скачать бортовой отчёт', 'Download Flight Report', 'Есепті жүктеп алу')}
                        </button>
                        <button
                          type="button"
                          className="ib-primary-btn"
                          onClick={() => startTestFlight(true)}
                        >
                          ↻ {c('Повторить тестовый полёт', 'Fly Again', 'Қайта ұшыру')}
                        </button>
                      </div>
                    </div>
                  </section>
                )}
              </>
            )}
          </div>

          {/* Right Sticky Sidebar: Interactive Orbital Stage + Live Resource Meters */}
          <aside className="ib-sidebar">
            <FlightStageScene
              design={design}
              flight={flight}
              mode={flight ? 'flight' : 'preview'}
              onOpenLaunchCinematic={() => setShowLaunchModal(true)}
            />

            <section className="ib-meters-card">
              <h2>{c('Сводка ресурсов аппарата', 'Live Engineering Telemetry', 'Ресурстар телеметриясы')}</h2>
              <div className="ib-meter-list">
                {/* Budget */}
                <div className="ib-meter">
                  <div className="ib-meter-head">
                    <span>{c('Бюджет миссии', 'Budget', 'Бюджет')}</span>
                    <strong className={calc.cost <= calc.budget ? 'is-ok' : 'is-bad'}>
                      ${calc.cost}M / ${calc.budget}M
                    </strong>
                  </div>
                  <div className="ib-bar-track">
                    <div
                      className={`ib-bar-fill ${calc.cost <= calc.budget ? 'is-ok' : 'is-bad'}`}
                      style={{ width: `${Math.min(100, (calc.cost / Math.max(1, calc.budget)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Mass */}
                <div className="ib-meter">
                  <div className="ib-meter-head">
                    <span>{c('Масса / Грузоподъёмность', 'Wet Mass', 'Масса')}</span>
                    <strong className={calc.mass <= calc.massLimit ? 'is-ok' : 'is-bad'}>
                      {calc.mass} / {calc.massLimit} kg
                    </strong>
                  </div>
                  <div className="ib-bar-track">
                    <div
                      className={`ib-bar-fill ${calc.mass <= calc.massLimit ? 'is-ok' : 'is-bad'}`}
                      style={{ width: `${Math.min(100, (calc.mass / Math.max(1, calc.massLimit)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Power */}
                <div className="ib-meter">
                  <div className="ib-meter-head">
                    <span>{c('Мощность (EOL)', 'Power EOL', 'Қуат (EOL)')}</span>
                    <strong className={calc.endOfLifeGeneration >= calc.requiredGeneration ? 'is-ok' : 'is-bad'}>
                      {Math.round(calc.endOfLifeGeneration)} / {Math.round(calc.requiredGeneration)} W
                    </strong>
                  </div>
                  <div className="ib-bar-track">
                    <div
                      className={`ib-bar-fill ${calc.endOfLifeGeneration >= calc.requiredGeneration ? 'is-ok' : 'is-bad'}`}
                      style={{
                        width: `${Math.min(100, (calc.endOfLifeGeneration / Math.max(1, calc.requiredGeneration)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Delta-v */}
                <div className="ib-meter">
                  <div className="ib-meter-head">
                    <span>{c('Запас скорости Δv', 'Delta-v', 'Δv қоры')}</span>
                    <strong className={calc.deltaV >= calc.requiredDeltaV ? 'is-ok' : 'is-bad'}>
                      {Math.round(calc.deltaV)} / {calc.requiredDeltaV} m/s
                    </strong>
                  </div>
                  <div className="ib-bar-track">
                    <div
                      className={`ib-bar-fill ${calc.deltaV >= calc.requiredDeltaV ? 'is-ok' : 'is-bad'}`}
                      style={{
                        width: `${Math.min(100, (calc.deltaV / Math.max(1, calc.requiredDeltaV)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Downlink vs Data */}
                <div className="ib-meter">
                  <div className="ib-meter-head">
                    <span>{c('Передача данных', 'Downlink', 'Деректер арнасы')}</span>
                    <strong className={calc.bandwidth >= calc.requiredBandwidth ? 'is-ok' : 'is-bad'}>
                      {Math.round(calc.bandwidth)} / {calc.requiredBandwidth} GB/d
                    </strong>
                  </div>
                  <div className="ib-bar-track">
                    <div
                      className={`ib-bar-fill ${calc.bandwidth >= calc.requiredBandwidth ? 'is-ok' : 'is-bad'}`}
                      style={{
                        width: `${Math.min(100, (calc.bandwidth / Math.max(1, calc.requiredBandwidth)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Science & Reliability */}
                <div className="ib-meter">
                  <div className="ib-meter-head">
                    <span>{c('Надёжность и Наука', 'Reliability & Sci', 'Сенімділік пен Ғылым')}</span>
                    <strong className="is-ok">
                      {calc.reliability.toFixed(1)}% · {calc.science} pts
                    </strong>
                  </div>
                  <div className="ib-bar-track">
                    <div
                      className="ib-bar-fill is-ok"
                      style={{ width: `${Math.min(100, calc.reliability)}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>

        {/* Full-Screen Rocket Launch Cinematic Modal */}
        {showLaunchModal && (
          <div
            className="ib-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={c('Анимация запуска ракеты и выведения на орбиту', 'Rocket Launch & Orbit Insertion Animation', 'Зымыран стартының анимациясы')}
          >
            <div className="ib-modal-box">
              <div className="ib-modal-top">
                <h2>
                  🚀 {design.name} · {calc.launcher.name} → {calc.orbit.name}
                </h2>
                <button
                  type="button"
                  className="ib-secondary-btn"
                  onClick={() => setShowLaunchModal(false)}
                >
                  {flight
                    ? c('Перейти к управлению на орбите →', 'Continue to Orbital Control →', 'Орбиталық басқаруға өту →')
                    : c('Закрыть окно', 'Close Preview', 'Жабу')}
                </button>
              </div>
              <LaunchSequence
                design={design}
                onComplete={() => {
                  if (flight) {
                    setShowLaunchModal(false);
                  }
                }}
              />
            </div>
          </div>
        )}
      </main>
    </ExpeditionShell>
  );
}
