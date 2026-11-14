"use client";
import { LaunchIntro } from "./launch-intro";
import { useI18n } from "./preferences";
import { useEffect, useRef, useState } from "react";
import {
  Rocket,
  Activity,
  Check,
  Download,
  ArrowRight,
  ArrowLeft,
  Radio,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Trophy,
  Copy,
  RotateCcw,
} from "lucide-react";
import { OperationsControl } from "./operations-control";
import { IntervalSummary } from "./interval-summary";
import { Design } from "@/lib/data";
import { calculate } from "@/lib/engineering";
import {
  Flight,
  Result,
  phases,
  pendingEvent,
  respondByCommand,
  advanceByCommand,
  nextIntervalHours,
  scoreFlight,
  responseRisk,
} from "@/lib/simulation";
import {
  saveResult,
  downloadReport,
  saveFlight,
  clearFlight,
} from "@/lib/storage";
import { TelemetryChart } from "./telemetry-chart";
import { DecisionImpact, ScoreExplanation } from "./decision-impact";
import { FlightStageScene } from "./flight-stage-scene";
export function FlightControl({
  design,
  initial,
  restored = false,
  returnLabel,
  onReturn,
  onResult,
}: {
  design: Design;
  initial: Flight;
  restored?: boolean;
  returnLabel?: string;
  onReturn: () => void;
  onResult: (r: Result) => void;
}) {
  const { t, tx, localeTag, number } = useI18n();

  const [flight, setFlight] = useState(() => ({ ...initial, paused: true }));
  const [showLaunchIntro, setShowLaunchIntro] = useState(!restored && initial.phase === 0 && !initial.completed);
  const [checkpointSaved, setCheckpointSaved] = useState(true);
  const [saved, setSaved] = useState(true);
  const [result, setResult] = useState<Result | null>(null);
  const once = useRef(false);
  const m = calculate(design);
  const event = pendingEvent(flight);
  useEffect(() => {
    setCheckpointSaved(saveFlight(design, flight));
  }, [design, flight]);
  useEffect(() => {
    if (flight.completed && !once.current) {
      once.current = true;
      const r = scoreFlight(design, flight);
      const stored = saveResult(r);
      setSaved(stored);
      if (stored) clearFlight();
      setResult(r);
      onResult(r);
    }
  }, [flight, design, onResult]);
  if (result)
    return (
      <ResultView
        result={result}
        onReturn={onReturn}
        saved={saved}
        returnLabel={returnLabel}
      />
    );
  return (
    <div className="flight-screen">
      {showLaunchIntro && <LaunchIntro design={design} onDone={() => setShowLaunchIntro(false)}/>}
      <div
        className={`checkpoint-status ${checkpointSaved ? "" : "checkpoint-warning"}`}
        role="status"
      >
        <ShieldCheck size={15} />
        <span>
          {tx(
            !checkpointSaved
              ? "Flight autosave unavailable. Keep this window open until the mission is complete."
              : restored
                ? "Checkpoint restored. Review your settings and calculate the next interval when ready."
                : "Flight autosaved on this device. You can safely close and reopen the app.",
          )}
        </span>
      </div>
      <div className="flight-title">
        <div>
          <span className="eyebrow">
            {t("MISSION CONTROL / FLIGHT IN PROGRESS")}
          </span>
          <h2>{t(design.name)}</h2>
          <p>
            {tx(m.mission.name)} {t(" · ")}
            {tx(m.orbit.name)}
          </p>
        </div>
        <span className="flight-live">
          <i />
          {tx(
            event
                ? "AWAITING YOUR COMMAND"
                : "Planning next interval",
          )}
        </span>
      </div>
      <div className="flight-timeline">
        {tx(
          phases.map((p, i) => (
            <div
              key={p}
              className={
                i === flight.phase ? "active" : i < flight.phase ? "done" : ""
              }
            >
              <span>{tx(i < flight.phase ? <Check size={12} /> : i + 1)}</span>
              <strong>{tx(p)}</strong>
            </div>
          )),
        )}
      </div>
      <div className="flight-resource-strip">
        {tx(
          [
            ["TOTAL COST", `$${m.cost.toFixed(1)}M`],
            ["DRY MASS", `${Math.round(m.dryMass)} kg`],
            [
              "POWER IN / OUT",
              `${Math.round(flight.operations?.generationW ?? m.generation + flight.powerDelta)} / ${Math.round(flight.operations?.loadW ?? m.consumption)} W`,
            ],
            ["STORAGE", `${(flight.operations?.data.reduce((n,r)=>n+r.buffered,0) ?? m.dataNeed).toFixed(1)} / ${m.storage} GB`],
            ["DOWNLINK", `${m.bandwidth.toFixed(1)} Mbps`],
            ["RELIABILITY", `${m.reliability.toFixed(1)}%`],
          ].map(([k, v]) => (
            <div key={k}>
              <span>{tx(k)}</span>
              <strong>{tx(v)}</strong>
            </div>
          )),
        )}
      </div>
      <OperationsControl design={design} flight={flight} onChange={setFlight} />
      <section className="operations-panel interval-planning" aria-label={t("Planning next interval")}>
        <h3>{t("Planning next interval")}</h3>
        <p>{t("Time advances only when you confirm. Adjust instruments and transmission before continuing.")}</p>
        <p><strong>{t("Next interval duration")}: </strong>
          {number(nextIntervalHours(flight, design) / (flight.phase >= 4 ? 720 : 1), 2)} {t(flight.phase >= 4 ? "months" : "hours")}
          {" · "}{t(phases[flight.phase + 1])}
        </p>
        <button className="primary-button" disabled={!!event || flight.completed}
          onClick={() => setFlight(f => advanceByCommand(f, design))}>
          {t("Calculate next interval")} <ArrowRight size={16} />
        </button>
        {event && <p role="status">{t("Resolve the pending event below before calculating the next interval.")}</p>}
      </section>
      {flight.lastInterval && <IntervalSummary report={flight.lastInterval} />}
      <div className="flight-layout">
        <div>
          <FlightStageScene design={design} flight={flight} mode="flight" />
          <div className="flight-metrics">
            {tx(
              [
                ["SPACECRAFT HEALTH", `${flight.health}%`],
                ["FUEL RESERVE", `${flight.fuel.toFixed(1)} kg`],
                [
                  "SCIENCE CHANGE",
                  `${flight.scienceDelta >= 0 ? "+" : ""}${flight.scienceDelta}`,
                ],
                ["ANOMALIES SURVIVED", flight.anomalies],
              ].map(([label, val]) => (
                <div key={label}>
                  <span>{tx(label)}</span>
                  <strong>{tx(val)}</strong>
                </div>
              )),
            )}
          </div>
          {tx(
            flight.telemetry && <TelemetryChart samples={flight.telemetry} />,
          )}
          <DecisionImpact decisions={flight.decisions} />
        </div>
        <div className="command-column">
          {tx(
            event ? (
              <section
                className={`event-card ${event.type}`}
                aria-live="polite"
              >
                <div className="event-kicker">
                  {tx(
                    event.type === "discovery" ? (
                      <Sparkles size={16} />
                    ) : (
                      <TriangleAlert size={16} />
                    ),
                  )}
                  {tx(" ")}
                  {tx(
                    event.type === "discovery"
                      ? "SCIENCE OPPORTUNITY"
                      : "FLIGHT ANOMALY",
                  )}
                </div>
                <h3>{tx(event.title)}</h3>
                <p>{tx(event.description)}</p>
                <div className="event-choices">
                  {tx(
                    event.choices.map((c, i) => (
                      <button
                        key={c.label}
                        disabled={c.fuel > flight.fuel}
                        onClick={() =>
                          setFlight((f) => respondByCommand(f, design, i))
                        }
                      >
                        <span>{tx(String.fromCharCode(65 + i))}</span>
                        <div>
                          <strong>{tx(c.label)}</strong>
                          <p>{tx(c.description)}</p>
                          <span className="response-risk">
                            {t("Adjusted damage risk:")}
                            {tx(" ")}
                            {tx(
                              (
                                responseRisk(
                                  c.risk,
                                  m.reliability,
                                  design.mode,
                                ) * 100
                              ).toFixed(1),
                            )}
                            {t("%")}
                            {tx(
                              c.damage > 0
                                ? ` · ${Math.min(c.damage, flight.health)}% health loss if hit`
                                : "",
                            )}
                          </span>
                          {tx(
                            c.fuel > flight.fuel && (
                              <small>
                                {t("Not enough reserve propellant")}
                              </small>
                            ),
                          )}
                        </div>
                        <ArrowRight size={14} />
                      </button>
                    )),
                  )}
                </div>
                <small className="event-foot">
                  {tx(
                    "Descriptions show base risk. The adjusted risk above is used for your design and game mode.",
                  )}
                </small>
              </section>
            ) : (
              <div className="nominal-card">
                <div className="radar-pulse">
                  <Radio size={30} />
                </div>
                <span className="eyebrow">
                  {tx(flight.paused ? "FLIGHT HOLD" : "TELEMETRY NOMINAL")}
                </span>
                <h3>{tx(phases[flight.phase])}</h3>
                <p>
                  {tx(
                    flight.paused
                      ? "Review your settings, then calculate the next interval."
                      : "Your spacecraft is executing the mission plan. Stay ready for the unexpected.",
                  )}
                </p>
              </div>
            ),
          )}
          <section className="mission-log">
            <div className="sub-heading">
              <h3>
                <Activity size={14} /> {t(" Mission log")}
              </h3>
              <span>
                {tx(flight.log.length)} {t(" ENTRIES")}
              </span>
            </div>
            <div className="log-entries">
              {tx(
                [...flight.log].reverse().map((l, i) => (
                  <div
                    className={`log-entry ${l.kind}`}
                    key={`${i}-${l.phase}`}
                  >
                    <span>{tx(l.phase.toUpperCase())}</span>
                    <p>{tx(l.text)}</p>
                  </div>
                )),
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
export function ResultView({
  result: r,
  onReturn,
  saved = true,
  returnLabel = "Refine your mission",
  returnDisabled = false,
}: {
  result: Result;
  onReturn: () => void;
  saved?: boolean;
  returnLabel?: string;
  returnDisabled?: boolean;
}) {
  const { t, tx, localeTag } = useI18n();

  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        t(`${r.name} — Mission Architect\nGrade ${r.grade} · ${r.score}/100 · Science ${r.science}\n${r.mission} · $${r.cost.toFixed(1)}M · ${r.objectives.length}/${r.objectiveCount} objectives complete\n${location.origin}`),
      );
      setCopied(true);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <div className="results-page">
      <div className="result-hero">
        <div
          className={`grade-emblem ${r.grade === "Mission Failed" ? "failed" : ""}`}
        >
          <span>{t("MISSION GRADE")}</span>
          <strong>{tx(r.grade === "Mission Failed" ? "F" : r.grade)}</strong>
          <Trophy size={20} />
        </div>
        <div>
          <span className="eyebrow">
            {t("MISSION DEBRIEF / ")}
            {tx(r.mode.toUpperCase())} {t(" MODE")}
          </span>
          <h2>
            {tx(
              r.grade === "Mission Failed"
                ? "Mission unsuccessful"
                : "Mission completed",
            )}
          </h2>
          <p>
            {t("Scoring model")}{t(" v")}{r.scoringVersion ?? 1} · {t(r.name)} {t(" · ")}
            {tx(r.mission)}
          </p>
          <div className="result-badges">
            {tx(
              r.health === 100 && (
                <span>
                  <ShieldCheck size={13} /> {t(" Safe pair of hands")}
                </span>
              ),
            )}
            {tx(
              r.science >= 100 && (
                <span>
                  <Sparkles size={13} /> {t(" Science pioneer")}
                </span>
              ),
            )}
            {tx(
              r.challengePassed && r.scenario && (
                <span>
                  <Trophy size={13} /> {t(" Challenge complete")}
                </span>
              ),
            )}
          </div>
        </div>
        <div className="total-score">
          <strong>{tx(r.score)}</strong>
          <span>{t("/ 100 MISSION SCORE")}</span>
        </div>
      </div>
      <div className="result-score-grid">
        {tx(
          [
            ["Mission success", r.success, "%"],
            ["Science score", r.science, "pts"],
            ["Engineering efficiency", r.engineering, "%"],
            ["Budget efficiency", r.budgetEfficiency, "%"],
          ].map(([label, value, unit]) => (
            <div key={label}>
              <span>{tx(label)}</span>
              <strong>
                {tx(value)}
                <small>{tx(unit)}</small>
              </strong>
              <div className="meter">
                <i style={{ width: `${Math.min(100, Number(value))}%` }} />
              </div>
            </div>
          )),
        )}
      </div>
      {r.lastInterval && <IntervalSummary report={r.lastInterval} />}
      {tx(
        r.breakdown && (
          <ScoreExplanation
            breakdown={r.breakdown}
            failed={r.grade === "Mission Failed"}
          />
        ),
      )}
      <div className="debrief-grid">
        <section className="debrief-panel">
          <h3>{t("Outcome assessment")}</h3>
          {tx(
            r.reasons.map((reason, i) => (
              <div className="reason" key={reason}>
                <span>
                  {tx(String(i + 1).padStart(2, "0"))}
                </span>
                <p>{tx(reason)}</p>
              </div>
            )),
          )}
          <div className="score-formula">
            {t(
              "Score = 40% success + 30% science (capped at 100) + 15% engineering + 15% budget efficiency. Failed missions are capped at 30 points.",
            )}
          </div>
        </section>
        <section className="debrief-panel">
          <h3>{t("Final spacecraft telemetry")}</h3>
          <div className="final-telemetry">
            {tx(
              [
                ["Total mission cost", `$${r.cost.toFixed(1)}M`],
                ["Final spacecraft mass", `${r.mass.toFixed(1)} kg`],
                ["Final power margin", `${Math.round(r.powerMargin)} W`],
                ["Design reliability", `${r.reliability.toFixed(1)}%`],
                ["Spacecraft health", `${r.health}%`],
                ["Anomalies survived", r.anomalies],
                [
                  "Objectives completed",
                  `${r.objectives.length}/${r.objectiveCount}`,
                ],
              ].map(([k, v]) => (
                <div key={k}>
                  <span>{tx(k)}</span>
                  <strong>{tx(v)}</strong>
                </div>
              )),
            )}
          </div>
          <div className="completed-objectives">
            {tx(
              r.objectives.map((o) => (
                <span key={o}>
                  <Check size={13} />
                  {tx(o)}
                </span>
              )),
            )}
          </div>
        </section>
      </div>
      {tx(r.telemetry && <TelemetryChart samples={r.telemetry} />)}
      {tx(r.decisions && <DecisionImpact decisions={r.decisions} />)}
      {tx(
        !saved && (
          <p className="launch-warning">
            {t(
              "Browser storage is unavailable. Download your report to keep this result.",
            )}
          </p>
        ),
      )}
      <div className="result-actions">
        <button className="secondary-button" onClick={() => downloadReport(r)}>
          <Download size={15} /> {t(" Download report")}
        </button>
        <button className="secondary-button" onClick={copy}>
          <Copy size={15} />
          {tx(copied ? "Summary copied" : "Copy mission summary")}
        </button>
        <button className="primary-button" onClick={onReturn} disabled={returnDisabled}>
          <RotateCcw size={15} /> {tx(returnLabel)}
        </button>
      </div>
      {tx(
        copyError && (
          <p className="launch-warning">
            {t(
              "Clipboard unavailable. Use Download report to share your results.",
            )}
          </p>
        ),
      )}
    </div>
  );
}
