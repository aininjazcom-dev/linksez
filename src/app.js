import { httpUrl, sharedLink, sourceFor, tagsFromText } from './link-utils.js';

const KEY = 'linsez-demo-v1';
const SHARE_KEY = 'linsez-share-draft';
const seed = {
  profile: { name: 'Alex Chen', email: 'alex@linsez.app', dark: false },
  collections: [
    { id: 'travel', name: 'Travel', description: 'Places worth getting lost in', image: 3 },
    { id: 'design', name: 'Design', description: 'Spaces and objects that inspire', image: 1 },
    { id: 'ideas', name: 'Ideas', description: 'Thoughts for the future', image: 2 },
    { id: 'wellness', name: 'Wellness', description: 'A little more balance', image: 5 }
  ],
  links: [
    { id: 'alps', title: 'A Day in the Alps', url: 'https://www.youtube.com/watch?v=Scxs7L0vhZ4', source: 'YouTube', type: 'Video', description: 'A cinematic journey through quiet mountain valleys and bright blue lakes.', image: 0, tags: ['travel', 'nature', 'europe'], collectionId: 'travel', favorite: true, notes: 'For the next mountain getaway.', savedAt: '2026-10-22' },
    { id: 'workspace', title: 'Minimal Workspace for Deep Work', url: 'https://www.architecturaldigest.com/', source: 'Article', type: 'Article', description: 'Small design choices that make a calm and focused place to work.', image: 1, tags: ['design', 'workspace'], collectionId: 'design', favorite: false, notes: '', savedAt: '2026-10-20' },
    { id: 'future', title: 'The Future of AI in 2026', url: 'https://www.technologyreview.com/', source: 'Website', type: 'Website', description: 'A thoughtful look at how new technology is changing the way we create.', image: 2, tags: ['ideas', 'technology'], collectionId: 'ideas', favorite: false, notes: 'Read this again on Friday.', savedAt: '2026-10-18' },
    { id: 'coast', title: 'The Most Beautiful Places to Visit', url: 'https://www.lonelyplanet.com/', source: 'Website', type: 'Website', description: 'From alpine lakes to coastal towns, discover places worth a spot on your list.', image: 3, tags: ['travel', 'places'], collectionId: 'travel', favorite: true, notes: '', savedAt: '2026-10-16' },
    { id: 'architecture', title: 'Architecture That Makes You Pause', url: 'https://www.archdaily.com/', source: 'Article', type: 'Article', description: 'An edit of bold modern buildings and the ideas behind them.', image: 4, tags: ['architecture', 'design'], collectionId: 'design', favorite: false, notes: '', savedAt: '2026-10-13' },
    { id: 'food', title: 'A Fresh Take on Everyday Lunch', url: 'https://www.bonappetit.com/', source: 'Instagram', type: 'Post', description: 'Simple, colorful bowls to make the middle of your day feel better.', image: 5, tags: ['food', 'wellness'], collectionId: 'wellness', favorite: false, notes: '', savedAt: '2026-10-11' }
  ],
  recent: []
};

const discover = [
  { id: 'discover-remote', title: 'The Ultimate Guide to Remote Work', url: 'https://www.nomadlist.com/', source: 'Article', type: 'Article', description: 'Practical tips, tools and destinations for a more flexible work life.', image: 1, tags: ['remote work', 'productivity'], collectionId: 'design', favorite: false, notes: '' },
  { id: 'discover-coast', title: 'The Quiet Side of the Amalfi Coast', url: 'https://www.lonelyplanet.com/italy/amalfi-coast', source: 'Website', type: 'Website', description: 'A slower way to explore Italy’s iconic shoreline.', image: 3, tags: ['travel', 'italy'], collectionId: 'travel', favorite: false, notes: '' },
  { id: 'discover-food', title: 'A Bowl Full of Good Things', url: 'https://www.bonappetit.com/recipes', source: 'Instagram', type: 'Post', description: 'Fresh flavors and easy inspiration for lunch.', image: 5, tags: ['food', 'wellness'], collectionId: 'wellness', favorite: false, notes: '' }
];

function readState() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data && Array.isArray(data.links) && Array.isArray(data.collections)) return data;
  } catch { /* use demo seed */ }
  return structuredClone(seed);
}
let state = readState();
let activeFilter = 'All';
let searchFilter = 'All';
let searchQuery = '';
let discoverFilter = 'All';
let installPrompt = null;
let focusSearchOnNavigate = false;
let previewData = null;
let previewTimer = null;
let previewAbort = null;
if (location.pathname === '/share') {
  const incoming = sharedLink(location.search);
  if (incoming) sessionStorage.setItem(SHARE_KEY, JSON.stringify(incoming));
  history.replaceState(null, '', '/#/save');
}
let shareDraft = null;
try { shareDraft = JSON.parse(sessionStorage.getItem(SHARE_KEY)); } catch { sessionStorage.removeItem(SHARE_KEY); }
let lastFormUrl = shareDraft?.url || '';
let autoFields = { title: shareDraft?.title || '', description: '', tags: '' };
let autoType = '';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const icons = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  arrow: '<path d="m9 18 6-6-6-6"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  bookmark: '<path d="M5 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v18l-7-5-7 5z"/>',
  external: '<path d="M13 5h6v6M19 5l-9 9"/><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  close: '<path d="M5 5l14 14M19 5 5 19"/>',
  edit: '<path d="m16 4 4 4-12 12H4v-4zM14 6l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  spark: '<path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8zM19 17l.6 2.4L22 20l-2.4.6L19 23l-.6-2.4L16 20l2.4-.6z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
  moon: '<path d="M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  filter: '<path d="M4 7h16M7 12h10m-7 5h4"/>',
  heart: '<path d="M20.8 8.6c0 4.3-8.8 10.6-8.8 10.6S3.2 12.9 3.2 8.6a4.6 4.6 0 0 1 8.8-1.9 4.6 4.6 0 0 1 8.8 1.9Z"/>'
};
function icon(name, size = 22, fill = 'none') { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`; }
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2800); }
function route() { return (location.hash.slice(1) || '/home').split('/').filter(Boolean); }
function go(path) { location.hash = `#/${path}`; window.scrollTo(0, 0); }
function openSearch() { if (route()[0] === 'search') { $('#search-input')?.focus(); return; } focusSearchOnNavigate = true; go('search'); }
function item(id) { const saved=state.links.find(x => x.id === id); if (saved) return saved; const idea=discover.find(x => x.id === id); return state.links.find(x => x.url === idea?.url) || idea; }
function collection(id) { return state.collections.find(x => x.id === id); }
function host(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } }
function photo(index, cls = '', imageUrl = '') {
  if (httpUrl(imageUrl)) return `<div class="photo photo-fallback remote-photo ${cls}">${icon('link', 36)}<span>Saved link</span><img src="${esc(imageUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" /></div>`;
  if (Number.isInteger(index) && index >= 0 && index < 6) return `<div class="photo ${cls}" style="--photo-x:${index % 3 * 50}%;--photo-y:${Math.floor(index / 3) * 100}%"></div>`;
  return `<div class="photo photo-fallback ${cls}">${icon('link', 36)}<span>Saved link</span></div>`;
}
function brand() { return `<div class="brand"><span class="brand-mark"><svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M8 5a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v12h-5V6h-2v15l-5 5V5Zm12 9h5a4 4 0 0 1 4 4v13l-7-5-7 5V18a4 4 0 0 1 4-4h1Zm0 5v4l2-1.5 2 1.5v-4h-4Z"/></svg></span><span>LinsEz</span></div>`; }
function header(back = false) { const [page,id]=route(); const names={home:'Home',search:'Search',save:'Save a link',collections:'Collections',collection:collection(id)?.name||'Collection',discover:'Discover',detail:'Link detail',profile:'Profile'}; return `<header class="topbar"><div class="mobile-topbar">${back ? `<button class="icon-button" data-action="back" aria-label="Go back">${icon('back')}</button>` : brand()}<div class="topbar-actions">${!back ? `<button class="icon-button" data-go="search" aria-label="Search">${icon('search')}</button>` : ''}<button class="avatar avatar-small" data-go="profile" aria-label="Open profile">AC</button></div></div><div class="desktop-topbar"><div class="breadcrumbs"><span>My library</span>${icon('arrow',15)}<strong>${esc(names[page]||'Home')}</strong></div><div class="desktop-topbar-actions"><button class="desktop-global-search" data-action="open-search">${icon('search',18)}<span>Search your library</span><kbd>Ctrl K</kbd></button><button class="desktop-add" data-go="save">${icon('plus',18)}<span>Save link</span></button><button class="desktop-profile" data-go="profile" aria-label="Open profile"><span class="avatar avatar-small">${esc(state.profile.name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase())}</span><span>${esc(state.profile.name)}</span>${icon('arrow',15)}</button></div></div></header>`; }
function nav(section) { const entries = [['home','Home','home'],['search','Search','search'],['save','Save','plus'],['collections','Collections','folder'],['profile','Profile','user']]; return `<nav class="bottom-nav" aria-label="Main navigation">${entries.map(([key,label,glyph]) => `<button class="nav-item ${section === key ? 'active' : ''} ${key === 'save' ? 'nav-add' : ''}" data-go="${key}" aria-label="${label}">${icon(glyph, key === 'save' ? 27 : 22)}<span>${label}</span></button>`).join('')}</nav>`; }
function desktopNav(section) { return `<aside class="sidebar"><div class="sidebar-brand">${brand()}<small>SAVE LINKS. FIND THEM FAST.</small></div><button data-go="save" class="sidebar-save">${icon('plus',20)} Save a link</button><p class="side-label">WORKSPACE</p>${[['home','Home','home'],['search','Search','search'],['collections','Collections','folder'],['discover','Discover','spark']].map(([key,label,glyph]) => `<button data-go="${key}" class="side-item ${section === key ? 'active' : ''}">${icon(glyph,20)}<span>${label}</span></button>`).join('')}<div class="sidebar-divider"></div><div class="side-section-heading"><span>YOUR COLLECTIONS</span><button data-action="new-collection" aria-label="New collection">${icon('plus',16)}</button></div>${state.collections.slice(0,4).map(c=>`<button class="side-collection ${route()[0]==='collection'&&route()[1]===c.id?'active':''}" data-go="collection/${esc(c.id)}"><span class="side-collection-dot"></span><span>${esc(c.name)}</span><small>${state.links.filter(x=>x.collectionId===c.id).length}</small></button>`).join('')}<div class="sidebar-spacer"></div><button class="sidebar-account ${section==='profile'?'active':''}" data-go="profile"><span class="avatar avatar-small">${esc(state.profile.name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase())}</span><span><strong>${esc(state.profile.name)}</strong><small>Local demo library</small></span>${icon('arrow',17)}</button></aside>`; }
function shell(section, body, back = false) { return `<div class="app-shell ${state.profile.dark ? 'dark' : ''}">${desktopNav(section)}<div class="main-shell">${header(back)}<main>${body}</main>${nav(section)}</div></div>`; }
function chips(options, current, action) { return `<div class="chip-row" role="group" aria-label="Filter results">${options.map(x => `<button class="chip ${current === x ? 'selected' : ''}" data-action="${action}" data-value="${esc(x)}">${esc(x)}</button>`).join('')}</div>`; }
function sectionHeading(title, button, target) { return `<div class="section-heading"><h2>${title}</h2>${button ? `<button class="text-link" data-go="${target}">${button} ${icon('arrow',16)}</button>` : ''}</div>`; }
function contentCard(link, featured = false) { const favorite=state.links.find(x=>x.url===link.url)?.favorite ?? link.favorite; return `<article class="content-card ${featured ? 'featured-card' : ''}"><button class="card-open" data-go="detail/${esc(link.id)}" aria-label="View ${esc(link.title)}">${photo(link.image, 'card-photo', link.previewImage)}</button><div class="card-content"><div class="card-meta"><span class="source-dot ${esc(link.source.toLowerCase())}"></span>${esc(link.source)}<span class="meta-separator">·</span>${esc(link.type)}</div><button class="card-title" data-go="detail/${esc(link.id)}">${esc(link.title)}</button>${featured ? `<p class="card-desc">${esc(link.description)}</p>` : ''}<div class="card-footer"><span class="small-tags">${link.tags.slice(0,2).map(t => `<span>${esc(t)}</span>`).join('')}</span><button class="bookmark-btn ${favorite ? 'is-favorite' : ''}" data-action="favorite" data-id="${esc(link.id)}" aria-label="${favorite ? 'Remove from favorites' : 'Add to favorites'}">${icon('bookmark',20,favorite ? 'currentColor' : 'none')}</button></div></div></article>`; }
function collectionCard(c) { const count = state.links.filter(x => x.collectionId === c.id).length; return `<button class="collection-card" data-go="collection/${esc(c.id)}">${photo(c.image)}<span class="collection-shade"></span><span class="collection-info"><strong>${esc(c.name)}</strong><small>${count} ${count === 1 ? 'link' : 'links'}</small></span><span class="collection-arrow">${icon('arrow',20)}</span></button>`; }
function empty(title, message, action = null) { return `<div class="empty-state"><div class="empty-icon">${icon('bookmark',28)}</div><h3>${title}</h3><p>${message}</p>${action ? `<button class="button button-dark" data-go="${action[1]}">${action[0]}</button>` : ''}</div>`; }

function home() {
  const list = [...state.links].sort((a,b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
  const shown = activeFilter === 'All' ? list : activeFilter === 'Favorites' ? list.filter(x => x.favorite) : ['YouTube','Instagram'].includes(activeFilter) ? list.filter(x => x.source === activeFilter) : list.filter(x => x.type === activeFilter);
  return shell('home', `
    <div class="page-head home-head"><div><span class="eyebrow">YOUR PERSONAL LIBRARY</span><h1>Good things are<br><em>worth keeping.</em></h1><p>Everything you saved, right where you need it.</p></div><div class="head-art">${icon('spark',28)}</div></div>
    <button class="search-pill home-search" data-go="search">${icon('search',20)}<span>Search your saved links...</span><span class="search-shortcut">⌕</span></button>
    <div class="quick-stats"><div><strong>${state.links.length}</strong><span>Saved links</span></div><span class="stat-divider"></span><div><strong>${state.collections.length}</strong><span>Collections</span></div><span class="stat-divider"></span><div><strong>${state.links.filter(x=>x.favorite).length}</strong><span>Favorites</span></div></div>
    <div class="home-workspace"><div class="home-main">${sectionHeading('Your links', 'Discover ideas', 'discover')}${chips(['All','Video','Article','Post','Website','YouTube','Instagram','Favorites'], activeFilter, 'home-filter')}<div class="card-grid">${shown.length ? shown.map((x,i) => contentCard(x,i === 0 && activeFilter === 'All')).join('') : empty('Nothing here yet', 'Save something you love and it will appear here.', ['Save a link','save'])}</div><div class="discover-callout"><div class="callout-icon">${icon('spark',24)}</div><div><strong>Find your next favorite</strong><p>Explore a few ideas picked for curious minds.</p></div><button data-go="discover" aria-label="Discover ideas">${icon('arrow')}</button></div></div>
    <aside class="home-aside"><div class="aside-panel"><div class="aside-heading"><span class="eyebrow">STAY ORGANIZED</span><h2>Collections</h2></div><div class="aside-collections">${state.collections.slice(0,4).map(c=>`<button data-go="collection/${esc(c.id)}">${photo(c.image)}<span><strong>${esc(c.name)}</strong><small>${state.links.filter(x=>x.collectionId===c.id).length} saved links</small></span>${icon('arrow',17)}</button>`).join('')}</div><button class="aside-footer" data-go="collections">View all collections ${icon('arrow',17)}</button></div><div class="aside-save"><span>${icon('bookmark',24)}</span><h3>Found something good?</h3><p>Give it a place in your library.</p><button class="button button-light" data-go="save">${icon('plus',17)} Save a link</button></div></aside></div>`);
}
function collections() { return shell('collections', `<div class="page-head"><span class="eyebrow">KEEP IT TOGETHER</span><div class="title-with-action"><h1>Collections<span class="period">.</span></h1><button class="round-action" data-action="new-collection" aria-label="New collection">${icon('plus')}</button></div><p>A thoughtful home for every interest.</p></div><div class="collection-grid">${state.collections.map(collectionCard).join('')}</div><p class="page-footnote">Organize a little, find a lot.</p>`); }
function collectionDetail(id) { const c = collection(id); if (!c) return notFound(); const links = state.links.filter(x => x.collectionId === id); return shell('collections', `<div class="detail-top"><span class="eyebrow">COLLECTION</span><button class="icon-button" data-action="edit-collection" data-id="${esc(id)}" aria-label="Edit collection">${icon('edit')}</button></div><div class="collection-hero">${photo(c.image)}<div class="collection-hero-shade"></div><div><span>${links.length} ${links.length === 1 ? 'SAVED LINK' : 'SAVED LINKS'}</span><h1>${esc(c.name)}</h1><p>${esc(c.description)}</p></div></div>${sectionHeading('In this collection', null)}<div class="card-grid">${links.length ? links.map(x => contentCard(x)).join('') : empty('A fresh start', 'Add a link to bring this collection to life.', ['Save a link','save'])}</div>`, true); }
function discoverPage() { const categoryCollections = state.collections.filter(c => discoverFilter === 'All' || c.name === discoverFilter); const ideas = discoverFilter === 'All' ? discover : discover.filter(x => collection(x.collectionId)?.name === discoverFilter); return shell('discover', `<div class="page-head"><span class="eyebrow">A LITTLE INSPIRATION</span><h1>Discover <em>ideas.</em></h1><p>Handpicked corners of the web to explore.</p></div><button class="search-pill" data-go="search">${icon('search',20)}<span>Search links and ideas...</span></button>${chips(['All',...state.collections.map(c=>c.name)], discoverFilter, 'discover-filter')}${sectionHeading('Explore collections', 'See yours', 'collections')}<div class="collection-grid">${categoryCollections.map(collectionCard).join('') || empty('No collection found', 'Try another category.')}</div>${sectionHeading('Worth a look', null)}<div class="card-grid">${ideas.map(x=>contentCard(x)).join('') || empty('More ideas soon', 'Explore another category.')}</div>`); }
function previewCard(data = {}, status = 'Paste a link to get started') {
  const domain = host(data.url || '');
  return `<div class="preview-cover">${photo(null, '', data.image)}</div><div class="preview-copy"><span>${esc(data.siteName || domain || 'YOUR NEW SAVE')}</span><strong>${esc(data.title || domain || status)}</strong><p>${esc(data.description || (domain ? 'Add a description to remember why it matters.' : 'A preview will appear here.'))}</p><small>${esc(domain || status)}</small></div>`;
}
function savePage() {
  const draft = shareDraft || {};
  const initial = previewData?.url === draft.url ? previewData : draft;
  return shell('save', `<div class="page-head"><span class="eyebrow">${shareDraft ? 'SHARED TO LINSEZ' : 'ADD TO YOUR LIBRARY'}</span><h1>Save a <em>link.</em></h1><p>${shareDraft ? 'Review the preview, add your context, and keep it.' : 'Paste anything worth coming back to.'}</p></div><form id="save-form" class="form-card"><label for="url">Link URL</label><div class="input-with-icon">${icon('link',20)}<input id="url" name="url" type="url" maxlength="2048" placeholder="https://example.com/article" autocomplete="url" value="${esc(draft.url || '')}" required /></div><div id="link-preview" class="link-preview rich-preview">${previewCard(initial)}</div><p id="preview-status" class="preview-status" role="status">${shareDraft ? 'Fetching a preview…' : 'Paste a URL to fetch its title, image and description.'}</p><label for="title">Title <span class="optional">editable</span></label><input id="title" name="title" type="text" maxlength="120" value="${esc(draft.title || '')}" placeholder="Give it a memorable title" /><label for="description">Description <span class="optional">editable</span></label><textarea id="description" name="description" rows="3" maxlength="500" placeholder="A short summary of this link"></textarea><div class="form-two"><div><label for="type">Type</label><select id="type" name="type"><option>Website</option><option>Article</option><option>Video</option><option>Post</option></select></div><div><label for="collection">Collection</label><select id="collection" name="collection"><option value="">No collection</option>${state.collections.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></div></div><label for="tags">Tags <span class="optional">editable</span></label><input id="tags" name="tags" type="text" placeholder="design, inspiration" /><small class="field-hint">Separate tags with commas</small><label for="notes">Your note <span class="optional">optional</span></label><textarea id="notes" name="notes" rows="4" placeholder="Why did this catch your eye?">${esc(draft.note || '')}</textarea><button class="button button-dark button-full" type="submit">${icon('bookmark',19)} Save link</button></form><aside class="save-aside"><div class="save-aside-photo">${photo(1)}</div><span class="eyebrow">MADE FOR YOUR CURIOSITY</span><h2>Keep the good stuff close.</h2><p>Add a link, tuck it into a collection, and find it again whenever you need it.</p><div class="save-aside-steps"><div><span>01</span> Share or paste a URL</div><div><span>02</span> Review the preview</div><div><span>03</span> Save for later</div></div></aside><p class="page-footnote">Previews need a connection. Your saved links remain in this browser.</p>`);
}
function detailPage(id) {
  const x = item(id); if (!x) return notFound();
  id = x.id;
  const saved = state.links.some(y => y.id === id);
  return shell(saved ? 'home' : 'discover', `<div class="detail-top"><span class="eyebrow">${saved ? 'SAVED LINK' : 'DISCOVER IDEA'}</span><button class="icon-button" data-action="detail-menu" data-id="${esc(id)}" aria-label="More options">${icon('more')}</button></div><div class="detail-photo-wrap">${photo(x.image, 'detail-photo', x.previewImage)}<span class="photo-source"><span class="source-dot ${esc(x.source.toLowerCase())}"></span>${esc(x.source)}</span></div><div class="detail-content"><div class="detail-source">${esc(host(x.url))} <span>·</span> ${esc(x.type)}</div><h1>${esc(x.title)}</h1><p class="detail-description">${esc(x.description || 'A link saved for later.')}</p><div class="tag-list">${x.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><a class="button button-dark button-full" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">Open original ${icon('external',18)}</a><div class="detail-actions"><button class="button button-light" data-action="favorite" data-id="${esc(id)}">${icon('bookmark',19,x.favorite ? 'currentColor' : 'none')} ${x.favorite ? 'Favorited' : 'Favorite'}</button>${saved ? `<button class="button button-light" data-action="edit-link" data-id="${esc(id)}">${icon('edit',18)} Edit</button><button class="button button-light" data-action="delete" data-id="${esc(id)}">${icon('trash',18)} Delete</button>` : `<button class="button button-light" data-action="save-discover" data-id="${esc(id)}">${icon('plus',18)} Save to library</button>`}</div>${saved ? `<div class="notes-panel"><div class="section-heading"><h2>Your note</h2><span class="note-private">Just for you</span></div><textarea id="detail-notes" rows="4" placeholder="Add your thoughts about this link...">${esc(x.notes)}</textarea><button class="text-link" data-action="save-notes" data-id="${esc(id)}">Save note ${icon('arrow',16)}</button></div><div class="collection-picker"><label for="detail-collection">Collection</label><select id="detail-collection" data-id="${esc(id)}"><option value="">No collection</option>${state.collections.map(c=>`<option value="${esc(c.id)}" ${x.collectionId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>` : ''}</div>`, true);
}
function searchPage() { const q = searchQuery.trim().toLowerCase(); const all = [...state.links, ...discover.filter(d => !state.links.some(x => x.url === d.url))]; const results = all.filter(x => (!q || `${x.title} ${x.description} ${x.source} ${x.tags.join(' ')} ${host(x.url)}`.toLowerCase().includes(q)) && (searchFilter === 'All' || (['YouTube','Instagram'].includes(searchFilter) ? x.source === searchFilter : x.type === searchFilter))); return shell('search', `<div class="page-head search-head"><span class="eyebrow">FIND IT FAST</span><h1>Search<span class="period">.</span></h1><p>Every good thing is a search away.</p></div><div class="search-input-wrap">${icon('search',21)}<input id="search-input" type="search" placeholder="Try “remote work” or “travel”" value="${esc(searchQuery)}" autocomplete="off" /><button data-action="clear-search" aria-label="Clear search">${icon('close',17)}</button></div>${chips(['All','Video','Article','Post','Website','YouTube','Instagram'], searchFilter, 'search-filter')}${!q && state.recent.length ? `<div class="section-heading"><h2>Recent searches</h2><button class="text-link" data-action="clear-recent">Clear all</button></div><div class="recent-list">${state.recent.map(s=>`<button data-action="recent-search" data-value="${esc(s)}">${icon('search',17)}<span>${esc(s)}</span>${icon('arrow',16)}</button>`).join('')}</div>` : ''}${sectionHeading(q ? `${results.length} ${results.length === 1 ? 'result' : 'results'}` : 'Browse everything', null)}<div class="card-grid">${results.length ? results.map(x=>contentCard(x)).join('') : empty('No links found', 'Try a different phrase or filter.')}</div>`); }
function profilePage() { return shell('profile', `<div class="page-head"><span class="eyebrow">YOUR SPACE</span><h1>Profile<span class="period">.</span></h1><p>A little corner of the internet that is yours.</p></div><div class="profile-card"><div class="avatar avatar-large">${esc(state.profile.name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase())}</div><div><h2>${esc(state.profile.name)}</h2><p>${esc(state.profile.email)}</p></div><button class="icon-button" data-action="edit-profile" aria-label="Edit profile">${icon('edit',20)}</button></div><div class="profile-stats"><div><strong>${state.links.length}</strong><span>Saved links</span></div><div><strong>${state.collections.length}</strong><span>Collections</span></div><div><strong>${state.links.filter(x=>x.favorite).length}</strong><span>Favorites</span></div></div><div class="settings-list"><button data-action="theme">${icon(state.profile.dark ? 'sun' : 'moon',21)}<span>Appearance<small>${state.profile.dark ? 'Dark' : 'Light'} mode</small></span>${icon('arrow',18)}</button><button data-action="export">${icon('download',21)}<span>Export my library<small>Download a JSON backup</small></span>${icon('arrow',18)}</button><button data-action="reset">${icon('trash',21)}<span>Reset demo data<small>Start with the original sample links</small></span>${icon('arrow',18)}</button></div><div class="profile-quote"><span>${icon('spark',22)}</span><p>Save what sparks something.</p><small>LINSEZ · PHASE 1 DEMO</small></div>`); }
function notFound() { return shell('home', empty('Page not found', 'Let’s get you back to your library.', ['Go home','home'])); }
function render() { const [page,id] = route(); const views = { home, collections, discover: discoverPage, save: savePage, search: searchPage, profile: profilePage }; $('#app').innerHTML = page === 'collection' ? collectionDetail(id) : page === 'detail' ? detailPage(id) : (views[page] || notFound)(); document.body.classList.toggle('dark-mode', state.profile.dark); }

function modal(title, fields, onSubmit, danger = false) { const wrap = document.createElement('div'); wrap.className = 'modal-backdrop'; wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-button" type="button" data-close-modal aria-label="Close">${icon('close')}</button></div><form id="modal-form">${fields}<div class="modal-buttons"><button class="button button-light" type="button" data-close-modal>Cancel</button><button class="button ${danger ? 'button-danger' : 'button-dark'}" type="submit">Save changes</button></div></form></div>`; document.body.append(wrap); wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('[data-close-modal]')) wrap.remove(); }); wrap.querySelector('form').addEventListener('submit', e => { e.preventDefault(); if (onSubmit(new FormData(e.currentTarget)) !== false) wrap.remove(); }); wrap.querySelector('input')?.focus(); }
function confirmAction(title, message, buttonLabel, onConfirm) { const wrap=document.createElement('div'); wrap.className='modal-backdrop'; wrap.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-button" type="button" data-close-modal aria-label="Close">${icon('close')}</button></div><p class="modal-copy">${esc(message)}</p><div class="modal-buttons"><button class="button button-light" type="button" data-close-modal>Cancel</button><button class="button button-danger" type="button" id="confirm-action">${esc(buttonLabel)}</button></div></div>`; document.body.append(wrap); wrap.addEventListener('click', e=>{if(e.target===wrap || e.target.closest('[data-close-modal]'))wrap.remove();}); wrap.querySelector('#confirm-action').addEventListener('click',()=>{wrap.remove();onConfirm();}); }
function newCollection() { modal('New collection', `<label for="modal-name">Name</label><input id="modal-name" name="name" required maxlength="35" placeholder="e.g. Reading list" /><label for="modal-description">Description</label><input id="modal-description" name="description" maxlength="80" placeholder="What will you keep here?" /><label for="modal-image">Cover</label><select id="modal-image" name="image"><option value="0">Mountains</option><option value="1">Workspace</option><option value="2">Space</option><option value="3">Coast</option><option value="4">Architecture</option><option value="5">Food</option></select>`, data => { const name = String(data.get('name')).trim(); if (!name) return; const id = `collection-${Date.now()}`; state.collections.push({ id, name, description: String(data.get('description')).trim(), image: Number(data.get('image')) }); save(); go(`collection/${id}`); toast('Collection created'); }); }
function editCollection(id) { const c=collection(id); if (!c) return; modal('Edit collection', `<label for="modal-name">Name</label><input id="modal-name" name="name" required maxlength="35" value="${esc(c.name)}" /><label for="modal-description">Description</label><input id="modal-description" name="description" maxlength="80" value="${esc(c.description)}" /><label for="modal-image">Cover</label><select id="modal-image" name="image">${['Mountains','Workspace','Space','Coast','Architecture','Food'].map((n,i)=>`<option value="${i}" ${c.image===i?'selected':''}>${n}</option>`).join('')}</select><button class="delete-inline" type="button" id="delete-collection">Delete collection</button>`, data => { c.name=String(data.get('name')).trim(); c.description=String(data.get('description')).trim(); c.image=Number(data.get('image')); save(); render(); toast('Collection updated'); }); $('#delete-collection').onclick=()=>{ $('.modal-backdrop')?.remove(); confirmAction('Delete collection?', `Links in “${c.name}” will stay in your library.`, 'Delete collection', ()=>{ state.collections=state.collections.filter(x=>x.id!==id); state.links.forEach(x=>{if(x.collectionId===id)x.collectionId='';}); save(); go('collections'); toast('Collection deleted'); }); }; }
function editProfile() { modal('Edit profile', `<label for="modal-name">Name</label><input id="modal-name" name="name" required maxlength="60" value="${esc(state.profile.name)}" /><label for="modal-email">Email label</label><input id="modal-email" name="email" type="email" required value="${esc(state.profile.email)}" />`, data => { state.profile.name=String(data.get('name')).trim(); state.profile.email=String(data.get('email')).trim(); save(); render(); toast('Profile updated'); }); }
function editLink(id) {
  const link = state.links.find(x => x.id === id);
  if (!link) return;
  modal('Edit link', `<label for="modal-title">Title</label><input id="modal-title" name="title" required maxlength="120" value="${esc(link.title)}" /><label for="modal-url">URL</label><input id="modal-url" name="url" type="url" required value="${esc(link.url)}" /><label for="modal-description">Description</label><textarea id="modal-description" name="description" rows="3" maxlength="500">${esc(link.description)}</textarea><label for="modal-tags">Tags, separated by commas</label><input id="modal-tags" name="tags" value="${esc(link.tags.join(', '))}" /><div class="form-two"><div><label for="modal-type">Type</label><select id="modal-type" name="type">${['Website','Article','Video','Post'].map(type => `<option ${link.type === type ? 'selected' : ''}>${type}</option>`).join('')}</select></div><div><label for="modal-collection">Collection</label><select id="modal-collection" name="collection"><option value="">No collection</option>${state.collections.map(c => `<option value="${esc(c.id)}" ${link.collectionId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div></div>`, data => {
    const url = httpUrl(data.get('url'));
    if (!url) { toast('Use a valid http or https URL'); return false; }
    if (state.links.some(x => x.id !== id && x.url === url)) { toast('That URL is already in your library'); return false; }
    if (url !== link.url) link.previewImage = '';
    link.url = url;
    link.title = String(data.get('title')).trim().slice(0, 120) || host(url);
    link.description = String(data.get('description')).trim().slice(0, 500);
    link.type = String(data.get('type'));
    link.source = sourceFor(url, link.type);
    link.tags = tagsFromText(data.get('tags'));
    link.collectionId = String(data.get('collection'));
    save(); render(); toast('Link updated');
  });
}
function saveLink(form) {
  const data = new FormData(form);
  const url = httpUrl(data.get('url'));
  if (!url) { toast('Use a valid http or https URL'); return; }
  const existing = state.links.find(link => link.url === url);
  if (existing) { shareDraft = null; previewData = null; sessionStorage.removeItem(SHARE_KEY); go(`detail/${existing.id}`); toast('Already in your library'); return; }
  const domain = host(url);
  const title = String(data.get('title')).trim() || previewData?.title || domain;
  const type = String(data.get('type'));
  const id = `link-${crypto.randomUUID()}`;
  state.links.unshift({
    id, title: title.slice(0, 120), url, source: sourceFor(url, type), type,
    description: String(data.get('description')).trim().slice(0, 500) || `Saved from ${domain}`,
    image: null, previewImage: previewData?.url === url ? previewData.image : '',
    tags: tagsFromText(data.get('tags')), collectionId: String(data.get('collection')),
    favorite: false, notes: String(data.get('notes')).trim().slice(0, 1000),
    savedAt: new Date().toISOString().slice(0, 10)
  });
  save();
  shareDraft = null; previewData = null; sessionStorage.removeItem(SHARE_KEY);
  go(`detail/${id}`);
  toast('Link saved to your library');
}

function schedulePreview(raw, delay = 500) {
  clearTimeout(previewTimer);
  previewAbort?.abort();
  previewData = null;
  const url = httpUrl(raw);
  if (url !== lastFormUrl) {
    for (const field of ['title', 'description', 'tags']) {
      const input = $(`#${field}`);
      if (input && input.value === autoFields[field]) input.value = '';
    }
    autoFields = { title: '', description: '', tags: '' };
    lastFormUrl = url;
    if (shareDraft && url !== shareDraft.url) { shareDraft = null; sessionStorage.removeItem(SHARE_KEY); }
  }
  const typeInput = $('#type');
  if (url && typeInput && (!autoType || typeInput.value === autoType)) {
    const source = sourceFor(url);
    autoType = source === 'YouTube' ? 'Video' : ['Instagram', 'X'].includes(source) ? 'Post' : 'Website';
    typeInput.value = autoType;
  }
  const preview = $('#link-preview');
  const status = $('#preview-status');
  if (preview) preview.innerHTML = previewCard({ url, title: $('#title')?.value || '', description: $('#description')?.value || '' });
  if (!url) { if (status) status.textContent = 'Paste a URL to fetch its title, image and description.'; return; }
  if (status) status.textContent = 'Fetching a preview…';
  previewTimer = setTimeout(() => loadPreview(url), delay);
}

async function loadPreview(url) {
  previewAbort = new AbortController();
  try {
    const response = await fetch(`/api/preview?url=${encodeURIComponent(url)}`, { signal: previewAbort.signal });
    if (!response.ok) throw new Error('Preview unavailable');
    const data = await response.json();
    if (httpUrl($('#url')?.value) !== url) return;
    previewData = data;
    if ($('#title') && !$('#title').value.trim()) { $('#title').value = data.title || ''; autoFields.title = $('#title').value; }
    if ($('#description') && !$('#description').value.trim()) { $('#description').value = data.description || ''; autoFields.description = $('#description').value; }
    if ($('#tags') && !$('#tags').value.trim()) { $('#tags').value = (data.tags || []).join(', '); autoFields.tags = $('#tags').value; }
    $('#link-preview').innerHTML = previewCard({ ...data, url, title: $('#title')?.value || data.title, description: $('#description')?.value || data.description });
    $('#preview-status').textContent = data.image || data.description || data.tags?.length
      ? 'Preview ready. Review the details before saving.'
      : 'Only a basic preview is available for this site. Add a description and tags if you like.';
  } catch (error) {
    if (error.name === 'AbortError' || httpUrl($('#url')?.value) !== url) return;
    $('#preview-status').textContent = 'This site did not provide a preview. Add your own title, description and tags.';
    $('#link-preview').innerHTML = previewCard({ url, title: $('#title')?.value || '', description: $('#description')?.value || '' });
  }
}
function exportData() { const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='linsez-library.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); toast('Library exported'); }

document.addEventListener('click', e => {
  const navTarget=e.target.closest('[data-go]'); if (navTarget) { go(navTarget.dataset.go); return; }
  const btn=e.target.closest('[data-action]'); if (!btn) return;
  const { action,id,value }=btn.dataset;
  if (action === 'open-search') openSearch();
  if (action === 'back') { if (history.length > 1) history.back(); else go('home'); }
  if (action === 'home-filter') { activeFilter=value; render(); }
  if (action === 'search-filter') { searchFilter=value; render(); $('#search-input')?.focus(); }
  if (action === 'discover-filter') { discoverFilter=value; render(); }
  if (action === 'favorite') { let x=state.links.find(y=>y.id===id); if (!x) { const idea=discover.find(y=>y.id===id); if (!idea) return; x=state.links.find(y=>y.url===idea.url); if (!x) { x={...structuredClone(idea),id:`link-${Date.now()}`,savedAt:new Date().toISOString().slice(0,10),favorite:true}; state.links.unshift(x); save(); go(`detail/${x.id}`); toast('Saved to favorites'); return; } } x.favorite=!x.favorite; save(); render(); toast(x.favorite?'Added to favorites':'Removed from favorites'); }
  if (action === 'new-collection') newCollection();
  if (action === 'edit-collection') editCollection(id);
  if (action === 'edit-profile') editProfile();
  if (action === 'edit-link') editLink(id);
  if (action === 'save-notes') { const x=state.links.find(y=>y.id===id); if (x) { x.notes=$('#detail-notes').value.trim(); save(); toast('Note saved'); } }
  if (action === 'delete') { const x=item(id); if (x) confirmAction('Delete link?', `Remove “${x.title}” from your library?`, 'Delete link', ()=>{ state.links=state.links.filter(y=>y.id!==id); save(); go('home'); toast('Link deleted'); }); }
  if (action === 'detail-menu') { const x=item(id); if (x) { modal('Link options', `<p class="modal-copy">${esc(x.title)}</p><div class="option-list"><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${icon('external',18)} Open original</a><button type="button" id="copy-link">${icon('link',18)} Copy URL</button></div>`,()=>{}); $('.modal-buttons')?.remove(); $('#copy-link').onclick=async()=>{ await navigator.clipboard.writeText(x.url); $('.modal-backdrop')?.remove(); toast('URL copied'); }; } }
  if (action === 'save-discover') { const x=discover.find(y=>y.id===id); if (!x) return; const existing=state.links.find(y=>y.url===x.url); if (existing) { go(`detail/${existing.id}`); toast('Already in your library'); return; } const copy={...structuredClone(x),id:`link-${Date.now()}`,savedAt:new Date().toISOString().slice(0,10)}; state.links.unshift(copy); save(); go(`detail/${copy.id}`); toast('Saved to your library'); }
  if (action === 'clear-search') { searchQuery=''; render(); $('#search-input')?.focus(); }
  if (action === 'clear-recent') { state.recent=[]; save(); render(); }
  if (action === 'recent-search') { searchQuery=value; rememberSearch(value); render(); }
  if (action === 'theme') { state.profile.dark=!state.profile.dark; save(); render(); }
  if (action === 'export') exportData();
  if (action === 'reset') confirmAction('Reset demo data?', 'This will remove your local changes and restore the sample links.', 'Reset demo', ()=>{ state=structuredClone(seed); save(); go('home'); render(); toast('Demo reset'); });
});
function rememberSearch(q) { const value=q.trim(); if (!value) return; state.recent=[value,...state.recent.filter(x=>x.toLowerCase()!==value.toLowerCase())].slice(0,5); save(); }
document.addEventListener('input', e => {
  if (e.target.id === 'search-input') { searchQuery=e.target.value; const start=e.target.selectionStart; render(); const input=$('#search-input'); input?.focus(); input?.setSelectionRange(start,start); }
  if (e.target.id === 'url') schedulePreview(e.target.value);
  if (e.target.id === 'title' || e.target.id === 'description') {
    const preview = $('#link-preview');
    if (preview) preview.innerHTML = previewCard({ ...(previewData || {}), url: httpUrl($('#url')?.value), title: $('#title')?.value, description: $('#description')?.value });
  }
});
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='k') { e.preventDefault(); openSearch(); } if (e.target.id==='search-input' && e.key==='Enter') { e.preventDefault(); rememberSearch(searchQuery); e.target.blur(); render(); } });
document.addEventListener('submit', e => { if (e.target.id==='save-form') { e.preventDefault(); saveLink(e.target); } });
document.addEventListener('change', e => { if (e.target.id==='detail-collection') { const x=state.links.find(y=>y.id===e.target.dataset.id); if (x) { x.collectionId=e.target.value; save(); toast('Collection updated'); } } });
window.addEventListener('hashchange', () => { render(); if (focusSearchOnNavigate) { $('#search-input')?.focus(); focusSearchOnNavigate = false; } if (route()[0] === 'save' && shareDraft?.url) schedulePreview(shareDraft.url, 0); });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt=e; });
if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
render();
if (route()[0] === 'save' && shareDraft?.url) schedulePreview(shareDraft.url, 0);
document.addEventListener('error', event => { if (event.target.matches?.('.remote-photo img')) event.target.remove(); }, true);
