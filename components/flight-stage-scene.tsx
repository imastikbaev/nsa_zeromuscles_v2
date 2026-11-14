'use client';
import { useI18n } from "@/components/preferences";


import './flight-stage-scene.css';
import { useEffect, useId, useMemo, useState } from 'react';
import {
  instruments as instrumentCatalog,
  launchers,
  missions,
  orbits,
  systems,
  type Design,
  type MissionId,
} from '@/lib/data';
import { calculate } from '@/lib/engineering';
import { dataTotals } from '@/lib/operations';
import { operatingProfile } from '@/lib/orbit-operations';
import { pendingEvent, phases, type Flight } from '@/lib/simulation';
import { useExpeditionCopy } from './expedition-shell';

type Props = {
  design: Design;
  flight?: Flight | null;
  mode?: 'preview' | 'flight';
  onOpenLaunchCinematic?: () => void;
};

const BODY_PALETTES: Record<
  MissionId,
  { core: string; rim: string; atmo: string; crater: string; labelRu: string; labelEn: string; labelKk: string }
> = {
  earth: {
    core: '#174882',
    rim: '#4ca6ff',
    atmo: 'rgba(116, 192, 255, 0.24)',
    crater: '#2e7d5b',
    labelRu: 'Земля',
    labelEn: 'Earth',
    labelKk: 'Жер',
  },
  lunar: {
    core: '#6c7586',
    rim: '#b8c2d4',
    atmo: 'rgba(184, 194, 212, 0.14)',
    crater: '#4b5362',
    labelRu: 'Луна',
    labelEn: 'Moon',
    labelKk: 'Ай',
  },
  mars: {
    core: '#9e472a',
    rim: '#e5865a',
    atmo: 'rgba(235, 134, 90, 0.2)',
    crater: '#6e2d18',
    labelRu: 'Марс',
    labelEn: 'Mars',
    labelKk: 'Марс',
  },
  asteroid: {
    core: '#5c5852',
    rim: '#a39c93',
    atmo: 'rgba(163, 156, 147, 0.12)',
    crater: '#3d3a36',
    labelRu: 'Астероид',
    labelEn: 'Asteroid',
    labelKk: 'Астероид',
  },
  solar: {
    core: '#d97706',
    rim: '#fde047',
    atmo: 'rgba(251, 191, 36, 0.3)',
    crater: '#b45309',
    labelRu: 'Гелиоцентрическая орбита',
    labelEn: 'Heliocentric Orbit',
    labelKk: 'Гелиоцентрлік орбита',
  },
  deep: {
    core: '#2c3e70',
    rim: '#8aa8ff',
    atmo: 'rgba(138, 168, 255, 0.2)',
    crater: '#1c284a',
    labelRu: 'Дальний космос (Юпитер)',
    labelEn: 'Deep Space (Jupiter)',
    labelKk: 'Терең ғарыш (Юпитер)',
  },
};

export function FlightStageScene({
  design,
  flight = null,
  mode = 'preview',
  onOpenLaunchCinematic,
}: Props) {
  const { t } = useI18n();

  const c = useExpeditionCopy();
  const uid = useId().replace(/:/g, '');
  const calc = useMemo(() => calculate(design), [design]);
  const orbit = orbits.find((o) => o.id === design.orbit) ?? orbits[0];
  const launcher = launchers.find((l) => l.id === design.launcher) ?? launchers[0];
  const prop =
    systems.propulsion.find((p) => p.id === design.systems.propulsion) ??
    systems.propulsion[0];
  const ant =
    systems.antenna.find((a) => a.id === design.systems.antenna) ??
    systems.antenna[0];
  const mission = missions.find((m) => m.id === design.mission) ?? missions[0];
  const profile = operatingProfile(design.orbit);
  const palette = BODY_PALETTES[design.mission] ?? BODY_PALETTES.earth;

  const [tick, setTick] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      setTick((ts - start) / 1000);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  const activePhase = flight ? flight.phase : 6;
  const activeEvent = flight ? pendingEvent(flight) : null;
  const ops = flight?.operations;
  const totals = ops ? dataTotals(ops) : null;
  const isDownlinking = ops ? ops.downlink : true;

  // Compute orbital angle based on phase and animation tick
  const baseAngleDeg =
    mode === 'preview'
      ? (tick * 18) % 360
      : activePhase === 0
        ? 215
        : activePhase === 1
          ? 245
          : activePhase === 2
            ? 280
            : activePhase === 3
              ? 315
              : (tick * 24 + activePhase * 45) % 360;

  const angleRad = (baseAngleDeg * Math.PI) / 180;
  const rx = 215;
  const ry = 96;
  const cx = 360;
  const cy = 205;

  const craftX =
    mode === 'flight' && activePhase === 0
      ? 110
      : mode === 'flight' && activePhase === 1
        ? 165
        : cx + Math.cos(angleRad) * rx;
  const craftY =
    mode === 'flight' && activePhase === 0
      ? 310 - (reducedMotion ? 40 : Math.sin(tick * 2) * 10 + 35)
      : mode === 'flight' && activePhase === 1
        ? 215
        : cy + Math.sin(angleRad) * ry;

  // Determine orbital sector in Science Operations
  const normalizedDeg = ((baseAngleDeg % 360) + 360) % 360;
  const inEclipse = normalizedDeg > 35 && normalizedDeg < 145;
  const inContactWindow = normalizedDeg >= 200 && normalizedDeg <= 330;
  const inObservationWindow = !inEclipse && (ops ? ops.duty > 0 : true);

  // Wing length scales with solar panel area (0..40 m²)
  const wingSpan = Math.min(72, Math.max(18, 16 + design.panels * 1.65));
  const deployedScale =
    design.systems.power === 'rtg' && design.panels === 0
      ? 0.2
      : mode === 'flight' && activePhase < 3
        ? 0.12
        : mode === 'flight' && activePhase === 3
          ? 0.85
          : 1;

  // Plume color by propulsion type
  const plumeColor =
    design.systems.propulsion === 'ion'
      ? '#64d8ff'
      : design.systems.propulsion === 'hybrid'
        ? '#a78bfa'
        : '#ffb74d';

  const firingThruster =
    mode === 'flight' &&
    (activePhase === 0 || activePhase === 1 || activePhase === 2 || activePhase === 5);

  const selectedInstruments = instrumentCatalog.filter((i) =>
    design.instruments.includes(i.id),
  );
  const bufferPct =
    totals && calc.storage > 0
      ? Math.min(100, Math.round((totals.buffered / calc.storage) * 100))
      : 0;

  const phaseTitle = () => {
    if (mode === 'preview') {
      return c(
        `Орбитальный предпросмотр · ${palette.labelRu}`,
        `Orbital Preview · ${palette.labelEn}`,
        `Орбиталық алдын ала қарау · ${palette.labelKk}`,
      );
    }
    const labels: Array<[string, string, string]> = [
      ['Этап 1/8 · Старт ракеты-носителя', 'Phase 1/8 · Rocket Liftoff', '1/8 кезең · Зымыран старты'],
      ['Этап 2/8 · Отделение первой ступени', 'Phase 2/8 · Stage Separation', '2/8 кезең · Саты бөлінуі'],
      ['Этап 3/8 · Выход на целевую орбиту', 'Phase 3/8 · Orbit Insertion Burn', '3/8 кезең · Орбитаға шығу'],
      ['Этап 4/8 · Раскрытие солнечных батарей', 'Phase 4/8 · Solar Array Deployment', '4/8 кезең · Күн панельдерін ашу'],
      ['Этап 5/8 · Проверка радиолинии с Землёй', 'Phase 5/8 · Deep-Space Comms Check', '5/8 кезең · Байланысты тексеру'],
      ['Этап 6/8 · Коррекция траектории (Δv)', 'Phase 6/8 · Course Correction Burn', '6/8 кезең · Траекторияны түзету'],
      ['Этап 7/8 · Научная работа и сброс данных', 'Phase 7/8 · Science & Data Downlink', '7/8 кезең · Ғылыми жұмыс және деректер'],
      ['Этап 8/8 · Завершение полётной программы', 'Phase 8/8 · Mission Completion', '8/8 кезең · Миссияның аяқталуы'],
    ];
    const item = labels[Math.min(labels.length - 1, Math.max(0, activePhase))];
    return c(item[0], item[1], item[2]);
  };

  return (
    <div className="fss-card" aria-label={phaseTitle()}>
      <div className="fss-topbar">
        <div className="fss-status-group">
          <span className={`fss-dot ${activeEvent ? 'is-alert' : 'is-nominal'}`} />
          <strong>{phaseTitle()}</strong>
        </div>
        <div className="fss-meta-pills">
          <span className="fss-pill">
            {c('Носитель:', 'Launcher:', 'Зымыран:')} {t(launcher.name)}
          </span>
          <span className="fss-pill">
            {c('Орбита:', 'Orbit:', 'Орбита:')} {t(orbit.short)} ({t(orbit.altitude)})
          </span>
          {onOpenLaunchCinematic && (
            <button type="button" className="fss-cinematic-btn" onClick={onOpenLaunchCinematic}>
              {c('Анимация запуска ракеты', 'Watch Rocket Launch', 'Зымыран стартын көру')}
            </button>
          )}
        </div>
      </div>

      <div className="fss-canvas-wrap">
        <svg
          className="fss-svg"
          viewBox="0 0 720 390"
          role="img"
          aria-label={c(
            'Интерактивная схема орбиты, космического аппарата и радиолинии',
            'Interactive orbital, spacecraft, and ground link diagram',
            'Орбита, ғарыш аппараты және радиобайланыс интерактивті сызбасы',
          )}
        >
          <defs>
            <radialGradient id={`${uid}-fssBodyGrad`} cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor={palette.rim} />
              <stop offset="65%" stopColor={palette.core} />
              <stop offset="100%" stopColor="#070c16" />
            </radialGradient>
            <linearGradient id={`${uid}-fssEclipseGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(4, 8, 16, 0.05)" />
              <stop offset="100%" stopColor="rgba(4, 8, 16, 0.82)" />
            </linearGradient>
            <linearGradient id={`${uid}-fssScanGrad`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(144, 191, 255, 0.48)" />
              <stop offset="100%" stopColor="rgba(144, 191, 255, 0.0)" />
            </linearGradient>
          </defs>

          {/* Background Starfield */}
          {[
            [42, 48, 1.4],
            [118, 86, 1.1],
            [196, 34, 1.6],
            [284, 58, 1.0],
            [520, 40, 1.5],
            [618, 72, 1.2],
            [670, 38, 1.8],
            [648, 168, 1.2],
            [590, 326, 1.4],
            [82, 356, 1.3],
            [176, 332, 1.1],
            [464, 352, 1.5],
          ].map(([sx, sy, sr], idx) => (
            <circle
              key={idx}
              cx={sx}
              cy={sy}
              r={sr}
              fill="#d8e6ff"
              opacity={0.35 + ((idx * 19) % 50) / 100}
            />
          ))}

          {/* Sunlight Rays on Left Side */}
          <g opacity="0.65">
            <text x="24" y="32" fill="#fde047" fontSize="11" fontWeight="600">
              ☀ {c('Солнечный поток', 'Solar Flux', 'Күн ағыны')} ({Math.round(orbit.sun * 100)}%)
            </text>
            <line x1="18" y1="44" x2="92" y2="62" stroke="#fde047" strokeWidth="1" strokeDasharray="3 5" />
            <line x1="18" y1="74" x2="92" y2="92" stroke="#fde047" strokeWidth="1" strokeDasharray="3 5" />
          </g>

          {/* Eclipse Shadow Zone Behind Target Body */}
          <path
            d={`M ${cx + 42} ${cy - 48} L 705 ${cy - 125} L 705 ${cy + 145} L ${cx + 32} ${cy + 58} Z`}
            fill={`url(#${uid}-fssEclipseGrad)`}
          />
          <text x="548" y="96" fill="#9fb2cc" fontSize="11">
            ☾ {c('Тень (питание от АКБ)', 'Eclipse Shadow (Battery)', 'Көлеңке аймағы')}
          </text>

          {/* Ground Station Receiver on Left-Bottom */}
          <g transform="translate(56, 324)">
            <rect x="-24" y="22" width="64" height="8" rx="3" fill="#1e2f48" />
            <path d="M 0 22 L 8 6 L 16 22 Z" fill="#6f8db5" />
            <path
              d="M -4 4 Q 8 -10 22 4"
              fill="none"
              stroke="#90bfff"
              strokeWidth="2.5"
            />
            <line x1="8" y1="6" x2="14" y2="-4" stroke="#90bfff" strokeWidth="1.8" />
            <circle cx="14" cy="-4" r="2.5" fill="#6ee7b7" />
            <text x="-20" y="44" fill="#b9cbe3" fontSize="11" fontWeight="600">
              {c('ЦУП · Наземная станция', 'Mission Control Dish', 'Жер үсті станциясы')}
            </text>
          </g>

          {/* Orbit Ellipse */}
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill="none"
            stroke="rgba(144, 191, 255, 0.28)"
            strokeWidth="1.6"
            strokeDasharray="6 6"
          />

          {/* Highlighted Active Orbit Arc */}
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill="none"
            stroke={inEclipse ? '#fbbf24' : '#90bfff'}
            strokeWidth="2.2"
            strokeDasharray="95 600"
            strokeDashoffset={-baseAngleDeg * 1.9}
            opacity="0.7"
          />

          {/* Central Destination Body */}
          <g transform={`translate(${cx}, ${cy})`}>
            <circle r="70" fill={palette.atmo} />
            <circle r="56" fill={`url(#${uid}-fssBodyGrad)`} />
            <circle cx="-18" cy="-14" r="11" fill={palette.crater} opacity="0.45" />
            <circle cx="16" cy="18" r="15" fill={palette.crater} opacity="0.38" />
            <circle cx="22" cy="-16" r="7" fill={palette.crater} opacity="0.35" />
            {design.mission === 'deep' && (
              <ellipse
                cx="0"
                cy="0"
                rx="84"
                ry="18"
                fill="none"
                stroke="rgba(216, 230, 255, 0.35)"
                strokeWidth="4"
                transform="rotate(-14)"
              />
            )}
            <text
              x="0"
              y="82"
              textAnchor="middle"
              fill="#d5e4fa"
              fontSize="12"
              fontWeight="600"
            >
              {c(palette.labelRu, palette.labelEn, palette.labelKk)} · {t(orbit.altitude)}
            </text>
          </g>

          {/* Launch Ascent Trajectory Line (Phases 0 & 1) */}
          {mode === 'flight' && activePhase <= 1 && (
            <g>
              <path
                d={`M 90 340 Q 120 190 ${cx - rx} ${cy}`}
                fill="none"
                stroke="#ffb74d"
                strokeWidth="2.2"
                strokeDasharray="5 5"
              />
              {activePhase === 1 && (
                <g transform="translate(122, 272) rotate(28)">
                  <rect x="-6" y="-16" width="12" height="32" rx="2" fill="#8b9bb4" />
                  <text x="14" y="4" fill="#fbbf24" fontSize="11">
                    {c('1-я ступень отделена', 'Stage 1 separated', '1-саты бөлінді')}
                  </text>
                </g>
              )}
            </g>
          )}

          {/* Observation Swath Cone (when observing target body) */}
          {(mode === 'preview' || activePhase === 6) &&
            inObservationWindow &&
            selectedInstruments.length > 0 && (
              <g>
                <polygon
                  points={`${craftX},${craftY} ${cx - 24},${cy - 18} ${cx + 24},${cy + 18}`}
                  fill={`url(#${uid}-fssScanGrad)`}
                />
                <line
                  x1={craftX}
                  y1={craftY}
                  x2={cx}
                  y2={cy}
                  stroke="#90bfff"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                />
              </g>
            )}

          {/* RF Downlink Beam to Ground Station (when communicating) */}
          {(mode === 'preview' || activePhase === 4 || (activePhase === 6 && inContactWindow)) &&
            isDownlinking && (
              <g>
                <line
                  x1={craftX}
                  y1={craftY}
                  x2={70}
                  y2={320}
                  stroke="#6ee7b7"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  strokeDashoffset={-tick * 28}
                />
                <circle
                  cx={craftX + (70 - craftX) * ((tick * 0.45) % 1)}
                  cy={craftY + (320 - craftY) * ((tick * 0.45) % 1)}
                  r="4"
                  fill="#6ee7b7"
                />
                <circle
                  cx={craftX + (70 - craftX) * ((tick * 0.45 + 0.5) % 1)}
                  cy={craftY + (320 - craftY) * ((tick * 0.45 + 0.5) % 1)}
                  r="3.5"
                  fill="#90bfff"
                />
              </g>
            )}

          {/* Anomaly Alert Overlay Effect (if an in-flight event is pending) */}
          {activeEvent && (
            <g>
              <circle
                cx={craftX}
                cy={craftY}
                r={36 + Math.sin(tick * 5) * 5}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="5 4"
              />
              <text
                x={craftX}
                y={craftY - 46}
                textAnchor="middle"
                fill="#fcd34d"
                fontSize="12"
                fontWeight="700"
              >
                ⚠ {t(activeEvent.title)}
              </text>
            </g>
          )}

          {/* Spacecraft Assembly */}
          <g transform={`translate(${craftX}, ${craftY})`}>
            {/* Thruster Plume when firing */}
            {(firingThruster || mode === 'preview') && (
              <ellipse
                cx="-24"
                cy="0"
                rx={firingThruster ? 18 + Math.sin(tick * 16) * 4 : 10}
                ry={firingThruster ? 6 : 3.5}
                fill={plumeColor}
                opacity={firingThruster ? 0.9 : 0.55}
              />
            )}

            {/* Left & Right Solar Array Wings */}
            <g transform={`scale(1, ${deployedScale})`}>
              <rect
                x="-7"
                y={-14 - wingSpan}
                width="14"
                height={wingSpan}
                rx="2"
                fill="#1d4ed8"
                stroke="#90bfff"
                strokeWidth="1.2"
              />
              <line
                x1="0"
                y1={-14 - wingSpan}
                x2="0"
                y2="-14"
                stroke="rgba(144, 191, 255, 0.5)"
                strokeWidth="0.8"
              />
              <rect
                x="-7"
                y="14"
                width="14"
                height={wingSpan}
                rx="2"
                fill="#1d4ed8"
                stroke="#90bfff"
                strokeWidth="1.2"
              />
              <line
                x1="0"
                y1="14"
                x2="0"
                y2={14 + wingSpan}
                stroke="rgba(144, 191, 255, 0.5)"
                strokeWidth="0.8"
              />
            </g>

            {/* Spacecraft Bus Body */}
            <rect
              x="-16"
              y="-13"
              width="32"
              height="26"
              rx="4"
              fill="#d8e4f8"
              stroke="#476692"
              strokeWidth="1.5"
            />
            {/* Gold Multi-Layer Insulation Foil Accent */}
            <rect x="-11" y="-8" width="14" height="16" rx="2" fill="#eab308" opacity="0.85" />

            {/* Instrument Sensor Pods */}
            {selectedInstruments.map((inst, idx) => {
              const py = -8 + idx * 5.5;
              return (
                <circle
                  key={inst.id}
                  cx="9"
                  cy={py}
                  r="2.4"
                  fill="#38bdf8"
                  stroke="#08111f"
                  strokeWidth="0.8"
                >
                  <title>{t(inst.name)}</title>
                </circle>
              );
            })}

            {/* Antenna Visualization */}
            {design.systems.antenna === 'dish' && (
              <path
                d="M 16 -8 Q 26 0 16 8"
                fill="none"
                stroke="#f8fafc"
                strokeWidth="2.2"
              />
            )}
            {design.systems.antenna === 'array' && (
              <rect x="16" y="-9" width="6" height="18" rx="1" fill="#6ee7b7" />
            )}
            {design.systems.antenna === 'patch' && (
              <rect x="15" y="-5" width="3" height="10" rx="1" fill="#90bfff" />
            )}
          </g>
        </svg>
      </div>

      {/* Bottom Live Telemetry Strip */}
      <div className="fss-telemetry-grid">
        <div className="fss-stat">
          <span>{c('Энергобаланс (конец срока службы)', 'Power Margin (EOL)', 'Энергия балансы (EOL)')}</span>
          <strong className={calc.endOfLifeMargin >= calc.designPowerMargin ? 'is-ok' : 'is-bad'}>
            {design.panels}{t(" m² · ")}{calc.endOfLifeMargin >= 0 ? '+' : ''}
            {Math.round(calc.endOfLifeMargin)}{t(" W ")}</strong>
        </div>
        <div className="fss-stat">
          <span>{c('Двигатель и манёвр Δv', 'Propulsion & Δv', 'Қозғалтқыш және Δv')}</span>
          <strong className={calc.deltaV >= calc.requiredDeltaV ? 'is-ok' : 'is-bad'}>
            {t(prop.name)} · {Math.round(calc.deltaV)} / {calc.requiredDeltaV}{t(" m/s ")}</strong>
        </div>
        <div className="fss-stat">
          <span>{c('Канал связи и антенна', 'Radio Link & Antenna', 'Радиоарна және антенна')}</span>
          <strong className={calc.bandwidth >= calc.requiredBandwidth ? 'is-ok' : 'is-bad'}>
            {t(ant.name)} · {Math.round(calc.bandwidth)} / {calc.requiredBandwidth}{t(" GB/d ")}</strong>
        </div>
        <div className="fss-stat">
          <span>
            {totals
              ? c('Буфер памяти / Передано', 'Buffer / Delivered', 'Буфер / Жеткізілді')
              : c('Режим 6-часового витка', '6-Hour Orbit Profile', '6 сағаттық орбита циклі')}
          </span>
          <strong>
            {t(totals
              ? `${totals.buffered.toFixed(0)}/${calc.storage} GB (${bufferPct}%) · ↓${totals.delivered.toFixed(0)} GB`
              : `${Math.round(profile.observation * 6 * 10) / 10}h obs · ${Math.round(profile.eclipse * 6 * 10) / 10}h ecl · ${Math.round(profile.contact * 6 * 10) / 10}h link`)}
          </strong>
        </div>
      </div>

      <p className="fss-note">{c('Схема движения и окон связи условная. Время миссии и ресурсы пересчитываются только по команде.', 'Motion and contact windows are schematic. Mission time and resources advance only on command.', 'Қозғалыс пен байланыс терезелері шартты. Миссия уақыты мен ресурстары тек команда бойынша есептеледі.')}</p>
      {/* Flight Phase Progress Bar when in Flight Mode */}
      {mode === 'flight' && flight && (
        <div className="fss-phase-track" role="list" aria-label={c('Этапы полёта', 'Flight phases', 'Ұшу кезеңдері')}>
          {phases.map((p, idx) => {
            const state =
              idx < flight.phase ? 'done' : idx === flight.phase ? 'current' : 'upcoming';
            return (
              <div key={p} role="listitem" className={`fss-phase-step is-${state}`}>
                <span className="fss-phase-num">{idx + 1}</span>
                <span className="fss-phase-name">{t(p)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
