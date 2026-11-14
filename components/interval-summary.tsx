"use client";
import type { IntervalReport } from "@/lib/operations";
import { useI18n } from "./preferences";

export function IntervalSummary({ report: r }: { report: IntervalReport }) {
  const { t, number } = useI18n();
  return <section className="operations-panel" aria-label={t("Last interval result")} aria-live="polite">
    <h3>{t("Last interval result")}</h3>
    <p>{t("Calculated duration")}: {number(r.hours / (r.hours >= 720 ? 720 : 1), 2)} {t(r.hours >= 720 ? "months" : "hours")}</p>
    <dl className="operations-metrics">
      <div><dt>{t("Data generated this interval")}</dt><dd>{number(r.generated, 2)} GB</dd></div>
      <div><dt>{t("Data delivered this interval")}</dt><dd>{number(r.delivered, 2)} GB</dd></div>
      <div><dt>{t("Overflow loss this interval")}</dt><dd>{number(r.lost, 2)} GB</dd></div>
      <div><dt>{t("Data remaining onboard")}</dt><dd>{number(r.buffered, 2)} GB</dd></div>
      <div><dt>{t("Battery before / after")}</dt><dd>{number(r.batteryBefore, 2)} → {number(r.batteryAfter, 2)} kWh</dd></div>
      <div><dt>{t("Unserved energy this interval")}</dt><dd>{number(r.unservedKWh, 2)} kWh</dd></div>
    </dl>
    <ul>
      {!r.scienceActive && <li>{t("Commissioning interval: science collection has not started yet.")}</li>}
      {r.scienceActive && (r.duty < 1 || r.disabledCount > 0) && <li>{t("Reduced duty or disabled instruments limited collection and lowered the requested load.")}</li>}
      {r.unservedKWh > 0 && <li>{t("Power shortages reduced observation and transmission throughput.")}</li>}
      {!r.downlink && <li>{t("The transmitter was off: no data could be delivered this interval.")}</li>}
      {r.lost > 0 && <li>{t("Storage filled before transmission: excess incoming data was lost.")}</li>}
      {r.buffered > 0 && <li>{t("Data remains onboard; delivery depends on contact windows, available power and transmission settings.")}</li>}
      {r.scienceActive && r.unservedKWh === 0 && r.lost === 0 && <li>{t("Scheduled operations completed without energy shortages or storage overflow.")}</li>}
    </ul>
    <p>{t("Battery values are interval endpoints; unserved energy includes shortages inside the interval.")}</p>
  </section>;
}
