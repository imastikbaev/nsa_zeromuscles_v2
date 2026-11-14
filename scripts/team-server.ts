import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { RoomStore, RoomError } from '../lib/team-server';
const store = new RoomStore(resolve('.local/team-rooms.json'));
const port = Number(process.env.TEAM_PORT) || 3002;
createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (origin && !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        res.writeHead(403).end();
        return;
    }
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host ?? '')) {
        res.writeHead(403).end();
        return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
        res.writeHead(204).end();
        return;
    }
    try {
        const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`), parts = url.pathname.split('/').filter(Boolean);
        if (parts[0] !== 'rooms' || parts.length > 3)
            throw new RoomError(404, 'Not found.');
        const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
        if (req.method === 'GET' && parts.length === 2) {
            res.end(JSON.stringify(store.read(parts[1], token)));
            return;
        }
        if (req.method !== 'POST')
            throw new RoomError(405, 'Method not allowed.');
        let body = '';
        for await (const chunk of req) {
            body += chunk;
            if (Buffer.byteLength(body) > 65536)
                throw new RoomError(413, 'Request too large.');
        }
        const payload = JSON.parse(body);
        const data = parts.length === 1 ? store.create(payload.name, payload.design) :
            parts[2] === 'join' ? store.join(parts[1], payload.name) :
                parts[2] === 'commands' ? store.command(parts[1], token, payload.revision, payload.command) : null;
        if (!data)
            throw new RoomError(404, 'Not found.');
        res.end(JSON.stringify(data));
    }
    catch (e) {
        res.writeHead(e instanceof RoomError ? e.status : 400);
        res.end(JSON.stringify({ error: (e as Error).message }));
    }
}).listen(port, '127.0.0.1', () => console.log(`Local team rooms: http://127.0.0.1:${port}`));
