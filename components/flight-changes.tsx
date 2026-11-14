"use client";
import { useEffect, useRef } from "react";
import type { Design } from "@/lib/data";
import { pendingEvent, phases, type Flight } from "@/lib/simulation";
import { dataTotals } from "@/lib/operations";
import { sampleFlight } from "@/lib/telemetry";
import { useI18n } from "./preferences";
import "./flight-changes.css";

export function FlightChanges({ before, flight, design }: {
  before: Flight | null;
  flight: Flight;
  design: Design;
}) {
  const { t, number } = useI18n();
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (before?.id === flight.id &&
        (before.phase !== flight.phase || before.resolved !== flight.resolved)) {
      panel.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    }
  }, [before, flight]);
  if (!before || before.id !== flight.id) return null;

  const previous = sampleFlight(before, design, "comparison");
  const current = sampleFlight(flight, design, "comparison");
  const intervalAdvanced = (flight.operations?.elapsedHours ?? 0) > (before.operations?.elapsedHours ?? 0);
  const decision = flight.decisions.length > before.decisions.length ? flight.decisions.at(-1) : undefined;
  const event = pendingEvent(flight);
  const rows = [
    { label: "Spacecraft health", old: before.health, value: flight.health, unit: "%", direction: 1 },
    { label: "Reserve propellant", old: before.fuel, value: flight.fuel, unit: "kg", direction: 1 },
    { label: "Science adjustment from decisions", old: before.scienceDelta, value: flight.scienceDelta, unit: "pts", direction: 1 },
    { label: "Projected science return", old: previous.science, value: current.science, unit: "pts", direction: 1 },
    { label: "Nominal power headroom", old: previous.power, value: current.power, unit: "W", direction: 1 },
  ];
  if (before.operations && flight.operations) {
    const a = dataTotals(before.operations), b = dataTotals(flight.operations);
    rows.push(
      { label: "Mission time", old: before.operations.elapsedHours, value: flight.operations.elapsedHours, unit: "hours", direction: 0 },
      { label: "Battery charge", old: before.operations.batteryKWh, value: flight.operations.batteryKWh, unit: "kWh", direction: 1 },
      { label: "Delivered data", old: a.delivered, value: b.delivered, unit: "GB", direction: 1 },
      { label: "Data remaining onboard", old: a.buffered, value: b.buffered, unit: "GB", direction: 0 },
      { label: "Lost data", old: a.lost, value: b.lost, unit: "GB", direction: -1 },
    );
  }
  const notes: string[] = [];
  if (flight.fuel < before.fuel) notes.push("Fuel was spent on the selected maneuver, leaving less reserve for later commands.");
  if (flight.health < before.health) notes.push("The event response caused damage. Lower health reduces the projected science return.");
  if (flight.powerDelta < before.powerDelta) notes.push("Event damage reduced available power. Reduce instrument duty or transmission demand if energy runs short.");
  if (flight.scienceDelta !== before.scienceDelta) notes.push("The selected response changed the science bonus. Final science also depends on health and delivered data.");
  if (before.operations && flight.operations) {
    const a = before.operations, b = flight.operations;
    if (b.batteryKWh < a.batteryKWh) notes.push("The battery supplied more energy than it recovered during this interval, including time in eclipse.");
    if (b.batteryKWh > a.batteryKWh) notes.push("Surplus generation replenished the battery during this interval.");
    if (b.unservedKWh > a.unservedKWh) notes.push("Power shortages reduced observation and transmission throughput.");
    if (dataTotals(b).delivered > dataTotals(a).delivered) notes.push("Data reached Earth during contact windows and now contributes to the science result.");
    if (dataTotals(b).lost > dataTotals(a).lost) notes.push(intervalAdvanced
      ? "Storage filled before transmission: excess incoming data was lost."
      : "The buffer was cleared by command. Discarded data can no longer be transmitted.");
    if (dataTotals(b).buffered > dataTotals(a).buffered) notes.push("More data is waiting onboard. Keep transmission enabled and check power and contact windows.");
    if (a.duty !== b.duty || (a.disabledInstruments ?? []).join() !== (b.disabledInstruments ?? []).join())
      notes.push("Instrument settings apply to the next interval. Lower duty saves energy but collects less data.");
    if (a.downlink !== b.downlink) notes.push(b.downlink
      ? "Transmission is enabled for the next interval. It uses energy during contact windows."
      : "Transmission is disabled. Data will accumulate onboard and may overflow storage.");
    if (a.priority !== b.priority) notes.push("The selected instrument will transmit first when contact capacity is limited.");
  }
  if (intervalAdvanced && flight.lastInterval && !flight.lastInterval.scienceActive)
    notes.push("Commissioning interval: science collection has not started yet.");

  return <section ref={panel} className="flight-changes" aria-live="polite" aria-label={t("What changed")}>
    <header>
      <h3>{t("What changed")}</h3>
      <p>{before.phase !== flight.phase
        ? <>{t(phases[before.phase])} → {t(phases[flight.phase])}</>
        : t(decision ? "Result of your decision" : "Settings updated")}</p>
    </header>
    {decision && <p>{t(decision.event)} → <strong>{t(decision.choice)}</strong></p>}
    {event && <p className="flight-change-event"><strong>{t("Decision required")}</strong> · {t(event.title)}</p>}
    <div className="flight-change-table">
      <table>
        <thead><tr><th>{t("Metric")}</th><th>{t("Before")}</th><th>{t("Now")}</th><th>{t("Change")}</th></tr></thead>
        <tbody>{rows.map(row => {
          const delta = row.value - row.old;
          const unchanged = Math.abs(delta) < 0.005;
          const status = unchanged ? "same" : row.direction === 0 ? "neutral" : delta * row.direction > 0 ? "good" : "bad";
          return <tr key={row.label} data-change={status}>
            <th scope="row">{t(row.label)}</th>
            <td>{number(row.old, 2)} {t(row.unit)}</td>
            <td>{number(row.value, 2)} {t(row.unit)}</td>
            <td><span className="flight-change-status">{t(unchanged ? "Unchanged" : status === "good" ? "Improved" : status === "bad" ? "Worsened" : "Changed")}</span>
              {!unchanged && <span className="flight-change-delta"> {delta > 0 ? "+" : "−"}{number(Math.abs(delta), 2)} {t(row.unit)}</span>}
            </td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    {notes.length > 0 && <div className="flight-change-reasons"><h4>{t("Why it changed and what it affects")}</h4><ul>{notes.map(note => <li key={note}>{t(note)}</li>)}</ul></div>}
    <p className="flight-change-footnote">{t("Compared with the state before your last command. An unchanged value can still be critically low.")}</p>
  </section>;
}

export function FlightLog({ flight, before }: { flight: Flight; before: Flight | null }) {
  const { t } = useI18n();
  const start = before?.id === flight.id ? before.log.length : flight.log.length;
  const fresh = flight.log.slice(start);
  const earlier = flight.log.slice(0, start);
  return <section className="flight-update-log" aria-label={t("Mission log")}>
    {fresh.length > 0 && <><h3>{t("New messages")} · {fresh.length}</h3>
      <ul>{fresh.map((entry, i) => <li key={start + i} className="flight-log-new">
        <span className="flight-log-label">{t("New")} · {t(entry.phase)}</span>
        <p>{t(entry.text)}</p>
      </li>)}</ul></>}
    {earlier.length > 0 && <details><summary>{t("Earlier messages")} · {earlier.length}</summary>
      <ul>{[...earlier].reverse().map((entry, i) => <li key={i}><span className="flight-log-label">{t(entry.phase)}</span><p>{t(entry.text)}</p></li>)}</ul>
    </details>}
  </section>;
}
