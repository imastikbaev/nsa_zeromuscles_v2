"use client";
import { TeamPanel } from "./team-panel";
import { PreferenceControls, useI18n } from "./preferences";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Crosshair,
  Earth,
  FlaskConical,
  Gauge,
  Layers3,
  Moon,
  Orbit,
  Plus,
  Rocket,
  Satellite,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trophy,
  Zap,
  Radio,
  Weight,
  Wallet,
  HardDrive,
  Fuel,
  Activity,
  TriangleAlert,
  Settings2,
  Compass,
} from "lucide-react";
import {
  defaultDesign,
  Design,
  missions,
  objectives,
  glossary,
  Mode,
  scenarios,
} from "@/lib/data";
import { calculate, designForMission, Metrics } from "@/lib/engineering";
import { Help } from "./help";
import { OrbitView } from "./visuals";
import {
  SpacecraftStage,
  LaunchStage,
  TrajectoryStage,
} from "./builder-stages";
import { FlightControl } from "./flight";
import { Challenges, Records, Academy, Advisor } from "./explore";
import { createFlight, Flight, Result } from "@/lib/simulation";
import {
  readDesign,
  readRecords,
  readFlight,
  saveFlight,
  clearFlight,
  DESIGN_KEY,
} from "@/lib/storage";
import { readLearningSession } from "@/lib/learning";
import { configurationKey } from "@/lib/design-identity";
import { MissionLab } from "./mission-lab";
import {
  prepareProjectLoad,
  readProjects,
  writeProjects,
} from "@/lib/projects";
import { EngineeringReview } from "./engineering-review";
import { ProjectLibrary } from "./project-library";
import { InstallControl } from "./install-control";
import { MissionOverview, NewMissionDialog } from "./mission-overview";
import { MissionOrientation } from "./science-notebook";
import { useMissionTools } from "@/lib/webmcp";
function flightDestination(design: Design): "lab" | "builder" {
  const activity = readLearningSession();
  const chosen = activity?.selected ? activity[activity.selected] : null;
  return chosen && configurationKey(chosen.design) === configurationKey(design)
    ? "lab"
    : "builder";
}
const missionIcons = {
  earth: Earth,
  lunar: Moon,
  mars: Orbit,
  asteroid: Compass,
  solar: Sun,
  deep: Sparkles,
};
const steps = [
  { name: "Mission brief", icon: Target, description: "Set your destination" },
  { name: "Spacecraft", icon: Satellite, description: "Build your explorer" },
  { name: "Launch vehicle", icon: Rocket, description: "Find your ride" },
  { name: "Trajectory", icon: Orbit, description: "Chart your course" },
];
export function ResourcePanel({ d, m }: { d: Design; m: Metrics }) {
  const { t, tx, localeTag } = useI18n();

  const rows = [
    {
      name: "Mission budget",
      icon: Wallet,
      value: `$${m.cost.toFixed(1)}M`,
      total: Number.isFinite(m.budget) ? `/ $${m.budget}M` : "/ unlimited",
      ratio: m.cost / m.budget,
      hint: Number.isFinite(m.budget)
        ? `$${(m.budget - m.cost).toFixed(1)}M remaining`
        : "Unlimited experimentation",
      bad: m.cost > m.budget,
      color: "orange",
    },
    {
      name: "Spacecraft mass",
      icon: Weight,
      value: `${Math.round(m.mass)}`,
      total: `/ ${m.massLimit.toLocaleString(localeTag)} kg`,
      ratio: m.mass / m.massLimit,
      hint: `${Math.round(m.massLimit - m.mass)} kg remaining`,
      bad: m.mass > m.massLimit,
      color: "blue",
    },
    {
      name: "End-of-life power",
      icon: Zap,
      value: `${Math.round(m.requiredGeneration)} W`,
      total: `/ ${Math.round(m.endOfLifeGeneration)} W`,
      ratio: m.requiredGeneration / m.endOfLifeGeneration,
      hint: `${m.designPowerMargin >= 0 ? "+" : ""}${Math.round(m.designPowerMargin)} W after end-of-life reserve`,
      bad: m.designPowerMargin < 0,
      color: "green",
    },
  ];
  return (
    <aside id="mission-resources" className="resource-panel">
      <div className="panel-heading">
        <h3>{t("Mission resources")}</h3>
        <span className="live-label">
          <i />
          {t("LIVE")}
        </span>
      </div>
      <div className="resource-main">
        {tx(
          rows.map((r) => (
            <div className="resource" key={r.name}>
              <div className="resource-name">
                <r.icon size={15} />
                {r.name}
                {tx(
                  r.name === "End-of-life power" && (
                    <Help term="Power margin" />
                  ),
                )}
              </div>
              <div className="resource-value">
                <strong>{tx(r.value)}</strong>
                <span>{tx(r.total)}</span>
              </div>
              <div className={`meter ${r.color} ${r.bad ? "bad" : ""}`}>
                <i style={{ width: `${Math.min(100, r.ratio * 100) || 0}%` }} />
              </div>
              <small className={r.bad ? "text-danger" : ""}>{tx(r.hint)}</small>
            </div>
          )),
        )}
      </div>
      <div className="compact-resources">
        <div>
          <Fuel />
          <span>{t("Propellant")}</span>
          <strong>
            {tx(d.fuel)} <small>{t("kg")}</small>
          </strong>
        </div>
        <div>
          <HardDrive />
          <span>{t("Data buffer")}</span>
          <strong>
            {tx(m.dataNeed)}
            {t("/")}
            {tx(m.storage)} <small>{t("GB")}</small>
          </strong>
        </div>
        <div>
          <Radio />
          <span>{t("Bandwidth")}</span>
          <strong>
            {tx(m.bandwidth.toFixed(1))} <small>{t("Mbps")}</small>
          </strong>
        </div>
        <div>
          <ShieldCheck />
          <span>{t("Reliability")}</span>
          <strong className="text-green">
            {tx(m.reliability.toFixed(1))}
            <small>{t("%")}</small>
          </strong>
        </div>
      </div>
      <div className="science-summary">
        <div className="science-icon">
          <FlaskConical size={21} />
        </div>
        <div>
          <span>{t("Potential science score")}</span>
          <strong>
            {tx(Math.round(m.science))} <small>{t("pts")}</small>
          </strong>
        </div>
        <svg viewBox="0 0 70 30" width="70">
          <path
            d="M0 28 12 22 20 25 32 14 40 18 53 7 60 11 70 1"
            fill="none"
            stroke="#b3a3ea"
            strokeWidth="2"
          />
        </svg>
      </div>
      <div className={`readiness ${m.issues.length ? "has-issues" : ""}`}>
        <div>
          {tx(
            m.issues.length ? <TriangleAlert size={16} /> : <Check size={16} />,
          )}
          <strong>
            {tx(
              m.issues.length
                ? `${m.issues.length} check${m.issues.length > 1 ? "s need" : " needs"} attention`
                : "Launch constraints satisfied",
            )}
          </strong>
        </div>
        <p>
          {tx(
            m.issues.length
              ? m.issues[0].label
              : "Your design is within mission constraints.",
          )}
        </p>
      </div>
      {tx(
        m.issues.length > 0 && (
          <div className="issue-list" role="status">
            {tx(
              m.issues.map((i) => (
                <details key={i.label}>
                  <summary>{tx(i.label)}</summary>
                  <p>{tx(i.fix)}</p>
                </details>
              )),
            )}
          </div>
        ),
      )}
      <p className="resource-foot">
        <Activity size={12} /> {t(" Calculated with every decision")}
      </p>
    </aside>
  );
}
export default function MissionControl() {
  const { t, tx, localeTag } = useI18n();

  const [design, setDesign] = useState<Design>(defaultDesign);
  const [step, setStep] = useState(0);
  const [overview, setOverview] = useState(true);
  const [newMission, setNewMission] = useState(false);
  const [workspace, setWorkspace] = useState<"configuration" | "analysis">(
    "configuration",
  );
  const [view, setView] = useState("builder");
  const [ready, setReady] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [records, setRecords] = useState<Result[]>([]);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [advisor, setAdvisor] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [restoredFlight, setRestoredFlight] = useState(false);
  const [returnView, setReturnView] = useState<"lab" | "builder">("builder");
  useEffect(() => {
    setTeamOpen(new URLSearchParams(window.location.search).has("room"));
    const saved = readDesign();
    if (saved) setDesign(saved);
    const checkpoint = readFlight();
    if (checkpoint) {
      setDesign(checkpoint.design);
      setFlight({ ...checkpoint.flight, paused: true });
      setRestoredFlight(true);
      setReturnView(flightDestination(checkpoint.design));
      setView("flight");
    }
    setRecords(readRecords());
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(DESIGN_KEY, JSON.stringify(design));
        setStorageOk(true);
      } catch {
        setStorageOk(false);
      }
  }, [design, ready]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    document
      .getElementById("main-content")
      ?.scrollTo({ top: 0, behavior: "auto" });
  }, [view, step, overview, workspace]);
  const recordResult = useCallback(
    (r: Result) =>
      setRecords((prev) =>
        [r, ...prev.filter((v) => v.id !== r.id)].slice(0, 50),
      ),
    [],
  );
  const m = calculate(design);
  const Icon = missionIcons[design.mission];
  const activeChallenge = scenarios.find((s) => s.id === design.scenario);
  const loadLearningDesign = (next: Design): boolean => {
    try {
      const projects = prepareProjectLoad(readProjects(), design);
      if (!writeProjects(projects)) return false;
      setDesign(structuredClone(next));
      return true;
    } catch {
      return false;
    }
  };
  const launch = () => {
    if (!m.issues.length) {
      const next = createFlight(design);
      setReturnView(flightDestination(design));
      saveFlight(design, next);
      setFlight(next);
      setRestoredFlight(false);
      setView("flight");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const changeStep = (n: number) => {
    setOverview(false);
    setWorkspace("configuration");
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  useMissionTools(design, setDesign, view === "flight");
  return (
    <div
      className={`app-shell aerospace-shell ${overview && view === "builder" ? "overview-active" : ""}`}
    >
      <a className="skip-link" href="#main-content">
        {t("Skip to mission workspace")}
      </a>
      <header className="topbar">
        <a href="/" className="brand">
          <span className="brand-mark">
            <svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true">
              <path d="M8 30 20 6l12 24-12-7Z" fill="currentColor" />
              <path d="M5 34 35 16" stroke="#0095ff" strokeWidth="3" />
            </svg>
          </span>
          <span>
            {t("MISSION")}
            <span className="brand-light">{t("ARCHITECT")}</span>
            <small>{t("SPACE MISSION DESIGN & SIMULATION")}</small>
          </span>
        </a>
        <div className="topbar-center">
          <span className="top-pill">
            {t("WORKSPACE")} /{" "}
            {t(
              view === "builder"
                ? "Mission builder"
                : view === "records"
                  ? "Flight records"
                  : "Mission control",
            )}
          </span>
          <span className="top-version">{t("v1.5")}</span>
        </div>
        <div className="topbar-right">
          <span className="saved">
            <i />{" "}
            {tx(storageOk ? "Saved on this device" : "Storage unavailable")}
          </span>
          <PreferenceControls />
          <InstallControl />
          <button
            className="primary-button new-mission-cta"
            disabled={view === "flight"}
            onClick={() => setNewMission(true)}
          >
            <Plus size={16} />
            {t("New mission")}
          </button>
          <button
            disabled={view === "flight"}
            className="avatar"
            onClick={() => {
              if (view !== "flight") setView("academy");
            }}
            aria-label={t("Open flight academy")}
          >
            <BookOpen size={17} />
          </button>
        </div>
      </header>
      <div className="app-body">
        <nav className="sidebar">
          <div className="rail-brand">
            <svg viewBox="0 0 40 40" width="28" height="28" aria-hidden="true">
              <path d="M8 30 20 6l12 24-12-7Z" fill="currentColor" />
              <path d="M5 34 35 16" stroke="#0284c7" strokeWidth="2" />
            </svg>
            <strong>
              MISSION ARCHITECT
              <small>{t("MISSION LABORATORY • SIMULATION")}</small>
            </strong>
          </div>
          <div className="rail-section">{t("Mission workspace")}</div>
          {[
            {
              label: "Mission overview",
              icon: Layers3,
              section: "overview",
              step: 0,
            },
            {
              label: "Spacecraft & mass",
              icon: Layers3,
              section: "configuration",
              step: 1,
            },
            {
              label: "Orbit & trajectory",
              icon: Orbit,
              section: "configuration",
              step: 3,
            },
            {
              label: "Resource budget",
              icon: Crosshair,
              section: "analysis",
              step: 0,
            },
          ].map((item) => {
            const selected =
              view === "builder" &&
              (item.section === "overview"
                ? overview
                : !overview &&
                  workspace === item.section &&
                  (workspace === "analysis" || step === item.step));
            return (
              <button
                key={item.label}
                disabled={view === "flight"}
                className={`nav-item ${selected ? "active" : ""}`}
                aria-current={selected ? "page" : undefined}
                onClick={() => {
                  setView("builder");
                  setOverview(item.section === "overview");
                  setWorkspace(
                    item.section === "analysis" ? "analysis" : "configuration",
                  );
                  setStep(item.step);
                }}
              >
                <item.icon size={16} />
                {t(item.label)}
              </button>
            );
          })}
          <button
            disabled={view === "flight"}
            title={t("Challenges")}
            aria-current={view === "challenges" ? "page" : undefined}
            className={view === "challenges" ? "nav-item active" : "nav-item"}
            onClick={() => {
              if (view !== "flight") setView("challenges");
            }}
          >
            <Crosshair size={18} /> {t(" Challenges ")}
            <span className="count">{t("5")}</span>
          </button>
          <button
            disabled={view === "flight"}
            title={t("Flight records")}
            aria-current={view === "records" ? "page" : undefined}
            className={view === "records" ? "nav-item active" : "nav-item"}
            onClick={() => {
              if (view !== "flight") setView("records");
            }}
          >
            <Trophy size={18} /> {t(" Flight records")}
          </button>
          <button
            disabled={view === "flight"}
            title={t("Field guide")}
            aria-current={view === "academy" ? "page" : undefined}
            className={`nav-item mobile-academy ${view === "academy" ? "active" : ""}`}
            onClick={() => setView("academy")}
          >
            <BookOpen size={18} /> {t(" Field guide")}
          </button>
          <button
            disabled={view === "flight"}
            title={t("Mission lab")}
            aria-current={view === "lab" ? "page" : undefined}
            className={
              view === "lab" ? "nav-item active lab-nav" : "nav-item lab-nav"
            }
            onClick={() => setView("lab")}
          >
            <FlaskConical size={18} /> {t(" Mission lab")}
          </button>
          <div className="nav-group-title second">{t("YOUR MISSION")}</div>
          {tx(
            steps.map((s, i) => (
              <button
                disabled={view === "flight"}
                key={s.name}
                className={`workflow-item ${step === i && view === "builder" ? "selected" : ""}`}
                onClick={() => {
                  if (view !== "flight") {
                    setOverview(false);
                    setWorkspace("configuration");
                    setStep(i);
                    setView("builder");
                  }
                }}
              >
                <span className="step-number">
                  {tx(
                    i < step ? (
                      <Check size={12} />
                    ) : (
                      String(i + 1).padStart(2, "0")
                    ),
                  )}
                </span>
                {tx(s.name)}
              </button>
            )),
          )}
          <div className="sidebar-bottom">
            <div className="academy-card">
              <div className="academy-orbit">
                <Orbit size={29} />
              </div>
              <strong>
                {t("Engineering")}
                <br />
                {t("reference manual.")}
              </strong>
              <p>
                {t(
                  "Orbital mechanics, spacecraft systems, and mission constraints.",
                )}
              </p>
              <button
                disabled={view === "flight"}
                onClick={() => setView("academy")}
              >
                {t("Flight academy ")}
                <ArrowUpRight size={14} />
              </button>
            </div>
            <button
              disabled={view === "flight"}
              className={`nav-item help-nav ${view === "academy" ? "active" : ""}`}
              title={t("Field guide")}
              aria-current={view === "academy" ? "page" : undefined}
              onClick={() => {
                if (view !== "flight") setView("academy");
              }}
            >
              <BookOpen size={17} /> {t(" Field guide ")}
              <ArrowUpRight size={14} />
            </button>
            <span className="sidebar-caption">
              {t("MISSION ARCHITECT / EDUCATION")}
            </span>
          </div>
        </nav>
        <main className="main" id="main-content" tabIndex={-1}>
          <div className="page-heading">
            <div className="breadcrumb">
              {t("WORKSPACE ")}
              <span>{t("/")}</span>
              {tx(" ")}
              {tx(view === "builder" ? "MISSION BUILDER" : view.toUpperCase())}
            </div>
            <div className="title-row">
              <div>
                <h1>
                  {tx(
                    view === "flight"
                      ? "Mission control"
                      : view === "builder"
                        ? "Mission design"
                        : view === "challenges"
                          ? "Mission challenges"
                          : view === "records"
                            ? "Flight archive"
                            : view === "lab"
                              ? "Mission laboratory"
                              : "Engineering field guide",
                  )}
                </h1>
                <p>
                  {tx(
                    view === "builder"
                      ? "Configure the spacecraft, verify requirements, and review every resource budget."
                      : view === "flight"
                        ? "Monitor the spacecraft, evaluate anomalies, and command the mission."
                        : view === "challenges"
                          ? "Design to a brief. Meet the requirements. Test the outcome."
                          : view === "records"
                            ? "Review mission outcomes, telemetry, and engineering decisions."
                            : view === "lab"
                              ? "A practical investigation: define, compare, fly, and evaluate."
                              : "The principles behind each engineering decision.",
                  )}
                </p>
              </div>
              <label className="mode-select">
                <span className="mode-icon">
                  <Compass size={16} />
                </span>
                <select
                  aria-label={t("Game mode")}
                  title={t(
                    activeChallenge
                      ? "Leave the active challenge to change modes."
                      : undefined,
                  )}
                  disabled={view === "flight" || !!activeChallenge}
                  value={design.mode}
                  onChange={(e) =>
                    setDesign({ ...design, mode: e.target.value as Mode })
                  }
                >
                  <option value="guided">{t("Guided mode")}</option>
                  <option value="challenge">{t("Challenge mode")}</option>
                  <option value="sandbox">{t("Sandbox mode")}</option>
                </select>
                <ChevronDown size={14} />
              </label>
            </div>
          </div>
          <div
            className="dashboard-tabs"
            role="group"
            aria-label={t("Mission workspace sections")}
          >
            {[
              { label: "Overview", id: "overview" },
              { label: "Spacecraft", id: "spacecraft" },
              { label: "Trajectory", id: "trajectory" },
              { label: "Resource budget", id: "budget" },
              { label: "Flight records", id: "records" },
            ].map((tab) => (
              <button
                key={tab.id}
                disabled={view === "flight"}
                aria-pressed={
                  tab.id === "records"
                    ? view === "records"
                    : view === "builder" &&
                      (tab.id === "overview"
                        ? overview
                        : !overview &&
                          (tab.id === "budget"
                            ? workspace === "analysis"
                            : workspace === "configuration" &&
                              step === (tab.id === "spacecraft" ? 1 : 3)))
                }
                onClick={() => {
                  if (tab.id === "records") {
                    setView("records");
                    return;
                  }
                  setView("builder");
                  setOverview(tab.id === "overview");
                  setWorkspace(
                    tab.id === "budget" ? "analysis" : "configuration",
                  );
                  setStep(
                    tab.id === "spacecraft"
                      ? 1
                      : tab.id === "trajectory"
                        ? 3
                        : 0,
                  );
                }}
              >
                {t(tab.label)}
              </button>
            ))}
          </div>
          {newMission && (
            <NewMissionDialog
              onClose={() => setNewMission(false)}
              onCreate={(next) => {
                if (!loadLearningDesign(next)) return false;
                setView("builder");
                setOverview(true);
                setStep(0);
                return true;
              }}
            />
          )}
          {!storageOk && (
            <p className="storage-warning" role="alert">
              {t(
                "Storage unavailable. Export your design before closing this tab.",
              )}
            </p>
          )}
          {view === "builder" && <details className="team-disclosure" open={teamOpen} onToggle={e => setTeamOpen(e.currentTarget.open)}><summary>{t("Local team room")}</summary><TeamPanel design={design} onLoad={loadLearningDesign} /></details>}
          {view === "builder" && overview && (
            <MissionOverview
              design={design}
              onChange={setDesign}
              onLoad={loadLearningDesign}
              onLab={() => setView("lab")}
              onAnalysis={() => {
                setOverview(false);
                setWorkspace("analysis");
              }}
              onSpacecraft={() => changeStep(1)}
              onEdit={changeStep}
            />
          )}
          {tx(
            view === "builder" && !overview && (
              <section
                className="mission-register"
                aria-label={t("Active mission overview")}
              >
                <div>
                  <span>{t("ACTIVE PROJECT")}</span>
                  <strong>{design.name}</strong>
                </div>
                <div>
                  <span>{t("DESTINATION / ORBIT")}</span>
                  <strong>
                    {tx(m.mission.name)}{" "}
                    <small>
                      {t("/ ")}
                      {tx(m.orbit.short)}
                    </small>
                  </strong>
                </div>
                <div>
                  <span>{t("DESIGN REVIEW")}</span>
                  <strong
                    className={m.issues.length ? "register-hold" : "text-green"}
                  >
                    <i />
                    {tx(
                      m.issues.length
                        ? `${m.issues.length} open checks`
                        : "Ready for launch",
                    )}
                  </strong>
                </div>
              </section>
            ),
          )}
          {tx(
            view === "builder" ? (
              <>
                {!overview && (
                  <MissionOrientation
                    step={step}
                    m={m}
                    onLab={() => setView("lab")}
                  />
                )}
                <ProjectLibrary
                  design={design}
                  onLoad={(next) => {
                    setDesign(next);
                    setStep(0);
                  }}
                />
                {tx(
                  activeChallenge && (
                    <section className="active-challenge">
                      <div className="active-challenge-icon">
                        <Crosshair size={23} />
                      </div>
                      <div>
                        <span className="eyebrow">{t("ACTIVE CHALLENGE")}</span>
                        <h2>{tx(activeChallenge.name)}</h2>
                        <p>
                          {tx(activeChallenge.goal)} {t(" · $")}
                          {tx(activeChallenge.budget)}
                          {t("M budget")}
                          {tx(
                            Number.isFinite(activeChallenge.mass)
                              ? ` · ${activeChallenge.mass.toLocaleString(localeTag)} kg mass limit`
                              : "",
                          )}
                        </p>
                        <small>
                          {t(
                            "Destination and difficulty are fixed. Your engineering choices are yours.",
                          )}
                        </small>
                      </div>
                      <button
                        className="secondary-button"
                        onClick={() =>
                          setDesign({
                            ...design,
                            scenario: null,
                            mode: "guided",
                          })
                        }
                      >
                        {t("Leave challenge")}
                      </button>
                    </section>
                  ),
                )}
                <div className="mobile-resource-strip">
                  <div>
                    <span>{t("BUDGET")}</span>
                    <strong className={m.cost > m.budget ? "text-danger" : ""}>
                      {t("$")}
                      {tx(m.cost.toFixed(0))}
                      {t("M")}
                      {tx(" ")}
                      <small>
                        {t("/ ")}
                        {tx(Number.isFinite(m.budget) ? m.budget : "∞")}
                      </small>
                    </strong>
                  </div>
                  <div>
                    <span>{t("MASS")}</span>
                    <strong
                      className={m.mass > m.massLimit ? "text-danger" : ""}
                    >
                      {tx(Math.round(m.mass))} <small>{t("kg")}</small>
                    </strong>
                  </div>
                  <div>
                    <span>{t("EOL RESERVE")}</span>
                    <strong
                      className={
                        m.designPowerMargin < 0 ? "text-danger" : "text-green"
                      }
                    >
                      {tx(m.designPowerMargin >= 0 ? "+" : "")}
                      {tx(Math.round(m.designPowerMargin))}{" "}
                      <small>{t("W")}</small>
                    </strong>
                  </div>
                  <a
                    href="#mission-resources"
                    aria-label={t("View all mission resources and constraints")}
                  >
                    {tx(
                      m.issues.length ? (
                        <TriangleAlert size={16} />
                      ) : (
                        <Check size={16} />
                      ),
                    )}
                    <span>
                      {tx(
                        m.issues.length
                          ? `${m.issues.length} checks`
                          : "All clear",
                      )}
                    </span>
                  </a>
                </div>
                <div
                  className="workspace-switch"
                  role="group"
                  aria-label={t("Workspace view")}
                >
                  <button
                    aria-pressed={workspace === "configuration"}
                    onClick={() => setWorkspace("configuration")}
                  >
                    <Settings2 size={16} /> {t(" Configuration")}
                  </button>
                  <button
                    aria-pressed={workspace === "analysis"}
                    onClick={() => setWorkspace("analysis")}
                  >
                    <Gauge size={16} /> {t(" Engineering analysis")}
                    {tx(" ")}
                    <span>
                      {tx(
                        m.issues.length
                          ? `${m.issues.length} open`
                          : "Checks pass",
                      )}
                    </span>
                  </button>
                </div>
                <div className="stepper">
                  {tx(
                    steps.map((s, i) => (
                      <button
                        key={s.name}
                        onClick={() => {
                          setOverview(false);
                          setWorkspace("configuration");
                          setStep(i);
                        }}
                        className={
                          step === i ? "current" : i < step ? "complete" : ""
                        }
                      >
                        <span className="stepper-icon">
                          {tx(
                            i < step ? (
                              <Check size={17} />
                            ) : (
                              <s.icon size={17} />
                            ),
                          )}
                        </span>
                        <span>
                          <small>
                            {t("STEP 0")}
                            {tx(i + 1)}
                          </small>
                          <strong>{tx(s.name)}</strong>
                        </span>
                        {tx(i < 3 && <span className="step-connector" />)}
                      </button>
                    )),
                  )}
                </div>
                <div className="workspace-grid">
                  <section className="design-area">
                    {tx(
                      workspace === "analysis" ? (
                        <EngineeringReview
                          design={design}
                          onChange={setDesign}
                          onEdit={(next) => {
                            setWorkspace("configuration");
                            setStep(next);
                          }}
                        />
                      ) : step === 0 ? (
                        <>
                          <div className="section-heading">
                            <div>
                              <span className="eyebrow">
                                {t("01 / MISSION BRIEF")}
                              </span>
                              <h2>{t("Mission definition")}</h2>
                              <p>
                                {t(
                                  "Select a destination to establish the mission’s operating environment.",
                                )}
                              </p>
                            </div>
                            <span className="section-index">{t("01")}</span>
                          </div>
                          <div className="brief-grid">
                            <div className="mission-cards">
                              {tx(
                                missions.map((mi) => {
                                  const Mi = missionIcons[mi.id];
                                  return (
                                    <button
                                      className={`mission-card ${design.mission === mi.id ? "selected" : ""}`}
                                      key={mi.id}
                                      aria-pressed={design.mission === mi.id}
                                      disabled={!!activeChallenge}
                                      onClick={() =>
                                        setDesign(
                                          designForMission(mi.id, design.mode),
                                        )
                                      }
                                    >
                                      <div
                                        className={`mission-icon icon-${mi.id}`}
                                      >
                                        <Mi size={23} />
                                      </div>
                                      <span className="selection-circle">
                                        {tx(
                                          design.mission === mi.id && (
                                            <Check size={12} />
                                          ),
                                        )}
                                      </span>
                                      <strong>{tx(mi.name)}</strong>
                                      <p>{tx(mi.description)}</p>
                                      <span className="mission-tag">
                                        {tx(
                                          mi.id === "earth"
                                            ? "RECOMMENDED"
                                            : mi.id === "deep"
                                              ? "EXPERT"
                                              : "EXPLORATION",
                                        )}
                                      </span>
                                    </button>
                                  );
                                }),
                              )}
                            </div>
                            <div className="preview-column">
                              <OrbitView design={design} m={m} />
                              <div className="destination-caption">
                                <Icon size={16} />
                                <div>
                                  <strong>{tx(m.mission.name)}</strong>
                                  <span>{tx(m.mission.label)}</span>
                                </div>
                                <span className="destination-coordinates">
                                  {tx(
                                    design.mission === "earth"
                                      ? "23.4° / 149.6M km"
                                      : m.orbit.altitude,
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="objectives-block">
                            <div className="sub-heading">
                              <h3>{t("Science objectives")}</h3>
                              <span>
                                {tx(design.objectives.length)} {t(" selected")}
                              </span>
                            </div>
                            <p>
                              {t(
                                "Select the measurements the payload must support.",
                              )}
                            </p>
                            <div className="objective-grid">
                              {tx(
                                objectives
                                  .filter((o) =>
                                    m.mission.objectives.includes(o.id),
                                  )
                                  .map((o) => (
                                    <button
                                      className={
                                        design.objectives.includes(o.id)
                                          ? "objective selected"
                                          : "objective"
                                      }
                                      key={o.id}
                                      aria-pressed={design.objectives.includes(
                                        o.id,
                                      )}
                                      onClick={() =>
                                        setDesign({
                                          ...design,
                                          objectives:
                                            design.objectives.includes(o.id)
                                              ? design.objectives.filter(
                                                  (x) => x !== o.id,
                                                )
                                              : [...design.objectives, o.id],
                                        })
                                      }
                                    >
                                      <span className="checkbox">
                                        {tx(
                                          design.objectives.includes(o.id) && (
                                            <Check size={12} />
                                          ),
                                        )}
                                      </span>
                                      {tx(o.name)}
                                    </button>
                                  )),
                              )}
                            </div>
                          </div>
                          {tx(
                            design.mode === "guided" && (
                              <div className="guided-tip">
                                <span>
                                  <Sparkles size={18} />
                                </span>
                                <div>
                                  <strong>
                                    {t(
                                      "Your first mission? Start close to home.",
                                    )}
                                  </strong>
                                  <p>
                                    {t(
                                      "Earth observation offers a shorter journey, a stronger signal, and a little more room to experiment.",
                                    )}
                                  </p>
                                </div>
                              </div>
                            ),
                          )}
                          <div className="stage-footer">
                            <span>
                              <ShieldCheck size={14} />{" "}
                              {t(
                                " Configuration changes are saved automatically.",
                              )}
                            </span>
                            <button
                              className="primary-button"
                              onClick={() => changeStep(1)}
                            >
                              {t("Design spacecraft ")}
                              <ArrowRight size={16} />
                            </button>
                          </div>
                        </>
                      ) : step === 1 ? (
                        <SpacecraftStage
                          d={design}
                          m={m}
                          onChange={setDesign}
                          onNext={() => changeStep(2)}
                          onBack={() => changeStep(0)}
                        />
                      ) : step === 2 ? (
                        <LaunchStage
                          d={design}
                          m={m}
                          onChange={setDesign}
                          onNext={() => changeStep(3)}
                          onBack={() => changeStep(1)}
                        />
                      ) : (
                        <TrajectoryStage
                          d={design}
                          m={m}
                          onChange={setDesign}
                          onBack={() => changeStep(2)}
                          onLaunch={launch}
                        />
                      ),
                    )}
                  </section>
                  <ResourcePanel d={design} m={m} />
                </div>
              </>
            ) : view === "lab" ? (
              <MissionLab
                design={design}
                records={records}
                onLoad={loadLearningDesign}
                onEdit={(next, analysis) => {
                  setOverview(false);
                  setStep(next);
                  setWorkspace(analysis ? "analysis" : "configuration");
                  setView("builder");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            ) : view === "challenges" ? (
              <Challenges
                onSelect={(d) => {
                  setOverview(false);
                  setDesign(d);
                  setStep(0);
                  setView("builder");
                }}
              />
            ) : view === "records" ? (
              <Records records={records} onBuild={() => setView("builder")} />
            ) : view === "flight" && flight ? (
              <FlightControl
                key={flight.id}
                design={design}
                initial={flight}
                restored={restoredFlight}
                returnLabel={
                  returnView === "lab"
                    ? "Return to Climate Watch"
                    : "Refine your mission"
                }
                onReturn={() => {
                  setOverview(false);
                  setView(returnView);
                  setStep(1);
                  setFlight(null);
                  clearFlight();
                  setRestoredFlight(false);
                }}
                onResult={recordResult}
              />
            ) : (
              <Academy />
            ),
          )}
          {tx(
            view === "builder" && (
              <div className="advisor-launcher">
                <button onClick={() => setAdvisor((a) => !a)}>
                  <Sparkles size={14} /> {t(" Mission advisor")}
                  {tx(" ")}
                  <span>{tx(m.issues.length || "✓")}</span>
                </button>
                {tx(
                  advisor && (
                    <Advisor
                      design={design}
                      onClose={() => setAdvisor(false)}
                    />
                  ),
                )}
              </div>
            ),
          )}
          <footer className="page-footer">
            <span>
              {t("MISSION ARCHITECT ")}
              <span className="footer-slash">{t("/")}</span>{" "}
              {t(" SPACE MISSION DESIGN LAB")}
            </span>
            <span>
              {t(
                "Independent educational simulator · Not affiliated with NASA",
              )}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
