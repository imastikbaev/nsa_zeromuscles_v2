# Mission Architect

An installable, offline-capable preliminary mission engineering workspace and spaceflight simulation for students. Built with **Next.js App Router, TypeScript, React, and Tailwind CSS**. All engineering calculations, simulation, and persistence run on the device; no backend or API key is required.

## Run

Requires Node.js 22+ and npm.

```sh
npm install
npm run dev
```

Open http://localhost:3000. For the installable production PWA:

```sh
npm run build
npm run preview
```

Open http://localhost:3001. Install through the **Install app** button or your browser menu. Safari on iOS: **Share → Add to Home Screen**; Safari on macOS: **File → Add to Dock**. Installation requires HTTPS or localhost. The development server deliberately does not register an offline worker.

After the first successful online production load, the complete app shell and images are cached. Installed or browser-based, the app then opens and runs without a network connection. Updates show an **Update app** button. Browser storage retains the current design and up to 50 completed flight records. Active flights are checkpointed after every phase and response. Reopening the app restores the mission on pause with its resources, decision history, and random-generator state intact. Review settings and explicitly calculate the next interval when ready; reloading cannot reroll a pending event. Completed flights are saved once, then their checkpoint is cleared. Clearing site data removes local saves.

## Engineering workbench

The full-viewport workbench uses a 220 px labeled navigation rail, a scrollable telemetry canvas, and a docked 360 px white configuration inspector. Below 1000 px the inspector moves into the page; on mobile the rail becomes a horizontal navigation strip. The header uses a vector reference ground track instead of a decorative planet. Inclination and eccentricity are illustrative catalog values (`lib/workbench.ts`), not propagated orbital solutions; altitude and period come from the existing orbit catalog.

The Overview presents the current mission, budget and mass headroom, end-of-life power reserve, and delta-v. Both Mass and Power charts use the current design ledger with a dynamic axis. Freezing telemetry preserves a design snapshot for either metric. CSV exports identify the mission and the values as design estimates.

The readiness panel shows every launch blocker with a direct link to the relevant builder stage. Expand Resource checks for actual values, limits, and pass/fail status; export the saved design review or continue to prelaunch review once all blockers are resolved. Pending inspector edits disable section changes in this panel until saved or canceled.

The white configuration panel edits the mission name and compatible orbit. Cancel discards drafts; Validate saves and reports launch blockers. Auto-verify checks drafts immediately. Telemetry sync freezes or resumes the allocation chart; these are computed estimates, not spacecraft measurements. New mission backs up the current workspace before switching destinations.

Dark and light themes and English/Russian/Kazakh preferences persist locally. The overview and core builder have translated copy; some detailed simulation and learning content still falls back to English. Translation sources live in `lib/i18n/*.tsv`; regenerate the catalog with `node scripts/build-translations.mjs`. The bundled Geist font uses the SIL Open Font License (see `public/fonts/OFL.txt`).

## Play

1. Select one of six mission destinations and the science objectives.
2. Choose payload instruments, propulsion, power, communications, computer, thermal protection, and antenna. Adjust fuel, battery capacity, and solar area.
3. Select a compatible launch vehicle and trajectory.
4. Resolve each critical constraint in the live resource panel, name the mission, and launch.
5. Respond to three randomly selected mission events. Safe choices protect hardware; riskier choices can gain science. Solo flight waits for your confirmation before every interval; resolve pending events before proceeding.
6. Review the grade, exact weighted score contributions, decision-by-decision science/fuel/damage changes, achieved objectives, and final telemetry. Download a text report or copy a summary. Compare local flight records; click a mission name to reopen its debrief.

Guided mode gives starter advice. Challenge mode tightens budget, mass headroom, delta-v requirements, and event risk. Sandbox removes the budget cap while retaining physical constraints. Five preset challenges provide distinct objectives. An active-challenge card keeps the target and limits visible; mission destination and game mode stay fixed until you leave the challenge. Sandbox flights cannot earn challenge completion. The local advisor is explicitly rule-based, not a remote AI service.

## Climate Watch mission lab (v1.4)

Open **Mission lab** from navigation or the builder's activity card. The guided activity connects the product's features into one learning story: repair an underpowered Earth-observation design, compare two viable concepts, justify a choice, fly it, and reflect on the result.

The brief requires imaging and climate objectives in Sun-synchronous orbit, Guided mode, a $180M budget, an 850 kg absolute mass ceiling, at least 10% mass reserve, 20% end-of-life load reserve, and 2% annual solar degradation. Recording a concept requires all ordinary launch checks to pass too. The recommended comparison is an optical camera versus a high-resolution camera, both with a thermal radiometer; other solutions are allowed.

Five checkpoints are evidence-based: viable A, distinct viable B, selected concept with written reasoning and a disadvantage, a completed flight of that exact configuration after the concept was recorded, and a post-flight reflection. A failed flight counts as an experiment. Reflections are linked to the specific flight; a newer matching flight requires an updated reflection. Text is recorded for human discussion, never automatically graded for quality. Changing a concept clears its selection and reflection. Configuration identity excludes the callsign and selection order but includes hardware, objectives, resources, mode, orbit, scenario, and engineering requirements. Legacy flights without configuration identity cannot earn lab credit.

The activity, notes, and two snapshots persist separately from the working design. Switching designs first backs up current work to the library, and the original workspace can be restored from the activity footer. A matching flight returns directly to the lab. Export the learning report to share concepts, arguments, actual event outcomes, and a facilitator discussion rubric. The lab remains local-only. Optional local team rooms are described below.

## Flight recorder

New flights store an engineering-state sample at launch, each phase transition, and each command response. The interactive recorder plots health, reserve propellant, projected science, and nominal power headroom after event damage. Select a sample to inspect its phase and value or follow the latest sample. History persists in checkpoints, completed debriefs, records, and text reports. Old flights remain compatible; resumed legacy flights begin recording from their next transition. These are discrete simulator states, not fabricated continuous sensor readings or collected climate data.

Event commands display the actual reliability- and difficulty-adjusted damage probability used by the simulator. Passive engine advancement remains blocked while paused. Solo flight uses explicit commands to calculate one interval or resolve one event, then returns to planning hold. Instrument settings can be edited during that hold without advancing time; completed flights remain immutable. Reported damage is capped at remaining health.

## Mission library

Open **Mission library** in the builder to keep up to 12 named design snapshots. **Compare** shows saved-minus-current changes in seven engineering metrics and lists launch blockers. Different destinations or game rules are called out. **Open** preserves the current design in a backup slot before switching; a full library blocks switching if that backup is needed. Remove a project with the trash button and use **Undo removal** to restore the most recently removed entry while the library remains mounted.

**Export design** downloads a versioned JSON file. **Import design** validates a file up to 64 KB and adds it as a separate project for review without changing the working mission. Only recognized design fields are accepted; scores, flight state, unknown components, duplicate instruments/objectives, and inconsistent challenge settings cannot be imported. Local storage failures are reported, and file exports remain available as a backup.

## Engineering workspace (v1.3)

Switch from **Configuration** to **Engineering analysis** to review the design:

- **Requirements:** seven quantitative checks with actual values, limits, calculation basis, and links to the relevant editor. Objective traceability lists which instruments support each science goal. Open actions include all launch blockers, including destination and thermal incompatibility.
- **Equipment & budgets:** an auditable ledger of structure, instruments, subsystems, arrays, battery, fuel, launch, and operations. The calculation engine sums these exact rows for wet mass, cost, and operating load. Launch and operations contribute cost only. A power chart separates initial generation, end-of-life generation, loads, and reserves.
- **Trade study:** preview the coupled consequences of additional solar area, propellant, or battery capacity. Each option recomputes every constraint, and applied changes can be undone before further edits.
- **Design requirements:** reserve 0–30% of available launch mass, require 0–50% extra power above operating load, and specify 0–5% annual solar degradation. These settings are optional for legacy saves (default zero), persist through export/import, and are enforced by the same launch checks used by the simulation.
- **Design report:** export the requirement evidence, configuration ledger, coverage, open actions, and assumptions before launch.

Usable mass capacity = catalog capacity after scenario/difficulty limits × (1 − mass reserve). End-of-life solar output = initial solar output × (1 − annual loss)^(duration in years). RTG generation is held constant in this model. Required end-of-life generation = operating load × (1 + load reserve).

This is **not a flight-qualified design tool**. Equipment is fictional; trajectory, illumination, and attenuation use catalog factors. Ephemeris propagation, detailed RF link budgets, thermal/structural/attitude solvers, launcher performance curves, duty cycles, conversion losses, battery aging, and nuclear decay are outside scope. The reliability percentage is an educational index, not a validated survival probability. These limits appear in the review and exported report.

## Architecture

- `app/`: Next.js page, metadata, and responsive visual theme.
- `components/mission-control.tsx`: top-level client state, navigation, builder, and live resource panel.
- `components/builder-stages.tsx`: spacecraft, launch vehicle, and trajectory editors.
- `components/visuals.tsx`: orbit and interactive spacecraft diagrams.
- `components/flight.tsx`: timed simulation controls, autosave checkpoints, and mission debrief.
- `components/mission-lab.tsx` and `lib/learning.ts`: guided activity, validated learning evidence, persistence, and report export.
- `lib/design-identity.ts`: canonical engineering configuration identity for matching flight evidence.
- `components/telemetry-chart.tsx` and `lib/telemetry.ts`: interactive, persisted flight-state recorder.
- `components/decision-impact.tsx`: decision outcomes and weighted score explanations.
- `components/explore.tsx`: preset challenges, leaderboard, glossary, and advisor.
- `components/project-library.tsx`: named snapshots, imports/exports, comparison, safe switching, and undo.
- `lib/projects.ts`: portable design schema, import validation, local project persistence, and comparison calculations.
- `components/install-control.tsx`: PWA installation, offline indicator, and updates.
- `lib/data.ts`: typed mission, component, launcher, orbit, objective, and challenge catalogs.
- `lib/engineering.ts`: equipment ledger, engineering formulas, end-of-life requirements, and constraint evaluation.
- `lib/design-review.ts`: requirement evidence, objective traceability, sensitivity alternatives, and report serialization.
- `components/engineering-review.tsx`: editable design assumptions, requirement and equipment tables, power chart, and trade study.
- `lib/simulation.ts`: event catalog, immutable flight transitions, and scoring.
- `lib/storage.ts`: saved-design validation, browser storage, report export.
- `lib/webmcp.ts`: optional feature-detected tools using the same mission state as the UI.
- `public/manifest.webmanifest`: app installation metadata and icons.
- `scripts/build-sw.mjs`: hashes the final export and generates a versioned service worker containing the complete offline asset list.
- `scripts/serve.mjs`: dependency-free local server for the production export.
- `tests/`: engineering and simulation tests.

## Simplified engineering model

Units: mass in kg, cost in millions of USD, power in W, energy in kWh, delta-v in m/s, data in GB, bandwidth in Mbps.

- Wet mass = 180 kg bus + component mass + fuel + 7 kg/m² array + 12 kg/kWh battery.
- Cost = spacecraft integration + component costs + launch + consumables + duration-based operations.
- Solar generation = array area × 155 W/m² × orbit illumination × technology factor; RTGs add continuous generation.
- Power margin = generation − baseline and component loads. Battery reserve covers a simplified 36-minute eclipse (or short RTG interruption).
- Delta-v = specific impulse × 9.80665 × ln(wet mass / dry mass). The inverse equation estimates trajectory propellant. Launch-vehicle capacity represents delivery to the selected destination; spacecraft delta-v covers subsequent maneuvering.
- Link capacity = transmitter rate × antenna gain / a destination attenuation factor; sufficient bandwidth and two-day full-duty storage are launch constraints.
- Reliability = geometric mean of component reliabilities × launcher reliability, minus environmental, deployment, and duration penalties.
- Science = instrument value × orbit opportunities × objective coverage bonus, then event changes and spacecraft health.
- Score = 40% mission success + 30% science capped at 100 + 15% engineering efficiency + 15% budget efficiency. Grades: S ≥ 88, A ≥ 76, B ≥ 62, otherwise C. Health below 25% or no completed objectives means Mission Failed. Failure caps the score at 30.
- Mission success weights health (50%), objective completion (30%), and design reliability (20%). A mission needs at least 35% health and 15 final science to complete objectives.
- Final mass is dry mass plus remaining propellant, not the initial launch mass.

These are educational approximations, not real flight-design predictions. Vehicles and component specifications are fictional. Other-body visuals are schematics; the Earth visualization uses the texture distributed with the [Three.js planet example](https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg).

## Validation

```sh
npm test
npm run typecheck
npm run build
```

The tests cover all mission starters, physical/budget constraints, rocket-equation behavior, communication limits, event pause/resume, every anomaly response, complete mission scoring, failures, corrupt saved designs/checkpoints, pause restoration, deterministic replay, scoring contributions, challenge eligibility, design import/export round-trips, invalid files, project backup capacity, storage failures, comparative engineering trade-offs, ledger reconciliation, reserve-based launch gates, solar degradation, design report evidence, persisted requirements, learning checkpoint eligibility, canonical configuration matching, teaching report exports, telemetry continuity, and paused-command safety. The UI supports keyboard focus, reduced-motion preferences, mobile navigation, and a sticky mobile resource summary. Local QA covers full mission launch and decisions, flight records, component changes, installation help, and responsive layouts.

Deployment: serve `out/` from an HTTPS static host. Do not upload `.next/` as the site root. Rebuild after changes so the service-worker asset list and version remain consistent. No server runtime is required.

## Mission operations visual system (v1.5)

The NASA-inspired editorial treatment uses a Helvetica system-font stack, a light masthead, black navigation, squared controls, red primary actions, and blue configuration selections. `app/mission-theme.css` owns the presentation layer; `app/globals.css` provides component layout. No remote fonts are required, so the same design works offline. The active-project register displays actual mission/orbit and launch-check state. Status text and icons accompany color, and a skip link supports keyboard navigation.

The design references [NASA’s public typography guidance](https://www.nasa.gov/nasa-brand-center/brand-guidelines/). Mission Architect uses its own MA identity and is an independent educational simulator, not a NASA product.


## Local operations and teamwork update

No cloud deployment is needed. Install with `npm ci`, then run `npm run build` and `npm run preview` (http://localhost:3001). In a second terminal run `npm run team` (127.0.0.1:3002). Both preview and room service bind to loopback; nothing is published externally. `npm run dev` is the alternative frontend development command.

Open **Local team room**, enter a guest name and create a room from the current design. Open its invitation URL in another independently opened tab/browser and join (up to four members). Membership is saved per tab in sessionStorage, so reload reconnects; disconnecting clears that tab's session but does not release its role. Keep the original leader tab/session to resume that room. A fresh room can be created at any time. Roles are assigned in join order; all members can propose a complete design, while only the mission lead launches and commands the flight. The leader explicitly advances each phase so the group has time to discuss.

To edit: **Load shared design** (backs up private work), edit in the normal builder, then **Publish current design**. Publishing uses the loaded revision. If someone has changed the room, publication is rejected without erasing local edits. The shared flight uses the shared design, never an unpublished draft. Room polling runs once per second. The server is authoritative for randomness, events, score and command permissions. Room files and membership tokens are kept only in ignored `.local/team-rooms.json`; restarting restores sessions and pauses active flights. A closed tab without its session cannot reclaim its previous membership. Local rooms are a same-computer prototype, not an Internet multiplayer service.

### Version-2 simulation assumptions

- New design exports and flight checkpoints use envelope version 2; imports/checkpoints from version 1 remain readable. New flights carry an operations state with version 2. Saved flights without it keep their original rules; historical results are not recalculated. Reports identify the scoring version.
- Instrument catalog `data` means GB per 24 hours at continuous full duty. Launch storage checks reserve two days of such data. During flight, each instrument tracks generated, buffered, delivered and lost GB. Transmission uses `Mbps × 3600 / 8000` GB/hour. Data is generated before transmission within each half-hour interval, so overflow conservatively loses the excess. Priority controls which instrument transmits first. Manual discard also counts as lost data.
- Orbit profiles use representative six-hour cycles, not propagated trajectories. The profile specifies fractions for observation, eclipse and ground contact. Half-hour steps sample these windows. Four commissioning hours precede three equal accelerated scientific intervals covering `duration × 30 × 24` hours. Changing duration (1–120 months, or original catalog default) affects costs, aging and science opportunity.
- Solar generation follows the existing destination coefficient, explicit eclipse windows and annual degradation. RTG baseline stays constant. Battery charge/discharge uses W × hours / 1000 kWh and is capacity-limited. If requested energy cannot be served, operation throughput is proportionally reduced; this is a teaching approximation to safe mode, not detailed power-system switching. Instrument duty, individual instrument enable/disable and transmitter commands affect load and science throughput. Event power loss persists.
- Version-2 science = max(0, design science + event science) × health × delivered yield × duration benefit. Yield is the science-value-weighted delivered fraction of each instrument's planned observations. Duration benefit is sqrt(selected duration / catalog duration), capped at 2. Generated/buffered data alone earn no science. Objectives require at least one supporting instrument with delivered data, plus the existing health/science thresholds. Engineering headroom accounts for persistent event power loss.
- Reports include planned/actual campaign duration, data balance and unserved energy. Suggested hardware alternatives are rechecked for launch feasibility and show mass/cost changes; they are not promises of higher scores.
- Climate Watch retains catalog duration to keep concept comparisons fair. New control labels have English, Russian and Kazakh translations; existing detailed event/report prose may still fall back to English.

Validation adds energy depletion/recovery, individual instrument controls, conservation of data, overflow/discard, delivered-data scoring, duration import/export, room capacity/conflicts/permissions, server-computed flights and restart restoration. Run `npm test`, `npm run typecheck`, `npm run build`.


## Manual flight planning

Solo flight has no automatic timer. Configure instrument duty, enabled instruments and transmission while time is stopped, then select **Calculate next interval**. The screen displays the duration before confirmation: each commissioning step is one hour; each of the three science intervals is one third of the selected campaign. Pending events must be answered before the next interval. Answering an event does not advance the operational clock.

Each calculated interval reports generated, delivered, overflow-lost and remaining data, starting/ending battery charge and cumulative unserved energy for that interval. Explanations identify reduced collection settings, transmitter shutdown, power shortages and overflow. Battery endpoints alone do not indicate whether a shortage occurred during the interval. Manual buffer discard remains visible in the cumulative lost-data counter; it is not labeled as interval overflow. The last interval report survives reloads and is included in the saved debrief. Legacy flights without operational state retain their previous calculations and use manual phase progression.

The asteroid trajectory now resolves its explicit `transfer` operating profile. The tests cover catalog/profile consistency, manual progression, event gating, paused configuration, saved report validation and final interval persistence.


### Русская локализация

Русский — язык первого открытия, включая статическую HTML-страницу и установку приложения. Полный русский словарь дополнен в `lib/i18n/ru.json`; общие переводы трёх языков остаются в TSV-каталогах. Перевод выполняется при отображении и выгрузке текстовых отчётов. Идентификаторы компонентов и формат JSON-проектов не переводятся. Настройки языка версии 2 начинают с русского; последующий выбор пользователя сохраняется. Поиск справочника работает по русским терминам и объяснениям.
