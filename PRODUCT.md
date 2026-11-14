# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Students, aspiring aerospace engineers, educators, and NASA Space Apps Challenge participants/judges working individually or in collaborative teams of up to four roles (`Mission lead`, `Spacecraft engineer`, `Science lead`, `Communications lead`).

## Product Purpose
Mission Architect is an interactive educational space mission design game and preliminary engineering simulator. It bridges the gap between isolated theoretical exercises and system-level mission architecture by letting participants define mission objectives, configure spacecraft and payloads, select launch vehicles and orbits, manage competing resources, and operate an accelerated flight simulation from commissioning to post-mission debrief.

## Positioning
An offline-capable, zero-cloud preliminary mission engineering workbench and operational flight simulator where every choice couples across six physical and programmatic budgets—Mass, Power (BOL/EOL solar degradation & eclipse battery cycles), Cost, Delta-v (Tsiolkovsky rocket equation), Data generation/storage (GB/day vs. buffer), and RF Link bandwidth (Mbps)—with deterministic checkpoints, Climate Watch trade-study lab, and 4-player role-based local team rooms.

## Operating Context
Used in classrooms, hackathons (NASA Space Apps Challenge), and self-paced learning on desktop and mobile browsers (online or offline PWA), in solo or 4-member team sessions, with Russian as the default language. Russian catalog, event, glossary and report translations have regression coverage; English and Kazakh remain selectable.

## Capabilities and Constraints
- Six catalog missions: Earth Observation, Lunar Mission, Mars Orbiter, Asteroid Explorer, Solar Observation, and Deep Space Mission.
- Three game modes: Guided, Challenge (tighter reserves and anomaly risk), and Sandbox, plus five preset challenges and the Climate Watch Mission Lab.
- Real-time engineering calculation engine (`lib/engineering.ts`): wet/dry mass, $\Delta v$, power generation/degradation, link margin, reliability index, and 7 quantitative launch readiness gates.
- Version-2 operational flight engine (`lib/operations.ts`, `lib/orbit-operations.ts`): 6-hour orbital cycles with sunlight, eclipse, ground-station contact, and target observation windows; payload duty cycle, transmitter downlink, priority routing, buffer overflow protection, and stochastic anomaly decisions.
- Local 4-participant team room service (`127.0.0.1:3002`) with revision-checked design publishing and shared server-authoritative flight state.
- Routes: `/` landing, `/learn` tutorial, `/builder` animated builder, `/simulator` engineering workspace, `/launch` standalone cinematic preview.
- Solo workspaces share flight checkpoints and operations controls. Mission time advances through explicit interval commands; cinematic playback never advances mission state.
- Launch and orbit visuals are illustrative SVG scenes, not a 3D physics engine. A propagated-trajectory 3D sandbox remains a future milestone.

## Brand Commitments
- Identity: Mission Architect (`MA`) — NASA editorial typography and mission-operations visual authority (Helvetica/Geist hierarchy, monochrome surfaces, signal red primary actions, telemetry blue selections, crisp hairlines, tabular numerals).
- Trilingual support: English (`en`), Russian (`ru`), Kazakh (`kk`).

## Evidence on Hand
- Complete working engineering and flight engines in `lib/data.ts`, `lib/engineering.ts`, `lib/simulation.ts`, `lib/operations.ts`, `lib/orbit-operations.ts`, `lib/learning.ts`, `lib/team.ts`.
- Visual assets in `public/` (`earth-atmos.jpg`, `favicon.svg`, `icon-192.png`, `icon-512.png`, `fonts/`).

## Product Principles
- **Coupled engineering truth over decorative chrome:** Every visual element should reflect real coupled trade-offs (mass vs. $\Delta v$, instrument science vs. power and downlink bottleneck) using actual catalog numbers from the simulator.
- **Accessible system thinking:** Introduce orbital altitude, eclipse battery drain, specific impulse, and data buffer constraints visually and intuitively without requiring advanced prior coursework.
- **Team and solo parity:** Highlight both individual trade-study mastery and four-role collaborative mission control.
- **Zero-compromise offline craft:** Self-contained assets, fast static rendering, and crisp responsive layout across desktop and mobile viewports.
