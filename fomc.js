// ══════════════════════════════════════════════════════════════
// FOMC Federal Reserve Rate Decision Renderer
// Loads fomc.csv and draws rate labels directly into day cells.
// ══════════════════════════════════════════════════════════════

const FOMC_WIKI = 'https://en.wikipedia.org/wiki/History_of_Federal_Open_Market_Committee_actions';

// ── Enhanced tooltips for notable decisions ───────────────────
const FOMC_TOOLTIPS = {
  '4,29,2026': 'Hold 3.75% | 8-4 vote. Miran preferred a cut; Hammack, Kashkari & Logan opposed easing bias.',
  '3,18,2026': 'Hold 3.75% | 11-1. Miran dissented, preferring a 25bp cut.',
  '1,28,2026': 'Hold 3.75% | 10-2. Miran & Waller preferred a 25bp cut.',
  '12,10,2025': '-25bp → 3.75% | 9-3. Miran wanted 50bp; Goolsbee & Schmid preferred hold.',
  '10,29,2025': '-25bp → 4.00% | 10-2. Miran wanted 50bp; Schmid preferred hold.',
  '9,17,2025':  '-25bp → 4.25% | 11-1. Miran preferred a 50bp cut.',
  '7,30,2025':  'Hold 4.50% | 9-2. Bowman & Waller preferred a 25bp cut.',
  '9,18,2024':  '-50bp → 5.00% | 11-1. First cut since 2020; jumbo cut. Bowman preferred 25bp.',
  '12,18,2024': '-25bp → 4.50% | 11-1. Hammack preferred to hold.',
  '7,26,2023':  '+25bp → 5.50% | Cycle peak — highest since 2001.',
  '6,14,2023':  'Hold 5.25% | Deliberate skip — pause after 10 consecutive hikes.',
  '3,22,2023':  '+25bp → 5.00% | Hike despite SVB banking stress.',
  '6,15,2022':  '+75bp → 1.75% | Largest hike since 1994. George dissented (50bp). Inflation at 40-year high.',
  '5,4,2022':   '+50bp → 1.00% | Largest hike since 2000. Balance sheet runoff begins.',
  '3,16,2022':  '+25bp → 0.50% | First hike since 2018. Bullard dissented, wanted 50bp.',
  '11,2,2022':  '+75bp → 4.00% | Fourth consecutive 75bp hike.',
  '9,21,2022':  '+75bp → 3.25%',
  '7,27,2022':  '+75bp → 2.50%',
  '12,14,2022': '+50bp → 4.50% | Deliberate downshift from 75bp pace.',
  '3,15,2020':  '-100bp → 0.25% | Emergency Sunday cut — COVID-19. ZIRP era 2 begins. 9-1 vote.',
  '3,3,2020':   '-50bp → 1.25% | Emergency inter-meeting cut — first COVID-19 response.',
  '12,16,2008': '-75bp → 0.25% | ZIRP era 1 begins. Rate effectively zero for first time in Fed history.',
  '10,8,2008':  '-50bp → 1.50% | Emergency coordinated global cut with 6 other central banks.',
  '9,16,2008':  'Hold 2.00% | Day after Lehman Brothers bankruptcy. Fed held steady.',
  '3,18,2008':  '-75bp → 2.25% | Large cut amid Bear Stearns collapse. Fisher & Plosser dissented.',
  '3,16,2008':  '-25bp → 3.00% | Emergency — Bear Stearns meltdown. Arranged JPMorgan buyout.',
  '1,22,2008':  '-75bp → 3.50% | Emergency inter-meeting cut before market open. Poole dissented.',
  '1,30,2008':  '-50bp → 3.00% | Fisher dissented, preferred no change.',
  '12,11,2007': '-25bp → 4.25% | Markets disappointed. Fed pledged next-day global liquidity injection. Rosengren wanted 50bp.',
  '9,18,2007':  '-50bp → 4.75% | First cut of the financial crisis era.',
  '8,17,2007':  'Emergency discount rate cut only (not fed funds). Spread reduced to 50bp amid subprime crisis.',
  '6,29,2006':  '+25bp → 5.25% | Cycle peak. Held until Sept 2007 — 15 months.',
  '3,28,2006':  '+25bp → 4.75% | Bernanke\'s first meeting as chair, replacing Greenspan.',
  '6,30,2004':  '+25bp → 1.25% | Start of 2004-06 hike cycle after 12 months at 1% floor.',
  '12,14,2004': '+25bp → 2.25% | FOMC changed policy: minutes now released 3 weeks after decision.',
  '6,25,2003':  '-25bp → 1.00% | Post dot-com low; deflation fears. Parry wanted 50bp.',
  '11,6,2002':  '-50bp → 1.25% | Unusually large 50bp cut.',
  '9,17,2001':  '-50bp → 3.00% | Emergency cut after 9/11. Two conference calls Sept 13 & 17.',
  '1,3,2001':   '-50bp → 6.00% | Emergency inter-meeting cut. Dot-com recession begins.',
  '4,18,2001':  '-50bp → 4.50% | Emergency inter-meeting cut.',
  '5,16,2000':  '+50bp → 6.50% | Greenspan cycle peak. Dot-com bust followed.',
  '10,15,1998': '-25bp → 5.00% | Emergency inter-meeting cut. LTCM collapse.',
  '9,29,1998':  '-25bp → 5.25% | Russia default / LTCM crisis.',
  '2,4,1994':   '+25bp → 3.25% | First formal public FOMC announcement. Pre-emptive anti-inflation hike.',
  '4,18,1994':  '+25bp → 3.75% | Emergency inter-meeting hike.',
  '11,15,1994': '+75bp → 5.50% | Largest single move of cycle.',
  '2,1,1995':   '+50bp → 6.00% | Greenspan cycle peak.',
  '7,6,1995':   '-25bp → 5.75% | First \'insurance\' cut — pre-emptive easing.',
  '3,25,1997':  '+25bp → 5.50% | Only hike of 1997; pre-emptive.',
  '10,6,1979':  '+100bp (discount) | Saturday Night Massacre — rare Saturday press conference. Shift to reserves targeting; fed funds surged from ~11.5% to 15.5%+.',
  '12,16,2015': '+25bp → 0.50% | First hike in 9 years. End of ZIRP era 1.',
  '10,19,1987': 'Emergency liquidity injection — Black Monday. Funds rate fell ~37bp.',
  '12,6,1965':  '+50bp | LBJ furious — Greenspan overruled the president. Vietnam-era inflation beginning.',
  '8,27,2020':  'No meeting — FOMC adopted average inflation targeting (AIT): 2% average over time, not hard ceiling.',
};

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

  // Tooltip: use enhanced description if available, otherwise basic info
  const tooltipKey = `${entry.month},${entry.day},${entry.year}`;
  const enhanced = FOMC_TOOLTIPS[tooltipKey];
  const dir = entry.bps > 0 ? 'Hike' : entry.bps < 0 ? 'Cut' : 'Hold';
  label.title = enhanced
    ? `${dir} — ${enhanced}`
    : `Fed Rate Decision: ${entry.bps > 0 ? '+' : ''}${entry.bps}bp → ${entry.rate}%`;
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
