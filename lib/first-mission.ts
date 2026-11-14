import { Design } from './data';
import { calculate, designForMission } from './engineering';

export function firstMission(camera: 'camera' | 'hires' = 'camera', panels = 1): Design {
  return { ...designForMission('earth', 'guided'), name: 'Терра / Первый свет', objectives: ['imaging'], instruments: [camera], panels };
}
export function sufficientPanels(design: Design): number {
  for (let area = 1; area <= 20; area += 0.5) {
    if (calculate({ ...design, panels: area }).designPowerMargin >= 0) return area;
  }
  return 20;
}
