"use client";
import { useI18n } from "@/components/preferences";


import { useMemo, useState } from "react";
import { LaunchSequence } from "@/components/launch-sequence";
import { launchers, missions, systems } from "@/lib/data";
import { designForMission } from "@/lib/engineering";

export default function LaunchPreview() {
  const { t } = useI18n();

  const [mission, setMission] = useState<(typeof missions)[number]["id"]>("earth");
  const [launcher, setLauncher] = useState("swift");
  const [propulsion, setPropulsion] = useState("chemical");
  const [antenna, setAntenna] = useState("patch");
  const [panels, setPanels] = useState(8);
  const [run, setRun] = useState(0);

  const design = useMemo(() => {
    const base = designForMission(mission, "guided");
    return {
      ...base,
      launcher,
      panels,
      systems: { ...base.systems, propulsion, antenna },
    };
  }, [mission, launcher, propulsion, antenna, panels]);

  return (
    <div className="ls-page">
      <div className="ls-page-inner">
        <div>
          <h1>{t("Launch sequence")}</h1>
          <p>{t(" Every element is driven by the design: launcher size, load vibration, engine plume, fuel gauge, array area and antenna type. ")}</p>
        </div>
        <div className="ls-options">
          <label>{t(" Destination ")}<select value={mission} onChange={(e) => { setMission(e.target.value as typeof mission); setRun((n) => n + 1); }}>
              {missions.map((m) => (
                <option key={m.id} value={m.id}>{t(m.name)}</option>
              ))}
            </select>
          </label>
          <label>{t(" Launcher ")}<select value={launcher} onChange={(e) => { setLauncher(e.target.value); setRun((n) => n + 1); }}>
              {launchers.map((l) => (
                <option key={l.id} value={l.id}>{t(l.name)}</option>
              ))}
            </select>
          </label>
          <label>{t(" Propulsion ")}<select value={propulsion} onChange={(e) => { setPropulsion(e.target.value); setRun((n) => n + 1); }}>
              {systems.propulsion.map((p) => (
                <option key={p.id} value={p.id}>{t(p.name)}</option>
              ))}
            </select>
          </label>
          <label>{t(" Antenna ")}<select value={antenna} onChange={(e) => { setAntenna(e.target.value); setRun((n) => n + 1); }}>
              {systems.antenna.map((a) => (
                <option key={a.id} value={a.id}>{t(a.name)}</option>
              ))}
            </select>
          </label>
          <label>{t(" Solar array · ")}{panels}{t(" m² ")}<input type="range" min={2} max={32} step={2} value={panels} onChange={(e) => { setPanels(Number(e.target.value)); setRun((n) => n + 1); }} />
          </label>
        </div>
        <LaunchSequence key={run} design={design} />
      </div>
    </div>
  );
}
