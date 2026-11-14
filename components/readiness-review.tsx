"use client";
import { ArrowRight, Check, Download, TriangleAlert } from "lucide-react";
import { Design } from "@/lib/data";
import { reviewDesign, downloadEngineeringReport } from "@/lib/design-review";
import { useI18n } from "./preferences";

/** Uses the same requirements and blockers as launch; no separate readiness score. */
export function ReadinessReview({
  design,
  onEdit,
  draftPending,
}: {
  design: Design;
  onEdit: (step: number) => void;
  draftPending: boolean;
}) {
  const { t, number } = useI18n();
  const { metrics, checks } = reviewDesign(design);
  const blocked = metrics.issues.length > 0;
  return (
    <section
      className="bento-card readiness-review"
      aria-label={t("Launch readiness")}
    >
      <div className="bento-heading">
        <div>
          <span className="bento-eyebrow">{t(" PDR / ")}{t("Saved configuration")}
          </span>
          <h3>{t("Launch readiness")}</h3>
        </div>
        <span className={`status-pill ${blocked ? "amber" : "emerald"}`}>
          {blocked ? <TriangleAlert size={12} /> : <Check size={12} />}{" "}
          {t(blocked ? "Launch blocked" : "All configured checks passed")}
        </span>
      </div>
      {draftPending && (
        <p className="readiness-draft" role="status">
          {t(
            "Save or cancel inspector edits before changing sections. Checks below describe the saved design.",
          )}
        </p>
      )}
      {blocked && (
        <ul className="readiness-blockers">
          {metrics.issues.map((issue) => (
            <li key={issue.label}>
              <div>
                <strong>{t(issue.label)}</strong>
                <p>{t(issue.fix)}</p>
              </div>
              <button
                disabled={draftPending}
                onClick={() => onEdit(issue.step)}
                aria-label={`${t("Resolve")}: ${t(issue.label)}`}
              >
                {t("Resolve")}
                <ArrowRight size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <details className="readiness-details">
        <summary>
          {t("Resource checks")}{" "}
          <span>
            {checks.filter((c) => c.pass).length} / {checks.length}{" "}
            {t("passed")}
          </span>
        </summary>
        <div className="readiness-table-wrap">
          <table>
            <caption className="sr-only">{t("Resource checks")}</caption>
            <thead>
              <tr>
                <th>{t("Requirement")}</th>
                <th>{t("Actual")}</th>
                <th>{t("Limit")}</th>
                <th>{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((c) => (
                <tr key={c.id}>
                  <th>
                    <small>{c.id}</small>
                    <button
                      disabled={draftPending}
                      onClick={() => onEdit(c.step)}
                    >
                      {t(c.name)}
                      <ArrowRight size={12} />
                    </button>
                  </th>
                  <td>
                    {number(c.actual, c.unit === "kWh" ? 2 : 1)}{" "}
                    <small>{t(c.unit)}</small>
                  </td>
                  <td>
                    {Number.isFinite(c.limit)
                      ? `${c.direction === "max" ? "≤" : "≥"} ${number(c.limit, c.unit === "kWh" ? 2 : 1)} ${t(c.unit)}`
                      : t("Uncapped")}
                  </td>
                  <td className={c.pass ? "readiness-pass" : "readiness-fail"}>
                    {t(c.pass ? "PASS" : "FAIL")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <footer className="readiness-actions">
        <button
          className="secondary-button"
          onClick={() => downloadEngineeringReport(design)}
        >
          <Download size={14} />
          {t("Export design review")}
        </button>
        <button
          className="primary-button"
          disabled={blocked || draftPending}
          onClick={() => onEdit(3)}
        >
          {t("Continue to launch review")}
          <ArrowRight size={14} />
        </button>
      </footer>
    </section>
  );
}
