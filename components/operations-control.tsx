"use client";
import { Design, instruments } from "@/lib/data";
import { Flight, setFlightOperations } from "@/lib/simulation";
import { dataTotals } from "@/lib/operations";
import { useI18n } from "./preferences";
export function OperationsControl({ design, flight, onChange }: {
    design: Design;
    flight: Flight;
    onChange: (f: Flight) => void;
}) {
    const { t, number } = useI18n();
    const o = flight.operations;
    if (!o)
        return <p>{t("Legacy flight: original simulation rules.")}</p>;
    const totals = dataTotals(o);
    const update = (patch: Parameters<typeof setFlightOperations>[1]) => onChange(setFlightOperations(flight, patch));
    return <section className="operations-panel" aria-label={t("Mission operations")}>
   <h3>{t("Mission operations")}</h3>
   <p role="status">{t(o.safeMode ? "Energy shortage: observations are reduced automatically." : "Energy available for scheduled operations.")}</p>
   <dl className="operations-metrics">
    <div><dt>{t("Battery charge")}</dt><dd>{number(o.batteryKWh, 2)} / {number(design.battery, 2)}{t(" kWh")}</dd></div>
    <div><dt>{t("Buffered data")}</dt><dd>{number(totals.buffered, 2)}{t(" GB")}</dd></div>
    <div><dt>{t("Delivered data")}</dt><dd>{number(totals.delivered, 2)}{t(" GB")}</dd></div>
    <div><dt>{t("Lost data")}</dt><dd>{number(totals.lost, 2)}{t(" GB")}</dd></div>
   </dl>
   <fieldset disabled={flight.completed}>
    <legend>{t("Commands for the next interval")}</legend>
    <label>{t("Instrument duty cycle")}<select value={o.duty} onChange={e => update({ duty: Number(e.target.value) })}>
     <option value={1}>{t("Full observations")}</option><option value={0.5}>{t("Half observations")}</option><option value={0}>{t("Instruments off")}</option>
    </select></label>
    <p>{t("Duty cycle applies only to enabled instruments.")}</p>
    {o.data.map(r => <label key={r.id}><input type="checkbox" checked={!(o.disabledInstruments ?? []).includes(r.id)} onChange={e => update({ disabledInstruments: e.target.checked ? (o.disabledInstruments ?? []).filter(id => id !== r.id) : [...(o.disabledInstruments ?? []), r.id] })}/>{t(instruments.find(i => i.id === r.id)!.name)}</label>)}
    <label><input type="checkbox" checked={o.downlink} onChange={e => update({ downlink: e.target.checked })}/>{t("Transmit during contact windows")}</label>
    <label>{t("Data transmission priority")}<select value={o.priority ?? ""} onChange={e => update({ priority: e.target.value || null })}>
      <option value="">{t("Instrument order")}</option>{o.data.map(r => <option key={r.id} value={r.id}>{t(instruments.find(i => i.id === r.id)!.name)}</option>)}
    </select></label>
    <button className="secondary-button" disabled={totals.buffered === 0} onClick={() => { if (window.confirm(t("Discard all buffered data? Delivered data will be kept.")))
        update({ discard: true }); }}>{t("Discard buffered data")}</button>
   </fieldset>
   <p>{t("Less observation saves power and memory. Transmission consumes power. Only delivered data contributes to the final science result.")}</p>
 </section>;
}
