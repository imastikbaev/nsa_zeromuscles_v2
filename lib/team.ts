import type { Design } from './data';
import type { Flight, Result } from './simulation';
export const teamRoles = ['Mission lead', 'Spacecraft engineer', 'Science lead', 'Communications lead'] as const;
export type TeamRole = typeof teamRoles[number];
export interface TeamMember {
    id: string;
    name: string;
    role: TeamRole;
}
export interface TeamRoom {
    id: string;
    revision: number;
    design: Design;
    members: TeamMember[];
    flight: Flight | null;
    result: Result | null;
    log: string[];
}
export interface TeamSession {
    roomId: string;
    token: string;
    memberId: string;
}
export type TeamCommand = {
    type: 'design';
    design: Design;
} | {
    type: 'launch';
} | {
    type: 'advance';
} | {
    type: 'pause';
} | {
    type: 'reset';
} | {
    type: 'respond';
    choice: number;
} | {
    type: 'operations';
    duty?: number;
    downlink?: boolean;
    priority?: string | null;
    disabledInstruments?: string[];
    discard?: boolean;
};
