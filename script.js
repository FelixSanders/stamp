// Stamp + museum data now lives in data.json alongside this file, instead
// of being embedded here. This works the same on GitHub Pages (or any real
// web server) because fetch() can load a same-origin JSON file over
// http(s). It will NOT work if you just double-click index.html and open
// it as a file:// URL — browsers block fetch() for local files. To test
// locally, run a tiny server from this folder, e.g.:
//   python3 -m http.server 8000
// then visit http://localhost:8000
let stamps = [];
let museumInfo = {};

const sheetGrid = document.getElementById('sheetGrid');
const museumGrid = document.getElementById('museumGrid');
const viewer = document.getElementById('viewer');
const detail = document.getElementById('detail');
const search = document.getElementById('search');

function uniqueMuseums() {
  return Object.keys(museumInfo).sort();
}

function renderSheets(filter = '') {
  sheetGrid.innerHTML = '';
  for (let i = 1; i <= 21; i++) {
    const sheetStamps = stamps.filter(s => s.sheet === i);
    const matches = !filter || sheetStamps.some(s => s.museum.toLowerCase().includes(filter));
    if (!matches) continue;
    const card = document.createElement('article');
    card.className = 'sheet-card';
    card.innerHTML = `<img src="assets/sheet-${String(i).padStart(2, '0')}.jpg" alt="Stamp sheet ${i}" loading="lazy">
      <div class="sheet-info"><strong>Sheet ${String(i).padStart(2, '0')}</strong><span>${sheetStamps.length} stamps · Open sheet →</span></div>`;
    card.onclick = () => openViewer(i, sheetStamps[0]?.id);
    sheetGrid.appendChild(card);
  }
}

function renderMuseums(filter = '') {
  museumGrid.innerHTML = '';
  uniqueMuseums().filter(name => !filter || name.toLowerCase().includes(filter)).forEach(name => {
    const info = museumInfo[name];
    const count = stamps.filter(s => s.museum === name).length;
    const card = document.createElement('article');
    card.className = 'museum-card';
    card.innerHTML = `<p class="eyebrow">${count} STAMP${count === 1 ? '' : 'S'}</p><h3>${name}</h3><p>${info.city} · ${info.type}</p>`;
    card.onclick = () => openDetail(name);
    museumGrid.appendChild(card);
  });
}

let currentSheetStamps = [];

// Because the stamp image uses object-fit:contain, the visible image can be
// letterboxed inside its box on some screen sizes/orientations. Hotspot
// percentages are authored relative to the *visible image*, so we compute
// that box in pixels and position hotspots against it directly. This keeps
// every hotspot locked to its stamp regardless of viewport size.
function getContainRect(img) {
  const cw = img.clientWidth;
  const ch = img.clientHeight;
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!cw || !ch || !nw || !nh) return { left: 0, top: 0, width: cw, height: ch };
  const scale = Math.min(cw / nw, ch / nh);
  const width = nw * scale;
  const height = nh * scale;
  return { left: (cw - width) / 2, top: (ch - height) / 2, width, height };
}

function positionHotspots() {
  const img = document.getElementById('viewerImage');
  const hs = document.getElementById('hotspots');
  if (!img || !hs || !img.naturalWidth) return;
  const rect = getContainRect(img);
  hs.querySelectorAll('.hotspot').forEach(b => {
    const s = currentSheetStamps.find(x => x.id === b.dataset.id);
    if (!s) return;
    const left = rect.left + ((s.x - s.w / 2) / 100) * rect.width;
    const top = rect.top + ((s.y - s.h / 2) / 100) * rect.height;
    const width = (s.w / 100) * rect.width;
    const height = (s.h / 100) * rect.height;
    b.style.left = `${left}px`;
    b.style.top = `${top}px`;
    b.style.width = `${width}px`;
    b.style.height = `${height}px`;
  });
}

function syncBodyScroll() {
  const anyOpen = viewer.classList.contains('open') || detail.classList.contains('open');
  document.body.classList.toggle('modal-open', anyOpen);
}

function openViewer(sheet, selectedId) {
  viewer.classList.add('open');
  viewer.setAttribute('aria-hidden', 'false');
  syncBodyScroll();
  const img = document.getElementById('viewerImage');
  const hs = document.getElementById('hotspots');
  hs.innerHTML = '';
  const items = stamps.filter(s => s.sheet === sheet);
  currentSheetStamps = items;
  items.forEach(s => {
    const b = document.createElement('button');
    b.className = 'hotspot';
    b.title = s.museum;
    b.dataset.id = s.id;
    // Four corner brackets (like a scan/viewfinder marker) plus a small
    // numbered badge, instead of a plain highlighted box.
    b.innerHTML = `
      <span class="hotspot-corner tl"></span>
      <span class="hotspot-corner tr"></span>
      <span class="hotspot-corner bl"></span>
      <span class="hotspot-corner br"></span>
      <span class="hotspot-badge">${s.number}</span>
      <span class="hotspot-pulse"></span>
    `;
    b.onclick = (e) => { e.stopPropagation(); selectStamp(s.id); };
    hs.appendChild(b);
  });
  img.alt = `Stamp sheet ${sheet}`;
  img.onload = positionHotspots;
  img.src = `assets/sheet-${String(sheet).padStart(2, '0')}.jpg`;
  if (img.complete) positionHotspots();
  selectStamp(selectedId || items[0]?.id);
}

// Recompute hotspot positions whenever the image box changes size
// (window resize, orientation change, or the viewer layout shifting).
const viewerImageWrap = document.querySelector('.viewer-image-wrap');
if (viewerImageWrap && 'ResizeObserver' in window) {
  new ResizeObserver(() => positionHotspots()).observe(viewerImageWrap);
} else {
  window.addEventListener('resize', positionHotspots);
}

function selectStamp(id) {
  const s = stamps.find(x => x.id === id);
  if (!s) return;
  document.querySelectorAll('.hotspot').forEach(x => x.classList.toggle('active', x.dataset.id === id));
  const info = museumInfo[s.museum] || { city: '', type: 'Museum', description: 'Add your museum details in data.json.' };
  document.getElementById('viewerLabel').textContent = `STAMP ${String(s.sheet).padStart(2, '0')} · #${s.number}`;
  document.getElementById('viewerTitle').textContent = s.museum;
  document.getElementById('viewerMeta').textContent = `${info.city} · ${info.type}`;
  document.getElementById('viewerDescription').textContent = info.description;
}

function openDetail(name) {
  const info = museumInfo[name];
  detail.classList.add('open');
  detail.setAttribute('aria-hidden', 'false');
  syncBodyScroll();
  document.getElementById('detailTitle').textContent = name;
  document.getElementById('detailCity').textContent = info.city;
  document.getElementById('detailType').textContent = info.type;
  document.getElementById('detailDescription').textContent = info.description;
  document.getElementById('detailStampButton').onclick = () => {
    const first = stamps.find(s => s.museum === name);
    detail.classList.remove('open');
    if (first) openViewer(first.sheet, first.id);
  };
}

document.querySelectorAll('[data-close]').forEach(x => x.onclick = () => {
  viewer.classList.remove('open');
  viewer.setAttribute('aria-hidden', 'true');
  syncBodyScroll();
});
document.querySelectorAll('[data-detail-close]').forEach(x => x.onclick = () => {
  detail.classList.remove('open');
  detail.setAttribute('aria-hidden', 'true');
  syncBodyScroll();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    viewer.classList.remove('open');
    detail.classList.remove('open');
    syncBodyScroll();
  }
});
search.addEventListener('input', e => {
  const q = e.target.value.toLowerCase().trim();
  renderSheets(q);
  renderMuseums(q);
});

// ---- Load data.json, then boot the app ----
sheetGrid.innerHTML = '<p class="loading-note">Loading the collection…</p>';

fetch('data.json')
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then(data => {
    stamps = data.stamps;
    museumInfo = data.museumInfo;
    document.getElementById('stampCount').textContent = stamps.length;
    document.getElementById('museumCount').textContent = Object.keys(museumInfo).length;
    renderSheets();
    renderMuseums();
  })
  .catch(err => {
    console.error('Failed to load data.json', err);
    sheetGrid.innerHTML = `<p class="loading-note error">Couldn't load data.json. If you opened this page directly from a file (file://), browsers block that — run a local server instead, e.g. <code>python3 -m http.server</code>, then open the localhost address. This works normally once hosted, including on GitHub Pages.</p>`;
  });