"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronRight,
  Circle,
  Layers3,
  Radio,
  Satellite,
  ShieldCheck,
  X,
} from "lucide-react";
import { Design, missions, orbits } from "@/lib/data";
import { calculate, designForMission } from "@/lib/engineering";
import { resourceAllocation } from "@/lib/allocation";
import { Project, readProjects } from "@/lib/projects";
import { ReadinessReview } from "./readiness-review";
import { useI18n } from "./preferences";
import {
  allocationScale,
  allocationPercent,
  referenceGeometry,
} from "@/lib/workbench";

type Props = {
  design: Design;
  onChange: (d: Design) => void;
  onLoad: (d: Design) => boolean;
  onLab: () => void;
  onAnalysis: () => void;
  onSpacecraft: () => void;
  onEdit: (step: number) => void;
};
const initials = (s: string) =>
  s
    .trim()
    .split(/\s+/)
    .filter(word => /\p{L}/u.test(word))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
export function MissionOverview({
  design,
  onChange,
  onLoad,
  onLab,
  onAnalysis,
  onSpacecraft,
  onEdit,
}: Props) {
  const { t, number } = useI18n();
  const [draft, setDraft] = useState(design);
  const [autoVerify, setAutoVerify] = useState(true);
  const [synced, setSynced] = useState(true);
  const [snapshot, setSnapshot] = useState(design);
  const [metric, setMetric] = useState<"mass" | "power">("mass");
  const [active, setActive] = useState("Payload");
  const [validatedDesign, setValidatedDesign] = useState<string | null>(null);
  const validated = validatedDesign === JSON.stringify(draft);
  const [message, setMessage] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => {
    setDraft(design);
    setProjects(readProjects());
  }, [design]);
  const m = calculate(design),
    check = calculate(draft),
    chart = calculate(synced ? design : snapshot);
  const bars = resourceAllocation(chart.ledger, metric);
  const scale = allocationScale(bars.map((b) => b.value));
  const total = bars.reduce((sum, b) => sum + b.value, 0);
  const geometry = referenceGeometry[design.orbit];
  const chosen = bars.find((b) => b.group === active) ?? bars[0];
  const dirty = JSON.stringify(draft) !== JSON.stringify(design);
  function validate() {
    const normalized = { ...draft, name: draft.name.trim() };
    setValidatedDesign(JSON.stringify(normalized));
    if (!draft.name.trim()) {
      setMessage("Enter a mission name.");
      return;
    }
    setDraft(normalized);
    onChange(normalized);
    setMessage(
      check.issues.length
        ? "Design saved. Resolve the listed checks before launch."
        : "Design validated and saved.",
    );
  }
  function exportTelemetry() {
    const rows = [
      [
        "Mission",
        synced ? design.name : snapshot.name,
      ],
      [
        "Source",
        "Design estimates, not measured flight telemetry",
      ],
      ["Subsystem", metric === "mass" ? "Mass (kg)" : "Operating power (W)"],
      ...bars.map((b) => [b.group, String(b.value)]),
    ];
    const blob = new Blob(
      [
        rows
          .map((row) =>
            row.map((v) => '"' + t(v).replaceAll('"', '""') + '"').join(","),
          )
          .join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "mission-resource-allocation.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Resource allocation exported.");
  }
  return (
    <div className="overview-grid">
      <div className="workbench-primary">
        <section className="bento-card mission-hero">
          <div className="hero-copy">
            <span className="bento-eyebrow">
              <i />
              {t("ACTIVE MISSION")}
            </span>
            <h2>{t(design.name)}</h2>
            <p>
              {t(m.mission.name)} <span> / </span>
              {t(m.orbit.short)}
            </p>
            <div className="hero-badges">
              <span
                className={`status-pill ${m.issues.length ? "amber" : "emerald"}`}
              >
                <Circle size={6} fill="currentColor" />
                {t(m.issues.length ? "Review required" : "Ready for launch")}
              </span>
              <span className="status-pill sky">{t("Simulation")}</span>
            </div>
            <button className="hero-link" onClick={onSpacecraft}>
              {t("Explore spacecraft")} <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="ground-track">
            <div className="track-caption">
              <span>{t(" MA-")}{t(design.mission.toUpperCase())} / {t(m.orbit.short)}
              </span>
              <span>{t("Reference geometry")}</span>
            </div>
            <svg
              viewBox="0 0 480 110"
              role="img"
              aria-label={t("Schematic ground track")}
            >
              <defs>
                <pattern
                  id="track-grid"
                  width="40"
                  height="22"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M40 0H0V22"
                    fill="none"
                    stroke="#243044"
                    strokeWidth="0.6"
                  />
                </pattern>
              </defs>
              <rect width="480" height="110" fill="url(#track-grid)" />
              <path d="M0 55H480" stroke="#42536a" strokeDasharray="3 5" />
              <path
                d={
                  geometry?.inclination === 0
                    ? "M0 55H480"
                    : "M0 55C40 -8 80 -8 120 55S200 118 240 55S320 -8 360 55S440 118 480 55"
                }
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
              <circle cx="240" cy="55" r="4" fill="#e0f2fe" />
              <text x="5" y="12" fill="#71829a" fontSize="8">{t(" 90° N ")}</text>
              <text x="5" y="104" fill="#71829a" fontSize="8">{t(" 90° S ")}</text>
            </svg>
            <dl className="orbital-readouts">
              <div>
                <dt>{t("Inclination")}</dt>
                <dd>
                  {geometry ? number(geometry.inclination, 1) + "°" : "—"}
                </dd>
              </div>
              <div>
                <dt>{t("Orbital altitude")}</dt>
                <dd>{t(m.orbit.altitude)}</dd>
              </div>
              <div>
                <dt>{t("Orbital period")}</dt>
                <dd>{t(m.orbit.period)}</dd>
              </div>
              <div>
                <dt>{t("Eccentricity")}</dt>
                <dd>{geometry ? number(geometry.eccentricity, 4) : "—"}</dd>
              </div>
            </dl>
          </div>
        </section>
        <section
          className="bento-card quick-metrics"
          aria-label={t("Mission resources")}
        >
          <div>
            <span>{t("Mission budget")}</span>
            <strong>
              ${number(m.cost, 1)}
              <small>{t("M")}</small>
            </strong>
            <p>
              {Number.isFinite(m.budget)
                ? `/ $${number(m.budget, 1)}M · ${number(m.budget - m.cost, 1)}M ${t("remaining")}`
                : t("Unlimited experimentation")}
            </p>
            <Meter
              value={m.cost}
              total={m.budget}
              label={t("Mission budget")}
            />
          </div>
          <div>
            <span>{t("Spacecraft mass")}</span>
            <strong>
              {number(m.mass, 1)}
              <small>{t("kg")}</small>
            </strong>
            <p>
              / {number(m.massLimit)} {t("kg")} · {number(m.massLimit - m.mass)}{" "}
              {t("kg remaining")}
            </p>
            <Meter
              value={m.mass}
              total={m.massLimit}
              label={t("Spacecraft mass")}
            />
          </div>
          <div>
            <span>{t("Power reserve")}</span>
            <strong
              className={
                m.designPowerMargin < 0 ? "metric-danger" : "metric-good"
              }
            >
              {m.designPowerMargin >= 0 ? "+" : ""}
              {number(m.designPowerMargin)}
              <small>{t("W")}</small>
            </strong>
            <p>
              {t("Power margin")}:{" "}
              {number(
                (100 * m.designPowerMargin) /
                  Math.max(1, m.endOfLifeGeneration),
                1,
              )}
              %
            </p>
            <Meter
              value={m.requiredGeneration}
              total={m.endOfLifeGeneration}
              label={t("Power")}
            />
          </div>
          <div>
            <span>{t("Available delta-v")}</span>
            <strong>
              {number(m.deltaV)}
              <small>{t("m/s")}</small>
            </strong>
            <p>
              {t("Required")}: {number(m.requiredDeltaV)} {t("m/s")}
            </p>
            <Meter
              value={m.requiredDeltaV}
              total={m.deltaV}
              label={t("Required delta-v")}
            />
          </div>
        </section>
        <section className="bento-card allocation-card">
          <div className="bento-heading">
            <div>
              <span className="bento-eyebrow">
                {t("ENGINEERING TELEMETRY")}
              </span>
              <h3>
                {t(
                  metric === "mass"
                    ? "Subsystem mass allocation"
                    : "Subsystem power allocation",
                )}
              </h3>
            </div>
            <span className="subtle-status">
              <i className={synced ? "" : "paused-dot"} />
              {t(
                synced ? "Live estimates" : "Snapshot",
              )}
            </span>
          </div>
          <div className="allocation-top">
            <div>
              <strong>
                {number(chosen.value, 1)}{" "}
                <small>{t(metric === "mass" ? "kg" : "W")}</small>
              </strong>
              <p>{t(chosen.group)}</p>
            </div>
            <div
              className="mini-segments"
              role="group"
              aria-label={t("Chart metric")}
            >
              <button
                aria-pressed={metric === "mass"}
                onClick={() => setMetric("mass")}
              >
                {t("Mass")}
              </button>
              <button
                aria-pressed={metric === "power"}
                onClick={() => setMetric("power")}
              >
                {t("Power")}
              </button>
            </div>
          </div>
          <div
            className="allocation-chart"
            role="group"
            aria-label={t("Subsystem allocation")}
          >
            <div className="chart-axis" aria-hidden="true">
              {scale.ticks.map((v) => (
                <span key={v} style={{ bottom: `${(v / scale.max) * 100}%` }}>
                  {number(v)}
                </span>
              ))}
            </div>
            <div className="chart-gridlines" aria-hidden="true">
              {scale.ticks.map((v) => (
                <i key={v} style={{ bottom: `${(v / scale.max) * 100}%` }} />
              ))}
            </div>
            {bars.map((b) => (
              <button
                key={b.group}
                className={`allocation-column ${b.group === chosen.group ? "active" : ""}`}
                aria-pressed={b.group === chosen.group}
                aria-label={`${t(b.group)}: ${number(b.value, 1)} ${t(metric === "mass" ? "kg" : "W")}`}
                onClick={() => setActive(b.group)}
              >
                <span className="allocation-track">
                  <span
                    className="allocation-bar"
                    style={{ height: `${(b.value / scale.max) * 100}%` }}
                  />
                  <span
                    className="bar-value"
                    style={{ bottom: `${(b.value / scale.max) * 100}%` }}
                  >
                    {number(b.value, 1)} {t(metric === "mass" ? "kg" : "W")} •{" "}
                    {number(allocationPercent(b.value, total), 1)}%
                  </span>
                </span>
                <span className="bar-label">
                  {t(
                    b.group === "Propulsion"
                      ? "Propulsion subsystem"
                      : b.group === "Thermal control"
                        ? "Thermal subsystem"
                        : b.group,
                  )}
                </span>
              </button>
            ))}
          </div>
          <div className="allocation-footer">
            <span>
              <Radio size={13} />
              {t(
                "Design estimates · not flight measurements",
              )}{" "}
              {!synced && <span> / {t(snapshot.name)}</span>}
            </span>
            <button onClick={exportTelemetry}>
              <ArrowDownToLine size={14} />
              {t("Export telemetry")}
            </button>
          </div>
        </section>
      </div>
      <section
        className="bento-card config-card"
        aria-label={t("Mission inspector")}
      >
        <div className="inspector-index">
          {t("Mission inspector")} <span>{t("SYS / 01")}</span>
        </div>
        <div className="bento-heading">
          <div>
            <span className="bento-eyebrow">{t("MISSION PARAMETERS")}</span>
            <h3>{t("Active configuration")}</h3>
          </div>
          <span className="config-symbol">
            <Layers3 size={20} />
          </span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            validate();
          }}
        >
          <label className="config-field">
            {t("Mission name")}
            <input
              maxLength={80}
              required
              value={draft.name}
              onChange={(e) => {
                setDraft({ ...draft, name: e.target.value });
                setValidatedDesign(null);
                setMessage("");
              }}
            />
          </label>
          <label className="config-field">
            {t("Target orbit")}
            <select
              value={draft.orbit}
              onChange={(e) => {
                setDraft({ ...draft, orbit: e.target.value });
                setValidatedDesign(null);
                setMessage("");
              }}
            >
              {orbits
                .filter((o) => o.destinations.includes(draft.mission))
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {t(o.name)} / {t(o.short)}
                  </option>
                ))}
            </select>
          </label>
          <div className="config-switch-row">
            <span>
              <strong>{t("Auto-verify requirements")}</strong>
              <small>{t("Check edits as you make them")}</small>
            </span>
            <button
              type="button"
              role="switch"
              aria-label={t("Auto-verify requirements")}
              aria-checked={autoVerify}
              className="ios-switch"
              onClick={() => setAutoVerify((v) => !v)}
            >
              <span />
            </button>
          </div>
          <div className="config-switch-row">
            <span>
              <strong>{t("Telemetry sync")}</strong>
              <small>{t("Keep the allocation chart up to date")}</small>
            </span>
            <button
              type="button"
              role="switch"
              aria-label={t("Telemetry sync")}
              aria-checked={synced}
              className="ios-switch"
              onClick={() => {
                setSnapshot(design);
                setSynced((v) => !v);
              }}
            >
              <span />
            </button>
          </div>
          <div
            className={`config-check ${(autoVerify || validated) && check.issues.length ? "has-errors" : ""}`}
            role="status"
          >
            <ShieldCheck size={15} />
            <span>
              {t(
                autoVerify || validated
                  ? check.issues.length
                    ? `${check.issues.length} open checks`
                    : "All configured checks passed"
                  : "Manual verification enabled",
              )}
              {dirty ? ` · ${t("Unsaved edits")}` : ""}
            </span>
          </div>
          {(autoVerify || validated) && check.issues.length > 0 && (
            <ul className="config-issues">
              {check.issues.map((i) => (
                <li key={i.label}>
                  {t(i.label)}
                  <small>{t(i.fix)}</small>
                </li>
              ))}
            </ul>
          )}
          <div className="config-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={!dirty}
              onClick={() => {
                setDraft(design);
                setValidatedDesign(null);
                setMessage("");
              }}
            >
              {t("Cancel")}
            </button>
            <button type="submit" className="primary-button">
              <Check size={15} />
              {t("Validate design")}
            </button>
          </div>
        </form>
        <div className="inspector-summary">
          <h4>{t("Design review")}</h4>
          <dl>
            <div>
              <dt>{t("Reliability")}</dt>
              <dd>{number(m.reliability, 1)}%</dd>
            </div>
            <div>
              <dt>{t("Science score")}</dt>
              <dd>{number(m.science)}</dd>
            </div>
          </dl>
          <p>
            {t(
              "Reference geometry is illustrative; this view does not propagate an orbit.",
            )}
          </p>
          <button className="secondary-button" onClick={onAnalysis}>
            {t("Review constraints")} <ArrowUpRight size={14} />
          </button>
        </div>
      </section>
      <ReadinessReview design={design} onEdit={onEdit} draftPending={dirty} />
      <section className="bento-card briefs-card">
        <div className="bento-heading">
          <div>
            <span className="bento-eyebrow">{t("YOUR WORKSPACE")}</span>
            <h3>{t("Mission briefs & library")}</h3>
          </div>
          <Satellite size={20} />
        </div>
        <button className="brief-row" onClick={onLab}>
          <span className="monogram cyan">{t("CW")}</span>
          <span className="brief-row-copy">
            <strong>{t("Climate Watch")}</strong>
            <small>{t("Compare two Earth observation concepts")}</small>
          </span>
          <span className="status-pill sky">{t("Guided")}</span>
          <ChevronRight size={16} />
        </button>
        <button className="brief-row" onClick={onAnalysis}>
          <span className="monogram">{initials(t(design.name))}</span>
          <span className="brief-row-copy">
            <strong>{t(design.name)}</strong>
            <small>
              {t("Active design")} · {t(m.mission.name)}
            </small>
          </span>
          <span
            className={`status-pill ${m.issues.length ? "amber" : "emerald"}`}
          >
            {t(m.issues.length ? "Review" : "Nominal")}
          </span>
          <ChevronRight size={16} />
        </button>
        {projects
          .filter((p) => JSON.stringify(p.design) !== JSON.stringify(design))
          .slice(0, 2)
          .map((p) => (
            <button
              className="brief-row"
              key={p.id}
              onClick={() =>
                setMessage(
                  onLoad(p.design)
                    ? "Saved mission opened."
                    : "Could not preserve the current workspace. Free a slot in the mission library and retry.",
                )
              }
            >
              <span className="monogram">{initials(p.design.name)}</span>
              <span className="brief-row-copy">
                <strong>{t(p.design.name)}</strong>
                <small>{t("Saved on this device")}</small>
              </span>
              <span className="status-pill amber">{t("Saved")}</span>
              <ChevronRight size={16} />
            </button>
          ))}
      </section>
      <section className="bento-card next-step-card">
        <span className="bento-eyebrow">{t("NEXT STEP")}</span>
        <h3>
          {t(
            m.issues.length
              ? "Resolve. Verify. Launch."
              : "Your mission starts with a question.",
          )}
        </h3>
        <p>
          {t(
            m.issues.length
              ? m.issues[0].fix
              : "Choose the measurements you need, then give your instruments the resources to make them.",
          )}
        </p>
        <button
          className="primary-button"
          onClick={m.issues.length ? onAnalysis : onSpacecraft}
        >
          {t(m.issues.length ? "Review constraints" : "Configure spacecraft")}
          <ArrowUpRight size={17} />
        </button>
      </section>
      {message && (
        <p className="overview-notice" role="status">
          {t(message)}
        </p>
      )}
    </div>
  );
}
export function NewMissionDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (d: Design) => boolean;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [destination, setDestination] = useState<Design["mission"]>("earth");
  const [error, setError] = useState("");
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="new-mission-dialog"
      aria-labelledby="new-mission-title"
      onCancel={onClose}
    >
      <div className="bento-heading">
        <div>
          <span className="bento-eyebrow">{t("NEW MISSION")}</span>
          <h2 id="new-mission-title">{t("Choose your destination")}</h2>
        </div>
        <button aria-label={t("Close")} onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <p>
        {t("Your current design will be backed up in the mission library.")}
      </p>
      <div className="new-destinations">
        {missions.map((m) => (
          <button
            key={m.id}
            aria-pressed={destination === m.id}
            onClick={() => setDestination(m.id)}
          >
            <Satellite size={20} />
            <strong>{t(m.name)}</strong>
            <small>{t(m.description)}</small>
          </button>
        ))}
      </div>
      {error && <p role="alert">{t(error)}</p>}
      <div className="config-actions">
        <button className="secondary-button" onClick={onClose}>
          {t("Cancel")}
        </button>
        <button
          className="primary-button"
          onClick={() => {
            if (onCreate(designForMission(destination))) onClose();
            else
              setError(
                "Could not preserve the current workspace. Free a slot in the mission library and retry.",
              );
          }}
        >
          {t("Create mission")}
          <ArrowUpRight size={16} />
        </button>
      </div>
    </dialog>
  );
}

function Meter({
  value,
  total,
  label,
}: {
  value: number;
  total: number;
  label: string;
}) {
  return (
    <div
      className={`kpi-meter ${value > total ? "over-limit" : ""}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={allocationPercent(value, total)}
    >
      <span style={{ width: `${allocationPercent(value, total)}%` }} />
    </div>
  );
}
