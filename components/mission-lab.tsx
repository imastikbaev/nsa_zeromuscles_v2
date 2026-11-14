"use client";
import { useI18n } from "./preferences";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Download,
  FlaskConical,
  Orbit,
  Rocket,
  Save,
  TriangleAlert,
} from "lucide-react";
import { Design } from "@/lib/data";
import { calculate } from "@/lib/engineering";
import { configurationKey } from "@/lib/design-identity";
import { compareDesigns } from "@/lib/projects";
import { Result } from "@/lib/simulation";
import { DecisionImpact } from "./decision-impact";
import {
  climateBrief,
  climateStarter,
  LearningSession,
  newLearningSession,
  readLearningSession,
  saveLearningSession,
  captureConcept,
  evaluateLearning,
  briefIssues,
  downloadLearningReport,
} from "@/lib/learning";

export function MissionLab({
  design,
  records,
  onLoad,
  onEdit,
}: {
  design: Design;
  records: Result[];
  onLoad: (d: Design) => boolean;
  onEdit: (step: number, analysis?: boolean) => void;
}) {
  const { t, tx, localeTag } = useI18n();

  const [session, setSession] = useState<LearningSession | null>(null);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    setSession(readLearningSession());
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready && session) setSaved(saveLearningSession(session));
  }, [session, ready]);
  const tell = (text: string, bad = false) => {
    setMessage(text);
    setError(bad);
  };
  const begin = () => {
    const next = newLearningSession(design);
    if (!saveLearningSession(next)) {
      setSaved(false);
      tell(
        "Device storage is unavailable. Export your current design before starting the activity.",
        true,
      );
      return;
    }
    setSession(next);
    if (onLoad(climateStarter()))
      tell(
        "Climate Watch started. The starter array is deliberately undersized: inspect the power budget, then repair it.",
      );
    else
      tell(
        "Your activity is saved, but the working design could not be switched. Free a library slot, then open the starter below.",
        true,
      );
  };
  const evidence = session ? evaluateLearning(session, records) : null;
  const m = calculate(design),
    outside = briefIssues(design);
  const record = (slot: "a" | "b") => {
    if (!session) return;
    try {
      setSession(captureConcept(session, slot, design));
      tell(
        `Concept ${slot.toUpperCase()} recorded. Review the comparison before choosing a design.`,
      );
    } catch (e) {
      tell((e as Error).message, true);
    }
  };
  const chosenMatches =
    !!evidence?.chosen &&
    configurationKey(evidence.chosen.design) === configurationKey(design);
  return (
    <div className="mission-lab">
      <section className="lab-hero">
        <div className="lab-hero-copy">
          <span className="eyebrow">
            <FlaskConical size={14} /> {t(" GUIDED MISSION / 01")}
          </span>
          <h2>{t("Climate Watch")}</h2>
          <p>{tx(climateBrief.story)}</p>
          <div className="lab-tags">
            <span>{tx(climateBrief.duration)}</span>
            <span>{t("Solo or small team")}</span>
            <span>{t("No prior experience")}</span>
          </div>
          {tx(
            !session && (
              <button
                className="primary-button"
                disabled={!ready}
                onClick={begin}
              >
                {t("Start the mission ")}
                <ArrowRight size={16} />
              </button>
            ),
          )}
        </div>
        <div className="lab-brief-card">
          <div className="lab-orbit-art" aria-hidden="true">
            <i />
            <span />
            <Orbit size={115} strokeWidth={0.7} />
          </div>
          <span className="eyebrow">{t("MISSION CONTRACT")}</span>
          <dl>
            <div>
              <dt>{t("Science")}</dt>
              <dd>{t("Images + surface temperature")}</dd>
            </div>
            <div>
              <dt>{t("Destination")}</dt>
              <dd>{t("Earth · Sun-synchronous orbit")}</dd>
            </div>
            <div>
              <dt>{t("Budget / launch mass")}</dt>
              <dd>{t("$180M / 850 kg maximum")}</dd>
            </div>
            <div>
              <dt>{t("Engineering reserves")}</dt>
              <dd>{t("10% mass · 20% power")}</dd>
            </div>
            <div>
              <dt>{t("Solar aging assumption")}</dt>
              <dd>{t("2% per year minimum")}</dd>
            </div>
          </dl>
        </div>
      </section>
      {!session ? (
        <>
          <section className="lab-story">
            <h3>{t("The question you will answer")}</h3>
            <p>
              {t(
                "Is extra image detail worth a heavier, more expensive spacecraft? Build two viable concepts, choose one, and use the flight results to defend or revise your decision.",
              )}
            </p>
            <div className="lab-learning-grid">
              {tx(
                [
                  ["01", "Build", "Repair an underpowered starting design."],
                  ["02", "Compare", "Measure the cost of better science."],
                  ["03", "Test", "Fly your choice and respond to anomalies."],
                  ["04", "Explain", "Use evidence to justify the trade-off."],
                ].map(([n, title, text]) => (
                  <article key={n}>
                    <span>{tx(n)}</span>
                    <h4>{tx(title)}</h4>
                    <p>{tx(text)}</p>
                  </article>
                )),
              )}
            </div>
            <p className="lab-small-print">
              {t(
                "Starting preserves your current work in the mission library. This activity uses fictional equipment and modeled science scores; it does not collect real climate observations.",
              )}
            </p>
          </section>
          <TeacherGuide />
        </>
      ) : (
        <>
          <div className="lab-status-line">
            <span className={saved ? "text-green" : "text-danger"}>
              {tx(saved ? <Check size={14} /> : <TriangleAlert size={14} />)}
              {tx(" ")}
              {tx(
                saved
                  ? "Activity saved on this device"
                  : "Activity autosave unavailable — download your report before leaving",
              )}
            </span>
            <button
              className="secondary-button"
              onClick={() => downloadLearningReport(session, records)}
            >
              <Download size={14} /> {t(" Learning report")}
            </button>
          </div>
          {tx(
            message && (
              <div
                className={`lab-message ${error ? "text-danger" : ""}`}
                role="status"
              >
                {tx(message)}
              </div>
            ),
          )}
          <section className="lab-progress" aria-label={t("Learning progress")}>
            <div>
              <span className="eyebrow">
                {t("EVIDENCE, NOT JUST CHECKBOXES")}
              </span>
              <h3>
                {tx(
                  evidence!.complete
                    ? "Activity complete. Ready to discuss."
                    : `${evidence!.count} of 5 learning checkpoints`,
                )}
              </h3>
              <p>
                {t(
                  "Written responses are saved for discussion, not automatically graded.",
                )}
              </p>
            </div>
            <div className="lab-checkpoints">
              {tx(
                evidence!.checkpoints.map((c, i) => (
                  <div key={c.id} className={c.done ? "done" : ""}>
                    {tx(
                      c.done ? (
                        <CheckCircle2 size={19} />
                      ) : (
                        <span>{tx(i + 1)}</span>
                      ),
                    )}
                    <div>
                      <strong>{tx(c.name)}</strong>
                      <small>{tx(c.detail)}</small>
                    </div>
                  </div>
                )),
              )}
            </div>
          </section>
          <section className="lab-workbench">
            <div className="sub-heading">
              <div>
                <span className="eyebrow">{t("01 / BUILD & COMPARE")}</span>
                <h3>{t("Make two ideas measurable.")}</h3>
              </div>
              <button className="secondary-button" onClick={() => onEdit(1)}>
                {t("Open spacecraft ")}
                <ArrowRight size={14} />
              </button>
            </div>
            <div className="lab-current">
              <SatelliteStatus
                good={outside.length === 0 && m.issues.length === 0}
              />
              <div>
                <strong>
                  {t("Current workspace: ")}
                  {design.name}
                </strong>
                <p>
                  {t("$")}
                  {tx(m.cost.toFixed(1))}
                  {t("M · ")}
                  {tx(m.mass.toFixed(1))} {t(" kg ·")}
                  {tx(" ")}
                  {tx(m.science.toFixed(1))} {t(" potential science ·")}
                  {tx(" ")}
                  {tx(m.designPowerMargin.toFixed(0))} {t(" W after reserve")}
                </p>
              </div>
              <button
                className="secondary-button"
                onClick={() => onEdit(1, true)}
              >
                {t("Inspect calculations")}
              </button>
            </div>
            {tx(
              (outside.length > 0 || m.issues.length > 0) && (
                <div className="lab-open-checks">
                  <strong>{t("Before this concept can be recorded")}</strong>
                  <ul>
                    {tx(outside.map((t) => <li key={t}>{tx(t)}</li>))}
                    {tx(
                      m.issues.map((i) => (
                        <li key={i.label}>
                          {tx(i.label)} {t(" — ")}
                          {tx(i.fix)}
                        </li>
                      )),
                    )}
                  </ul>
                  {tx(
                    outside.length > 0 && (
                      <button
                        className="secondary-button"
                        onClick={() => {
                          if (onLoad(climateStarter()))
                            tell(
                              "Starter opened. Repair its power deficit before recording Concept A.",
                            );
                          else
                            tell(
                              "Could not preserve the current workspace. Free a slot in the mission library and retry.",
                              true,
                            );
                        }}
                      >
                        {t("Open Climate Watch starter")}
                      </button>
                    ),
                  )}
                </div>
              ),
            )}
            <details className="lab-hint">
              <summary>{t("Need a starting point?")}</summary>
              <p>
                {t(
                  "The optical camera supports imaging; the thermal radiometer supports climate measurements. The starter has only 1 m² of solar array. Try 6 m² and inspect how mass, cost, and end-of-life power change. Record that as Concept A. For B, replace the optical camera with a high-resolution camera, then resolve any new limits. Other solutions are welcome.",
                )}
              </p>
            </details>
            <div className="lab-concepts">
              {tx(
                (["a", "b"] as const).map((slot) => {
                  const snapshot = session[slot];
                  const metrics = snapshot ? calculate(snapshot.design) : null;
                  return (
                    <article
                      key={slot}
                      className={session.selected === slot ? "selected" : ""}
                    >
                      <div className="lab-concept-heading">
                        <span>
                          {t("CONCEPT ")}
                          {tx(slot.toUpperCase())}
                        </span>
                        {tx(
                          session.selected === slot && (
                            <span>
                              <Check size={13} /> {t(" Selected for flight")}
                            </span>
                          ),
                        )}
                      </div>
                      <h4>
                        {tx(snapshot?.design.name ?? "No concept recorded")}
                      </h4>
                      {tx(
                        metrics ? (
                          <>
                            <dl>
                              <div>
                                <dt>{t("Total cost")}</dt>
                                <dd>
                                  {t("$")}
                                  {tx(metrics.cost.toFixed(1))}
                                  {t("M")}
                                </dd>
                              </div>
                              <div>
                                <dt>{t("Wet mass")}</dt>
                                <dd>
                                  {tx(metrics.mass.toFixed(1))} {t(" kg")}
                                </dd>
                              </div>
                              <div>
                                <dt>{t("Potential science")}</dt>
                                <dd>
                                  {tx(metrics.science.toFixed(1))} {t(" pts")}
                                </dd>
                              </div>
                              <div>
                                <dt>{t("Power after reserve")}</dt>
                                <dd>
                                  {tx(metrics.designPowerMargin.toFixed(0))}{" "}
                                  {t(" W")}
                                </dd>
                              </div>
                            </dl>
                            <p className="lab-payload">
                              {tx(
                                metrics.payload.map((p) => p.name).join(" + "),
                              )}
                            </p>
                          </>
                        ) : (
                          <p>
                            {t(
                              "Record the current working design after it meets the mission contract and all launch checks.",
                            )}
                          </p>
                        ),
                      )}
                      <div className="lab-concept-actions">
                        <button
                          className="secondary-button"
                          onClick={() => record(slot)}
                        >
                          <Save size={13} />
                          {tx(snapshot ? "Update" : "Record")} {t(" Concept")}
                          {tx(" ")}
                          {tx(slot.toUpperCase())}
                        </button>
                        {tx(
                          snapshot && (
                            <button
                              className="secondary-button"
                              onClick={() => {
                                if (onLoad(snapshot.design))
                                  tell(
                                    `Concept ${slot.toUpperCase()} opened in the workspace.`,
                                  );
                                else
                                  tell(
                                    "Could not preserve your current work. Free a library slot before opening this concept.",
                                    true,
                                  );
                              }}
                            >
                              {t("Open ")}
                              {tx(slot.toUpperCase())}
                            </button>
                          ),
                        )}
                      </div>
                    </article>
                  );
                }),
              )}
            </div>
            {tx(
              session.a && session.b && (
                <div className="lab-comparison">
                  <h4>{t("What changed from A to B?")}</h4>
                  <div className="comparison-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>{t("Metric")}</th>
                          <th>{t("A")}</th>
                          <th>{t("B")}</th>
                          <th>{t("B − A")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tx(
                          compareDesigns(
                            session.a.design,
                            session.b.design,
                          ).map((r) => (
                            <tr key={r.label}>
                              <th>
                                {tx(r.label)}
                                <small>{tx(r.unit)}</small>
                              </th>
                              <td>{tx(r.current.toFixed(r.digits))}</td>
                              <td>{tx(r.candidate.toFixed(r.digits))}</td>
                              <td>
                                {tx(
                                  Math.abs(r.delta) < 0.5 * 10 ** -r.digits
                                    ? "—"
                                    : `${r.delta > 0 ? "+" : ""}${r.delta.toFixed(r.digits)}`,
                                )}
                              </td>
                            </tr>
                          )),
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p>
                    {t(
                      "More science can require more mass, money, power, and downlink capacity. There is no single winning design.",
                    )}
                  </p>
                </div>
              ),
            )}
          </section>
          <section className="lab-defense">
            <span className="eyebrow">{t("02 / CHOOSE & EXPLAIN")}</span>
            <h3>{t("Which design earns its place on the rocket?")}</h3>
            <div className="lab-choice">
              {(["a", "b"] as const).map((slot) => (
                <button
                  className="secondary-button"
                  key={slot}
                  disabled={!evidence!.compared}
                  aria-pressed={session.selected === slot}
                  onClick={() => {
                    const snapshot = session[slot]!;
                    if (!onLoad(snapshot.design)) {
                      tell(
                        "Free a library slot so the current design can be backed up before switching.",
                        true,
                      );
                      return;
                    }
                    setSession({
                      ...session,
                      selected: slot,
                      notes: {
                        ...session.notes,
                        reflection:
                          session.selected === slot
                            ? session.notes.reflection
                            : "",
                      },
                    });
                    tell(
                      `Concept ${slot.toUpperCase()} selected and loaded. Explain your choice before the flight.`,
                    );
                  }}
                >
                  {t("Choose Concept ")}
                  {tx(slot.toUpperCase())}
                  {tx(session.selected === slot && <Check size={14} />)}
                </button>
              ))}
            </div>
            {tx(
              !evidence!.compared && (
                <p>
                  {t(
                    "Record two different viable concepts to choose between them.",
                  )}
                </p>
              ),
            )}
            {tx(
              climateBrief.questions.slice(0, 2).map((q) => (
                <label className="lab-note" key={q.id}>
                  {tx(q.label)}
                  <small>{tx(q.prompt)}</small>
                  <textarea
                    maxLength={1500}
                    rows={3}
                    value={session.notes[q.id]}
                    onChange={(e) =>
                      setSession({
                        ...session,
                        notes: { ...session.notes, [q.id]: e.target.value },
                      })
                    }
                  />
                  <span>
                    {tx(session.notes[q.id].length)}
                    {t("/1500 · saved for human review")}
                  </span>
                </label>
              )),
            )}
          </section>
          <section className="lab-flight">
            <span className="eyebrow">{t("03 / TEST & REFLECT")}</span>
            <h3>{t("Let the mission challenge your assumptions.")}</h3>
            {tx(
              evidence!.result ? (
                <>
                  <div className="lab-flight-evidence">
                    <CheckCircle2 size={22} />
                    <div>
                      <strong>
                        {t("Matching flight recorded · ")}
                        {tx(evidence!.result.grade)}
                      </strong>
                      <p>
                        {tx(evidence!.result.science)} {t(" science points ·")}
                        {tx(" ")}
                        {tx(evidence!.result.health)}
                        {t("% health ·")}
                        {tx(" ")}
                        {tx(evidence!.result.anomalies)}{" "}
                        {t(" anomalies survived")}
                      </p>
                    </div>
                  </div>
                  {tx(
                    evidence!.result.decisions && (
                      <DecisionImpact decisions={evidence!.result.decisions} />
                    ),
                  )}
                </>
              ) : (
                <>
                  <p>
                    {t(
                      "Complete a flight after recording your selected concept. Its engineering configuration must match; renaming the mission is fine. A failed flight still counts as an experiment.",
                    )}
                  </p>
                  {tx(
                    evidence!.chosen && !chosenMatches && (
                      <p className="text-amber">
                        {t(
                          "The workspace has changed since your selection. Open the selected concept before launching, or record the revised design and choose again.",
                        )}
                      </p>
                    ),
                  )}
                  <button
                    className="primary-button"
                    disabled={!evidence!.checkpoints[2].done}
                    onClick={() => {
                      if (!chosenMatches && !onLoad(evidence!.chosen!.design)) {
                        tell(
                          "Could not back up your workspace. Free a library slot before loading the chosen concept.",
                          true,
                        );
                        return;
                      }
                      onEdit(3);
                    }}
                  >
                    <Rocket size={16} />{" "}
                    {t(" Prepare selected concept for launch")}
                  </button>
                </>
              ),
            )}
            <label className="lab-note">
              {tx(climateBrief.questions[2].label)}
              <small>{tx(climateBrief.questions[2].prompt)}</small>
              <textarea
                maxLength={1500}
                rows={4}
                disabled={!evidence!.result}
                placeholder={t(
                  evidence!.result
                    ? "What did the flight teach you?"
                    : "Complete a matching flight to unlock reflection.",
                )}
                value={session.notes.reflection}
                onChange={(e) =>
                  setSession({
                    ...session,
                    notes: { ...session.notes, reflection: e.target.value },
                    reflectionFor: evidence!.result?.id ?? null,
                  })
                }
              />
              {evidence!.result &&
                session.notes.reflection.trim() &&
                session.reflectionFor !== evidence!.result.id && (
                  <small className="text-amber">
                    {t(
                      "A newer matching flight is available. Update your reflection using this flight’s evidence.",
                    )}
                  </small>
                )}
              <span>
                {session.notes.reflection.length}
                {t("/1500 · saved for human review")}
              </span>
            </label>
            {tx(
              evidence!.complete && (
                <div className="lab-complete">
                  <CheckCircle2 size={30} />
                  <div>
                    <h3>{t("Design investigation complete.")}</h3>
                    <p>
                      {t(
                        "Two designs, a justified choice, and a tested outcome. Download the evidence and discuss what you would change next.",
                      )}
                    </p>
                  </div>
                </div>
              ),
            )}
          </section>
          <TeacherGuide />
          <div className="lab-footer">
            <button
              className="secondary-button"
              onClick={() => {
                if (onLoad(session.original))
                  tell(
                    "Original workspace restored. Your activity and recorded concepts remain saved here.",
                  );
                else
                  tell(
                    "Could not preserve the current work. Free a library slot and retry.",
                    true,
                  );
              }}
            >
              <ArrowLeft size={14} /> {t(" Restore pre-activity workspace")}
            </button>
            <button
              className="primary-button"
              onClick={() => downloadLearningReport(session, records)}
            >
              <Download size={15} /> {t(" Download learning report")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
function SatelliteStatus({ good }: { good: boolean }) {
  const { t, tx, localeTag } = useI18n();

  return good ? <CheckCircle2 size={22} /> : <TriangleAlert size={22} />;
}
function TeacherGuide() {
  const { t, tx, localeTag } = useI18n();

  return (
    <details className="lab-teacher">
      <summary>
        <BookOpen size={16} /> {t(" Facilitator notes & discussion rubric")}
      </summary>
      <p>
        {t(
          "Suggested session: 5 minutes to understand the brief, 10 minutes to design and compare, 5 minutes to fly, and 5 minutes to discuss. Teams can exchange exported learning reports; live collaboration is not included.",
        )}
      </p>
      <ul>
        <li>
          <strong>{t("Evidence:")}</strong>{" "}
          {t(
            " Does the explanation cite an actual cost, mass, power, or science difference?",
          )}
        </li>
        <li>
          <strong>{t("Reasoning:")}</strong>{" "}
          {t(" Does that difference connect to the mission objective?")}
        </li>
        <li>
          <strong>{t("Trade-off:")}</strong>{" "}
          {t(" Is a disadvantage acknowledged?")}
        </li>
        <li>
          <strong>{t("Reflection:")}</strong>{" "}
          {t(
            " Does the proposed improvement follow from a recorded flight event?",
          )}
        </li>
      </ul>
      <p>
        {t(
          "A flight grade measures the simulation outcome. Learning checkpoints record work completed; they do not assess the quality of prose or guarantee mastery. All catalog specifications and climate outcomes are simplified educational models.",
        )}
      </p>
    </details>
  );
}
