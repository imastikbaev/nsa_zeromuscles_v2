"use client";
import { useEffect, useState, useRef } from 'react';
import type { Design } from '@/lib/data';
import type { TeamRoom, TeamSession, TeamCommand } from '@/lib/team';
import { pendingEvent, phases } from '@/lib/simulation';
import { calculate } from '@/lib/engineering';
import { OperationsControl } from './operations-control';
import { ResultView } from './flight';
import { useI18n } from './preferences';
const KEY = 'mission-architect:team-session';
const endpoint = 'http://127.0.0.1:3002';
export function TeamPanel({ design, onLoad }: {
    design: Design;
    onLoad: (d: Design) => boolean;
}) {
    const { t } = useI18n();
    const [session, setSession] = useState<TeamSession | null>(null), [room, setRoom] = useState<TeamRoom | null>(null);
    const [name, setName] = useState(''), [code, setCode] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [online, setOnline] = useState(false);
    const [baseRevision, setBaseRevision] = useState<number | null>(null);
    const active = useRef<TeamSession | null>(null);
    useEffect(() => {
        try {
            const s = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
            if (s?.roomId && s?.token && s?.memberId) {
                active.current = s;
                setSession(s);
            }
        }
        catch { }
        setCode(new URLSearchParams(location.search).get('room') ?? '');
    }, []);
    async function request(path: string, body?: unknown, s = active.current) {
        const response = await fetch(endpoint + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(s ? { Authorization: `Bearer ${s.token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(5000) });
        const data = await response.json();
        if (!response.ok)
            throw Error(data.error ?? 'Room request failed.');
        return data;
    }
    useEffect(() => {
        if (!session)
            return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout>;
        async function poll() { try {
            const r = await request(`/rooms/${session!.roomId}`, undefined, session);
            if (!cancelled) {
                setRoom(previous => !previous || r.revision >= previous.revision ? r : previous);
                setOnline(true);
            }
        }
        catch {
            if (!cancelled)
                setOnline(false);
        }
        finally {
            if (!cancelled)
                timer = setTimeout(poll, 1000);
        } }
        void poll();
        return () => { cancelled = true; clearTimeout(timer); };
    }, [session]);
    async function connect(join: boolean) {
        setBusy(true);
        setMessage('');
        try {
            const data = await request(join ? `/rooms/${code.trim()}/join` : '/rooms', join ? { name } : { name, design }, null);
            active.current = data.session;
            setSession(data.session);
            setRoom(data.room);
            setOnline(true);
            setBaseRevision(join ? null : data.room.revision);
            try {
                sessionStorage.setItem(KEY, JSON.stringify(data.session));
            }
            catch {
                setMessage(t('Session storage unavailable. Keep this tab open.'));
            }
        }
        catch (e) {
            setMessage((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    async function command(c: TeamCommand, revision = room?.revision) {
        if (!session || revision === undefined)
            return;
        setBusy(true);
        setMessage('');
        try {
            const r = await request(`/rooms/${session.roomId}/commands`, { revision, command: c });
            setRoom(r);
            setOnline(true);
            if (c.type === 'design')
                setBaseRevision(r.revision);
        }
        catch (e) {
            setMessage((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    function disconnect() { active.current = null; setSession(null); setRoom(null); setBaseRevision(null); try {
        sessionStorage.removeItem(KEY);
    }
    catch { } }
    const lead = room?.members.find(m => m.id === session?.memberId)?.role === 'Mission lead';
    const event = room?.flight ? pendingEvent(room.flight) : undefined;
    return <details className="team-panel operations-panel" open={session !== null || undefined}>
  <summary>{t('Local team room')}</summary>
  {!session ? <>
   <p>{t('Up to four participants in separate browsers on this computer. Start the local room service first.')}</p>
   <div className="team-actions"><label>{t('Your name')}<input value={name} maxLength={40} onChange={e => setName(e.target.value)}/></label>
   <button className="primary-button" disabled={busy || !name.trim()} onClick={() => void connect(false)}>{t('Create room from current design')}</button>
   <label>{t('Room code')}<input value={code} maxLength={18} onChange={e => setCode(e.target.value)}/></label>
   <button className="secondary-button" disabled={busy || !name.trim() || !/^[a-f0-9]{18}$/.test(code)} onClick={() => void connect(true)}>{t('Join room')}</button></div>
  </> : <>
   <p role="status">{t(online ? 'Connected to local room' : 'Room service unavailable. Reconnecting…')}</p>
   <button className="secondary-button" onClick={disconnect}>{t('Disconnect this tab')}</button>
   {room && <>
    <p>{t('Room code')}: <code>{room.id}</code> · {t('Revision')}: {room.revision}</p>
    <label>{t('Invitation link')}<input readOnly value={typeof window === 'undefined' ? '' : `${location.origin}/simulator/?room=${room.id}`} onFocus={e => e.target.select()}/></label>
    <ul>{room.members.map(m => <li key={m.id}>{t(m.name)} — {t(m.role)}</li>)}</ul>
    <p>{t('Shared design')}: {t(room.design.name)} · {calculate(room.design).mass.toFixed(1)}{t(" kg · $")}{calculate(room.design).cost.toFixed(1)}{t("M")}</p>
    {!room.flight ? <>
     <p>{t('Load the shared design, edit it in the builder, then publish. Conflicting changes are rejected; your private edits are preserved.')}</p>
     <div className="team-actions">
      <button className="secondary-button" disabled={busy || !online} onClick={() => { if (onLoad(room.design)) {
                    setBaseRevision(room.revision);
                    setMessage(t('Shared design loaded.'));
                }
                else
                    setMessage(t('Backup failed. Free a mission library slot first.')); }}>{t('Load shared design')}</button>
      <button className="secondary-button" disabled={busy || !online || baseRevision === null} onClick={() => void command({ type: 'design', design }, baseRevision!)}>{t('Publish current design')}</button>
      {lead && <button className="primary-button" disabled={busy || !online || calculate(room.design).issues.length > 0} onClick={() => void command({ type: 'launch' })}>{t('Launch shared mission')}</button>}
     </div>
     {calculate(room.design).issues.length > 0 && <ul>{calculate(room.design).issues.map(i => <li key={i.label}>{t(i.label)}</li>)}</ul>}
    </> : room.result ? <>
     <ResultView result={room.result} onReturn={() => void command({ type: 'reset' })} returnDisabled={!lead || busy || !online} returnLabel={lead ? t('Reset shared mission') : t('Only the mission lead can reset')}/>
    </> : <>
     <h3>{t(phases[room.flight.phase])} · {room.flight.health}%</h3>
     <p>{t('The mission lead confirms each phase and command. All participants see the same server-calculated flight.')}</p>
     <fieldset disabled={!lead || busy || !online} className="team-flight-controls">
      <legend>{t('Shared flight commands')}</legend>
      <button className="secondary-button" onClick={() => void command({ type: 'pause' })}>{t(room.flight.paused ? 'Resume' : 'Pause')}</button>
      <button className="primary-button" disabled={!!event || room.flight.paused} onClick={() => void command({ type: 'advance' })}>{t('Advance next phase')}</button>
      <OperationsControl design={room.design} flight={room.flight} onChange={f => { const o = f.operations!; void command({ type: 'operations', duty: o.duty, downlink: o.downlink, priority: o.priority, disabledInstruments: o.disabledInstruments, discard: o.data.some((r, i) => r.lost > room.flight!.operations!.data[i].lost) }); }}/>
      {event && <section><h4>{t(event.title)}</h4><p>{t(event.description)}</p>{event.choices.map((c, i) => <button className="secondary-button" key={c.label} disabled={room.flight!.paused || c.fuel > room.flight!.fuel} onClick={() => void command({ type: 'respond', choice: i })}>{t(c.label)} ({c.science >= 0 ? '+' : ''}{c.science} · {c.fuel}{t(" kg)")}</button>)}</section>}
     </fieldset>
    </>}
    <details><summary>{t('Room activity')}</summary><ol>{room.log.slice(-10).map((entry, i) => <li key={`${i}-${entry}`}>{entry}</li>)}</ol></details>
   </>}
  </>}
  {message && <p role="alert">{message}</p>}
 </details>;
}
