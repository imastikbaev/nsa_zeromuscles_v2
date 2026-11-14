"use client";
import { useI18n } from "./preferences";
import { useState } from "react";
import { Activity } from "lucide-react";
import { TelemetrySample } from "@/lib/telemetry";
import { phases } from "@/lib/simulation";
const metrics = [
  { key: "health", label: "Health", unit: "%", color: "#9dccac" },
  { key: "fuel", label: "Fuel", unit: "kg", color: "#e8bd86" },
  {
    key: "science",
    label: "Science projection",
    unit: "pts",
    color: "#baa6e6",
  },
  { key: "power", label: "Power headroom", unit: "W", color: "#86c0d5" },
] as const;
export function TelemetryChart({ samples }: { samples: TelemetrySample[] }) {
  const { t, tx, localeTag } = useI18n();

  const [metric, setMetric] =
    useState<(typeof metrics)[number]["key"]>("health");
  const [selected, setSelected] = useState<number | null>(null);
  if (!samples.length) return null;
  const current = metrics.find((m) => m.key === metric)!;
  const values = samples.map((p) => p[metric]);
  const low = Math.min(0, ...values),
    high = Math.max(metric === "health" ? 100 : 1, ...values);
  const span = Math.max(1, high - low);
  const x = (i: number) => 46 + (i / Math.max(1, samples.length - 1)) * 580;
  const y = (v: number) => 164 - ((v - low) / span) * 135;
  const path = values
    .map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`)
    .join(" ");
  const index = Math.min(selected ?? samples.length - 1, samples.length - 1),
    point = samples[index];
  return (
    <section
      className="telemetry-chart"
      aria-label={t("Flight telemetry history")}
    >
      <div className="sub-heading">
        <h3>
          <Activity size={16} /> {t(" Flight recorder")}
        </h3>
        <span>
          {tx(samples.length)} {t(" STATE SAMPLES")}
        </span>
      </div>
      <div
        className="telemetry-tabs"
        role="group"
        aria-label={t("Telemetry metric")}
      >
        {tx(
          metrics.map((m) => (
            <button
              key={m.key}
              aria-pressed={metric === m.key}
              onClick={() => setMetric(m.key)}
            >
              {tx(m.label)}
            </button>
          )),
        )}
      </div>
      <div className="telemetry-readout">
        <div>
          <span>{tx(point.label)}</span>
          <strong style={{ color: current.color }}>
            {tx(point[metric].toFixed(metric === "fuel" ? 1 : 0))}
            {tx(" ")}
            <small>{tx(current.unit)}</small>
          </strong>
        </div>
        <p>
          {tx(phases[point.phase])} {t(" · sample ")}
          {tx(index + 1)} {t(" / ")}
          {tx(samples.length)}
        </p>
      </div>
      <svg
        viewBox="0 0 650 195"
        role="img"
        aria-label={t(
          `${current.label} across ${samples.length} recorded mission states. Selected sample: ${point[metric].toFixed(1)} ${current.unit}.`,
        )}
      >
        {tx(
          [0, 0.5, 1].map((t) => (
            <g key={t}>
              <line
                x1="46"
                x2="626"
                y1={y(low + span * t)}
                y2={y(low + span * t)}
                stroke="#374650"
                strokeDasharray="4 5"
              />
              <text
                x="37"
                y={y(low + span * t) + 4}
                textAnchor="end"
                fill="#849eae"
                fontSize="10"
              >
                {tx(Math.round(low + span * t))}
              </text>
            </g>
          )),
        )}
        <path
          d={path}
          stroke={current.color}
          fill="none"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {tx(
          values.map((v, i) => (
            <circle
              key={i}
              cx={x(i)}
              cy={y(v)}
              r={i === index ? 5 : 2.5}
              fill={i === index ? "#f1f1d8" : current.color}
            />
          )),
        )}
        <line
          x1={x(index)}
          x2={x(index)}
          y1="20"
          y2="169"
          stroke={current.color}
          strokeOpacity=".4"
          strokeDasharray="3 4"
        />
        <text x="46" y="188" fill="#829cab" fontSize="10">
          {t("First recorded state")}
        </text>
        <text x="626" y="188" fill="#829cab" fontSize="10" textAnchor="end">
          {t("Latest state")}
        </text>
      </svg>
      <div
        className="telemetry-samples"
        role="group"
        aria-label={t("Inspect recorded state")}
      >
        {tx(
          samples.map((p, i) => (
            <button
              key={i}
              aria-label={t(`Sample ${i + 1}: ${p.label}`)}
              aria-pressed={index === i}
              title={t(p.label)}
              onClick={() => setSelected(i)}
            >
              {tx(i + 1)}
            </button>
          )),
        )}
        <button
          className="telemetry-live"
          aria-pressed={selected === null}
          onClick={() => setSelected(null)}
        >
          {t("Follow latest")}
        </button>
      </div>
      <p className="telemetry-explanation">
        {t(
          "Samples are recorded at mission phases and decisions. Science is the projected return at current health; power is nominal generation after event damage minus operating load. This is simulated state, not real sensor telemetry.",
        )}
      </p>
    </section>
  );
}
