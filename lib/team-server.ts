import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { teamRoles, type TeamRoom, type TeamSession, type TeamCommand } from './team';
import { copyDesign, decodeDesign, encodeDesign } from './projects';
import { validCheckpoint } from './storage';
import { createFlight, advanceFlight, resolveEvent, scoreFlight, setFlightOperations } from './simulation';
interface StoredRoom extends TeamRoom {
    tokens: Record<string, string>;
}
export class RoomError extends Error {
    constructor(public status: number, message: string) { super(message); }
}
export class RoomStore {
    private rooms = new Map<string, StoredRoom>();
    constructor(private file?: string) {
        if (!file)
            return;
        try {
            const saved = JSON.parse(readFileSync(file, 'utf8'));
            if (saved.version !== 1 || !Array.isArray(saved.rooms))
                throw Error('Invalid room archive');
            for (const r of saved.rooms as StoredRoom[]) {
                decodeDesign(encodeDesign(r.design));
                if (!r.id || !Number.isInteger(r.revision) || !Array.isArray(r.members) || r.members.length < 1 || r.members.length > 4 || !r.tokens || !Array.isArray(r.log))
                    throw Error('Invalid room');
                if (r.flight && !validCheckpoint({ version: 1, design: r.design, flight: r.flight, savedAt: new Date().toISOString() }))
                    throw Error('Invalid room flight');
                if (r.flight && !r.flight.completed) {
                    r.flight.paused = true;
                    r.revision++;
                }
                this.rooms.set(r.id, r);
            }
        }
        catch (e) {
            if ((e as NodeJS.ErrnoException).code !== 'ENOENT')
                throw e;
        }
    }
    private commit(room: StoredRoom) {
        const next = new Map(this.rooms);
        next.set(room.id, room);
        if (this.file) {
            mkdirSync(dirname(this.file), { recursive: true });
            writeFileSync(this.file + '.tmp', JSON.stringify({ version: 1, rooms: [...next.values()] }), { mode: 0o600 });
            renameSync(this.file + '.tmp', this.file);
        }
        this.rooms = next;
    }
    private room(id: string) { const r = this.rooms.get(id); if (!r)
        throw new RoomError(404, 'Room not found.'); return r; }
    private name(value: unknown) { if (typeof value !== 'string' || !value.trim() || value.trim().length > 40)
        throw new RoomError(400, 'Enter a name of 1–40 characters.'); return value.trim(); }
    private public(r: StoredRoom): TeamRoom { const { tokens: _, ...snapshot } = r; return structuredClone(snapshot); }
    private authenticate(r: StoredRoom, token: string) { const member = r.members.find(m => m.id === r.tokens[token]); if (!member)
        throw new RoomError(401, 'Room session expired. Join again.'); return member; }
    create(name: unknown, design: unknown): {
        room: TeamRoom;
        session: TeamSession;
    } {
        if (this.rooms.size >= 100)
            throw new RoomError(409, 'Local room limit reached.');
        const d = decodeDesign(JSON.stringify({ format: 'mission-architect-design', version: 1, design }));
        const id = randomBytes(9).toString('hex'), memberId = randomUUID(), token = randomBytes(24).toString('hex');
        const r: StoredRoom = { id, revision: 0, design: d, members: [{ id: memberId, name: this.name(name), role: teamRoles[0] }], tokens: { [token]: memberId }, flight: null, result: null, log: ['Room created.'] };
        this.commit(r);
        return { room: this.public(r), session: { roomId: id, memberId, token } };
    }
    join(id: string, name: unknown) {
        const r = structuredClone(this.room(id));
        if (r.members.length >= 4)
            throw new RoomError(409, 'This room already has four participants.');
        const memberId = randomUUID(), token = randomBytes(24).toString('hex');
        r.members.push({ id: memberId, name: this.name(name), role: teamRoles[r.members.length] });
        r.tokens[token] = memberId;
        r.revision++;
        r.log = [...r.log, `${r.members.at(-1)!.name} joined.`].slice(-50);
        this.commit(r);
        return { room: this.public(r), session: { roomId: id, memberId, token } };
    }
    read(id: string, token: string) { const r = this.room(id); this.authenticate(r, token); return this.public(r); }
    command(id: string, token: string, revision: number, command: TeamCommand) {
        const r = structuredClone(this.room(id)), member = this.authenticate(r, token);
        if (revision !== r.revision)
            throw new RoomError(409, 'The room changed. Load the latest shared design before publishing, or retry the flight command.');
        if (!command || typeof command.type !== 'string')
            throw new RoomError(400, 'Invalid command.');
        if (command.type !== 'design' && member.role !== 'Mission lead')
            throw new RoomError(403, 'Only the mission lead can command the shared flight.');
        switch (command.type) {
            case 'design':
                if (r.flight)
                    throw new RoomError(409, 'Reset the completed flight before changing the design.');
                r.design = decodeDesign(JSON.stringify({ format: 'mission-architect-design', version: 1, design: command.design }));
                break;
            case 'launch':
                if (r.flight)
                    throw new RoomError(409, 'A shared flight already exists.');
                r.flight = createFlight(r.design);
                break;
            case 'reset':
                if (r.flight && !r.flight.completed)
                    throw new RoomError(409, 'Finish the shared flight before resetting.');
                r.flight = null;
                r.result = null;
                break;
            case 'advance':
            case 'respond':
            case 'pause':
            case 'operations': {
                if (!r.flight || r.flight.completed)
                    throw new RoomError(409, 'No active flight.');
                const old = r.flight;
                if (command.type === 'advance')
                    r.flight = advanceFlight(old, r.design);
                if (command.type === 'respond')
                    r.flight = resolveEvent(old, r.design, command.choice);
                if (command.type === 'pause')
                    r.flight = { ...old, paused: !old.paused };
                if (command.type === 'operations') {
                    const { type: _, ...patch } = command;
                    r.flight = setFlightOperations(old, patch);
                }
                if (old === r.flight)
                    throw new RoomError(409, 'Resume the flight or resolve its pending event first.');
                if (r.flight.completed)
                    r.result = scoreFlight(r.design, r.flight);
                break;
            }
            default: throw new RoomError(400, 'Unknown command.');
        }
        r.revision++;
        r.log = [...r.log, `${member.name}: ${command.type} (revision ${r.revision})`].slice(-50);
        this.commit(r);
        return this.public(r);
    }
}
