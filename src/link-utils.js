export function httpUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

export function sharedLink(search) {
  const params = new URLSearchParams(search);
  const text = (params.get('text') || '').trim();
  const direct = httpUrl(params.get('url'));
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  const extracted = match ? httpUrl(match[0].replace(/[),.;!?]+$/, '')) : '';
  const url = direct || extracted;
  if (!url) return null;
  const note = text.replace(match?.[0] || '', '').trim().slice(0, 1000);
  return { url, title: (params.get('title') || '').trim().slice(0, 120), note };
}

export function sourceFor(url, type = 'Website') {
  const host = new URL(url).hostname.toLowerCase();
  if (/(^|\.)youtube\.com$/.test(host) || host === 'youtu.be') return 'YouTube';
  if (/(^|\.)instagram\.com$/.test(host)) return 'Instagram';
  if (host === 'x.com' || host.endsWith('.x.com') || host === 'twitter.com' || host.endsWith('.twitter.com')) return 'X';
  return type === 'Article' ? 'Article' : 'Website';
}

export function tagsFromText(value) {
  return String(value || '').split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 6);
}
