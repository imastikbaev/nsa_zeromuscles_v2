import { Category, Design, instruments, MissionId, missions, Mode, scenarios } from './data';
import { calculate, designForMission } from './engineering';

export type TutorialCameraId =
  | 'camera'
  | 'hires'
  | 'radiometer'
  | 'spectrometer'
  | 'radar'
  | 'particles';

export interface FirstMissionOptions {
  mission?: MissionId;
  mode?: Mode;
  scenario?: string | null;
  orbit?: string;
  secondaryInstrument?: string | null;
  powerType?: 'solar' | 'advanced' | 'rtg';
  battery?: number;
  communications?: 'xband' | 'kaband' | 'laser';
  antenna?: 'patch' | 'dish' | 'array';
  computer?: 'standard' | 'redundant' | 'science';
  propulsion?: 'chemical' | 'ion' | 'hybrid';
  fuel?: number;
  thermal?: 'passive' | 'active' | 'shield';
  launcher?: 'swift' | 'atlas' | 'titan' | 'horizon';
}

const CAMERA_PRIMARY_OBJECTIVE: Record<TutorialCameraId, string> = {
  camera: 'imaging',
  hires: 'imaging',
  radiometer: 'climate',
  spectrometer: 'atmosphere',
  radar: 'terrain',
  particles: 'radiation',
};

export function firstMission(
  camera: TutorialCameraId = 'camera',
  panels = 1,
  options: FirstMissionOptions = {},
): Design {
  const missionId: MissionId = options.mission ?? 'earth';
  const mode: Mode = options.mode ?? (options.scenario ? 'challenge' : 'guided');
  const base = designForMission(missionId, mode);
  const missionMeta = missions.find((m) => m.id === missionId) ?? missions[0];

  const selectedInstruments: string[] = [camera];
  if (options.secondaryInstrument && options.secondaryInstrument !== camera) {
    selectedInstruments.push(options.secondaryInstrument);
  }

  const primaryObjective = CAMERA_PRIMARY_OBJECTIVE[camera] ?? 'imaging';
  const validMissionObjectives = missionMeta.objectives.filter((obj) =>
    selectedInstruments.some((instId) =>
      instruments.find((i) => i.id === instId)?.supports.includes(obj),
    ),
  );
  const objectives =
    missionId === 'earth' && !options.mission && !options.scenario
      ? [primaryObjective]
      : validMissionObjectives.length > 0
        ? validMissionObjectives
        : [missionMeta.objectives[0]];

  const validScenario =
    options.scenario &&
    scenarios.some((s) => s.id === options.scenario && s.mission === missionId)
      ? options.scenario
      : null;

  const systems: Record<Category, string> = {
    ...base.systems,
    power: options.powerType ?? base.systems.power,
    communications: options.communications ?? base.systems.communications,
    antenna: options.antenna ?? base.systems.antenna,
    computer: options.computer ?? base.systems.computer,
    propulsion: options.propulsion ?? base.systems.propulsion,
    thermal: options.thermal ?? base.systems.thermal,
  };

  return {
    ...base,
    name:
      missionId === 'earth' && !validScenario
        ? 'Терра / Первый свет'
        : base.name,
    mission: missionId,
    mode: validScenario ? 'challenge' : mode,
    scenario: validScenario,
    orbit: options.orbit ?? base.orbit,
    launcher: options.launcher ?? base.launcher,
    objectives,
    instruments: selectedInstruments,
    systems,
    panels,
    battery: options.battery ?? base.battery,
    fuel: options.fuel ?? base.fuel,
  };
}

export function sufficientPanels(design: Design): number {
  for (let area = 1; area <= 45; area += 0.5) {
    if (calculate({ ...design, panels: area }).designPowerMargin >= 0) return area;
  }
  return 45;
}
