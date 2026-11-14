type LedgerRow = { group: string; mass: number; power: number };

/** Every ledger row is assigned once, so the chart reconciles with the design totals.
 * Antenna belongs to communications; bus, fuel, panels and batteries share the final bar.
 * Launch and operations currently contribute zero spacecraft mass and operating power.
 */
export function resourceAllocation(
  ledger: LedgerRow[],
  metric: "mass" | "power",
) {
  const groups = [
    "Payload",
    "Propulsion",
    "Power system",
    "Communications",
    "Onboard computer",
    "Thermal control",
    "Platform & resources",
  ];
  const totals = new Map(groups.map((group) => [group, 0]));
  for (const row of ledger) {
    const group =
      row.group === "Antenna"
        ? "Communications"
        : totals.has(row.group)
          ? row.group
          : "Platform & resources";
    totals.set(group, totals.get(group)! + row[metric]);
  }
  return groups.map((group) => ({ group, value: totals.get(group)! }));
}

/** Explicit presentation example requested for the mass chart; never used by engineering or launch checks. */
export const demonstrationMassAllocation = [
  { group: "Payload", value: 80 },
  { group: "Propulsion", value: 168 },
  { group: "Structure", value: 94 },
  { group: "Power system", value: 78 },
  { group: "Avionics", value: 52 },
  { group: "Thermal control", value: 48 },
  { group: "Communications", value: 42 },
];
