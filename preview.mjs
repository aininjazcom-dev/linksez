import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';

const MAX_BYTES = 1024 * 1024;

export function publicUrl(input) {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password || url.port) throw new Error('Use a public http or https URL');
  if (isIP(url.hostname.replace(/^\[|\]$/g, '')) || /(^localhost$|\.localhost$|\.local$|\.internal$)/i.test(url.hostname)) throw new Error('Private addresses are not supported');
  return url;
}

export function publicIpv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b, c] = parts;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || (b === 0 && c === 0))) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 192 && b === 0 && c === 2) || (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113));
}

function decode(value = '') {
  return value.replace(/&#(x[\da-f]+|\d+);?|&([a-z]+);?/gi, (match, number, name) => {
    if (number) {
      const code = number[0].toLowerCase() === 'x' ? parseInt(number.slice(1), 16) : Number(number);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' })[name.toLowerCase()] ?? match;
  }).replace(/\s+/g, ' ').trim();
}

export function parseMetadata(html, baseUrl) {
  const meta = new Map();
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attrs = Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m => [m[1].toLowerCase(), m[2] ?? m[3] ?? m[4]]));
    const key = (attrs.property || attrs.name || '').toLowerCase();
    if (key && attrs.content && !meta.has(key)) meta.set(key, decode(attrs.content));
  }
  const title = meta.get('og:title') || meta.get('twitter:title') || decode((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [,''])[1]);
  const description = meta.get('og:description') || meta.get('twitter:description') || meta.get('description') || '';
  let image = meta.get('og:image') || meta.get('twitter:image') || '';
  try { image = image ? new URL(image, baseUrl).href : ''; if (image && !['http:', 'https:'].includes(new URL(image).protocol)) image = ''; } catch { image = ''; }
  const tags = (meta.get('keywords') || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 6);
  return { title: title.slice(0, 120), description: description.slice(0, 500), image, tags, siteName: (meta.get('og:site_name') || '').slice(0, 80) };
}

async function download(url, redirects = 0) {
  const addresses = await lookup(url.hostname, { family: 4, all: true });
  const address = addresses.find(x => publicIpv4(x.address))?.address;
  if (!address) throw new Error('The address is not public');
  const transport = url.protocol === 'https:' ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const req = transport(url, {
      lookup: (_hostname, options, callback) => {
        const done = typeof options === 'function' ? options : callback;
        if (options?.all) done(null, [{ address, family: 4 }]);
        else done(null, address, 4);
      },
      headers: { 'User-Agent': 'LinsEzPreview/1.0', Accept: 'text/html,application/xhtml+xml', 'Accept-Encoding': 'identity' },
      timeout: 8000
    }, res => {
      const status = res.statusCode || 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        if (redirects >= 3) { reject(new Error('Too many redirects')); return; }
        try { resolve(download(publicUrl(new URL(res.headers.location, url).href), redirects + 1)); } catch (error) { reject(error); }
        return;
      }
      if (status !== 200 || !String(res.headers['content-type'] || '').toLowerCase().includes('text/html')) {
        res.resume(); reject(new Error('No HTML preview available')); return;
      }
      const chunks = []; let size = 0;
      res.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_BYTES) { req.destroy(new Error('Preview is too large')); return; }
        chunks.push(chunk);
      });
      res.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8'), finalUrl: url.href }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('Preview timed out')));
    req.on('error', reject);
    req.end();
  });
}

export async function fetchPreview(input) {
  const url = publicUrl(input);
  const { html, finalUrl } = await download(url);
  return { ...parseMetadata(html, finalUrl), url: url.href, domain: url.hostname.replace(/^www\./, '') };
}
