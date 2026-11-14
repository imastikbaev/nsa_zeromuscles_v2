"use client";
import { useState } from "react";
import { ExternalLink, ArrowRight } from "lucide-react";
import { useI18n } from "./preferences";
import { relativeSolarFlux, scienceSources } from "@/lib/science";
import { Design } from "@/lib/data";
import { Metrics } from "@/lib/engineering";
export function ScienceNotebook() {
  const { t, number } = useI18n();
  const [distance, setDistance] = useState(1);
  const fraction = relativeSolarFlux(distance);
  return (
    <section className="science-notebook" aria-label={t("Scientific basis")}>
      <span className="eyebrow">{t("SCIENCE / SOURCES & ASSUMPTIONS")}</span>
      <h2>{t("What is physics, and what is a game rule?")}</h2>
      <p>
        {t(
          "Use this experiment to understand one relationship. The mission simulator adds simplified engineering assumptions. These sources explain the principles; they do not validate our spacecraft designs.",
        )}
      </p>
      <div className="solar-experiment">
        <div>
          <label htmlFor="solar-distance">
            {t("Distance from the Sun")}{" "}
            <strong>{number(distance, 2)} AU</strong>
          </label>
          <input
            id="solar-distance"
            type="range"
            min="1"
            max="5.2"
            step="0.1"
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
          />
          <p>
            {t(
              "1 AU is the mean Earth–Sun distance. Move the slider to 2 AU and predict the result first.",
            )}
          </p>
        </div>
        <div>
          <span>{t("Sunlight compared with Earth")}</span>
          <output htmlFor="solar-distance">{number(fraction * 100, 1)}%</output>
          <div className="meter blue" aria-hidden="true">
            <i style={{ width: `${fraction * 100}%` }} />
          </div>
          <small>
            {t(
              "Relative sunlight = 1 / distance². This is incoming light, not electrical output.",
            )}
          </small>
        </div>
      </div>
      {scienceSources.map((s) => (
        <details key={s.url}>
          <summary>{t(s.title)}</summary>
          <p>{t(s.principle)}</p>
          <p>
            <strong>{t("In this simulator:")} </strong>
            {t(s.model)}
          </p>
          <a href={s.url} target="_blank" rel="noreferrer">
            {t("Read the NASA source")} <ExternalLink size={12} />
          </a>
        </details>
      ))}
    </section>
  );
}
const guidance = [
  [
    "Define a useful measurement",
    "Choose a destination and a science objective. Your instruments must be able to make that measurement.",
  ],
  [
    "Give each instrument the resources it needs",
    "Add instruments, then balance power, memory, communication, and mass. More equipment is not always a better mission.",
  ],
  [
    "Choose a rocket that can deliver the design",
    "Compare capacity and destination compatibility first, then cost. A cheap launch is not useful if it cannot deliver your spacecraft.",
  ],
  [
    "Check the complete mission before launch",
    "Review the orbit, resolve every launch blocker, and leave reserves for unexpected events. Then test your design in flight.",
  ],
] as const;
export function MissionOrientation({
  step,
  m,
  onLab,
}: {
  step: number;
  m: Metrics;
  onLab: () => void;
}) {
  const { t } = useI18n();
  const [title, body] = guidance[step];
  return (
    <section
      className="mission-guidance"
      aria-label={t("How to use Mission Architect")}
    >
      <span className="eyebrow">{t("YOUR NEXT DECISION")}</span>
      <h2>{t(title)}</h2>
      <p>{t(body)}</p>
      <details>
        <summary>{t("What am I trying to achieve?")}</summary>
        <ol>
          <li>
            {t("Design a spacecraft that can answer a science question.")}
          </li>
          <li>
            {t(
              "Resolve the resource limits shown on the right or in the mobile resource bar.",
            )}
          </li>
          <li>
            {t(
              "Launch, respond to events, and explain what you would improve.",
            )}
          </li>
        </ol>
        <p>
          {t(
            "The score summarizes this teaching model. It is not a real-world mission success probability.",
          )}
        </p>
        <button className="secondary-button" onClick={onLab}>
          {t("Try the guided Climate Watch activity")} <ArrowRight size={14} />
        </button>
      </details>
      {m.issues.length > 0 && (
        <p role="status">
          <strong>{t("First issue to resolve:")} </strong>
          {t(m.issues[0].label)} — {t(m.issues[0].fix)}
        </p>
      )}
    </section>
  );
}
