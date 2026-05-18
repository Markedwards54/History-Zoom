// ══════════════════════════════════════════════════════════════
// FOMC Federal Reserve Rate Decision Renderer
// Loads fomc.csv and draws rate labels directly into day cells.
// ══════════════════════════════════════════════════════════════

const FOMC_WIKI = 'https://en.wikipedia.org/wiki/History_of_Federal_Open_Market_Committee_actions';

let fomcData = [];

// ── Load fomc.csv ─────────────────────────────────────────────
function loadFOMC(callback) {
  const url = (typeof csvUrl === 'function')
    ? csvUrl('fomc.csv')
    : 'fomc.csv?nc=' + Date.now();
  fetch(url, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' }
  })
  .then(r => r.text())
  .then(text => {
    Papa.parse(text, {
      header: true,
      complete: results => {
        fomcData = results.data
          .filter(r => r.month && r.year && r.bps !== undefined)
          .map(r => ({
            month: parseInt(r.month, 10),
            day:   parseInt(r.day,   10),
            year:  parseInt(r.year,  10),
            bps:   parseInt(r.bps,   10),
            rate:  r.rate || '',
          }));
        if (callback) callback();
      }
    });
  })
  .catch(err => console.error('[FOMC] Load error:', err));
}

// ── Render all FOMC labels for the current year ───────────────
function renderFOMC() {
  document.querySelectorAll('.fomc-label').forEach(el => el.remove());
  const yr = currentYear;
  fomcData.filter(r => r.year === yr).forEach(entry => {
    const cell = document.querySelector(
      `.day-cell[data-month="${entry.month}"][data-day="${entry.day}"][data-year="${yr}"]`
    );
    if (!cell) return;
    cell.appendChild(makeFomcLabel(entry));
  });
}

function makeFomcLabel(entry) {
  const label = document.createElement('div');
  label.className = 'fomc-label';

  if (entry.bps > 0) {
    label.classList.add('fomc-hike');
    label.innerHTML = `<span class="fomc-rate">${entry.rate}</span>`;
  } else if (entry.bps < 0) {
    label.classList.add('fomc-cut');
    label.innerHTML = `<span class="fomc-rate">${entry.rate}</span>`;
  } else {
    label.classList.add('fomc-hold');
    label.innerHTML = `<span class="fomc-rate">${entry.rate}</span>`;
  }

  label.title = `Fed: ${entry.bps > 0 ? '+' : ''}${entry.bps}bp → ${entry.rate}%`;
  label.dataset.month = entry.month;
  label.dataset.day   = entry.day;
  label.dataset.year  = entry.year;

  label.addEventListener('click', e => {
    e.stopPropagation();
    openWiki(FOMC_WIKI);
  });

  label.addEventListener('contextmenu', e => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    fomcCtxTarget = entry;
    showFomcCtx(e);
  });

  return label;
}

// ── Context menu ──────────────────────────────────────────────
let fomcCtxTarget = null;

function showFomcCtx(e) {
  const m = document.getElementById('fomc-ctx-menu');
  if (!m) return;
  m.style.display = 'block';
  m.style.left = Math.min(e.clientX, window.innerWidth  - 160) + 'px';
  m.style.top  = Math.min(e.clientY, window.innerHeight - 80)  + 'px';
}

function hideFomcCtx() {
  const m = document.getElementById('fomc-ctx-menu');
  if (m) m.style.display = 'none';
  fomcCtxTarget = null;
}

function fomcDelete() {
  hideFomcCtx();
  if (!fomcCtxTarget) return;
  const { month, day, year } = fomcCtxTarget;
  fomcData = fomcData.filter(r => !(r.month === month && r.day === day && r.year === year));
  renderFOMC();
  saveFOMC();
}

// ── Add dialog ────────────────────────────────────────────────
function fomcDialogOpen(mo, dy, yr) {
  document.getElementById('fomc-mo').value   = mo  || '';
  document.getElementById('fomc-dy').value   = dy  || '';
  document.getElementById('fomc-yr').value   = yr  || currentYear;
  document.getElementById('fomc-bps').value  = '';
  document.getElementById('fomc-rate').value = '';
  document.getElementById('fomc-dialog-fb').textContent = '';
  document.getElementById('fomc-dialog').style.display = 'block';
}

function fomcDialogClose() {
  document.getElementById('fomc-dialog').style.display = 'none';
}

function fomcDialogPreset(type) {
  // Set typical bps values; user fills in rate
  const bpsMap = { hike: 25, hold: 0, cut: -25 };
  const bps = document.getElementById('fomc-bps');
  if (!bps.value) bps.value = bpsMap[type] || 0;
}

async function fomcDialogSave() {
  const mo   = parseInt(document.getElementById('fomc-mo').value,  10);
  const dy   = parseInt(document.getElementById('fomc-dy').value,  10);
  const yr   = parseInt(document.getElementById('fomc-yr').value,  10);
  const bps  = parseInt(document.getElementById('fomc-bps').value, 10);
  const rate = parseFloat(document.getElementById('fomc-rate').value);
  const fb   = document.getElementById('fomc-dialog-fb');

  if (!mo || !dy || !yr || isNaN(bps) || isNaN(rate)) {
    fb.textContent = '⚠ Please fill in all fields';
    fb.style.color = '#e88';
    return;
  }

  // Remove any existing entry for same date
  fomcData = fomcData.filter(r => !(r.month === mo && r.day === dy && r.year === yr));
  const entry = { month: mo, day: dy, year: yr, bps, rate: rate.toFixed(2) };
  fomcData.push(entry);
  fomcData.sort((a,b) => a.year !== b.year ? a.year - b.year : a.month !== b.month ? a.month - b.month : a.day - b.day);

  renderFOMC();
  fb.style.color = '#5ab870';
  fb.textContent = '⏳ Saving…';
  await saveFOMC();
  fb.textContent = '✓ Added!';
  setTimeout(fomcDialogClose, 800);
}

// ── Save fomc.csv ─────────────────────────────────────────────
async function saveFOMC() {
  const rows = fomcData.map(r => `${r.month},${r.day},${r.year},${r.bps},${r.rate}`);
  try {
    const apiUrl = (typeof CSV_WRITE_URL !== 'undefined') ? CSV_WRITE_URL : 'http://localhost:8080/csv_write.php';
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvFile:'fomc.csv', replaceAll:true, rows, header:'month,day,year,bps,rate' })
    });
    const data = await res.json();
    if (data.success) showSaveStatus('✓ FOMC saved');
    else showSaveStatus('⚠ FOMC save: ' + data.error, true);
  } catch(e) { showSaveStatus('⚠ ' + e.message, true); }
}

function renderFOMCAfterBuild() { setTimeout(renderFOMC, 50); }
