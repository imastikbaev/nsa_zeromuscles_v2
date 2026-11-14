"use client";
import { useI18n } from "./preferences";
import {
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { DecisionRecord, ScoreBreakdown } from "@/lib/simulation";
export function DecisionImpact({ decisions }: { decisions: DecisionRecord[] }) {
  const { t, tx, localeTag } = useI18n();

  if (!decisions.length) return null;
  return (
    <section
      className="decision-impact"
      aria-label={t("Consequences of your flight decisions")}
    >
      <div className="sub-heading">
        <h3>
          <Activity size={16} /> {t(" Your decisions, measured.")}
        </h3>
        <span>
          {tx(decisions.length)} {t(" COMMANDS")}
        </span>
      </div>
      <p>
        {t(
          "Actual outcomes after each response, before the final health multiplier.",
        )}
      </p>
      <div className="decision-rows">
        {tx(
          decisions.map((d, i) => (
            <article className="decision-row" key={`${i}-${d.event}`}>
              <div className="decision-heading">
                <span className="decision-number">
                  {t("0")}
                  {tx(i + 1)}
                </span>
                <div>
                  <strong>{tx(d.choice)}</strong>
                  <span>{tx(d.event)}</span>
                </div>
              </div>
              <div className="decision-values">
                <span className={d.science >= 0 ? "text-green" : "text-amber"}>
                  {tx(
                    d.science >= 0 ? (
                      <ArrowUpRight size={14} />
                    ) : (
                      <ArrowDownRight size={14} />
                    ),
                  )}
                  <strong>
                    {tx(d.science >= 0 ? "+" : "")}
                    {tx(d.science)}
                  </strong>
                  {tx(" ")}
                  {t("science")}
                </span>
                <span>
                  <strong>{tx(d.fuel ? `−${d.fuel}` : "0")}</strong>{" "}
                  {t(" kg fuel")}
                </span>
                <span className={d.damage ? "text-danger" : "text-green"}>
                  {tx(
                    d.damage ? (
                      <>
                        <strong>
                          {t("−")}
                          {tx(d.damage)}
                          {t("%")}
                        </strong>{" "}
                        {t(" health")}
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={13} /> {t(" No damage")}
                      </>
                    ),
                  )}
                </span>
              </div>
            </article>
          )),
        )}
      </div>
    </section>
  );
}
export function ScoreExplanation({
  breakdown: b,
  failed,
}: {
  breakdown: ScoreBreakdown;
  failed: boolean;
}) {
  const { t, tx, localeTag } = useI18n();

  return (
    <section className="score-explanation">
      <div className="sub-heading">
        <h3>{t("Where your points came from")}</h3>
        <span>{t("TRANSPARENT SCORING")}</span>
      </div>
      <div className="score-contributions">
        {tx(
          b.contributions.map((c, i) => (
            <div key={c.label}>
              <div>
                <span>{tx(c.label)}</span>
                <strong>
                  {tx(c.points.toFixed(1))}{" "}
                  <small>
                    {t("/ ")}
                    {tx(c.maximum)}
                  </small>
                </strong>
              </div>
              <div className={`contribution-track contribution-${i}`}>
                <i style={{ width: `${(c.points / c.maximum) * 100}%` }} />
              </div>
            </div>
          )),
        )}
      </div>
      {b.deliveryMultiplier !== undefined && <p>{t("Delivered science × duration")}: {b.deliveryMultiplier.toFixed(3)}×. {t("This factor also multiplies the science equation below.")}</p>}
      <div className="science-equation">
        <div>
          <span>{t("DESIGN SCIENCE")}</span>
          <strong>{tx(b.baseScience.toFixed(1))}</strong>
        </div>
        <div>
          <span>{t("FLIGHT DECISIONS")}</span>
          <strong>
            {tx(b.decisionScience >= 0 ? "+" : "")}
            {tx(b.decisionScience)}
          </strong>
        </div>
        <div>
          <span>{t("REMAINING HEALTH")}</span>
          <strong>
            {tx(Math.round(b.healthMultiplier * 100))}
            {t("%")}
          </strong>
        </div>
        <p>
          {t("Science = (")}
          {tx(b.baseScience.toFixed(1))}
          {tx(" ")}
          {tx(b.decisionScience >= 0 ? "+" : "−")}{" "}
          {tx(Math.abs(b.decisionScience))}
          {t(") ×")}
          {tx(" ")}
          {tx(Math.round(b.healthMultiplier * 100))}
          {t("%")}{b.deliveryMultiplier !== undefined && <> × {b.deliveryMultiplier.toFixed(3)}</>} =
          {tx(" ")}
          {tx(
            Math.max(
              0,
              Math.round(
                (b.baseScience + b.decisionScience) * b.healthMultiplier * (b.deliveryMultiplier ?? 1),
              ),
            ),
          )}
          {tx(" ")}
          {t("points. The overall grade uses the weighted points above.")}
          {tx(failed ? " A failed mission caps the total at 30 points." : "")}
        </p>
      </div>
    </section>
  );
}
