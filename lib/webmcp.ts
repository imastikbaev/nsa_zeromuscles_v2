"use client";
import { useEffect, useRef } from "react";
import { Design, missions } from "./data";
import { calculate, designForMission } from "./engineering";
import { flushSync } from "react-dom";
interface Context {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
}
export function useMissionTools(
  design: Design,
  setDesign: (d: Design) => void,
  inFlight: boolean,
) {
  const state = useRef({ design, setDesign, inFlight });
  state.current = { design, setDesign, inFlight };
  useEffect(() => {
    const context = (document as Document & { modelContext?: Context })
      .modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    const tools = [
      {
        name: "read_mission_engineering",
        description:
          "Read the current mission design, engineering metrics, and launch blockers.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => {
          const m = calculate(state.current.design);
          return {
            design: state.current.design,
            mass: m.mass,
            cost: m.cost,
            powerMargin: m.margin,
            endOfLifePowerMargin: m.designPowerMargin,
            requirements: m.requirements,
            equipmentLedger: m.ledger,
            reliability: m.reliability,
            science: m.science,
            launchBlockers: m.issues,
          };
        },
      },
      {
        name: "configure_mission_destination",
        description:
          "Replace the current design with a starting design for a destination. Does not launch. Unavailable during flight.",
        inputSchema: {
          type: "object",
          properties: {
            destination: { type: "string", enum: missions.map((m) => m.id) },
          },
          required: ["destination"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: (input: unknown) => {
          if (
            !input ||
            typeof input !== "object" ||
            !("destination" in input) ||
            Object.keys(input).length !== 1 ||
            !missions.some((m) => m.id === input.destination)
          )
            throw new Error("Choose a valid destination.");
          if (state.current.inFlight)
            throw new Error("Cannot edit a mission in flight.");
          if (state.current.design.scenario)
            throw new Error(
              "Leave the active challenge before changing destinations.",
            );
          const next = designForMission(
            input.destination as Design["mission"],
            state.current.design.mode,
          );
          flushSync(() => state.current.setDesign(next));
          return {
            mission: next.mission,
            launchBlockers: calculate(next).issues,
          };
        },
      },
    ];
    for (const tool of tools)
      try {
        Promise.resolve(
          context.registerTool(tool, { signal: controller.signal }),
        ).catch(() => {});
      } catch {}
    return () => controller.abort();
  }, []);
}
