"use client";
import { useI18n } from "./preferences";
import { useState } from "react";
import { Expand, Minus, Plus, RotateCcw, Satellite } from "lucide-react";
import { Design } from "@/lib/data";
import { Metrics } from "@/lib/engineering";
export function OrbitView({
  design,
  m,
  phase,
}: {
  design: Design;
  m: Metrics;
  phase?: string;
}) {
  const { t, tx, localeTag } = useI18n();

  const [zoom, setZoom] = useState(1);
  const [running, setRunning] = useState(true);
  return (
    <div
      className={`orbit-view planet-${design.mission} ${running ? "" : "motion-paused"}`}
    >
      <div className="view-top">
        <span>
          <i className="live-dot" /> {t(" LIVE ORBIT PREVIEW")}
        </span>
        <button
          className="icon-btn"
          title={t("Reset view")}
          onClick={() => {
            setZoom(1);
            setRunning(true);
          }}
        >
          <RotateCcw size={14} />
        </button>
      </div>
      <div className="orbital-scene" style={{ transform: `scale(${zoom})` }}>
        <div className="orbit-path orbit-outer" />
        <div className="orbit-path orbit-middle" />
        <div className="planet">
          <div className="planet-texture" />
          <div className="planet-shade" />
        </div>
        <div className={`satellite-track ${running ? "" : "paused"}`}>
          <div className="orbit-satellite">
            <Satellite size={22} />
          </div>
        </div>
        <div className="orbit-axis" />
        <span className="north-label">{t("N")}</span>
      </div>
      <div className="orbit-cross cross-a">{t("+")}</div>
      <div className="orbit-cross cross-b">{t("+")}</div>
      <div className="orbit-label">
        <span className="signal-dot" />
        {tx(m.orbit.short)}{" "}
        <span>
          {" "}
          {t(" / ")}
          {tx(m.orbit.altitude)}
        </span>
      </div>
      <div className="view-controls">
        <button
          title={t("Zoom out")}
          onClick={() => setZoom((v) => Math.max(0.75, v - 0.1))}
        >
          <Minus size={14} />
        </button>
        <button
          title={t(
            running ? "Pause orbital animation" : "Resume orbital animation",
          )}
          onClick={() => setRunning((v) => !v)}
        >
          <Expand size={14} />
        </button>
        <button
          title={t("Zoom in")}
          onClick={() => setZoom((v) => Math.min(1.3, v + 0.1))}
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="orbit-bottom">
        <div>
          <span>{t("ORBITAL PERIOD")}</span>
          <strong>{tx(m.orbit.period)}</strong>
        </div>
        <div>
          <span>{tx(phase ? "MISSION PHASE" : "SIGNAL DELAY")}</span>
          <strong>{tx(phase ?? `${m.orbit.delay} s`)}</strong>
        </div>
      </div>
    </div>
  );
}
export function SpacecraftView({ design }: { design: Design }) {
  const { t, tx, localeTag } = useI18n();

  const [selected, setSelected] = useState("payload");
  const panels = design.panels > 0;
  const big = design.panels > 10;
  const modules: Record<string, string> = {
    payload: `${design.instruments.length} instrument${design.instruments.length !== 1 ? "s" : ""} installed`,
    panels: `${design.panels} m² solar array`,
    antenna:
      design.systems.antenna === "patch"
        ? "Compact patch antenna"
        : design.systems.antenna === "dish"
          ? "Deployable high-gain dish"
          : "Electronically steered array",
    propulsion: design.systems.propulsion + " propulsion",
    fuel: `${design.fuel} kg propellant`,
    battery: `${design.battery} kWh reserve`,
    computer: design.systems.computer + " flight computer",
  };
  return (
    <div className="craft-view">
      <div className="view-top">
        <span>{t("SPACECRAFT CONFIGURATION")}</span>
        <span className="tiny">{t("INTERACTIVE")}</span>
      </div>
      <svg
        viewBox="0 0 480 290"
        role="img"
        aria-label={t(
          "Interactive spacecraft diagram showing selected components",
        )}
      >
        <defs>
          <linearGradient id="bus" x2="1" y2="1">
            <stop stopColor="#d7b57c" />
            <stop offset="1" stopColor="#806544" />
          </linearGradient>
          <pattern
            id="cells"
            width="15"
            height="15"
            patternUnits="userSpaceOnUse"
          >
            <rect
              width="14"
              height="14"
              fill="#294968"
              stroke="#6a8faf"
              strokeWidth=".6"
            />
          </pattern>
          <linearGradient id="thrust" x2="0" y2="1">
            <stop stopColor="#92daff" stopOpacity=".9" />
            <stop offset="1" stopColor="#92daff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g stroke="#3b424c" strokeDasharray="3 5">
          <path d="M40 145H440M240 25V265" />
          <ellipse cx="240" cy="150" rx="205" ry="90" fill="none" />
        </g>
        <g transform="translate(0 -3) rotate(-15 240 150)">
          {tx(
            panels && (
              <g
                role="button"
                tabIndex={0}
                aria-label={t("Solar panels")}
                onClick={() => setSelected("panels")}
                onKeyDown={(e) => e.key === "Enter" && setSelected("panels")}
                className="svg-module"
              >
                <path d="M100 145H375" stroke="#999c9d" strokeWidth="7" />
                <rect
                  x={big ? 35 : 65}
                  y="101"
                  width={big ? 148 : 118}
                  height="88"
                  rx="2"
                  fill="url(#cells)"
                  stroke="#85a1b3"
                />
                <rect
                  x="297"
                  y="101"
                  width={big ? 148 : 118}
                  height="88"
                  rx="2"
                  fill="url(#cells)"
                  stroke="#85a1b3"
                />
              </g>
            ),
          )}
          <g
            className="svg-module"
            role="button"
            tabIndex={0}
            aria-label={t("Fuel tank")}
            onClick={() => setSelected("fuel")}
            onKeyDown={(e) => e.key === "Enter" && setSelected("fuel")}
          >
            <ellipse
              cx="240"
              cy="189"
              rx="30"
              ry="27"
              fill="#9ba3aa"
              stroke="#dce1e5"
            />
            <path d="M212 187H269" stroke="#69777d" strokeWidth="3" />
          </g>
          <g
            className="svg-module"
            role="button"
            tabIndex={0}
            aria-label={t("Computer")}
            onClick={() => setSelected("computer")}
            onKeyDown={(e) => e.key === "Enter" && setSelected("computer")}
          >
            <path
              d="m190 104 30-22 73 11v88l-29 22-74-13Z"
              fill="url(#bus)"
              stroke="#dbc092"
            />
            <path
              d="m190 104 74 12 29-23M264 116v87"
              fill="none"
              stroke="#edcf97"
            />
            <path
              d="M202 119v58m14-54v57m15-54v56"
              stroke="#6e5839"
              strokeWidth="2"
            />
          </g>
          <g
            className="svg-module"
            role="button"
            tabIndex={0}
            aria-label={t("Battery")}
            onClick={() => setSelected("battery")}
            onKeyDown={(e) => e.key === "Enter" && setSelected("battery")}
          >
            <rect
              x="270"
              y="142"
              width="19"
              height="29"
              rx="2"
              fill="#758b90"
              stroke="#d1dddd"
            />
            <path d="M280 147v18m-5-9h10" stroke="#c0d5d8" />
          </g>
          <g
            className="svg-module"
            role="button"
            tabIndex={0}
            aria-label={t("Payload")}
            onClick={() => setSelected("payload")}
            onKeyDown={(e) => e.key === "Enter" && setSelected("payload")}
          >
            <path d="M218 103V81l30-4v31" fill="#a5aeb4" stroke="#d1dbe0" />
            <ellipse
              cx="233"
              cy="81"
              rx={design.instruments.includes("hires") ? 23 : 16}
              ry="9"
              fill="#203b4b"
              stroke="#b1c9d4"
              strokeWidth="4"
            />
            {tx(
              design.instruments.length > 1 && (
                <rect x="197" y="89" width="13" height="15" fill="#a2b8c2" />
              ),
            )}
          </g>
          <g
            className="svg-module"
            role="button"
            tabIndex={0}
            aria-label={t("Antenna")}
            onClick={() => setSelected("antenna")}
            onKeyDown={(e) => e.key === "Enter" && setSelected("antenna")}
          >
            <path d="M269 107V69" stroke="#c4c6c2" strokeWidth="4" />
            {tx(
              design.systems.antenna !== "patch" ? (
                <>
                  <path
                    d="M237 56Q271 106 302 56Z"
                    fill="#b8c4c9"
                    stroke="#dbe4e8"
                  />
                  <path d="m269 73 2-39" stroke="#e5eced" strokeWidth="2" />
                </>
              ) : (
                <rect
                  x="258"
                  y="61"
                  width="24"
                  height="11"
                  rx="2"
                  fill="#d5dcdc"
                />
              ),
            )}
          </g>
          <g
            className="svg-module"
            role="button"
            tabIndex={0}
            aria-label={t("Propulsion")}
            onClick={() => setSelected("propulsion")}
            onKeyDown={(e) => e.key === "Enter" && setSelected("propulsion")}
          >
            <path d="m226 210-7 21h34l-7-21" fill="#656d77" stroke="#b9c0c5" />
            <path d="m220 232 16 42 16-42" fill="url(#thrust)" />
          </g>
        </g>
      </svg>
      <div className="craft-caption">
        <span>{tx(selected.toUpperCase())}</span>
        <strong>{tx(modules[selected])}</strong>
      </div>
      <div className="module-buttons">
        {tx(
          Object.keys(modules).map((k) => (
            <button
              key={k}
              className={selected === k ? "active" : ""}
              onClick={() => setSelected(k)}
            >
              {tx(k)}
            </button>
          )),
        )}
      </div>
    </div>
  );
}
