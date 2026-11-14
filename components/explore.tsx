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
import Link from "next/link";
import { Check } from "lucide-react";
import {
  Design,
  glossary,
  missions,
  orbits,
  scenarios,
  type MissionId,
} from "@/lib/data";
import { calculate, designForMission } from "@/lib/engineering";
import { Result } from "@/lib/simulation";
import { ResultView } from "./flight";
import { downloadReport } from "@/lib/storage";
import "./expedition.css";

export function Challenges({ onSelect }: { onSelect: (d: Design) => void }) {
  const { t, locale } = useI18n();
  const c = (ru: string, en: string, kk: string) =>
    locale === "ru" ? ru : locale === "kk" ? kk : en;

  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    "budget",
  );
  const [selectedMission, setSelectedMission] = useState<MissionId>("earth");
  const [selectedOrbit, setSelectedOrbit] = useState<string>("sso");

  function handleSelectScenario(scId: string | null) {
    setSelectedScenarioId(scId);
    if (scId) {
      const sc = scenarios.find((s) => s.id === scId);
      if (sc) {
        setSelectedMission(sc.mission);
        const mMeta = missions.find((m) => m.id === sc.mission)!;
        setSelectedOrbit(mMeta.orbit);
      }
    }
  }

  function handleSelectPlanet(mId: MissionId) {
    setSelectedMission(mId);
    const mMeta = missions.find((m) => m.id === mId)!;
    setSelectedOrbit(mMeta.orbit);
    if (selectedScenarioId) {
      const sc = scenarios.find((s) => s.id === selectedScenarioId);
      if (sc && sc.mission !== mId) {
        const matching = scenarios.find((s) => s.mission === mId);
        setSelectedScenarioId(matching ? matching.id : null);
      }
    }
  }

  const baseDesign = designForMission(selectedMission, "challenge");
  const validScenario =
    selectedScenarioId &&
    scenarios.some(
      (s) => s.id === selectedScenarioId && s.mission === selectedMission,
    )
      ? selectedScenarioId
      : null;
  const previewDesign: Design = {
    ...baseDesign,
    mode: "challenge",
    scenario: validScenario,
    orbit: selectedOrbit,
  };
  const m = calculate(previewDesign);
  const activeSc = scenarios.find((s) => s.id === validScenario);
  const availableOrbits = orbits.filter((o) =>
    o.destinations.includes(selectedMission),
  );

  const tutorialHref = `/learn/?mode=challenge${validScenario ? `&scenario=${encodeURIComponent(validScenario)}` : ""}&mission=${encodeURIComponent(selectedMission)}&orbit=${encodeURIComponent(selectedOrbit)}`;

  return (
    <div className="challenges-page">
      <div className="exp-lesson" style={{ paddingTop: 12 }}>
        <section className="exp-lesson-body">
          <h2>
            {c(
              "Выбери испытание, планету и орбиту",
              "Choose your challenge, planet, and orbit",
              "Сынақты, планетаны және орбитаны таңда",
            )}
          </h2>
          <p className="exp-lead">
            {c(
              "Выбери одно из 5 инженерных испытаний или включи режим Challenge для любой из 6 планет Солнечной системы. Ты можешь менять планету и орбиту прямо здесь, а затем собрать спутник в удобном пошаговом меню тутора или в полном симуляторе.",
              "Pick one of the 5 engineering challenge briefs or run Challenge Mode on any of the 6 Solar System destinations. Switch planets and orbits freely, then build in the guided tutorial menu or the full workspace.",
              "5 инженерлік сынақтың бірін таңда немесе кез келген 6 планетада Challenge режимін іске қос.",
            )}
          </p>

          <div
            className="exp-subblock"
            style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}
          >
            <h3>
              {c(
                "1. Выбери испытание (Challenge Brief)",
                "1. Select Challenge Brief",
                "1. Сынақты таңда (Challenge Brief)",
              )}
            </h3>
            <div className="exp-camera-options exp-compact-grid">
              <button
                type="button"
                aria-pressed={selectedScenarioId === null}
                onClick={() => handleSelectScenario(null)}
              >
                <span className="exp-option-title">
                  {c(
                    "Свободный Challenge на любой планете",
                    "Custom Planetary Challenge (Any Planet)",
                    "Кез келген планетадағы еркін Challenge",
                  )}
                  {selectedScenarioId === null && <Check size={18} />}
                </span>
                <span>
                  {c(
                    "Ужесточённые лимиты бюджета (−18%), массы (−5%) и манёвров (+15% Δv) на любой выбранной планете",
                    "Tightened budget (−18%), mass (−5%), and maneuver (+15% Δv) limits on any planet you pick below",
                    "Кез келген планетада қатаңдатылған бюджет (−18%), масса (−5%) және Δv (+15%) шектеулері",
                  )}
                </span>
                <strong>
                  {c("Любая планета", "Any planet", "Кез келген планета")}{" "}
                  <span>·</span> {c("Бюджет −18%", "Budget −18%", "Бюджет −18%")}{" "}
                  <span>·</span> Δv +15%
                </strong>
              </button>

              {scenarios.map((s, idx) => {
                const isSelected = selectedScenarioId === s.id;
                const scPlanet = missions.find((mi) => mi.id === s.mission)!;
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleSelectScenario(s.id)}
                  >
                    <span className="exp-option-title">
                      0{idx + 1} · {t(s.name)}
                      {isSelected && <Check size={18} />}
                    </span>
                    <span>{t(s.description)}</span>
                    <strong>
                      {t(scPlanet.name)} <span>·</span> ${s.budget}M{" "}
                      {Number.isFinite(s.mass) ? `· ≤${s.mass} kg ` : ""}
                      <span>·</span> {t(s.goal)}
                    </strong>
                    <div className="exp-consequence">
                      {s.id === "budget"
                        ? c(
                            "Последствия: потолок бюджета $140M требует лёгких приборов и ракеты Swift 1.",
                            "Consequences: $140M cap favors lightweight instruments and the Swift 1 launcher.",
                            "Салдары: $140M шегі жеңіл аспаптар мен Swift 1 зымыранын талап етеді.",
                          )
                        : s.id === "mars500"
                          ? c(
                              "Последствия: для ≥100 науки на Марсе нужны высокоточные камеры/спектрометр и мощный радиоканал.",
                              "Consequences: earning ≥100 science at Mars requires high-yield sensors and strong downlink.",
                              "Салдары: Марста ≥100 ғылым жинау үшін қуатты аспаптар мен байланыс қажет.",
                            )
                          : s.id === "lightmoon"
                            ? c(
                                "Последствия: лимит массы 1500 кг и закрытие всех 3 целей Луны требуют ионного или гибридного двигателя.",
                                "Consequences: 1,500 kg cap and all 3 lunar objectives require hybrid or ion propulsion.",
                                "Салдары: 1500 кг масса шегі гибридті немесе иондық қозғалтқышты қажет етеді.",
                              )
                            : s.id === "voyager"
                              ? c(
                                  "Последствия: для сохранения ≥70% здоровья в дальнем космосе нужны РИТЭГ, резервный компьютер и щит.",
                                  "Consequences: finishing ≥70% health in deep space demands RTG, redundant computer, and shielding.",
                                  "Салдары: терең ғарышта ≥70% денсаулық сақтау үшін РИТЭГ пен қалқан қажет.",
                                )
                              : c(
                                  "Последствия: для ≥95% надёжности избегай громоздких панелей (>10 м²) и выбирай надёжные подсистемы.",
                                  "Consequences: reaching ≥95% reliability requires compact arrays (≤10 m²) and high-reliability parts.",
                                  "Салдары: ≥95% сенімділік үшін ықшам панельдер мен сенімді жүйелер қажет.",
                                )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="exp-subblock">
            <h3>
              {c(
                "2. Планета / Небесное тело назначения",
                "2. Target Planet / Destination",
                "2. Мақсатты планета / Аспан денесі",
              )}
            </h3>
            <div className="exp-camera-options exp-compact-grid">
              {missions.map((mi) => {
                const miOrbit = orbits.find((o) => o.id === mi.orbit)!;
                const active = selectedMission === mi.id;
                return (
                  <button
                    key={mi.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleSelectPlanet(mi.id)}
                  >
                    <span className="exp-option-title">
                      {t(mi.name)}
                      {active && <Check size={18} />}
                    </span>
                    <span>{t(mi.description)}</span>
                    <strong>
                      ${mi.budget}M <span>·</span> {mi.duration}{" "}
                      {c("мес.", "mo", "ай")} <span>·</span>{" "}
                      {Math.round(miOrbit.sun * 100)}%{" "}
                      {c("солнца", "sunlight", "күн")} <span>·</span> Δv{" "}
                      {miOrbit.deltaV} m/s
                    </strong>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="exp-subblock">
            <h3>
              {c(
                "3. Рабочая орбита",
                "3. Operating Orbit",
                "3. Жұмыс орбитасы",
              )}
            </h3>
            <div className="exp-camera-options exp-compact-grid">
              {availableOrbits.map((orb) => (
                <button
                  key={orb.id}
                  type="button"
                  aria-pressed={selectedOrbit === orb.id}
                  onClick={() => setSelectedOrbit(orb.id)}
                >
                  <span className="exp-option-title">
                    {t(orb.name)} ({orb.short} · {orb.altitude})
                    {selectedOrbit === orb.id && <Check size={18} />}
                  </span>
                  <span>{t(orb.description)}</span>
                  <strong>
                    Δv {orb.deltaV} m/s <span>·</span> ×{orb.science}{" "}
                    {c("наука", "science", "ғылым")} <span>·</span>{" "}
                    {c("дистанция", "distance", "қашықтық")} ×{orb.distance}
                  </strong>
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="exp-lesson-visual">
          <div className="exp-live-budget" aria-live="polite">
            <h2>
              {c(
                "Параметры испытания",
                "Challenge Parameters",
                "Сынақ параметрлері",
              )}
            </h2>
            <dl>
              <div>
                <dt>{c("Выбранная планета", "Target planet", "Планета")}</dt>
                <dd>
                  {t(m.mission.name)} <small>· {m.orbit.short}</small>
                </dd>
              </div>
              <div>
                <dt>{c("Условие победы", "Victory goal", "Жеңіс шарты")}</dt>
                <dd>
                  {activeSc
                    ? t(activeSc.goal)
                    : c(
                        "Успешный полёт в режиме Challenge",
                        "Complete flight under Challenge limits",
                        "Challenge режимінде сәтті ұшу",
                      )}
                </dd>
              </div>
              <div>
                <dt>{c("Лимит бюджета", "Budget cap", "Бюджет шегі")}</dt>
                <dd>${Math.round(m.budget)}M</dd>
              </div>
              <div>
                <dt>{c("Лимит массы", "Mass limit", "Масса шегі")}</dt>
                <dd>{Math.round(m.massLimit)} kg</dd>
              </div>
              <div>
                <dt>{c("Требуемый Δv", "Required Δv", "Қажетті Δv")}</dt>
                <dd>{Math.round(m.requiredDeltaV)} m/s</dd>
              </div>
              <div>
                <dt>
                  {c(
                    "Солнце и дистанция",
                    "Sunlight & distance",
                    "Күн және қашықтық",
                  )}
                </dt>
                <dd>
                  {Math.round(m.orbit.sun * 100)}% <small>· ×{m.orbit.distance}</small>
                </dd>
              </div>
            </dl>
            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              <Link className="exp-primary" href={tutorialHref}>
                {c(
                  "Собрать в пошаговом меню (как в туторе)",
                  "Build in step-by-step tutorial menu",
                  "Қадамдық мәзірде құрастыру",
                )}
                <ArrowRight size={18} />
              </Link>
              <button
                type="button"
                className="secondary-button"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => onSelect(previewDesign)}
              >
                {c(
                  "Открыть в инженерном конструкторе",
                  "Open in full engineering workspace",
                  "Инженерлік конструкторда ашу",
                )}
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
export function Records({
  records,
  onBuild,
  onDelete,
}: {
  records: Result[];
  onBuild: () => void;
  onDelete: (id: string) => boolean;
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
        onDelete={() => {
          if (!onDelete(selectedResult.id)) return false;
          setSelectedResult(null);
          return true;
        }}
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
                              <strong>{t(r.name)}</strong>
                            </button>
                            <small>
                              {tx(r.mission)} {t(" · ")}
                              {tx(r.mode)} · {t("Scoring model")}{t(" v")}{r.scoringVersion ?? 1} {t(" ·")}
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
              `${t(term)} ${t(meaning)} ${term} ${meaning}`
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
        !Object.entries(glossary).some(([term, m]) =>
          `${t(term)} ${t(m)} ${term} ${m}`.toLowerCase().includes(query.toLowerCase()),
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
