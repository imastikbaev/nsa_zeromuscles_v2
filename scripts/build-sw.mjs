import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
const root = join(process.cwd(), "out");
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const groups = await Promise.all(
    entries.map((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
    ),
  );
  return groups.flat();
}
const files = (await walk(root)).filter(
  (f) =>
    !f.endsWith("sw.js") &&
    !f.endsWith(".map") &&
    !f.endsWith("404.html") &&
    !f.endsWith(".txt"),
);
const assets = files.map((f) => "/" + relative(root, f).split("\\").join("/"));
assets.push("/");
const hash = createHash("sha256");
for (const file of files) hash.update(await readFile(file));
const version = "mission-architect-" + hash.digest("hex").slice(0, 12);
const worker = `/* Generated from the final static export. Every shell asset is available offline. */
const CACHE=${JSON.stringify(version)};
const ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('mission-architect-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match('/index.html'))));return}
 if(!ASSETS.includes(url.pathname))return;
 event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(url.pathname))||fetch(event.request)));
});`;
await writeFile(join(root, "sw.js"), worker);
console.log(`Offline worker generated: ${assets.length} assets, ${version}`);
