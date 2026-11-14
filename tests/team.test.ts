import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RoomStore } from '../lib/team-server';
import { defaultDesign } from '../lib/data';
import { pendingEvent } from '../lib/simulation';
test('four room members, opaque sessions, revisions and leader-only flight', () => {
    const store = new RoomStore();
    const lead = store.create('Lead', defaultDesign), s = lead.session;
    const guest = store.join(s.roomId, 'Science');
    store.join(s.roomId, 'Engineer');
    store.join(s.roomId, 'Radio');
    assert.throws(() => store.join(s.roomId, 'Fifth'), /four/);
    let r = store.read(s.roomId, s.token);
    assert(!JSON.stringify(r).includes(s.token));
    assert.throws(() => store.read(s.roomId, 'bad'), /session/);
    assert.throws(() => store.command(s.roomId, s.token, 0, { type: 'design', design: defaultDesign }), /changed/);
    assert.throws(() => store.command(s.roomId, guest.session.token, r.revision, { type: 'launch' }), /lead/);
    r = store.command(s.roomId, s.token, r.revision, { type: 'launch' });
    const revision = r.revision;
    r = store.command(s.roomId, s.token, r.revision, { type: 'advance' });
    assert.throws(() => store.command(s.roomId, s.token, revision, { type: 'advance' }), /changed/);
    while (!r.flight!.completed) {
        const e = pendingEvent(r.flight!);
        r = store.command(s.roomId, s.token, r.revision, e ? { type: 'respond', choice: e.choices.findIndex(c => c.fuel <= r.flight!.fuel) } : { type: 'advance' });
    }
    assert(r.result);
    assert.equal(r.result.scoringVersion, 2);
    assert.equal(store.read(s.roomId, guest.session.token).result!.id, r.result!.id);
});
test('local server restart restores sessions and pauses active flight', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mission-room-'));
    try {
        const file = join(dir, 'rooms.json');
        const a = new RoomStore(file);
        const { room, session: s } = a.create('Lead', defaultDesign);
        a.command(s.roomId, s.token, room.revision, { type: 'launch' });
        const b = new RoomStore(file), r = b.read(s.roomId, s.token);
        assert(r.flight!.paused);
        assert.equal(r.members.length, 1);
    }
    finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
