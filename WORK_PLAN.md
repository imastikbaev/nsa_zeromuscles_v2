# Local implementation plan

No deployment, remote commits or hosted services.

1. Real mass allocation: reuse ledger aggregation, dynamic scale, accurate CSV; verify mass/power reconciliation.
2. Flight power: versioned operational state, battery and payload duty controls, energy conservation, persisted checkpoints; test deficits and pause safety.
3. Science data: generated/buffered/downlinked/lost data, finite storage, powered transmitter and operational controls; test conservation and capacity.
4. Orbit and duration: explicit educational observation/eclipse/contact schedules, selectable duration, accelerated bounded simulation, migration; test orbit and duration effects.
5. Debrief and learning: versioned scoring, delivered-data yield, explanations and validated alternatives, translations and learning regression tests.
6. Local teamwork: local authoritative room server, four guest roles, revision checking, reconnect, server flight decisions, UI and integration tests.
7. Verification: dependency remediation, full tests/typecheck/build, desktop/mobile browser flow, local-only handoff.

## Stage 1 plan
Replace demonstration data with current or frozen ledger; use automatic chart scale and label both metrics as estimates. Keep historical example export available only as unused legacy data until cleanup.

Stage 1 complete: real ledger chart and CSV; 56 tests pass.

## Stage 2 plan
Add optional version-2 operational state (legacy flights retain old rules), conservative battery accounting, engine-validated duty/transmitter controls and checkpoint validation. UI follows when data fields are complete.

Stage 2 engine complete: 58 tests pass, energy shortage/recovery and paused commands verified.

## Stage 3 plan
Track data per instrument with GB/day generation, GB buffer and Mbps downlink converted to GB/hour. Account for powered observation time, overflow, manual discard and priority transmission. Add existing-style operational controls and conservative checkpoint validation. Preserve version-1 flights.

Stage 3 complete: 59 tests pass, conservative data ledger and controls added.

## Stage 4 plan
Optional durationMonths 1–120 (absent = original catalog). Orbit operating profiles use six-hour representative cycles, explicitly not propagated trajectories. Integrate half-hour intervals with cached engineering metrics, eclipse charging/discharging, contact and observation windows. Three scientific campaign intervals span the selected duration; commissioning remains four hours. Persist duration in portable designs and identity only when explicitly set, preserving old identities.

Stage 4 complete: 60 tests pass. Duration round-trip, orbit differences and power/data coupling verified.

## Stage 5 plan
Version-2 scoring weights instrument-specific delivered fractions and mission duration; preserve original version-1 path. Show plan/actual and bottleneck, validate suggested configuration changes against launch gates. Update telemetry, report equation, learning instructions, localization and tests. No stored report is recalculated.

Stage 5 complete: 61 tests pass, v2 delivered-data scoring, v1 fallback, explainable recommendations and EN/RU/KK operation labels. Learning comparisons preserve catalog duration.

## Stage 6 plan
Loopback-only HTTP room service with no cloud dependency. Up to four unique guest roles; opaque member tokens; public snapshots never expose tokens. Revision-checked design publication and leader-only launch/advance/response/pause/reset. Persist room sessions atomically in ignored local storage; restore flights paused after server restart. Browser polling, sessionStorage reconnect, explicit load/publish avoids overwriting private work. Integration tests cover capacity, conflict, token isolation, permissions, flight and restart.

Stage 6 complete: 63 tests pass, four-member permissions, stale revisions, shared flight and disk restart covered. Team rooms intentionally bind only to 127.0.0.1; separate browsers/contexts on this machine share rooms.

## Final verification plan
Review dependencies without publishing, regenerate translations, run regression suite/typecheck/static build, exercise desktop/mobile UI and local room HTTP API. Document simulation assumptions and local startup. Keep .local state ignored and all changes uncommitted locally.

## Completed verification

- All six implementation stages completed locally; no push or deployment.
- 65 tests pass, TypeScript passes, production static build passes on Next.js 16.4.6.
- npm audit fix completed with 0 reported vulnerabilities; dependency changes remain local.
- Browser: real mass ledger, room creation, second participant, guest command restriction, full shared flight and matching debrief verified. Completed shared flight: 74/100, 12 science months, 3357.7 GB delivered.
- Browser: 390 px viewport has no horizontal overflow; existing visual style preserved. Temporary viewport override reset.
- Browser: selected 6-month mission, launched solo, disabled the optical camera, paused and reloaded. Version-2 checkpoint restored pause and instrument state; controls disabled while paused.
- Room service restarted successfully from its disk archive; prior sessions reconnected.
- Design detector reported only existing font/layout-transition warnings; no new component findings.
- New files and edits are intentionally uncommitted. Local preview: http://localhost:3001; room service: 127.0.0.1:3002.

Limitations: team rooms are same-computer local prototype; roles assigned in join order, only leader can issue flight commands. Disconnecting a tab does not release its slot. Orbit schedules and power sharing are explicitly educational approximations. Existing detailed event/report prose can still fall back to English; new controls are translated.
