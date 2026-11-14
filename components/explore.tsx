"use client";
import { ScienceNotebook } from "./science-notebook";
import { useI18n } from "./preferences";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Compass,
  Crosshair,
  Download,
  Lightbulb,
  Medal,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Wallet,
  X,
} from "lucide-react";
import { Design, glossary, scenarios } from "@/lib/data";
import { calculate, designForMission } from "@/lib/engineering";
import { Result } from "@/lib/simulation";
import { ResultView } from "./flight";
import { downloadReport } from "@/lib/storage";
export function Challenges({ onSelect }: { onSelect: (d: Design) => void }) {
  const { t, tx, localeTag } = useI18n();

  return (
    <div className="challenges-page">
      <div className="challenge-intro">
        <Crosshair size={32} />
        <div>
          <span className="eyebrow">
            {t("FIVE MISSIONS. INFINITE SOLUTIONS.")}
          </span>
          <h2>{t("Design briefs")}</h2>
          <p>
            {t(
              "Start with a flight-ready concept, then make it your own. Each challenge has a different definition of success.",
            )}
          </p>
        </div>
      </div>
      <div className="challenge-grid">
        {tx(
          scenarios.map((s, i) => (
            <button
              className="challenge-card"
              key={s.id}
              onClick={() => {
                const d = designForMission(s.mission, "guided");
                onSelect({ ...d, mode: "challenge", scenario: s.id });
              }}
            >
              <span className="challenge-number">
                {t("0")}
                {tx(i + 1)}
              </span>
              <div className="challenge-card-top">
                <span className="eyebrow">
                  {tx(s.mission.toUpperCase())} {t(" / CHALLENGE")}
                </span>
                <ArrowRight size={17} />
              </div>
              <h3>{tx(s.name)}</h3>
              <p>{tx(s.description)}</p>
              <div className="challenge-limits">
                <span>
                  <Wallet size={12} /> {t(" $")}
                  {tx(s.budget)}
                  {t("M")}
                </span>
                <span>
                  <Crosshair size={12} /> {tx(s.goal)}
                </span>
              </div>
              <span className="challenge-start">
                {t("Accept challenge ")}
                <ArrowRight size={13} />
              </span>
            </button>
          )),
        )}
      </div>
    </div>
  );
}
export function Records({
  records,
  onBuild,
}: {
  records: Result[];
  onBuild: () => void;
}) {
  const { t, tx, localeTag } = useI18n();

  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [sort, setSort] = useState("score");
  const [mode, setMode] = useState("all");
  const successful = records.filter((r) => r.grade !== "Mission Failed");
  const visible = records
    .filter((r) => mode === "all" || r.mode === mode)
    .sort((a, b) =>
      sort === "cost"
        ? a.cost - b.cost
        : sort === "science"
          ? b.science - a.science
          : sort === "reliability"
            ? b.reliability - a.reliability
            : b.score - a.score,
    );
  const high = records.length ? Math.max(...records.map((r) => r.score)) : 0;
  const sci = records.length ? Math.max(...records.map((r) => r.science)) : 0;
  const rel = records.length
    ? Math.max(...records.map((r) => r.reliability))
    : 0;
  const low = successful.length
    ? Math.min(...successful.map((r) => r.cost))
    : null;
  if (selectedResult)
    return (
      <ResultView
        result={selectedResult}
        onReturn={() => setSelectedResult(null)}
        returnLabel="Back to flight records"
      />
    );
  return (
    <div className="records-page">
      <div className="record-highlights">
        {tx(
          [
            ["Highest mission score", `${high}`, Trophy],
            [
              "Lowest successful cost",
              low === null ? "—" : `$${low.toFixed(1)}M`,
              Wallet,
            ],
            ["Highest science score", `${sci}`, Sparkles],
            ["Best design reliability", `${rel.toFixed(1)}%`, ShieldCheck],
          ].map(([label, value, Icon]) => {
            const I = Icon as typeof Trophy;
            return (
              <div key={String(label)}>
                <I size={20} />
                <span>{tx(String(label))}</span>
                <strong>{tx(String(value))}</strong>
              </div>
            );
          }),
        )}
      </div>
      <div className="records-heading">
        <div>
          <h2>{t("Flight records")}</h2>
          <p>
            {tx(records.length)}{" "}
            {t(" missions · stored on this device · latest 50 retained")}
          </p>
        </div>
        <p>{t("Scores from different model versions are not directly comparable.")}</p>
        <div className="record-filters">
          <select
            aria-label={t("Filter records by mode")}
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="all">{t("All modes")}</option>
            <option value="guided">{t("Guided")}</option>
            <option value="challenge">{t("Challenge")}</option>
            <option value="sandbox">{t("Sandbox")}</option>
          </select>
          <select
            aria-label={t("Sort flight records")}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="score">{t("Highest score")}</option>
            <option value="cost">{t("Lowest cost")}</option>
            <option value="science">{t("Most science")}</option>
            <option value="reliability">{t("Best reliability")}</option>
          </select>
        </div>
      </div>
      {tx(
        visible.length ? (
          <div className="records-table-wrap">
            <table className="records-table">
              <thead>
                <tr>
                  <th>{t("Rank / mission")}</th>
                  <th>{t("Grade")}</th>
                  <th>{t("Score")}</th>
                  <th>{t("Science")}</th>
                  <th>{t("Cost")}</th>
                  <th>{t("Reliability")}</th>
                  <th>{t("Report")}</th>
                </tr>
              </thead>
              <tbody>
                {tx(
                  visible.map((r, i) => (
                    <tr key={r.id}>
                      <td>
                        <div className="record-name">
                          <span>{tx(String(i + 1).padStart(2, "0"))}</span>
                          <div>
                            <button
                              className="record-report-button"
                              aria-label={t(`View report for ${r.name}`)}
                              onClick={() => setSelectedResult(r)}
                            >
                              <strong>{r.name}</strong>
                            </button>
                            <small>
                              {tx(r.mission)} {t(" · ")}
                              {tx(r.mode)} · {t("Scoring model")} v{r.scoringVersion ?? 1} {t(" ·")}
                              {tx(" ")}
                              {tx(
                                new Date(r.date).toLocaleDateString(localeTag),
                              )}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="record-grade">
                          {tx(r.grade === "Mission Failed" ? "F" : r.grade)}
                        </span>
                      </td>
                      <td>{tx(r.score)}</td>
                      <td>{tx(r.science)}</td>
                      <td>
                        {t("$")}
                        {tx(r.cost.toFixed(1))}
                        {t("M")}
                      </td>
                      <td>
                        {tx(r.reliability.toFixed(1))}
                        {t("%")}
                      </td>
                      <td>
                        <button
                          className="icon-btn"
                          title={t(`Download ${r.name} report`)}
                          onClick={() => downloadReport(r)}
                        >
                          <Download size={16} />
                        </button>
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-orbit">
              <Trophy size={38} strokeWidth={1.2} />
            </div>
            <span className="eyebrow">{t("YOUR NEXT GREAT ACHIEVEMENT")}</span>
            <h3>
              {tx(
                records.length
                  ? "No flights in this mode yet."
                  : "Every explorer starts somewhere.",
              )}
            </h3>
            <p>
              {t(
                "Complete a mission to see your engineering achievements here.",
              )}
            </p>
            <button className="primary-button" onClick={onBuild}>
              {t("Design a mission ")}
              <ArrowRight size={15} />
            </button>
          </div>
        ),
      )}
    </div>
  );
}
export function Academy() {
  const { t, tx, localeTag } = useI18n();

  const [query, setQuery] = useState("");
  return (
    <div className="academy-page">
      <div className="academy-intro">
        <BookOpen size={32} />
        <div>
          <span className="eyebrow">{t("THE EXPLORER’S FIELD GUIDE")}</span>
          <h2>{t("Spaceflight fundamentals")}</h2>
          <p>
            {t(
              "The ideas behind every great mission, explained in plain language.",
            )}
          </p>
        </div>
      </div>
      <ScienceNotebook />
      <label className="search-field">
        <Search size={17} />
        <input
          placeholder={t("Search a concept…")}
          aria-label={t("Search engineering concepts")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="glossary-grid">
        {tx(
          Object.entries(glossary)
            .filter(([term, meaning]) =>
              `${t(term)} ${t(meaning)} ${term}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map(([term, meaning], i) => (
              <article className="glossary-card" key={term}>
                <span className="eyebrow">
                  {t("FIELD NOTE ")}
                  {tx(String(i + 1).padStart(2, "0"))}
                </span>
                <h3>{tx(term)}</h3>
                <p>{tx(meaning)}</p>
              </article>
            )),
        )}
      </div>
      {tx(
        !Object.entries(glossary).some(([t, m]) =>
          `${t} ${m}`.toLowerCase().includes(query.toLowerCase()),
        ) && (
          <p className="no-matches">
            {t("No matching concepts. Try “power”, “orbit”, or “fuel”.")}
          </p>
        ),
      )}
      <div className="model-note">
        <Lightbulb size={20} />
        <div>
          <strong>{t("A teaching model, grounded in engineering.")}</strong>
          <p>
            {t(
              "Mission Architect uses simplified calculations to make trade-offs visible. Solar flux, the rocket equation, link quality, and reliability are approximate models. Launch vehicles and component specifications are fictional. They are not suitable for planning a real spaceflight.",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
export function Advisor({
  design,
  onClose,
}: {
  design: Design;
  onClose: () => void;
}) {
  const { t, tx, localeTag } = useI18n();

  const m = calculate(design);
  return (
    <aside className="advisor-popover" aria-label={t("Mission advisor")}>
      <div className="sub-heading">
        <h3>
          <Sparkles size={15} /> {t(" Mission advisor")}
        </h3>
        <button
          className="icon-btn"
          onClick={onClose}
          aria-label={t("Close advisor")}
        >
          <X size={16} />
        </button>
      </div>
      <span className="advisor-label">
        {t("LOCAL ENGINEERING ASSISTANT · RULE-BASED")}
      </span>
      <p>
        {tx(
          m.issues.length
            ? `I found ${m.issues.length} things to improve before launch.`
            : "Your mission is cleared for launch. Here are a few ways to refine it.",
        )}
      </p>
      {tx(
        m.issues.length ? (
          m.issues.map((i) => (
            <div className="advisor-advice" key={i.label}>
              <strong>{tx(i.label)}</strong>
              <p>{tx(i.fix)}</p>
            </div>
          ))
        ) : (
          <>
            <div className="advisor-advice">
              <strong>{t("Keep fuel for the unexpected.")}</strong>
              <p>
                {t("Your trajectory leaves ")}
                {tx((design.fuel - m.fuelNeeded).toFixed(1))}
                {tx(" ")}
                {t(
                  "kg for anomaly responses. A little reserve can protect valuable science.",
                )}
              </p>
            </div>
            <div className="advisor-advice">
              <strong>{t("Protect your science.")}</strong>
              <p>
                {tx(
                  m.reliability < 95
                    ? "A redundant computer and active thermal control can improve resilience."
                    : "Your design reliability is strong. Avoid overloading the spacecraft just to chase more science.",
                )}
              </p>
            </div>
          </>
        ),
      )}
    </aside>
  );
}
