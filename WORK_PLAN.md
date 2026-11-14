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


## Dias animation integration — 2026-11-14

Merged upstream `f2174a4` into the local manual-flight branch. Both `/builder/` and `/simulator/` now use explicit interval commands, shared checkpoints and the animated orbit scene. Tutorial launch goes to the animated builder. The builder freezes hardware during flight, shows interval reports and reports storage failures. Completed checkpoints are retained when report saving fails. Scene CSS is shared independently of builder layout; SVG IDs are per instance. Launch replay respects reduced motion and its modal supports native keyboard focus containment and Escape.

Verification: 75 automated tests pass, including two tutorial-to-debrief checkpoint round-trips. Production build and TypeScript checked. Upstream launch route served HTTP 200 before integration. Browser visual verification remains incomplete: macOS denies Chromium's MachPortRendezvousServer startup. This is not a visual sign-off.

Next product milestone: a real 3D sandbox. Current orbit and launch scenes are SVG illustrations; mission operations use simplified time intervals. First implement a deterministic position/velocity integrator with gravity and thrust, collision/escape checks and fixed simulation steps; test circular orbit stability and fuel consumption. Then add a 3D renderer, camera controls and trajectory preview driven by that state. Finally connect a sandbox scenario (Earth launch/orbit), reset/save/load, time acceleration and resource/event controls. Keep cinematic time separate from mission physics.

## 3D launch cinematic — 2026-11-14

Scope adjusted at the user's request: a scripted launch cutscene, not a new flight physics engine.
- Updated local branch to upstream `543863a` before implementation.
- Lazy-loaded Three.js scene shares the existing 24-second preview clock: launch pad, ascent, stage separation, Earth and spacecraft array deployment. Vehicle scale, panel area, antenna and camera follow the design.
- Shared pause/resume, skip and replay controls; reduced-motion preference displays the final frame. No mission checkpoints, fuel or elapsed mission time are changed.
- SVG fallback remains available if WebGL initialization or rendering fails. Textures are bundled locally; resize, GPU resources and context-loss cleanup are handled.
- Removed interpolated altitude/speed/fuel readouts from the cutscene; display actual design parameters instead.
- Verification: 78 existing tests, TypeScript and production build passed. Additional temporary DOM integration checks passed for controls, completion callbacks, reduced motion, checkpoint isolation, SVG fallback and cleanup.
- Visual WebGL playback remains unverified because the environment blocks browser startup. DOM checks do not verify rendering quality.
- PR #1 was not merged: GitHub integration rejected marking the draft ready with `Resource not accessible by integration`.

### Launch centre detail pass
- Added a fictional spaceport with barrel-roof hangars, mission-control windows and dish, propellant tanks/feed pipes, access roads, service truck, lightning towers and flame trench.
- Opening camera flies from a campus overview to the launch pad; the tower service arm retracts before liftoff. Portrait framing increases camera distance.
- Added soft shadows, atmospheric haze, vehicle seams, a ladder and lattice bracing, exhaust illumination and soft smoke sprites. Pixel ratio capped at 2; shadow map capped at 1024.
- Scene traversal releases geometry/material resources, smoke texture and shadow targets on unmount.
- Existing tests and DOM cutscene control/fallback checks pass; actual GPU rendering still requires visual verification.

### Detailed vehicle pass
- Replaced primitive rocket geometry with a fictional multi-stage launch vehicle: continuous lathed fairing, radiused skirt, connected interstage, seven hollow engine bells, an upper-stage nozzle, pipework, cooling rings, servicing ports, fairing latches and instanced fasteners.
- Authored local 2K body markings plus roughness/bump maps; surface coordinates use physical height to avoid stretched labels. Static booster fittings are batched by material.
- Added local reflection lighting, animated translucent exhaust, whole-vehicle inspection and engine close-up cameras. Skip/replay return to the cinematic view; inspecting never advances a mission.
- Blender was attempted but crashed in Metal backend detection before scene loading. Geometry was instead inspected through a CPU-rendered preview of the actual Three.js model. Two review passes corrected an interstage gap, engine-bell spacing and UV stretching.
- CPU previews are geometry reviews, not screenshots of browser rendering or proof of photorealism. Final WebGL visual quality remains unverified in this environment.

### Environment and hangar pass
- Replaced the green circular ground primitive with deterministic dry terrain: gravel surface detail, varied mineral colours, level foundations and distant low ridges fading into haze.
- Rebuilt hangars as hollow shells with shallow curved roofs, sliding door panels, recessed entrances, roof ribs, clerestory glazing, gutters, downpipes, vents, safety bollards and service doors.
- Added concrete expansion joints and tyre tracks. Moved the main road clear of mission control and added road shoulders and marked parking.
- Batched static architecture into nine material draws; terrain uses one mesh. All new surface textures are disposed on scene unmount.
- Added a paused Spaceport camera option. A CPU geometry render was inspected; final browser GPU rendering remains unverified.

### Continuous vehicle and landscape
- Removed the separate simplified orbital-stage cylinder. The same detailed rocket and upper-stage objects now persist across the atmospheric/space camera transition, with continuous position and attitude at the cut.
- Split the fairing into two independently ejected shells. The payload is fitted inside the fairing, separates after shell release and unfolds its arrays afterwards; its scale is constant throughout.
- Added deterministic instanced scrub outside the campus, subtle wind motion tied to preview time, and a distant rocky mountain ridge with extended atmospheric haze.
- Inspection and replay restore the intact vehicle; instanced GPU resources are released when the scene closes.
- TypeScript, production build and all 78 existing tests pass. These checks do not constitute visual validation of the GPU animation.

### Launch integration and publication checks
- New missions automatically show a modal cinematic in the intuitive builder, engineering workspace and first-mission tutorial. Completion, Skip and Escape return to flight control without advancing the saved checkpoint.
- Restored flights do not replay the launch; the independent preview remains available.
- Verified with a DOM integration run: launching opens the cinematic, Skip preserves the checkpoint exactly, restoring avoids a second intro, and workspace handoffs still finish a full mission. 78 tests and production build passed.
- Before publication, remote heads were checked: feature branch `543863a`, main `f2174a4`; local HEAD matched the feature branch and contained main. No new upstream changes required integration.
