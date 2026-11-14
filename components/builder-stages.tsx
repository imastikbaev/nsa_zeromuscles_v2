"use client";
import { operatingProfile } from "@/lib/orbit-operations";
import { useI18n } from "./preferences";
import { useState } from "react";
import {
  Check,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Rocket,
  Satellite,
  Zap,
  Gauge,
  ChevronRight,
  ShieldCheck,
  Lightbulb,
  Info,
  Radio,
  CheckCircle2,
} from "lucide-react";
import {
  Category,
  Component,
  Design,
  instruments,
  systems,
  categoryLabels,
  launchers,
  orbits,
  objectives,
} from "@/lib/data";
import { Metrics } from "@/lib/engineering";
import { SpacecraftView, OrbitView } from "./visuals";
import { Help } from "./help";
export function StageHeading({
  step,
  title,
  subtitle,
}: {
  step: number;
  title: string;
  subtitle: string;
}) {
  const { t, tx, localeTag } = useI18n();

  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">
          {t("0")}
          {tx(step + 1)} {t(" /")}
          {tx(" ")}
          {tx(
            [
              "MISSION BRIEF",
              "SPACECRAFT DESIGN",
              "LAUNCH VEHICLE",
              "ORBIT & TRAJECTORY",
            ][step],
          )}
        </span>
        <h2>{tx(title)}</h2>
        <p>{tx(subtitle)}</p>
      </div>
      <span className="section-index">
        {t("0")}
        {tx(step + 1)}
      </span>
    </div>
  );
}
function PartCard({
  part,
  selected,
  onClick,
  instrument = false,
}: {
  part: Component;
  selected: boolean;
  onClick: () => void;
  instrument?: boolean;
}) {
  const { t, tx, localeTag } = useI18n();

  return (
    <button
      className={`part-card ${selected ? "selected" : ""}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <div className="part-top">
        <span className="part-symbol">
          {tx(instrument ? <Satellite size={20} /> : <Gauge size={20} />)}
        </span>
        <span className="selection-circle">
          {tx(selected && <Check size={12} />)}
        </span>
      </div>
      <strong>{tx(part.name)}</strong>
      <p>{tx(part.description)}</p>
      <div className="part-stats">
        <span>
          {tx(part.mass)} <small>{t("kg")}</small>
        </span>
        <span>
          {t("$")}
          {tx(part.cost)} <small>{t("M")}</small>
        </span>
        <span>
          {tx(part.power)} <small>{t("W")}</small>
        </span>
        {tx(
          instrument && (
            <span className="text-purple">
              {t("+")}
              {tx(part.science)} <small>{t("SCI")}</small>
            </span>
          ),
        )}
      </div>
      <div className="trade-offs">
        <span>
          <Plus size={11} />
          {tx(part.pro)}
        </span>
        <span>
          <Minus size={11} />
          {tx(part.con)}
        </span>
      </div>
      {tx(
        instrument && (
          <div className="supported-objectives">
            {tx(
              part.supports.map((s) => (
                <span key={s}>
                  {tx(objectives.find((o) => o.id === s)?.name)}
                </span>
              )),
            )}
          </div>
        ),
      )}
    </button>
  );
}
export function SpacecraftStage({
  d,
  m,
  onChange,
  onNext,
  onBack,
}: {
  d: Design;
  m: Metrics;
  onChange: (d: Design) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { t, tx, localeTag } = useI18n();

  const [tab, setTab] = useState<"payload" | Category>("payload");
  return (
    <>
      <StageHeading
        step={1}
        title={t("Spacecraft configuration")}
        subtitle="Configure payload and subsystems. Review the resource budgets before committing to a design."
      />
      <div className="craft-summary-grid">
        <SpacecraftView design={d} />
        <div className="craft-specs">
          <span className="eyebrow">{tx(d.name.toUpperCase())}</span>
          <h3>{t("System configuration")}</h3>
          <div>
            <span>
              {t("Payload mass fraction ")}
              <Help term="Payload mass fraction" />
            </span>
            <strong>
              {tx(m.payloadFraction.toFixed(1))}
              {t("%")}
            </strong>
          </div>
          <div>
            <span>
              {t("Available delta-v ")}
              <Help term="Delta-v" />
            </span>
            <strong>
              {tx(Math.round(m.deltaV))} {t(" m/s")}
            </strong>
          </div>
          <div>
            <span>
              {t("Specific impulse ")}
              <Help term="Specific impulse" />
            </span>
            <strong>
              {tx(m.selected[0].isp)} {t(" s")}
            </strong>
          </div>
          <p>
            {t(
              "Click a module to inspect the spacecraft. Changes below update this diagram.",
            )}
          </p>
        </div>
      </div>
      <div
        className="component-tabs"
        role="tablist"
        aria-label={t("Spacecraft subsystem")}
      >
        {tx(
          (
            ["payload", ...Object.keys(systems)] as ("payload" | Category)[]
          ).map((t) => (
            <button
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? "active" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {tx(t === "payload" ? "Science payload" : categoryLabels[t])}
            </button>
          )),
        )}
      </div>
      <div className="component-context">
        <h3>
          {tx(
            tab === "payload" ? "Scientific instruments" : categoryLabels[tab],
          )}
        </h3>
        <span>
          {tx(
            tab === "payload"
              ? `${d.instruments.length} instruments installed`
              : "Choose one system",
          )}
        </span>
      </div>
      <div className="parts-grid">
        {tx(
          (tab === "payload" ? instruments : systems[tab]).map((p) => (
            <PartCard
              key={p.id}
              part={p}
              selected={
                tab === "payload"
                  ? d.instruments.includes(p.id)
                  : d.systems[tab] === p.id
              }
              instrument={tab === "payload"}
              onClick={() =>
                onChange(
                  tab === "payload"
                    ? {
                        ...d,
                        instruments: d.instruments.includes(p.id)
                          ? d.instruments.filter((id) => id !== p.id)
                          : [...d.instruments, p.id],
                      }
                    : { ...d, systems: { ...d.systems, [tab]: p.id } },
                )
              }
            />
          )),
        )}
      </div>
      <div className="tuning-panel">
        <div className="sub-heading">
          <h3>{t("Resource allocation")}</h3>
          <span>{t("LIVE ENGINEERING")}</span>
        </div>
        {tx(
          [
            {
              key: "fuel",
              name: "Propellant load",
              unit: "kg",
              min: 0,
              max: 1500,
              step: 10,
              help: "More fuel increases delta-v, but also launch mass.",
            },
            {
              key: "battery",
              name: "Battery capacity",
              unit: "kWh",
              min: 0.2,
              max: 10,
              step: 0.1,
              help: `Eclipse reserve needed: ${m.batteryNeed.toFixed(2)} kWh.`,
            },
            {
              key: "panels",
              name: "Solar array area",
              unit: "m²",
              min: 0,
              max: 50,
              step: 1,
              help: "Larger arrays generate more power but increase deployment risk.",
            },
          ].map((r) => (
            <label key={r.key} className="range-control">
              <div>
                <span>{t(r.name)}</span>
                <strong>
                  {tx(d[r.key as "fuel" | "battery" | "panels"])}
                  {tx(" ")}
                  <small>{tx(r.unit)}</small>
                </strong>
              </div>
              <input
                aria-label={t(r.name)}
                type="range"
                min={r.min}
                max={r.max}
                step={r.step}
                value={d[r.key as "fuel" | "battery" | "panels"]}
                onChange={(e) =>
                  onChange({ ...d, [r.key]: Number(e.target.value) })
                }
              />
              <small>{tx(r.help)}</small>
            </label>
          )),
        )}
      </div>
      <StageFooter
        onBack={onBack}
        onNext={onNext}
        label="Choose launch vehicle"
      />
    </>
  );
}
export function LaunchStage({
  d,
  m,
  onChange,
  onNext,
  onBack,
}: {
  d: Design;
  m: Metrics;
  onChange: (d: Design) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { t, tx, localeTag } = useI18n();

  return (
    <>
      <StageHeading
        step={2}
        title={t("Launch vehicle selection")}
        subtitle="Check delivered mass, destination compatibility, cost and modeled reliability."
      />
      <div className="launch-banner">
        <div className="launch-banner-icon">
          <Rocket size={52} strokeWidth={1} />
        </div>
        <div>
          <span className="eyebrow">{t("PAYLOAD TO ORBIT")}</span>
          <h3>
            {tx(Math.round(m.mass).toLocaleString(localeTag))}
            {tx(" ")}
            <small>{t("kg, ready for a ride.")}</small>
          </h3>
          <p>
            {t(
              "Includes your spacecraft, scientific instruments, and propellant.",
            )}
          </p>
        </div>
      </div>
      <div className="launch-grid">
        {tx(
          launchers.map((l, i) => {
            const capable = l.destinations.includes(d.mission);
            return (
              <button
                key={l.id}
                className={`launcher-card ${d.launcher === l.id ? "selected" : ""}`}
                onClick={() => onChange({ ...d, launcher: l.id })}
                aria-pressed={d.launcher === l.id}
              >
                <div className="rocket-silhouette">
                  <Rocket size={60 + i * 11} strokeWidth={1} />
                  <span>
                    {t("0")}
                    {tx(i + 1)}
                  </span>
                </div>
                <div className="launcher-detail">
                  <span className="eyebrow">{tx(l.class)}</span>
                  <h3>{tx(l.name)}</h3>
                  <p>{tx(l.description)}</p>
                  <div className="launcher-stats">
                    <div>
                      <span>{t("Payload capacity")}</span>
                      <strong>
                        {tx(l.payload.toLocaleString(localeTag))} {t(" kg")}
                      </strong>
                    </div>
                    <div>
                      <span>{t("Launch cost")}</span>
                      <strong>
                        {t("$")}
                        {tx(l.cost)}
                        {t("M")}
                      </strong>
                    </div>
                    <div>
                      <span>{t("Reliability")}</span>
                      <strong>
                        {tx((l.reliability * 100).toFixed(1))}
                        {t("%")}
                      </strong>
                    </div>
                  </div>
                  <div
                    className={`capability ${capable ? "text-green" : "text-danger"}`}
                  >
                    {tx(
                      capable ? <CheckCircle2 size={13} /> : <Info size={13} />,
                    )}
                    {tx(" ")}
                    {tx(
                      capable
                        ? "Destination compatible"
                        : "Cannot reach this destination",
                    )}
                  </div>
                </div>
                <span className="selection-circle">
                  {tx(d.launcher === l.id && <Check size={12} />)}
                </span>
              </button>
            );
          }),
        )}
      </div>
      <div className="guided-tip">
        <span>
          <Lightbulb size={20} />
        </span>
        <div>
          <strong>{t("More lift is not always the better choice.")}</strong>
          <p>
            {t(
              "Unused launch capacity costs money. Find enough room for your spacecraft and a sensible safety margin.",
            )}
          </p>
        </div>
      </div>
      <StageFooter onBack={onBack} onNext={onNext} label="Plan trajectory" />
    </>
  );
}
export function TrajectoryStage({
  d,
  m,
  onChange,
  onBack,
  onLaunch,
}: {
  d: Design;
  m: Metrics;
  onChange: (d: Design) => void;
  onBack: () => void;
  onLaunch: () => void;
}) {
  const { t, tx, localeTag } = useI18n();

  return (
    <>
      <StageHeading
        step={3}
        title={t("Trajectory & launch readiness")}
        subtitle="Select the trajectory and review power, communications, and maneuver requirements."
      />
      <div className="trajectory-grid">
        <div className="orbit-options">
          {tx(
            orbits
              .filter((o) => o.destinations.includes(d.mission))
              .map((o) => (
                <button
                  className={`orbit-option ${d.orbit === o.id ? "selected" : ""}`}
                  key={o.id}
                  onClick={() => onChange({ ...d, orbit: o.id })}
                >
                  <span className="orbit-code">{tx(o.short)}</span>
                  <h3>{tx(o.name)}</h3>
                  <p>{tx(o.description)}</p>
                  <div>
                    <span>{tx(o.altitude)}</span>
                    <span>
                      {tx(o.deltaV.toLocaleString(localeTag))} {t(" m/s Δv")}
                    </span>
                  </div>
                  <span className="selection-circle">
                    {tx(d.orbit === o.id && <Check size={12} />)}
                  </span>
                </button>
              )),
          )}
        </div>
        <OrbitView design={d} m={m} />
      </div>
      <label className="duration-control">{t("Planned mission duration")}
        <select value={d.durationMonths ?? "catalog"} onChange={e=>onChange({...d,durationMonths:e.target.value==="catalog"?undefined:Number(e.target.value)})}>
          <option value="catalog">{t("Catalog duration")}</option>
          {[...new Set([3,6,12,24,36,60,120,...(d.durationMonths?[d.durationMonths]:[])])].sort((a,b)=>a-b).map(n=><option key={n} value={n}>{n} {t("months")}</option>)}
        </select>
      </label>
      <p>{t("Longer missions cost more and age solar panels, but allow more science observations.")}</p>
      <p>{t("Teaching schedule: observation / eclipse / contact")}: {Math.round(operatingProfile(d.orbit).observation*100)}% / {Math.round(operatingProfile(d.orbit).eclipse*100)}% / {Math.round(operatingProfile(d.orbit).contact*100)}%. {t("Representative cycles, not propagated orbits.")}</p>
      <div className="orbit-properties">
        {tx(
          [
            ["Signal delay", `${m.orbit.delay} s`],
            ["Solar availability", `${Math.round(m.orbit.sun * 100)}%`],
            [
              "Radiation exposure",
              `${Math.round(m.orbit.radiation * 100)} / 100`,
            ],
            ["Science multiplier", `${m.orbit.science}×`],
            ["Mission duration", `${Math.round(m.duration)} months`],
            ["Fuel for trajectory", `${m.fuelNeeded.toFixed(1)} kg`],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{tx(label)}</span>
              <strong>{tx(value)}</strong>
            </div>
          )),
        )}
      </div>
      <div className="preflight">
        <div className="sub-heading">
          <h3>{t("Preflight verification")}</h3>
          <ShieldCheck size={20} />
        </div>
        <label className="mission-name">
          {t("Mission callsign")}
          <input
            value={d.name}
            maxLength={80}
            placeholder={t("Name your mission")}
            onChange={(e) => onChange({ ...d, name: e.target.value })}
          />
        </label>
        <div className="preflight-list">
          {tx(
            [
              {
                label: "Science objectives covered",
                ok:
                  m.covered.length === d.objectives.length &&
                  d.objectives.length > 0,
              },
              {
                label: "Budget and mass within limits",
                ok: m.cost <= m.budget && m.mass <= m.massLimit,
              },
              {
                label: "Power and battery reserves sufficient",
                ok: m.designPowerMargin >= -1e-8 && d.battery >= m.batteryNeed,
              },
              {
                label: "Fuel, telemetry, and storage verified",
                ok:
                  m.deltaV >= m.requiredDeltaV &&
                  m.linkQuality >= 100 &&
                  m.storage >= m.dataNeed,
              },
            ].map((c) => (
              <div
                className={c.ok ? "text-green" : "text-danger"}
                key={c.label}
              >
                {tx(c.ok ? <Check size={15} /> : <Info size={15} />)}
                <span>{tx(c.label)}</span>
              </div>
            )),
          )}
        </div>
        {tx(
          m.issues.length > 0 && (
            <p className="launch-warning">
              {t("Resolve the ")}
              {tx(m.issues.length)}{" "}
              {t(" critical checks in Mission resources to unlock launch.")}
            </p>
          ),
        )}
      </div>
      <div className="stage-footer">
        <button className="secondary-button" onClick={onBack}>
          <ArrowLeft size={14} /> {t(" Back")}
        </button>
        <button
          className="primary-button launch-button"
          disabled={m.issues.length > 0 || !d.name.trim()}
          onClick={onLaunch}
        >
          <Rocket size={17} /> {t(" Launch mission ")}
          <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}
function StageFooter({
  onBack,
  onNext,
  label,
}: {
  onBack: () => void;
  onNext: () => void;
  label: string;
}) {
  const { t, tx, localeTag } = useI18n();

  return (
    <div className="stage-footer">
      <button className="secondary-button" onClick={onBack}>
        <ArrowLeft size={14} /> {t(" Back")}
      </button>
      <button className="primary-button" onClick={onNext}>
        {tx(label)}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
