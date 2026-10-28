import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fetchPreview } from './preview.mjs';

const root = process.cwd();
const port = Number(process.env.PORT) || 4173;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
createServer(async (req, res) => {
  let requestUrl;
  try { requestUrl = new URL(req.url, 'http://localhost'); } catch { res.writeHead(400).end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(requestUrl.pathname); } catch { res.writeHead(400).end(); return; }
  if (pathname === '/api/preview') {
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    const url = requestUrl.searchParams.get('url') || '';
    if (url.length > 2048) { res.writeHead(400).end(JSON.stringify({ error: 'URL is too long' })); return; }
    try {
      const preview = await fetchPreview(url);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(JSON.stringify(preview));
    } catch (error) {
      res.writeHead(422, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  const relative = pathname === '/' || pathname === '/share' ? 'index.html' : pathname.replace(/^\//, '');
  const file = resolve(root, relative.startsWith('src/') ? relative : relative.startsWith('public/') ? relative : relative === 'index.html' ? relative : `public/${relative}`);
  if (!(file === root || file.startsWith(root + sep))) { res.writeHead(403).end(); return; }
  try {
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
    const contents = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(contents);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); }
}).listen(port, '0.0.0.0', () => console.log(`LinsEz running at http://localhost:${port}`));
