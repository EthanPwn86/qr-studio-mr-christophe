import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

await mkdir('dist/icons', { recursive: true })
const icon = await readFile('public/icon.svg')
for (const size of [192, 512]) await sharp(icon).resize(size, size).png().toFile(`dist/icons/icon-${size}.png`)
await sharp(icon).resize(180, 180).png().toFile('dist/icons/apple-touch-icon.png')
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0b3550' } }).composite([{ input: await sharp(icon).resize(380, 380).png().toBuffer(), left: 66, top: 66 }]).png().toFile('dist/icons/maskable-512.png')

async function list(dir, prefix = '') {
  const files = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_') || entry.name === 'sw.js') continue
    const path = `${prefix}/${entry.name}`
    if (entry.isDirectory()) files.push(...await list(`${dir}/${entry.name}`, path))
    else files.push(path)
  }
  return files
}
const assets = await list('dist')
const contents = await Promise.all(assets.map(path => readFile(`dist${path}`)))
const version = createHash('sha256').update(Buffer.concat(contents)).digest('hex').slice(0, 16)
await writeFile('dist/sw.js', String.raw`// Generated from the complete production build. No external resources required offline.
const CACHE = 'qr-studio-${version}';
// Pages redirects /index.html to /. Cache the canonical response so navigation
// fallback never receives a redirected Response (rejected by Chromium).
const ASSETS = ${JSON.stringify(['/', ...assets.filter(path => path !== '/index.html')])};
self.addEventListener('install', event => {
  // Updates wait for existing tabs to close, keeping their lazy-loaded assets consistent.
  event.waitUntil(caches.open(CACHE).then(async cache => {
    await cache.addAll(ASSETS.filter(path => path !== '/'));
    const page = await fetch('/', { cache: 'reload' });
    if (!page.ok) throw new Error('Offline shell unavailable');
    // Pages injects its optional analytics beacon into network responses.
    // Keep the cached offline shell independent of all external requests.
    const html = (await page.text()).replace(/<script\b[^>]*\bsrc=["']https:\/\/static\.cloudflareinsights\.com\/[^"']*["'][^>]*>[\s\S]*?<\/script\s*>/gi, '');
    const headers = new Headers(page.headers);
    for (const name of ['content-length', 'content-encoding', 'etag']) headers.delete(name);
    await cache.put('/', new Response(html, { status: 200, headers }));
  }));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('qr-studio-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/')));
    return;
  }
  if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(url.pathname).then(cached => cached || fetch(event.request)));
  }
});
`)
console.log(`PWA ready: ${assets.length} local assets cached, version ${version}`)
