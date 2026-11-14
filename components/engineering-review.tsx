"use client";
import { useI18n } from "./preferences";
import { useState } from "react";
import {
  Check,
  TriangleAlert,
  Download,
  ArrowRight,
  Undo2,
  FileCheck2,
  Settings2,
} from "lucide-react";
import {
  Design,
  EngineeringRequirements,
  nominalRequirements,
} from "@/lib/data";
import { reviewDesign, downloadEngineeringReport } from "@/lib/design-review";

const signed = (n: number, digits = 1) =>
  `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;
export function EngineeringReview({
  design,
  onChange,
  onEdit,
}: {
  design: Design;
  onChange: (d: Design) => void;
  onEdit: (step: number) => void;
}) {
  const { t, tx, localeTag } = useI18n();

  const { metrics: m, checks, coverage, alternatives } = reviewDesign(design);
  const [tab, setTab] = useState<"budgets" | "requirements" | "trade">(
    "requirements",
  );
  const [undo, setUndo] = useState<{ before: Design; after: Design } | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const req = design.requirements ?? nominalRequirements;
  const changeRequirement = (
    key: keyof EngineeringRequirements,
    value: number,
    max: number,
  ) => {
    if (!Number.isFinite(value)) return;
    onChange({
      ...design,
      requirements: { ...req, [key]: Math.max(0, Math.min(max, value)) },
    });
  };
  return (
    <div className="engineering-review">
      <div className="review-header">
        <div>
          <span className="eyebrow">
            {t("PRELIMINARY DESIGN REVIEW / MODEL 1.3")}
          </span>
          <h2>{t("Engineering analysis")}</h2>
          <p>
            {t(
              "Trace requirements to equipment, inspect budgets, and test changes before launch.",
            )}
          </p>
        </div>
        <button
          className="secondary-button"
          onClick={() => downloadEngineeringReport(design)}
        >
          <Download size={15} /> {t(" Design report")}
        </button>
      </div>
      <div className="review-identity">
        <label>
          {t("Project name")}
          <input
            maxLength={80}
            value={design.name}
            onChange={(e) => onChange({ ...design, name: e.target.value })}
          />
        </label>
        <div>
          <span>{t("DESTINATION / TRAJECTORY")}</span>
          <strong>
            {tx(m.mission.name)} {t(" · ")}
            {tx(m.orbit.short)}
          </strong>
          <small>
            {tx(m.duration.toFixed(1))} {t(" months · ")}
            {tx(m.launcher.name)}
          </small>
        </div>
      </div>
      <div
        className={`review-verdict ${m.issues.length ? "blocked" : "passed"}`}
        role="status"
      >
        <FileCheck2 size={21} />
        <div>
          <strong>
            {tx(
              m.issues.length
                ? `${m.issues.length} open checks · launch blocked`
                : "Configured requirements satisfied",
            )}
          </strong>
          <p>
            {tx(
              m.issues.length
                ? m.issues[0].label
                : "Ready for simulation under the selected assumptions. Review model limits below.",
            )}
          </p>
        </div>
      </div>
      <section
        className="review-assumptions"
        aria-label={t("Engineering assumptions")}
      >
        <div className="sub-heading">
          <h3>
            <Settings2 size={15} /> {t(" Design requirements")}
          </h3>
          <span>{t("LIVE CONSTRAINTS")}</span>
        </div>
        <p>
          {t(
            "Set reserves explicitly. Zero means nominal sizing with no additional allowance. These requirements are saved with the project and enforced at launch.",
          )}
        </p>
        <div className="requirement-inputs">
          {tx(
            [
              {
                key: "massReserve" as const,
                name: "Mass growth reserve",
                max: 30,
                step: 1,
                unit: "%",
                hint: "Held back from available launch capacity.",
              },
              {
                key: "powerReserve" as const,
                name: "End-of-life power reserve",
                max: 50,
                step: 1,
                unit: "%",
                hint: "Required headroom above operating load.",
              },
              {
                key: "solarDegradation" as const,
                name: "Annual solar degradation",
                max: 5,
                step: 0.1,
                unit: "% / year",
                hint: "Compound loss over mission duration.",
              },
            ].map((f) => (
              <label key={f.key}>
                {tx(f.name)}
                <div>
                  <input
                    aria-label={t(f.name)}
                    type="number"
                    min={0}
                    max={f.max}
                    step={f.step}
                    value={req[f.key]}
                    onChange={(e) =>
                      changeRequirement(f.key, Number(e.target.value), f.max)
                    }
                  />
                  <span>{tx(f.unit)}</span>
                </div>
                <small>{tx(f.hint)}</small>
              </label>
            )),
          )}
        </div>
      </section>
      <div
        className="review-tabs"
        role="group"
        aria-label={t("Engineering analysis views")}
      >
        {tx(
          (
            [
              { id: "requirements", name: "Requirements" },
              { id: "budgets", name: "Equipment & budgets" },
              { id: "trade", name: "Trade study" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              aria-pressed={tab === t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => setTab(t.id)}
            >
              {tx(t.name)}
            </button>
          )),
        )}
      </div>
      {tx(
        tab === "requirements" ? (
          <>
            <div className="review-table-wrap">
              <table className="review-table">
                <caption>
                  {t(
                    "Quantitative requirements · values update with every design change",
                  )}
                </caption>
                <thead>
                  <tr>
                    <th>{t("Requirement / basis")}</th>
                    <th>{t("Actual")}</th>
                    <th>{t("Limit")}</th>
                    <th>{t("Status")}</th>
                    <th>{t("Edit")}</th>
                  </tr>
                </thead>
                <tbody>
                  {tx(
                    checks.map((c) => (
                      <tr key={c.id}>
                        <th>
                          <small>{tx(c.id)}</small>
                          {tx(c.name)}
                          <span>{tx(c.source)}</span>
                        </th>
                        <td>
                          {tx(c.actual.toFixed(c.unit === "kWh" ? 2 : 1))}
                          <small>{tx(c.unit)}</small>
                        </td>
                        <td>
                          {tx(
                            Number.isFinite(c.limit)
                              ? `${c.direction === "max" ? "≤" : "≥"} ${c.limit.toFixed(c.unit === "kWh" ? 2 : 1)}`
                              : "Uncapped",
                          )}
                          <small>{tx(c.unit)}</small>
                        </td>
                        <td className={c.pass ? "text-green" : "text-danger"}>
                          {tx(c.pass ? "PASS" : "FAIL")}
                        </td>
                        <td>
                          <button
                            aria-label={t(`Edit ${c.name}`)}
                            onClick={() => onEdit(c.step)}
                          >
                            <ArrowRight size={16} />
                          </button>
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
            <section className="coverage-review">
              <h3>{t("Science requirement traceability")}</h3>
              <p>
                {t(
                  "Coverage means an installed instrument supports the objective. Resolution, accuracy, and coverage time are not modeled.",
                )}
              </p>
              {tx(
                coverage.length ? (
                  coverage.map((c) => (
                    <div key={c.id}>
                      {tx(
                        c.instruments.length ? (
                          <Check size={15} />
                        ) : (
                          <TriangleAlert size={15} />
                        ),
                      )}
                      <strong>{tx(c.name)}</strong>
                      <span>
                        {tx(c.instruments.join(" / ") || "Missing instrument")}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-danger">
                    {t("No science objectives selected.")}
                  </p>
                ),
              )}
            </section>
            {tx(
              m.issues.length > 0 && (
                <section className="review-issues">
                  <h3>{t("Open actions")}</h3>
                  {tx(
                    m.issues.map((i) => (
                      <div key={i.label}>
                        <TriangleAlert size={15} />
                        <div>
                          <strong>{tx(i.label)}</strong>
                          <p>{tx(i.fix)}</p>
                        </div>
                      </div>
                    )),
                  )}
                </section>
              ),
            )}
          </>
        ) : tab === "budgets" ? (
          <>
            <div className="review-budget-totals">
              <div>
                <span>{t("WET / DRY MASS")}</span>
                <strong>
                  {tx(m.mass.toFixed(1))} {t(" / ")}
                  {tx(m.dryMass.toFixed(1))} <small>{t("kg")}</small>
                </strong>
              </div>
              <div>
                <span>{t("LIFECYCLE COST")}</span>
                <strong>
                  {t("$")}
                  {tx(m.cost.toFixed(1))} <small>{t("M")}</small>
                </strong>
              </div>
              <div>
                <span>{t("OPERATING LOAD")}</span>
                <strong>
                  {tx(m.consumption.toFixed(0))} <small>{t("W")}</small>
                </strong>
              </div>
            </div>
            <div className="review-table-wrap">
              <table className="review-table ledger-table">
                <caption>
                  {t(
                    "Equipment & resource ledger · all totals calculated from these rows",
                  )}
                </caption>
                <thead>
                  <tr>
                    <th>{t("Item / allocation")}</th>
                    <th>{t("Mass · kg")}</th>
                    <th>{t("Cost · $M")}</th>
                    <th>{t("Load · W")}</th>
                  </tr>
                </thead>
                <tbody>
                  {tx(
                    m.ledger.map((r) => (
                      <tr key={r.id}>
                        <th>
                          {t(r.name)}
                          <span>{tx(r.group)}</span>
                        </th>
                        <td>{tx(r.mass.toFixed(1))}</td>
                        <td>{tx(r.cost.toFixed(2))}</td>
                        <td>{tx(r.power.toFixed(0))}</td>
                      </tr>
                    )),
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <th>{t("Total")}</th>
                    <td>{tx(m.mass.toFixed(1))}</td>
                    <td>{tx(m.cost.toFixed(2))}</td>
                    <td>{tx(m.consumption.toFixed(0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <section className="power-review">
              <h3>{t("End-of-life power balance")}</h3>
              <div>
                {tx(
                  [
                    ["Initial generation", m.generation],
                    ["End-of-life generation", m.endOfLifeGeneration],
                    ["Operating load", m.consumption],
                    ["Required with reserve", m.requiredGeneration],
                  ].map(([name, value]) => (
                    <div key={name}>
                      <span>{tx(name)}</span>
                      <div className="review-bar">
                        <i
                          style={{
                            width: `${(Math.max(0, Number(value)) / Math.max(m.generation, m.requiredGeneration, 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <strong>
                        {tx(Number(value).toFixed(0))} {t(" W")}
                      </strong>
                    </div>
                  )),
                )}
              </div>
              <p>
                {t("Solar output retained: ")}
                {tx((m.solarRetention * 100).toFixed(1))}
                {t("% over")}
                {tx(" ")}
                {tx(m.duration.toFixed(1))}{" "}
                {t(" months. Surplus after the required reserve:")}
                {tx(" ")}
                <strong
                  className={
                    m.designPowerMargin < 0 ? "text-danger" : "text-green"
                  }
                >
                  {tx(signed(m.designPowerMargin, 0))} {t(" W")}
                </strong>
                {t(".")}
              </p>
            </section>
          </>
        ) : (
          <section className="trade-study">
            <h3>{t("Change one variable. Measure every consequence.")}</h3>
            <p>
              {t(
                "Each option below recalculates the entire current design. These are sensitivity checks, not an automatic optimizer. Apply only after reviewing new constraint violations.",
              )}
            </p>
            {tx(
              notice && (
                <p role="status" className="trade-notice">
                  {tx(notice)}
                </p>
              ),
            )}
            {tx(
              undo && JSON.stringify(design) === JSON.stringify(undo.after) && (
                <button
                  className="secondary-button"
                  onClick={() => {
                    onChange(undo.before);
                    setUndo(null);
                    setNotice("Previous design restored.");
                  }}
                >
                  <Undo2 size={14} /> {t(" Undo last trade")}
                </button>
              ),
            )}
            <div className="trade-cards">
              {tx(
                alternatives.map((a) => (
                  <article key={a.id}>
                    <h4>{tx(a.name)}</h4>
                    <dl>
                      <div>
                        <dt>{t("Cost")}</dt>
                        <dd>
                          {tx(signed(a.cost))} {t(" $M")}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("Wet mass")}</dt>
                        <dd>
                          {tx(signed(a.mass))} {t(" kg")}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("Power after reserve")}</dt>
                        <dd>
                          {tx(signed(a.power, 0))} {t(" W")}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("Delta-v")}</dt>
                        <dd>
                          {tx(signed(a.deltaV, 0))} {t(" m/s")}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("Reliability index")}</dt>
                        <dd>
                          {tx(signed(a.reliability, 2))} {t(" pp")}
                        </dd>
                      </div>
                    </dl>
                    <p
                      className={a.issues.length ? "text-amber" : "text-green"}
                    >
                      {tx(
                        a.issues.length
                          ? `${a.issues.length} unresolved checks`
                          : "All launch checks pass",
                      )}
                    </p>
                    {tx(
                      a.issues.length > 0 && (
                        <details>
                          <summary>{t("Review constraints")}</summary>
                          <ul>
                            {tx(
                              a.issues.map((i) => (
                                <li key={i.label}>{tx(i.label)}</li>
                              )),
                            )}
                          </ul>
                        </details>
                      ),
                    )}
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setUndo({
                          before: structuredClone(design),
                          after: a.design,
                        });
                        onChange(a.design);
                        setNotice(
                          `${a.name} applied. All budgets recalculated.`,
                        );
                      }}
                    >
                      {t("Apply ")}
                      {tx(a.name.toLowerCase())} <ArrowRight size={14} />
                    </button>
                  </article>
                )),
              )}
            </div>
          </section>
        ),
      )}
      <details className="model-limits">
        <summary>{t("Calculation basis & model limits")}</summary>
        <p>
          {t(
            "This is a preliminary educational sizing model with fictional equipment data. Passing checks is not flight qualification.",
          )}
        </p>
        <ul>
          <li>
            {t(
              "All installed equipment runs simultaneously. No duty cycles, conversion losses, battery aging or attitude-dependent solar output.",
            )}
          </li>
          <li>
            {t(
              "Trajectories, sunlight and communication attenuation use catalog factors. No ephemeris propagation, RF link budget, thermal solver, structural loads or launcher performance curves.",
            )}
          </li>
          <li>
            {t(
              "Solar output compounds by the entered annual degradation. RTG decay is not modeled. Battery sizing uses a fixed 36-minute eclipse, or 9-minute RTG backup.",
            )}
          </li>
          <li>
            {t(
              "Delta-v uses the rocket equation for spacecraft maneuvers after launcher delivery. The reliability index is not a validated probability of survival.",
            )}
          </li>
        </ul>
      </details>
    </div>
  );
}
