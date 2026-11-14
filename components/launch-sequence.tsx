"use client";

import "./launch-sequence.css";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Play, RotateCcw, SkipForward } from "lucide-react";
import type { Design } from "@/lib/data";
import { calculate } from "@/lib/engineering";
import { phases } from "@/lib/simulation";
import { useI18n } from "./preferences";

/**
 * Illustrative launch cinematic. Everything shown is derived from the player's
 * design through the same `calculate()` engine the simulator uses: the launcher
 * decides the rocket size, mass/capacity decides vibration, propulsion decides
 * the burn plume and fuel gauge, panels and antenna decide the deployed craft.
 * The trajectory is a teaching illustration, not a propagated orbit.
 */
export const LAUNCH_DURATION = 24;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => {
  const x = clamp01(n);
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, n: number) => a + (b - a) * n;
const rocketScale: Record<string, number> = {
  swift: 0.72,
  atlas: 0.86,
  titan: 1,
  horizon: 1.14,
};
const plume: Record<string, { length: number; width: number; core: string; edge: string }> = {
  chemical: { length: 34, width: 11, core: "#fff3d6", edge: "#ff9a2e" },
  ion: { length: 74, width: 4.5, core: "#e8f8ff", edge: "#5cc8ff" },
  hybrid: { length: 52, width: 8, core: "#fff6df", edge: "#9fd8ff" },
};

function makeStars(n: number) {
  let seed = 7;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: n }, () => ({
    x: next() * 800,
    y: next() * 520,
    r: 0.5 + next() * 1.4,
    o: 0.35 + next() * 0.65,
  }));
}

function parseKm(text: string): number | null {
  const match = /^([\d,.]+)\s*km$/i.exec(text.trim());
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

function Craft({
  design,
  deploy,
}: {
  design: Design;
  deploy: number;
}) {
  const panelWidth = Math.max(34, Math.min(120, 26 + design.panels * 4));
  const folded = lerp(0.08, 1, deploy);
  const antenna = design.systems.antenna;
  const hires = design.instruments.includes("hires");
  return (
    <g>
      <g transform={`translate(-22 0) scale(${folded} 1)`}>
        <rect x={-panelWidth} y={-19} width={panelWidth} height={38} fill="#1d4f7a" stroke="#8cc0ee" strokeWidth={1.2} />
        {[1, 2, 3].map((i) => (
          <path key={i} d={`M${-panelWidth + (panelWidth * i) / 4} -19v38`} stroke="#8cc0ee" strokeWidth={0.6} opacity={0.6} />
        ))}
      </g>
      <g transform={`translate(22 0) scale(${folded} 1)`}>
        <rect x={0} y={-19} width={panelWidth} height={38} fill="#1d4f7a" stroke="#8cc0ee" strokeWidth={1.2} />
        {[1, 2, 3].map((i) => (
          <path key={i} d={`M${(panelWidth * i) / 4} -19v38`} stroke="#8cc0ee" strokeWidth={0.6} opacity={0.6} />
        ))}
      </g>
      <path d={`M${-22 - panelWidth * folded} 0H${22 + panelWidth * folded}`} stroke="#9aa3ad" strokeWidth={2} />
      <rect x={-22} y={-30} width={44} height={60} rx={4} fill="#d8dde4" stroke="#8a94a3" strokeWidth={1.2} />
      <rect x={-22} y={-30} width={44} height={10} fill="#c88a1b" />
      <circle cx={0} cy={8} r={hires ? 11 : 7} fill="#071526" stroke="#8cc0ee" strokeWidth={1} />
      <circle cx={0} cy={8} r={hires ? 5 : 3} fill="#3b82c4" />
      <g opacity={smooth((deploy - 0.35) / 0.4)} stroke="#e8eef5" strokeWidth={1.4} fill="none">
        {antenna === "patch" && <rect x={-9} y={-38} width={18} height={7} fill="#c9d1db" />}
        {antenna === "dish" && (
          <>
            <path d="M0 -30V-44" />
            <path d="M-18 -54Q0 -36 18 -54Z" fill="#c9d1db" />
          </>
        )}
        {antenna === "array" && (
          <>
            <rect x={-15} y={-40} width={30} height={9} fill="#c9d1db" />
            <path d="M-5 -40v9M5 -40v9M-15 -35.5h30" />
          </>
        )}
      </g>
    </g>
  );
}

export function LaunchSequence({
  design,
  autoPlay = true,
  onComplete,
  showControls = true,
}: {
  design: Design;
  autoPlay?: boolean;
  onComplete?: () => void;
  showControls?: boolean;
}) {
  const { locale, t } = useI18n();
  const uid = useId().replace(/:/g, "");
  const m = useMemo(() => calculate(design), [design]);
  const stars = useMemo(() => makeStars(90), []);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const finished = useRef(false);
  const completeRef = useRef(onComplete);
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  const c = (ru: string, en: string, kk: string) =>
    locale === "ru" ? ru : locale === "kk" ? kk : en;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setTime(LAUNCH_DURATION);
      setPlaying(false);
      return;
    }
    setPlaying(autoPlay);
  }, [autoPlay]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setTime((prev) => Math.min(LAUNCH_DURATION, prev + dt));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  useEffect(() => {
    if (time >= LAUNCH_DURATION) {
      setPlaying(false);
      if (!finished.current) {
        finished.current = true;
        completeRef.current?.();
      }
    }
  }, [time]);

  function replay() {
    finished.current = false;
    setTime(0);
    setPlaying(true);
  }
  function skip() {
    setTime(LAUNCH_DURATION);
  }

  // Timeline: 0-3 countdown, 3-11.5 liftoff, 9.5-12 stage separation,
  // 12-19 orbit insertion burn, 19.5-23 array deployment, 24 orbit achieved.
  const scale = rocketScale[m.launcher.id] ?? 1;
  const load = clamp01(m.mass / Math.max(1, m.launchMassLimit));
  const u = clamp01((time - 3) / 8.5);
  const lift = smooth(u);
  const sep = clamp01((time - 9.5) / 2.5);
  const fade = smooth((time - 11.5) / 1.5);
  const burn = clamp01((time - 12) / 7);
  const deploy = smooth((time - 19.5) / 3.5);
  const ring = smooth((time - 18) / 2);
  const countdown = time < 3 ? Math.ceil(3 - time) : 0;
  const shaking = time >= 3 && time < 9.8;
  const shake = shaking ? (1.2 + load * 2.4) * (time < 4 ? 0.5 : 1) : 0;
  const dx = Math.sin(time * 80) * shake;
  const dy = Math.cos(time * 97) * shake * 0.6;
  const flicker = 0.85 + 0.15 * Math.sin(time * 45) + 0.08 * Math.sin(time * 71);
  const darkness = smooth(u * 1.1);
  const groundOffset = 900 * Math.pow(u, 2.2);
  const jet = plume[design.systems.propulsion] ?? plume.chemical;

  const phaseIndex = time < 9.5 ? 0 : time < 12 ? 1 : time < 19 ? 2 : time < 23.5 ? 3 : 4;
  const orbitKm = parseKm(m.orbit.altitude);
  const altitude =
    time < 12
      ? lerp(0, 160, lift)
      : lerp(160, orbitKm ?? 400, smooth(burn));
  const speed = lerp(0, 7.8, smooth((time - 3) / 16));
  const burnedFuel = Math.min(design.fuel, m.fuelNeeded) * smooth(burn);
  const remainingFuel = Math.max(0, design.fuel - burnedFuel);
  const sign = time < 3 ? "−" : "+";
  const clock = Math.abs(time - 3);
  const mm = String(Math.floor(clock / 60)).padStart(2, "0");
  const ss = String(Math.floor(clock % 60)).padStart(2, "0");

  // Orbit scene geometry: spacecraft spirals up to the dashed orbit ring.
  const pathP = smooth(burn);
  const craftX = lerp(90, 430, pathP) + Math.max(0, time - 19) * 5;
  const craftY = lerp(330, 170, Math.sin((pathP * Math.PI) / 2)) + Math.sin(time * 1.4) * (deploy > 0 ? 2.5 : 0);
  const craftAngle = lerp(62, 90, pathP);
  const showBurn = time >= 12 && time < 19;

  const smoke = Array.from({ length: 16 }, (_, i) => {
    const age = (((time - 3) * 0.5 + i / 16) % 1 + 1) % 1;
    const side = i % 2 ? 1 : -1;
    return {
      key: i,
      x: 400 + side * age * (40 + ((i * 13) % 50)),
      y: 440 - age * 22,
      r: 10 + age * 36,
      o: (1 - age) * 0.55 * clamp01(1 - u * 1.5),
    };
  });

  const labelPhase = phaseIndex === 4 ? c("Орбита достигнута", "Orbit achieved", "Орбитаға шықты") : t(phases[phaseIndex]);

  return (
    <div className="ls-root">
      <svg
        className="ls-svg"
        viewBox="0 0 800 520"
        role="img"
        aria-label={c(
          "Анимация запуска ракеты и выхода космического аппарата на орбиту",
          "Animation of a rocket launch and the spacecraft reaching orbit",
          "Зымыранның ұшырылуы мен аппараттың орбитаға шығуы анимациясы",
        )}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a5f96" />
            <stop offset="1" stopColor="#bcd9ee" />
          </linearGradient>
          <linearGradient id={`${uid}-night`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="0.55" stopColor="#000" stopOpacity="0.18" />
            <stop offset="1" stopColor="#000" stopOpacity="0.78" />
          </linearGradient>
          <radialGradient id={`${uid}-body`} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor={m.mission.color} />
            <stop offset="1" stopColor="#0b0f18" />
          </radialGradient>
          <pattern
            id={`${uid}-cells`}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <rect width="8" height="8" fill="#1d4f7a" />
          </pattern>
          <pattern
            id={`${uid}-earth`}
            patternUnits="userSpaceOnUse"
            width="1120"
            height="560"
            patternTransform={`translate(${-time * 14} 260)`}
          >
            <image href="/earth.jpg" width="1120" height="560" preserveAspectRatio="none" />
          </pattern>
          <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* ASCENT SCENE */}
        {fade < 1 && (
          <g opacity={1 - fade}>
            <rect width="800" height="520" fill={`url(#${uid}-sky)`} />
            <rect width="800" height="520" fill="#02040a" opacity={darkness} />
            <g opacity={smooth(u * 1.3 - 0.15)}>
              {stars.map((s, i) => (
                <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
              ))}
            </g>

            <g transform={`translate(0 ${groundOffset})`}>
              <path d="M0 440 L120 392 L210 426 L330 380 L430 440Z" fill="#5d6f82" opacity={0.7} />
              <path d="M430 440 L560 386 L660 424 L800 372V440Z" fill="#4c5d70" opacity={0.7} />
              <rect x="0" y="440" width="800" height="400" fill="#33404d" />
              <rect x="0" y="440" width="800" height="5" fill="#8a97a6" />
              <g stroke="#c4ccd6" strokeWidth={2} fill="none">
                <path d="M330 440V250M352 440V250M330 250h22M330 290h22M330 330h22M330 370h22M330 410h22" />
                <path d="M330 290L352 330M330 330L352 370M330 250L352 290" opacity={0.6} />
              </g>
              <rect x="350" y="286" width="26" height="4" fill="#c4ccd6" />
              {smoke.map((p) => (
                <circle key={p.key} cx={p.x} cy={p.y} r={p.r} fill="#e9edf2" opacity={Math.max(0, p.o)} />
              ))}
            </g>

            <g transform={`translate(${400 + dx} ${440 - lift * 160 + dy}) scale(${scale})`}>
              {/* Stage 1 */}
              <g transform={`translate(0 ${sep * sep * 420}) rotate(${sep * 10})`}>
                {time >= 3 && sep < 0.15 && (
                  <g opacity={clamp01((time - 3) / 0.8) * flicker}>
                    <path d="M-15 12L15 12L0 12" fill="none" />
                    <path d={`M-15 12 Q0 ${12 + 120 * clamp01((time - 3) / 1.2)} 15 12Z`} fill="#ff8a1f" />
                    <path d={`M-8 12 Q0 ${12 + 70 * clamp01((time - 3) / 1.2)} 8 12Z`} fill="#fff3c4" />
                  </g>
                )}
                <rect x={-20} y={-120} width={40} height={120} fill="#e9edf2" stroke="#9aa6b4" strokeWidth={1.2} />
                <rect x={-20} y={-62} width={40} height={14} fill="#d62828" />
                <path d="M-16 0L-20 14H-6L-4 0ZM4 0L6 14H20L16 0Z" fill="#6b7686" />
              </g>
              {/* Stage 2 */}
              <g>
                {time >= 10.6 && time < 12 && (
                  <path d={`M-9 -120 Q0 ${-120 + 50 * flicker} 9 -120Z`} fill="#ffd27a" opacity={0.9} />
                )}
                <rect x={-16} y={-185} width={32} height={65} fill="#dfe4ea" stroke="#9aa6b4" strokeWidth={1.2} />
                <rect x={-16} y={-150} width={32} height={3} fill="#8a94a3" />
              </g>
              {/* Fairing halves */}
              <g transform={`translate(${-sep * 70} ${sep * 50}) rotate(${-sep * 28} -16 -185)`}>
                <path d="M-16 -185V-232Q-16 -262 0 -275V-185Z" fill="#f2f4f7" stroke="#9aa6b4" strokeWidth={1.2} />
              </g>
              <g transform={`translate(${sep * 70} ${sep * 50}) rotate(${sep * 28} 16 -185)`}>
                <path d="M16 -185V-232Q16 -262 0 -275V-185Z" fill="#e4e8ed" stroke="#9aa6b4" strokeWidth={1.2} />
              </g>
              {sep > 0.25 && (
                <g transform="translate(0 -205) scale(0.4)" opacity={smooth((sep - 0.25) / 0.4)}>
                  <Craft design={design} deploy={0} />
                </g>
              )}
            </g>
          </g>
        )}

        {/* ORBIT SCENE */}
        {fade > 0 && (
          <g opacity={fade}>
            <rect width="800" height="520" fill="#02040a" />
            {stars.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
            ))}
            <circle cx="400" cy="820" r="566" fill="none" stroke="#6fb8ff" strokeWidth="9" opacity="0.55" filter={`url(#${uid}-glow)`} />
            <circle
              cx="400"
              cy="820"
              r="560"
              fill={design.mission === "earth" ? `url(#${uid}-earth)` : `url(#${uid}-body)`}
            />
            <circle cx="400" cy="820" r="560" fill={`url(#${uid}-night)`} />
            <circle
              cx="400"
              cy="820"
              r="650"
              fill="none"
              stroke="#f2ece1"
              strokeWidth="1.5"
              strokeDasharray={`${ring * 100} 100`}
              pathLength={100}
              opacity={0.7}
              transform="rotate(-90 400 820)"
            />
            <g transform={`translate(${craftX} ${craftY}) rotate(${craftAngle}) scale(1.35)`}>
              {showBurn && (
                <g opacity={flicker}>
                  <path
                    d={`M${-jet.width} 30 Q0 ${30 + jet.length * 1.4} ${jet.width} 30Z`}
                    fill={jet.edge}
                  />
                  <path
                    d={`M${-jet.width / 2} 30 Q0 ${30 + jet.length * 0.8} ${jet.width / 2} 30Z`}
                    fill={jet.core}
                  />
                </g>
              )}
              <Craft design={design} deploy={deploy} />
            </g>
          </g>
        )}
      </svg>

      <div className="ls-hud">
        <div className="ls-hud-top">
          <span className="ls-clock">
            T{sign}
            {mm}:{ss}
          </span>
          <span className="ls-phase" aria-live="polite">
            {labelPhase}
          </span>
        </div>
        {countdown > 0 && (
          <div className="ls-countdown" aria-hidden="true">
            {countdown}
          </div>
        )}
        {phaseIndex === 4 && (
          <div className="ls-banner" role="status">
            {c("ОРБИТА ДОСТИГНУТА", "ORBIT ACHIEVED", "ОРБИТАҒА ШЫҚТЫ")} · {m.orbit.short}
          </div>
        )}
        <div className="ls-hud-bottom">
          <div>
            <span>{c("Нагрузка ракеты", "Rocket load", "Зымыран жүктемесі")}</span>
            <strong>
              {(load * 100).toFixed(0)}% · {t(m.launcher.name)}
            </strong>
          </div>
          <div>
            <span>{c("Топливо", "Propellant", "Отын")}</span>
            <strong>{remainingFuel.toFixed(0)} kg</strong>
          </div>
          <div>
            <span>{c("Высота / скорость", "Altitude / speed", "Биіктік / жылдамдық")}</span>
            <strong>
              {altitude.toFixed(0)} km · {speed.toFixed(1)} km/s
            </strong>
          </div>
        </div>
        <p className="ls-note">
          {c(
            "Учебная иллюстрация, не расчёт траектории.",
            "Educational illustration, not a trajectory calculation.",
            "Оқу иллюстрациясы, траектория есебі емес.",
          )}
        </p>
      </div>

      {showControls && (
        <div className="ls-controls">
          {playing ? (
            <button type="button" onClick={skip}>
              <SkipForward size={14} />
              {c("Пропустить", "Skip", "Өткізу")}
            </button>
          ) : (
            <button type="button" onClick={replay}>
              {time >= LAUNCH_DURATION ? <RotateCcw size={14} /> : <Play size={14} />}
              {time >= LAUNCH_DURATION
                ? c("Повторить", "Replay", "Қайталау")
                : c("Запуск", "Launch", "Ұшыру")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
