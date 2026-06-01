// ══════════════════════════════════════════════════════════════
// HISTORY ZOOM — script.js
// Works with GitHub Pages (static hosting) + events.csv + multiDayTextBlocks.csv
// ══════════════════════════════════════════════════════════════

'use strict';

// ─── ENVIRONMENT DETECTION ────────────────────────────────────
// Works on localhost (XAMPP) and Render.com automatically
const IS_LOCAL = window.location.hostname === 'localhost' ||
                 window.location.hostname === '127.0.0.1';
const API_BASE = IS_LOCAL
  ? `http://${window.location.hostname}:${window.location.port || 8080}`
  : window.location.origin;
// On localhost: csv_write.php lives in the same folder as this script
// On Render: it's at the root, served by router.php
const CSV_WRITE_URL = IS_LOCAL
  ? window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/csv_write.php')
  : API_BASE + '/csv_write.php';

// Show download button only on Render (not needed on localhost)
if (!IS_LOCAL) {
  const dl = document.getElementById('download-link');
  if (dl) dl.style.display = 'inline-block';
  const bl = document.getElementById('backup-link');
  if (bl) bl.style.display = 'inline-block';
}

// On Render, CSVs are served from persistent disk via csv_serve.php
// On localhost, fetch directly from project folder
function csvUrl(filename) {
  if (IS_LOCAL) return filename + '?nc=' + Date.now();
  return 'csv_serve.php?file=' + encodeURIComponent(filename) + '&nc=' + Date.now();
}

// ─── STATE ────────────────────────────────────────────────────
// Guard against year=0 saved in localStorage from accidental navigation
let _savedYear = parseInt(localStorage.getItem('hz_year') || '2026', 10);
if (isNaN(_savedYear)) { _savedYear = 2026; localStorage.setItem('hz_year', '2026'); }
let currentYear = _savedYear;

// ── Date helper — fixes JS bug where new Date(year<100) adds 1900 ──
// Always use this instead of new Date(year, month, day)
function makeDate(year, month1based, day) {
  const d = new Date(0);
  d.setFullYear(year, month1based - 1, day || 1);
  return d;
}
let events             = [];   // loaded from events.csv
let multiDayTextBlocks = [];   // loaded from multiDayTextBlocks.csv

// Active arrays used by the renderer (same refs as above for CSV-based project)
let EVENTS     = events;
let BLOCKS     = multiDayTextBlocks;
// RECESSIONS filtering removed — ALL_RECESSIONS used directly

// NBER recessions
// ─── NBER Recession dates — exact peak/trough from NBER ──────
const ALL_RECESSIONS = [
  ['1857-06-01','1858-12-01'],['1860-10-01','1861-06-01'],['1865-04-01','1867-12-01'],
  ['1869-06-01','1870-12-01'],['1873-10-01','1879-03-01'],['1882-03-01','1885-05-01'],
  ['1887-03-01','1888-04-01'],['1890-07-01','1891-05-01'],['1893-01-01','1894-06-01'],
  ['1895-12-01','1897-06-01'],['1899-06-01','1900-12-01'],['1902-09-01','1904-08-01'],
  ['1907-05-01','1908-06-01'],['1910-01-01','1912-01-01'],['1913-01-01','1914-12-01'],
  ['1918-08-01','1919-03-01'],['1920-01-01','1921-07-01'],['1923-05-01','1924-07-01'],
  ['1926-10-01','1927-11-01'],['1929-08-01','1933-03-01'],['1937-05-01','1938-06-01'],
  ['1945-02-01','1945-10-01'],['1948-11-01','1949-10-01'],['1953-07-01','1954-05-01'],
  ['1957-08-01','1958-04-01'],['1960-04-01','1961-02-01'],['1969-12-01','1970-11-01'],
  ['1973-11-01','1975-03-01'],['1980-01-01','1980-07-01'],['1981-07-01','1982-11-01'],
  ['1990-07-01','1991-03-01'],['2001-03-01','2001-11-01'],['2007-12-01','2009-06-01'],
  ['2020-02-01','2020-04-01'],
].map(([p,t]) => ({ start: new Date(p), end: new Date(t) }));

// ─── CSV LOADING ──────────────────────────────────────────────
// CSV loading counter is local to loadCSVFiles()

function loadCSVFiles(callback) {
  let csvLoaded = 0;

  function fetchCSV(filename, done) {
    fetch(csvUrl(filename), {
      cache: 'no-store',
      headers: {'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache'}
    })
    .then(r => r.text())
    .then(text => Papa.parse(text, {header: true, complete: done}))
    .catch(err => console.error(filename + ' error:', err));
  }

  fetchCSV('events.csv', function(results) {
    events = results.data
      .filter(e => {
        const yr = parseInt(e.year, 10);
        return e.month && e.year && !isNaN(yr) && yr !== 0;
      })
      .map(e => ({
        month: parseInt(e.month, 10),
        day:   parseInt(e.day,   10),
        year:  parseInt(e.year,  10),
        wikiUrl:  e.wikiUrl  || '',
        imageUrl: e.imageUrl || '',
        ct: parseFloat(e.croptop)     || 0,
        cr: parseFloat(e.cropright)   || 0,
        cb: parseFloat(e.cropbottom)  || 0,
        cl: parseFloat(e.cropleft)    || 0,
        pt: parseFloat(e.positiontop)  || 0,
        pl: parseFloat(e.positionleft) || 0,
        sc: parseFloat(e.scale)  || 1,
        z:  parseInt(e.zIndexOverride, 10) || 10,
        tooltip: e.tooltip || '',
      }));
    EVENTS = events;
    if (++csvLoaded >= 2) callback();
  });

  fetchCSV('multiDayTextBlocks.csv', function(results) {
    console.log('[CSV] multiDayTextBlocks raw rows:', results.data.length);
    const apr18 = results.data.filter(b => b.startMonth === '4' && b.startDay === '18' && b.startYear === '2026');
    if (apr18.length) console.log('[CSV] Found Apr 18 2026 raw:', JSON.stringify(apr18[0]));
    else console.warn('[CSV] Apr 18 2026 NOT found in parsed data');
    multiDayTextBlocks = results.data
      .filter(b => {
        const sy = parseInt(b.startYear, 10);
        return b.startMonth && b.startYear && !isNaN(sy) && sy !== 0;
      })
      .map(b => ({
        sm: parseInt(b.startMonth, 10),
        sd: parseInt(b.startDay,   10),
        sy: parseInt(b.startYear,  10),
        em: parseInt(b.endMonth,   10),
        ed: parseInt(b.endDay,     10),
        ey: parseInt(b.endYear,    10),
        wiki:  b.wikiUrl || '',
        text:  b.text    || '',
        fs:    b.fontSize || '2em',
        bold:  b.bold ? b.bold.toLowerCase() === 'true' : false,
        color: b.color           || 'black',
        bg:    b.backgroundColor || 'gold',
        croptop: parseFloat(b.croptop)    || 0,
        cropbot: parseFloat(b.cropbottom) || 0,
        cropleft:  parseFloat(b.cropleft)  || 0,
        cropright: parseFloat(b.cropright) || 0,
        pt: parseFloat(b.positiontop)  || 40,
        pl: parseFloat(b.positionleft) || 17,
        vo: parseFloat(b.verticalOffset)  || 0,
        h:  parseFloat(b.height) || 0.8,
        z:  parseInt(b.zIndexOverride, 10) || 20,
        tooltip: b.tooltip || '',
        tw: b.textWeek ? String(b.textWeek).split(',').map(Number).filter(n => !isNaN(n) && n > 0) : [],
        segPl: {}, segPtInner: {},
        // pt_inner repurposes the 'scale' column; old rows have scale=1 so default to 20
        pt_inner: (b.scale && String(b.scale).trim() !== '1')
                    ? parseFloat(b.scale) || 20
                    : 20,
      }));
    BLOCKS = multiDayTextBlocks;
    if (++csvLoaded >= 2) callback();
  });
}

// ─── YEAR NAVIGATION ──────────────────────────────────────────
function setYear(yr) {
    yr = parseInt(yr, 10);
    if (isNaN(yr)) return;
    if (editMode) exitEditMode();

    currentYear = yr;

    // Update UI — no sword, just the year
    const disp = document.getElementById('year-display');
    if (disp) disp.textContent = yr < 0 ? Math.abs(yr) + ' BC' : String(yr);

    // Pre-fill search box so user sees current year
    const searchBox = document.getElementById('search-year');
    if (searchBox) searchBox.value = yr < 0 ? Math.abs(yr) : yr;
    const bceBox = document.getElementById('is-bce');
    if (bceBox) bceBox.checked = yr < 0;

    localStorage.setItem('hz_year', yr);

    buildCalendar();
}

function goBack()    { setYear(currentYear - 1); }
function goForward() { setYear(currentYear + 1); }

function searchYear() {
    const raw = document.getElementById('search-year').value.trim();
    const bce = document.getElementById('is-bce').checked;
    let yr = parseInt(raw, 10);
    if (isNaN(yr)) return;
    if (bce) yr = -Math.abs(yr);
    setYear(yr);
}

// Keyboard navigation (arrow keys)
document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft')  goBack();
    if (e.key === 'ArrowRight') goForward();
});

// Enter key in search box
document.addEventListener('DOMContentLoaded', () => {
    const searchBox = document.getElementById('search-year');
    if (searchBox) {
        searchBox.addEventListener('keydown', e => {
            if (e.key === 'Enter') searchYear();
        });
    }
});


// ─── exitEditMode helper (called by setYear) ──────────────────
function exitEditMode() {
    if (!editMode) return;
    editMode = false;
    document.body.classList.remove('edit-mode');
    const btn = document.getElementById('edit-btn');
    if (btn) { btn.textContent = '✏ Edit Mode'; btn.classList.remove('active'); }
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    editModeSnapshot = null;
    if (typeof closeAllPanels === 'function') closeAllPanels();
    if (typeof hideCtx       === 'function') hideCtx();
    if (typeof deselect      === 'function') deselect();
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function daysInMonth(m, y) {
  const d = new Date(0); d.setFullYear(y, m, 0); return d.getDate();
}
function firstDay(m, y) {
  const d = new Date(0); d.setFullYear(y, m-1, 1); return d.getDay();
}
function isRecession(d)    { return ALL_RECESSIONS.some(r => d >= r.start && d <= r.end); }

function buildCalendar() {
  const cal = document.getElementById('calendar');
  cal.innerHTML = '';

  for (let mo = 1; mo <= 12; mo++) {
    const mb = document.createElement('div');
    mb.className = 'month-block';

    // Header
    const mh = document.createElement('div');
    mh.className = 'month-name';
    mh.textContent = MONTHS[mo-1].toUpperCase() + ' ' + currentYear;
    mb.appendChild(mh);

    // Weekday labels
    const wr = document.createElement('div');
    wr.className = 'weekday-row';
    DAYS.forEach(d => {
      const wd = document.createElement('div');
      wd.className = 'wd';
      wd.textContent = d;
      wr.appendChild(wd);
    });
    mb.appendChild(wr);

    // Days grid
    const dg = document.createElement('div');
    dg.className = 'days-grid';

    const fd = firstDay(mo, currentYear);
    const di = daysInMonth(mo, currentYear);

    // Empty cells before first day
    for (let i = 0; i < fd; i++) {
      const ec = document.createElement('div');
      ec.className = 'day-cell empty';
      dg.appendChild(ec);
    }

    // Day cells
    for (let d = 1; d <= di; d++) {
      const cell = document.createElement('div');
      cell.className = 'day-cell';
      cell.dataset.month = mo;
      cell.dataset.day   = d;
      cell.dataset.year  = currentYear;
      const dt = makeDate(currentYear, mo, d);
      if (isRecession(dt)) cell.classList.add('recession');
      cell.textContent = d;

      // Click the day number (not an image) → open On This Day
      cell.addEventListener('click', e => {
        if (editMode) return;
        // Only trigger if clicking the cell background/number, not an image or block
        if (e.target === cell) showOnThisDay(mo, d);
      });

      // Attach events for this day
      EVENTS.forEach(ev => {
        if (ev.month === mo && ev.day === d && ev.year === currentYear) {
          const img = makeImg(ev);
          cell.appendChild(img);
        }
      });

      // Right-click context menu
      cell.addEventListener('contextmenu', e => {
        if (!editMode) return;
        e.preventDefault();
        showCtx(e, mo, d, currentYear, cell);
      });

      dg.appendChild(cell);
    }

    mb.appendChild(dg);
    cal.appendChild(mb);
  }

  // Fix vertical spacing for scaled mobile months
  fixMobileMonthSpacing();

  // Render text blocks
  renderBlocks();
  // Render FOMC labels if loaded
  if (typeof renderFOMCAfterBuild === 'function') renderFOMCAfterBuild();
}

function fixMobileMonthSpacing() {
  // Only needed on mobile where months are CSS-scaled
  if (window.innerWidth > 600) return;
  const scale = window.innerWidth <= 600 ? 0.72 : 1;
  document.querySelectorAll('.month-block').forEach(mb => {
    // Natural height * scale = visual height; layout height = natural height
    // margin-bottom compensates for the gap between visual and layout
    const naturalH = mb.offsetHeight;
    const compensation = -(naturalH * (1 - scale));
    mb.style.marginBottom = compensation + 'px';
  });
}

function makeImg(ev) {
  const img = document.createElement('img');
  img.src   = ev.imageUrl;
  img.className = 'evt-img';
  img._ev = ev; // store reference for broken image finder and outline

  // Tooltip: use stored override if set, otherwise auto-generate from wiki URL
  img.title = getTooltip(ev) || wikiTitle(ev.wikiUrl);

  applyImgStyle(img, ev);

  img.addEventListener('click', e => {
    if (!editMode) openWiki(ev.wikiUrl);
  });

  attachImgDrag(img, ev);
  return img;
}

function applyImgStyle(img, ev) {
  // Images render at natural size, then we scale to fit the cell,
  // then apply ev.sc as a multiplier on top of that fit.
  // This preserves the meaning of the original scale values.
  const hasCrop = ev.ct || ev.cr || ev.cb || ev.cl;

  img.style.position        = 'absolute';
  img.style.top             = ev.pt + '%';
  img.style.left            = ev.pl + '%';
  img.style.transformOrigin = 'top left';
  img.style.zIndex          = ev.z;
  img.style.clipPath        = hasCrop
    ? `inset(${ev.ct}% ${ev.cr}% ${ev.cb}% ${ev.cl}%)`
    : 'none';
  img.style.cursor          = 'pointer';
  img.style.display         = 'block';
  img.style.maxWidth        = 'none';
  img.style.maxHeight       = 'none';
  img.style.objectFit       = 'none';

  // Compute scale: fit image to cell dimensions × ev.sc multiplier
  // Cell is 75×100px. We scale so the image fills the cell, then multiply.
  function applyScale() {
    const nw = img.naturalWidth  || 250;
    const nh = img.naturalHeight || 330;
    if (!nw || !nh || nw < 2 || nh < 2) return; // image not ready
    const cellW = 75, cellH = 100;
    const fitScale = Math.max(cellW / nw, cellH / nh);
    if (!isFinite(fitScale) || fitScale <= 0) return; // guard Infinity/NaN
    const final = fitScale * (ev.sc || 1);
    img.style.width  = nw + 'px';
    img.style.height = nh + 'px';
    img.style.transform = `scale(${final})`;
    img._fitScale = fitScale;
  }

  if (img.complete && img.naturalWidth) {
    applyScale();
  } else {
    // Set a safe placeholder size while loading — prevents giant grey square
    img.style.width  = '75px';
    img.style.height = '100px';
    img.style.transform = `scale(${ev.sc || 1})`;
    img.addEventListener('load', applyScale, {once: true});
    img.addEventListener('error', () => {
      // Image failed to load — keep placeholder size so it doesn't blow up layout
      img.style.width  = '75px';
      img.style.height = '100px';
      img.style.transform = `scale(1)`;
      img.style.opacity = '0.3';
    }, {once: true});
  }
}

// ── TEXT BLOCKS ──────────────────────────────────────────────
function renderBlocks() {
  // Deselect first so handles don't orphan
  const prevBlock = (selTarget && selTarget.type === 'block') ? selTarget.block : null;
  deselect();

  document.querySelectorAll('.txt-block').forEach(b => b.remove());

  BLOCKS.forEach(block => {
    // Skip malformed blocks with year=0 or NaN
    if (!block.sy || isNaN(block.sy) || block.sy === 0) {
      console.warn('[renderBlocks] SKIPPED year=0 block:', block.text, 'sy:', block.sy);
      return;
    }

    // Log if this block overlaps year 0 somehow
    if (currentYear === 0 || block.sy === 0 || block.ey === 0) {
      console.warn('[renderBlocks] year=0 involvement:', block.text, 'sy:', block.sy, 'ey:', block.ey, 'currentYear:', currentYear);
    }

    // Determine which days of currentYear this block covers
    const blockStart = makeDate(block.sy, block.sm, block.sd);
    const blockEnd   = makeDate(block.ey, block.em, block.ed);
    const yearStart  = makeDate(currentYear, 1, 1);
    const yearEnd    = makeDate(currentYear, 12, 31);

    // Only render if block overlaps this year
    if (blockEnd < yearStart || blockStart > yearEnd) return;

    const renderStart = blockStart < yearStart ? yearStart : blockStart;
    const renderEnd   = blockEnd   > yearEnd   ? yearEnd   : blockEnd;

    // Walk day by day, grouping into week segments
    // Break segments at: end of week (Saturday→Sunday boundary) AND month changes
    // For cross-year blocks, offset totalWeek by segments in prior years
    // so each segment has a globally unique week number across both year pages.
    let totalWeek = 0;

    // Count segments that fell before this year (so 1945 segments don't collide with 1944)
    if (blockStart < yearStart) {
      let preStart = new Date(blockStart);
      while (preStart < yearStart) {
        const preEnd = new Date(preStart);
        while (preEnd < yearStart) {
          const next = new Date(preEnd);
          next.setDate(next.getDate() + 1);
          if (next >= yearStart)         break;
          if (next.getDay() === 0)       break;
          if (next.getMonth() !== preEnd.getMonth()) break;
          preEnd.setDate(preEnd.getDate() + 1);
        }
        totalWeek++;
        preStart = new Date(preEnd);
        preStart.setDate(preStart.getDate() + 1);
      }
    }

    let segStart  = new Date(renderStart);

    while (segStart <= renderEnd) {
      const segEnd = new Date(segStart);

      // Segment ends when:
      //   a) the NEXT day is a Sunday (new week row starts)
      //   b) the NEXT day is in a different month (different grid container)
      //   c) we've reached renderEnd
      while (segEnd <= renderEnd) {
        const next = new Date(segEnd);
        next.setDate(next.getDate() + 1);
        if (next > renderEnd)              break; // reached end
        if (next.getDay() === 0)           break; // next day is Sunday — new row
        if (next.getMonth() !== segEnd.getMonth()) break; // month boundary — different grid
        segEnd.setDate(segEnd.getDate() + 1);
      }

      totalWeek++;
      renderBlockSegment(block, segStart, segEnd, totalWeek);

      // Advance past the end of this segment
      segStart = new Date(segEnd);
      segStart.setDate(segStart.getDate() + 1);
    }
  });

  // Restore selection if a block was selected before re-render
  if (prevBlock && editMode) {
    setTimeout(() => selectBlock(prevBlock), 0);
  }
}

function renderBlockSegment(block, segStart, segEnd, weekNum) {
  const startMo = segStart.getMonth() + 1;
  const startDy = segStart.getDate();
  const endMo   = segEnd.getMonth() + 1;
  const endDy   = segEnd.getDate();

  const startCell = findCell(startMo, startDy);
  const endCell   = findCell(endMo, endDy);
  if (!startCell || !endCell) {
    if (block.sm === 4 && block.sd === 18 && block.sy === 2026) {
      console.warn('[render] Apr 18 2026 block: cell not found', {startMo, startDy, endMo, endDy, startCell, endCell});
    }
    return;
  }
  if (block.sm === 4 && block.sd === 18 && block.sy === 2026) {
    console.log('[render] Apr 18 2026 block rendering, weekNum:', weekNum, 'tw:', block.tw, 'h:', block.h, 'pt:', block.pt);
  }

  const el = document.createElement('div');
  el.className = 'txt-block';

  // ── Cross-month positioning fix ──
  // Each segment must be positioned relative to its own parent days-grid.
  // Start cell and end cell may be in different month blocks — we use
  // the start cell's parent as the container, and measure end cell
  // relative to the viewport then subtract the container's viewport offset.
  const startGrid = startCell.parentElement; // .days-grid
  const endGrid   = endCell.parentElement;

  const sr  = startCell.getBoundingClientRect();
  const er  = endCell.getBoundingClientRect();
  const pgr = startGrid.getBoundingClientRect(); // container's screen position

  const left  = sr.left  - pgr.left;
  // Width: from left edge of startCell to right edge of endCell (screen coords)
  // If they're in different month blocks, er.right > pgr.right — that's fine,
  // overflow:visible on the parent will let it bleed across.
  const width = er.right - sr.left;

  const cellH  = startCell.offsetHeight;
  const height = cellH * block.h;
  // Use offsetTop (relative to parent grid) — consistent regardless of scroll
  const top    = startCell.offsetTop + (cellH * block.pt / 100) + block.vo;

  el.style.left            = left + 'px';
  el.style.top             = top  + 'px';
  el.style.width           = width + 'px';
  el.style.height          = height + 'px';
  el.style.backgroundColor = block.bg;
  el.style.zIndex          = block.z;
  el.style.overflow        = 'hidden';
  el.style.position        = 'absolute';

  // Vertical crop via clipPath
  const ct = block.croptop   || 0;
  const cb = block.cropbot   || 0;
  const cl = block.cropleft  || 0;
  const cr = block.cropright || 0;
  el.style.clipPath = (ct || cb || cl || cr) ? `inset(${ct}% ${cr}% ${cb}% ${cl}%)` : 'none';

  el.dataset.baseTop    = top;
  el.dataset.baseTopRaw = startCell.offsetTop + (cellH * block.pt / 100);
  el._startCell = startCell; // store for liveUpdateBlock recalculation
  el._block   = block;
  el._weekNum = weekNum;
  el._cellH   = cellH;

  // Tooltip: use stored override if set, otherwise wiki title
  const titleStr = wikiTitle ? wikiTitle(block.wiki) : block.text;
  el.title = getBlockTooltip(block) || titleStr || block.text;

  // ── Per-segment text position ──
  // Each segment stores its own pl/pt_inner so moving text in one week
  // doesn't affect other weeks. Initialise from block defaults on first render.
  if (!block.segPl)      block.segPl      = {};
  if (!block.segPtInner) block.segPtInner = {};
  if (block.segPl[weekNum]      === undefined) block.segPl[weekNum]      = block.pl;
  if (block.segPtInner[weekNum] === undefined) block.segPtInner[weekNum] = block.pt_inner !== undefined ? block.pt_inner : 20;

  const segPl      = block.segPl[weekNum];
  const segPtInner = block.segPtInner[weekNum];

  // Inner text span
  const textSpan = document.createElement('span');
  textSpan.className = 'block-text-span';
  textSpan.style.position   = 'absolute';
  textSpan.style.whiteSpace = 'nowrap';
  textSpan.style.fontSize   = block.fs;
  textSpan.style.fontWeight = block.bold ? 'bold' : 'normal';
  textSpan.style.fontFamily = 'Arial, sans-serif';
  textSpan.style.color      = block.color;
  textSpan.style.top        = segPtInner + '%';
  textSpan.style.left       = segPl + '%';
  textSpan.style.transform  = 'translateY(-50%)';
  textSpan.style.cursor     = editMode ? 'move' : 'default';
  textSpan._weekNum         = weekNum; // tag so drag knows which segment

  if (block.tw.includes(weekNum)) {
    textSpan.textContent = block.text;
  }

  el.appendChild(textSpan);

  // Per-segment text label drag
  attachTextLabelDrag(textSpan, block, weekNum);

  el.addEventListener('click', e => {
    if (editMode) {
      e.stopPropagation();
      selectBlock(block);
      openBP(block.sm, block.sd, block.sy, block, el);
    } else {
      openWiki(block.wiki);
    }
  });

  el.addEventListener('contextmenu', e => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    showCtx(e, block.sm, block.sd, block.sy, null, null, block, weekNum);
  });

  attachBlockDrag(el, block);
  startGrid.appendChild(el);
}

function findCell(mo, day) {
  return document.querySelector(`.day-cell[data-month="${mo}"][data-day="${day}"][data-year="${currentYear}"]`);
}

// ══════════════════════════════════════════════════════════════
// WIKI MODAL
// ══════════════════════════════════════════════════════════════
let wikiModePref = localStorage.getItem('hz_wiki_mode') || 'center';

function applyWikiMode(modal, mode) {
  if (mode === 'side') {
    modal.style.top    = '4%';
    modal.style.left   = '62%';
    modal.style.width  = '35%';
    modal.style.height = '90%';
  } else {
    modal.style.top    = '6%';
    modal.style.left   = '10%';
    modal.style.width  = '80%';
    modal.style.height = '86%';
  }
}

function openWiki(url) {
  if (!url) return;
  const container = document.getElementById('modals');

  const modal = document.createElement('div');
  modal.className = 'wiki-modal open';
  let currentMode = wikiModePref;
  applyWikiMode(modal, currentMode);

  // Title bar with toggle + close
  const bar = document.createElement('div');
  bar.className = 'modal-bar';

  const title = document.createElement('span');
  title.textContent = 'WIKI';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'modal-mode-btn';
  toggleBtn.textContent = currentMode === 'center' ? '[ Side ]' : '[ Wide ]';
  toggleBtn.title = 'Toggle wide/side layout';
  toggleBtn.onclick = (e) => {
    e.stopPropagation();
    currentMode = currentMode === 'center' ? 'side' : 'center';
    wikiModePref = currentMode;
    localStorage.setItem('hz_wiki_mode', currentMode);
    applyWikiMode(modal, currentMode);
    toggleBtn.textContent = currentMode === 'center' ? '[ Side ]' : '[ Wide ]';
  };

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.textContent = '✕';
  closeBtn.onclick = () => modal.remove();

  bar.appendChild(title);
  bar.appendChild(toggleBtn);
  bar.appendChild(closeBtn);
  modal.appendChild(bar);

  // Iframe wrapper
  const wrap = document.createElement('div');
  wrap.className = 'modal-iframe-wrap';
  const iframe = document.createElement('iframe');
  iframe.className = 'modal-iframe';
  iframe.src = url;
  wrap.appendChild(iframe);
  modal.appendChild(wrap);

  // Resize handles — 8 directions
  ['n','s','e','w','nw','ne','sw','se'].forEach(dir => {
    const h = document.createElement('div');
    h.className = `modal-resize ${dir}`;
    modal.appendChild(h);
    attachModalResize(modal, h, dir);
  });

  container.appendChild(modal);

  // ── Drag (title bar) ──
  bar.addEventListener('mousedown', e => {
    if (e.target.closest('.modal-mode-btn') || e.target.closest('.modal-close')) return;
    if (e.button !== 0) return;
    e.preventDefault();
    iframe.style.pointerEvents = 'none';
    let sx = e.clientX, sy = e.clientY;
    const drag = ev => {
      const ox = sx - ev.clientX, oy = sy - ev.clientY;
      sx = ev.clientX; sy = ev.clientY;
      modal.style.top  = Math.max(0, modal.offsetTop  - oy) + 'px';
      modal.style.left = Math.max(0, modal.offsetLeft - ox) + 'px';
    };
    const stop = () => {
      iframe.style.pointerEvents = 'auto';
      window.removeEventListener('mousemove', drag);
      window.removeEventListener('mouseup',   stop);
    };
    window.addEventListener('mousemove', drag);
    window.addEventListener('mouseup',   stop);
  });
}

// ── Modal edge/corner resize ──────────────────────────────────
function attachModalResize(modal, handle, dir) {
  const iframe = modal.querySelector('.modal-iframe');
  const MIN_W  = 300, MIN_H = 200;

  handle.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    // Snapshot starting state
    const startX = e.clientX, startY = e.clientY;
    const startW = modal.offsetWidth,   startH = modal.offsetHeight;
    const startL = modal.offsetLeft,    startT = modal.offsetTop;

    // Cover iframe during resize so events don't get swallowed
    iframe.style.pointerEvents = 'none';

    const onMove = ev => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let w = startW, h = startH, l = startL, t = startT;

      if (dir.includes('e'))  w = Math.max(MIN_W, startW + dx);
      if (dir.includes('s'))  h = Math.max(MIN_H, startH + dy);
      if (dir.includes('w')) { w = Math.max(MIN_W, startW - dx); l = startL + startW - w; }
      if (dir.includes('n')) { h = Math.max(MIN_H, startH - dy); t = startT + startH - h; }

      modal.style.width  = w + 'px';
      modal.style.height = h + 'px';
      modal.style.left   = l + 'px';
      modal.style.top    = t + 'px';
    };

    const onUp = () => {
      iframe.style.pointerEvents = 'auto';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  });
}

// ══════════════════════════════════════════════════════════════
// EDIT MODE
// ══════════════════════════════════════════════════════════════
let editMode = false;

// Deep snapshot of EVENTS and BLOCKS for edit-mode cancel
let editModeSnapshot = null;

// Per-action undo stack
let actionUndoStack = [];
const ACTION_UNDO_LIMIT = 50;

function pushUndoSnapshot() {
  if (!editMode) return;
  actionUndoStack.push({
    events: deepCloneEvents(),
    blocks: deepCloneBlocks(),
  });
  if (actionUndoStack.length > ACTION_UNDO_LIMIT) actionUndoStack.shift();
  updateUndoBtn();
}

function updateUndoBtn() {
  const btn = document.getElementById('undo-edit-btn');
  if (!btn) return;
  btn.disabled = actionUndoStack.length === 0;
  btn.textContent = actionUndoStack.length > 0
    ? `↩ Undo (${actionUndoStack.length})`
    : '↩ Undo';
}

// undoLastAction — called by the Undo button in the top bar
function undoLastAction() { undoLastChange(); }

function undoLastChange() {
  if (!actionUndoStack.length) return;
  const snap = actionUndoStack.pop();

  // Restore EVENTS in-place
  EVENTS.length = 0;
  snap.events.forEach(e => EVENTS.push({...e}));

  // Restore BLOCKS
  BLOCKS.length = 0;
  snap.blocks.forEach(s => BLOCKS.push({
    ...s,
    tw: [...(s.tw||[])],
    segPl:      { ...(s.segPl || {}) },
    segPtInner: { ...(s.segPtInner || {}) },
  }));

  deselect();
  buildCalendar();
  updateUndoBtn();

  // Write reverted state back to CSV so refresh doesn't re-apply the change
  saveEntireCSV('events.csv', EVENTS.map(buildEventRow));
  saveEntireCSV('multiDayTextBlocks.csv', BLOCKS.map(buildBlockRow));
}

function deepCloneEvents() {
  return EVENTS.map(ev => ({ ...ev }));
}

function deepCloneBlocks() {
  return BLOCKS.map(b => ({
    ...b,
    tw:         [...(b.tw || [])],
    segPl:      b.segPl      ? { ...b.segPl }      : {},
    segPtInner: b.segPtInner ? { ...b.segPtInner } : {},
  }));
}

function toggleEdit() {
  // On localhost, always allow edit mode — no PHP auth available
  // On Render, check auth token
  if (!editMode && !IS_LOCAL && !hzGetToken()) {
    document.getElementById('hz-login-modal').style.display = 'block';
    setTimeout(() => document.getElementById('hz-pw-input')?.focus(), 100);
    return;
  }
  editMode = !editMode;
  document.body.classList.toggle('edit-mode', editMode);
  const btn       = document.getElementById('edit-btn');
  const cancelBtn = document.getElementById('cancel-edit-btn');
  const undoBtn   = document.getElementById('undo-edit-btn');

  const brokenBtn = document.getElementById('broken-img-btn');
  if (brokenBtn) brokenBtn.style.display = editMode ? 'inline-block' : 'none';

  btn.textContent = editMode ? '✕ Exit Edit Mode' : '✏ Edit Mode';
  btn.classList.toggle('active', editMode);
  cancelBtn.style.display = editMode ? 'inline-block' : 'none';
  if (undoBtn) undoBtn.style.display = editMode ? 'inline-block' : 'none';

  if (editMode) {
    editModeSnapshot = { events: deepCloneEvents(), blocks: deepCloneBlocks() };
    actionUndoStack = [];
    updateUndoBtn();
  } else {
    editModeSnapshot = null;
    actionUndoStack = [];
    closeEP(); closeBP(); hideCtx(); deselect();
  }
}

function cancelEditMode() {
  if (!editModeSnapshot) return;
  if (!confirm('Cancel all changes made during this edit session?')) return;

  // Restore EVENTS in-place (keep references that images hold)
  EVENTS.forEach((ev, i) => {
    const snap = editModeSnapshot.events[i];
    if (!snap) return;
    Object.assign(ev, snap);
    ev.crop     = { ...snap.crop };
    ev.position = { ...snap.position };
  });
  // Remove any newly added events
  EVENTS.splice(editModeSnapshot.events.length);

  // Restore BLOCKS
  BLOCKS.length = 0;
  editModeSnapshot.blocks.forEach(snap => BLOCKS.push({ ...snap, tw: [...snap.tw], segPl: { ...snap.segPl }, segPtInner: { ...snap.segPtInner } }));

  // Re-render everything
  buildCalendar();

  // Exit edit mode cleanly
  editMode = false;
  document.body.classList.remove('edit-mode');
  document.getElementById('edit-btn').textContent = '✏ Edit Mode';
  document.getElementById('edit-btn').classList.remove('active');
  document.getElementById('cancel-edit-btn').style.display = 'none';
  document.getElementById('undo-btn').style.display = 'none';
  editModeSnapshot = null;
  actionUndoStack = [];
  updateUndoBtn();
  closeEP(); closeBP(); hideCtx(); deselect();
}

// ── Context menu ─────────────────────────────────────────────
let ctxMo, ctxDy, ctxYr, ctxCell;
let ctxTargetEv    = null;
let ctxTargetBlock = null;
let ctxTargetWeekNum = null; // week number of right-clicked segment

function showCtx(e, mo, dy, yr, cell, targetEv, targetBlock, weekNum) {
  ctxMo = mo; ctxDy = dy; ctxYr = yr; ctxCell = cell;
  ctxTargetEv      = targetEv    || null;
  ctxTargetBlock   = targetBlock || null;
  ctxTargetWeekNum = weekNum     !== undefined ? weekNum : null;

  const isElement  = !!(ctxTargetEv || ctxTargetBlock);
  const isSegment  = ctxTargetBlock !== null && ctxTargetWeekNum !== null;

  // Add options only on empty cell
  document.getElementById('ctx-add-ev').style.display   = isElement ? 'none' : 'block';
  document.getElementById('ctx-add-blk').style.display  = isElement ? 'none' : 'block';
  document.getElementById('ctx-add-fomc').style.display = isElement ? 'none' : 'block';

  // Text week toggle — shown when right-clicking a block segment in edit mode
  const twBtn = document.getElementById('ctx-toggle-tw');
  if (isSegment && editMode) {
    const hasText = ctxTargetBlock.tw.includes(ctxTargetWeekNum);
    twBtn.textContent = hasText ? '📝 Remove text label here' : '📝 Place text label here';
    twBtn.style.display = 'block';
  } else {
    twBtn.style.display = 'none';
  }

  document.getElementById('ctx-delete-ev').style.display  = ctxTargetEv    ? 'block' : 'none';
  document.getElementById('ctx-delete-blk').style.display = ctxTargetBlock ? 'block' : 'none';

  const m = document.getElementById('ctx-menu');
  m.style.display = 'block';
  m.style.left = Math.min(e.clientX, window.innerWidth  - 210) + 'px';
  m.style.top  = Math.min(e.clientY, window.innerHeight - 160) + 'px';
}

function ctxAddFOMC() {
  hideCtx();
  if (typeof fomcDialogOpen === 'function') fomcDialogOpen(ctxMo, ctxDy, ctxYr);
}

function ctxToggleTextWeek() {
  hideCtx();
  if (!ctxTargetBlock || ctxTargetWeekNum === null) return;
  const block = ctxTargetBlock;
  const wn    = ctxTargetWeekNum;
  pushUndoSnapshot();

  if (block.tw.includes(wn)) {
    block.tw = block.tw.filter(w => w !== wn);
  } else {
    block.tw = [...block.tw, wn].sort((a,b) => a - b);
  }

  document.querySelectorAll('.block-text-span').forEach(s => {
    const seg = s.closest('.txt-block');
    if (!seg || seg._block !== block) return;
    s.textContent = block.tw.includes(seg._weekNum) ? block.text : '';
  });

  autoSaveRow('multiDayTextBlocks.csv', buildBlockRow(block), null, block.sm, block.sd, block.sy, block.wiki);
}

function ctxDeleteEvent() {
  hideCtx();
  if (!ctxTargetEv) return;
  const ev = ctxTargetEv;
  if (!confirm(`Delete image for ${ev.imageUrl.slice(0,60)}…?`)) return;
  pushUndoSnapshot();
  const idx = EVENTS.indexOf(ev);
  if (idx !== -1) EVENTS.splice(idx, 1);
  buildCalendar();
  // Write a blank/removal marker — simplest: save a row that won't match anything
  // Actually just rebuild the entire events.csv without this row
  saveEntireCSV('events.csv', EVENTS.map(buildEventRow));
}

function ctxDeleteBlock() {
  hideCtx();
  if (!ctxTargetBlock) return;
  const block = ctxTargetBlock;
  if (!confirm(`Delete block "${block.text}"?`)) return;
  pushUndoSnapshot();
  const idx = BLOCKS.indexOf(block);
  if (idx !== -1) BLOCKS.splice(idx, 1);
  deselect();
  buildCalendar();
  saveEntireCSV('multiDayTextBlocks.csv', BLOCKS.map(buildBlockRow));
}

// Save the entire CSV file (used for deletes where we rewrite the whole file)
async function saveEntireCSV(csvFile, rows) {
  showSaveStatus('⏳ Saving…');
  try {
    const res = await fetch(CSV_WRITE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvFile, replaceAll: true, rows })
    });
    const data = await res.json();
    showSaveStatus(data.success ? '✓ Deleted' : '⚠ ' + data.error, !data.success);
  } catch(e) { showSaveStatus('⚠ ' + e.message, true); }
}
function hideCtx() { document.getElementById('ctx-menu').style.display = 'none'; }
document.addEventListener('click', e => {
  if (!e.target.closest('#ctx-menu'))      hideCtx();
  if (!e.target.closest('#fomc-ctx-menu') && !e.target.closest('#fomc-tooltip-dialog') && typeof hideFomcCtx === 'function') hideFomcCtx();
});
function ctxEvent() { hideCtx(); openEP(ctxMo, ctxDy, ctxYr, null, null, ctxCell); }
function ctxBlock() { hideCtx(); openBP(ctxMo, ctxDy, ctxYr, null, ctxCell); }

// ══════════════════════════════════════════════════════════════
// EVENT EDITOR PANEL
// ══════════════════════════════════════════════════════════════
let epTarget       = null;  // {img, ev} when editing existing
let epOriginal     = null;  // original date+wiki snapshot for UPDATE matching
let bpCurrentBlock = null;  // block object when editing existing
let bpOriginal     = null;  // original date+wiki snapshot for UPDATE matching
let undoStack    = [];   // kept for pasteFmt undo tracking
let sessionSnap  = null; // full snapshot of ev/block state when panel opens

// Take a deep snapshot of an event object for cancel
function snapEvent(ev) {
  return { ...ev, crop:{...ev.crop}, position:{...ev.position} };
}
// Take a snapshot of slider values for cancel
function snapSliders() {
  const ids = ['ep-ct','ep-cb','ep-cl','ep-cr','ep-pt','ep-pl','ep-sc','ep-z'];
  const snap = {};
  ids.forEach(id => { const el = document.getElementById(id); if (el) snap[id] = el.value; });
  return snap;
}
function restoreSliders(snap) {
  Object.entries(snap).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = val;
    // Update display span if it exists
    const spanId = 'v-' + id.replace('ep-','');
    const span = document.getElementById(spanId);
    if (span) {
      if (id === 'ep-sc') span.textContent = (val/100).toFixed(2);
      else span.textContent = val;
    }
  });
}
let copiedFmt = null;
let savedFmts = JSON.parse(localStorage.getItem('hz_fmts') || '[]');

function sv(inputId, spanId) { // slider → span value
  document.getElementById(spanId).textContent = document.getElementById(inputId).value;
}

function openEP(mo, dy, yr, img, ev, triggerEl) {
  closeAllPanels();
  epTarget = img ? {img, ev} : null;
  console.log('[openEP] img:', !!img, 'ev:', !!ev, 'mo:', mo, 'dy:', dy, 'yr:', yr);

  // Snapshot original date+wiki for UPDATE matching
  epOriginal = ev ? { month: ev.month, day: ev.day, year: ev.year,
                      wiki: ev.wikiUrl, imageUrl: ev.imageUrl } : null;

  document.getElementById('ep-title').textContent = img ? 'EDIT IMAGE' : 'ADD EVENT';
  document.getElementById('ep-sm').value = mo;
  document.getElementById('ep-sd').value = dy;
  document.getElementById('ep-sy').value = yr;
  document.getElementById('ep-em').value = ev ? ev.month : mo;
  document.getElementById('ep-ed').value = ev ? ev.day   : dy;
  document.getElementById('ep-ey').value = ev ? ev.year  : yr;
  document.getElementById('ep-wiki').value = ev ? (ev.wikiUrl  || '') : '';
  document.getElementById('ep-img').value  = ev ? (ev.imageUrl || '') : '';

  // Pre-fill tooltip: use stored override, or auto-generate from wiki URL
  const tooltipField = document.getElementById('ep-tooltip');
  if (tooltipField) {
    tooltipField.value = ev ? (getTooltip(ev) || wikiTitle(ev.wikiUrl || '') || '') : '';
  }

  const ct = ev ? ev.ct : 0, cb = ev ? ev.cb : 0,
        cl = ev ? ev.cl : 0, cr = ev ? ev.cr : 0;
  const pt = ev ? ev.pt : 0, pl = ev ? ev.pl : 0;
  const sc = ev ? Math.round(ev.sc * 100) : 100;
  const z  = ev ? ev.z : 200;

  document.getElementById('ep-ct').value = ct; sv('ep-ct','v-ct');
  document.getElementById('ep-cb').value = cb; sv('ep-cb','v-cb');
  document.getElementById('ep-cl').value = cl; sv('ep-cl','v-cl');
  document.getElementById('ep-cr').value = cr; sv('ep-cr','v-cr');
  document.getElementById('ep-pt').value = pt; sv('ep-pt','v-pt');
  document.getElementById('ep-pl').value = pl; sv('ep-pl','v-pl');
  document.getElementById('ep-sc').value = sc;
  document.getElementById('v-sc').textContent = (sc/100).toFixed(2);
  document.getElementById('ep-z').value  = z;  sv('ep-z','v-z');

  epImgChange();
  epCSV();
  document.getElementById('ep-add-btn').style.display         = img ? 'none'  : 'block';
  document.getElementById('ep-delete-btn').style.display       = img ? 'block' : 'none';
  document.getElementById('ep-move-date-section').style.display = img ? 'block' : 'none';

  // Pre-fill new date fields with the event's current date
  if (ev) {
    document.getElementById('ep-new-mo').value = ev.month;
    document.getElementById('ep-new-dy').value = ev.day;
    document.getElementById('ep-new-yr').value = ev.year;
  }
  document.getElementById('ep-fb').textContent = '';
  document.getElementById('event-panel').classList.add('open');

  // Position panel away from whatever was clicked
  positionPanel(document.getElementById('event-panel'), triggerEl || img || null);

  // Snapshot state for cancel — taken after sliders are populated
  sessionSnap = { sliders: snapSliders(), ev: ev ? snapEvent(ev) : null };
  epSliderSnapped = false; // reset so next slider move snapshots fresh
  undoStack = [];
  rebuildFmtDropdown();
}

// ── Ensure only one editor panel open at a time ───────────────
function closeAllPanels() {
  document.getElementById('event-panel').classList.remove('open');
  document.getElementById('block-panel').classList.remove('open');
  epTarget       = null;
  bpCurrentBlock = null;
}
function closeEP() { document.getElementById('event-panel').classList.remove('open'); epTarget = null; }
function closeBP() { document.getElementById('block-panel').classList.remove('open'); bpCurrentBlock = null; }

// ── Smart panel positioning — place panel away from the trigger ──
function positionPanel(panelEl, triggerEl) {
  const panelW = panelEl.offsetWidth  || 310;
  const panelH = panelEl.offsetHeight || 500;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 12; // px gap from screen edge

  let left, top;

  if (triggerEl) {
    const r = triggerEl.getBoundingClientRect();
    const triggerCenterX = r.left + r.width  / 2;
    const triggerCenterY = r.top  + r.height / 2;

    // Prefer right side; fall back to left if not enough room
    if (triggerCenterX < vw / 2) {
      // Trigger is on left half — put panel on the right
      left = Math.min(vw - panelW - margin, vw - panelW - margin);
    } else {
      // Trigger is on right half — put panel on the left
      left = margin;
    }

    // Prefer top-aligned to trigger; shift up if it would go off-screen
    top = Math.max(margin, Math.min(r.top, vh - panelH - margin));
  } else {
    // No trigger (right-click add): place top-right
    left = vw - panelW - margin;
    top  = 60 + margin;
  }

  panelEl.style.left   = left + 'px';
  panelEl.style.top    = top  + 'px';
  panelEl.style.right  = 'auto';
  panelEl.style.bottom = 'auto';
}

function epImgChange() {
  const url = document.getElementById('ep-img').value.trim();
  const prev = document.getElementById('ep-preview');
  prev.src = url;
  prev.style.display = url ? 'block' : 'none';
  epCSV();
}

async function epSaveLinks() {
  if (!epTarget) { fb('ep-fb', '⚠ No event selected'); return; }
  const ev = epTarget.ev;

  const originalWiki     = ev.wikiUrl;
  const originalImageUrl = ev.imageUrl;

  const newWiki = document.getElementById('ep-wiki').value.trim();
  const newImg  = document.getElementById('ep-img').value.trim();

  if (!newWiki && !newImg) { fb('ep-fb', '⚠ No URLs entered'); return; }

  // Update ev in memory — tooltip MUST be set before buildEventRow
  ev.wikiUrl  = newWiki  || ev.wikiUrl;
  ev.imageUrl = newImg   || ev.imageUrl;
  ev.tooltip  = document.getElementById('ep-tooltip')?.value.trim() || '';

  // Build the updated CSV row
  const row = buildEventRow(ev);

  try {
    const res = await fetch(CSV_WRITE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csvFile:       'events.csv',
        newRow:        row,
        matchMonth:    String(ev.month),
        matchDay:      String(ev.day),
        matchYear:     String(ev.year),
        matchImageUrl: originalImageUrl,
        matchWiki:     originalWiki,
      })
    });
    const data = await res.json();
    if (data.success) {
      showSaveStatus(`✓ ${data.mode}`);
      // Save tooltip override to CSV
      const tipText = document.getElementById('ep-tooltip')?.value.trim() || '';
      ev.tooltip = tipText;
      if (tipText && epTarget.img) epTarget.img.title = tipText || wikiTitle(ev.wikiUrl);
      fb('ep-fb', '✓ Saved — reloading…');
      setTimeout(() => location.reload(), 800);
    } else {
      // Revert ev on failure
      ev.wikiUrl  = originalWiki;
      ev.imageUrl = originalImageUrl;
      fb('ep-fb', '⚠ ' + (data.error || 'Save failed'));
    }
  } catch(e) {
    ev.wikiUrl  = originalWiki;
    ev.imageUrl = originalImageUrl;
    fb('ep-fb', '⚠ ' + e.message);
  }
}

// ── UPDATE DATE (move existing event/block to new date) ───────
async function epUpdateDate() {
  if (!epTarget || !epOriginal) { fb('ep-fb', '⚠ No event selected'); return; }
  const ev  = epTarget.ev;

  // Read from the dedicated "Move to New Date" fields
  const newMonth = +document.getElementById('ep-new-mo').value;
  const newDay   = +document.getElementById('ep-new-dy').value;
  const newYear  = +document.getElementById('ep-new-yr').value;

  console.log('[epUpdateDate] moving from', epOriginal.month, epOriginal.day, epOriginal.year,
              'to', newMonth, newDay, newYear);

  if (!newMonth || !newDay || !newYear) { fb('ep-fb', '⚠ Enter a valid date'); return; }
  if (newMonth === ev.month && newDay === ev.day && newYear === ev.year) {
    fb('ep-fb', '⚠ Date is the same — change the date first'); return;
  }

  pushUndoSnapshot();

  // Update ev object with new date
  ev.month = newMonth; ev.day = newDay; ev.year = newYear;

  const row = buildEventRow(ev);
  console.log('[epUpdateDate] built row:', row);
  console.log('[epUpdateDate] matching against day:', epOriginal.day, 'wiki:', epOriginal.wiki?.slice(30));
  try {
    const res = await fetch(CSV_WRITE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csvFile:       'events.csv',
        newRow:        row,
        matchMonth:    String(epOriginal.month),
        matchDay:      String(epOriginal.day),
        matchYear:     String(epOriginal.year),
        matchImageUrl: epOriginal.imageUrl,
        matchWiki:     epOriginal.wiki,
      })
    });
    const data = await res.json();
    console.log('[epUpdateDate] PHP response:', JSON.stringify(data));
    if (data.success) {
      epOriginal = { month: newMonth, day: newDay, year: newYear,
                     wiki: ev.wikiUrl, imageUrl: ev.imageUrl };
      setTimeout(() => location.reload(), 800);
    } else {
      fb('ep-fb', '⚠ ' + (data.error || 'Update failed'));
    }
  } catch(e) { fb('ep-fb', '⚠ ' + e.message); }
}

async function bpUpdateDate() {
  if (!bpCurrentBlock || !bpOriginal) { fb('bp-fb', '⚠ No block selected'); return; }
  const b = bpCurrentBlock;
  const g = id => +document.getElementById(id).value;
  const gs = id => document.getElementById(id).value;
  const newSm = g('bp-sm'), newSd = g('bp-sd'), newSy = g('bp-sy');
  const newEm = g('bp-em'), newEd = g('bp-ed'), newEy = g('bp-ey');

  if (!newSm || !newSd || !newSy) { fb('bp-fb', '⚠ Enter a valid start date'); return; }

  pushUndoSnapshot();

  // Update block with new dates
  b.sm = newSm; b.sd = newSd; b.sy = newSy;
  b.em = newEm || newSm; b.ed = newEd || newSd; b.ey = newEy || newSy;

  const row = buildBlockRow(b);
  try {
    const res = await fetch(CSV_WRITE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csvFile:    'multiDayTextBlocks.csv',
        newRow:     row,
        matchMonth: String(bpOriginal.sm),
        matchDay:   String(bpOriginal.sd),
        matchYear:  String(bpOriginal.sy),
        matchWiki:  bpOriginal.wiki,
      })
    });
    const data = await res.json();
    if (data.success) {
      showSaveStatus(`✓ ${data.mode}`);
      fb('bp-fb', '✓ Dates updated — reloading…');
      bpOriginal = { sm: newSm, sd: newSd, sy: newSy,
                     em: newEm, ed: newEd, ey: newEy, wiki: b.wiki };
      setTimeout(() => location.reload(), 800);
    } else {
      fb('bp-fb', '⚠ ' + (data.error || 'Update failed'));
    }
  } catch(e) { fb('bp-fb', '⚠ ' + e.message); }
}

function epGetVals() {
  return {
    sm: +document.getElementById('ep-sm').value,
    sd: +document.getElementById('ep-sd').value,
    sy: +document.getElementById('ep-sy').value,
    em: +document.getElementById('ep-em').value,
    ed: +document.getElementById('ep-ed').value,
    ey: +document.getElementById('ep-ey').value,
    wiki: document.getElementById('ep-wiki').value.trim(),
    img:  document.getElementById('ep-img').value.trim(),
    ct: +document.getElementById('ep-ct').value,
    cb: +document.getElementById('ep-cb').value,
    cl: +document.getElementById('ep-cl').value,
    cr: +document.getElementById('ep-cr').value,
    pt: +document.getElementById('ep-pt').value,
    pl: +document.getElementById('ep-pl').value,
    sc: +(+document.getElementById('ep-sc').value / 100).toFixed(2),
    z:  +document.getElementById('ep-z').value,
  };
}

// Debounce timers for auto-save
let epSaveTimer   = null;
let bpSaveTimer   = null;
let epSliderSnapped = false; // true after first snapshot this slider session
let bpSliderSnapped = false;

function epLive() {
  if (!epTarget) return;
  if (!epSliderSnapped) { pushUndoSnapshot(); epSliderSnapped = true; }
  const v = epGetVals();
  const img = epTarget.img;
  const hasCrop = v.ct || v.cr || v.cb || v.cl;
  img.style.clipPath = hasCrop ? `inset(${v.ct}% ${v.cr}% ${v.cb}% ${v.cl}%)` : 'none';
  img.style.top      = v.pt + '%';
  img.style.left     = v.pl + '%';
  img.style.zIndex   = v.z;
  const fitScale = img._fitScale || 1;
  img.style.transform = `scale(${fitScale * v.sc})`;
  Object.assign(epTarget.ev, {ct:v.ct,cb:v.cb,cl:v.cl,cr:v.cr,pt:v.pt,pl:v.pl,sc:v.sc,z:v.z});
  if (selTarget && selTarget.el === img) {
    refreshSelection(imgVisualRect(img, epTarget.ev));
  }
  // Auto-save 1 second after slider stops moving
  clearTimeout(epSaveTimer);
  epSaveTimer = setTimeout(() => {
    const ev = epTarget ? epTarget.ev : null;
    if (!ev) return;
    autoSaveRow('events.csv', buildEventRow(ev), ev.imageUrl, ev.month, ev.day, ev.year, ev.wikiUrl);
  }, 1000);
}

function epCSV() {
  const v = epGetVals();
  const multi = (v.sm !== v.em || v.sd !== v.ed || v.sy !== v.ey);
  if (multi) {
    const rows = [];
    const s = makeDate(v.sy, v.sm, v.sd);
    const e = makeDate(v.ey, v.em, v.ed);
    for (let d=new Date(s); d<=e && rows.length<365; d.setDate(d.getDate()+1))
      rows.push(`${d.getMonth()+1},${d.getDate()},${d.getFullYear()},${v.wiki},${v.img},${v.ct},${v.cr},${v.cb},${v.cl},${v.pt}%,${v.pl}%,${v.sc},${v.z}`);
    document.getElementById('ep-csv').textContent = rows.join('\n');
  } else {
    document.getElementById('ep-csv').textContent =
      `${v.sm},${v.sd},${v.sy},${v.wiki},${v.img},${v.ct},${v.cr},${v.cb},${v.cl},${v.pt}%,${v.pl}%,${v.sc},${v.z}`;
  }
}

function epPreset(type) {
  const P = {full:[0,0,0,0],top:[0,0,50,0],bot:[50,0,0,0],left:[0,50,0,0],right:[0,0,0,50],
             tl:[0,50,50,0],tr:[0,0,50,50],bl:[50,50,0,0],br:[50,0,0,50]};
  const p = P[type]; if (!p) return;
  ['ep-ct','ep-cb','ep-cl','ep-cr'].forEach((id,i) => {
    document.getElementById(id).value = p[i];
    sv(id, 'v-' + ['ct','cb','cl','cr'][i]);
  });
  epLive(); epCSV();
}

async function epAdd() {
  const v = epGetVals();
  if (!v.img) { fb('ep-fb','⚠ Paste an image URL first'); return; }
  pushUndoSnapshot();
  const s = makeDate(v.sy, v.sm, v.sd);
  const e = makeDate(v.ey, v.em, v.ed);
  let count = 0;
  const added = [];
  for (let d=new Date(s); d<=e && count<365; d.setDate(d.getDate()+1), count++) {
    const mo = d.getMonth()+1, dy = d.getDate(), yr = d.getFullYear();
    if (yr !== currentYear) continue;
    const ev = {month:mo, day:dy, year:yr, wikiUrl:v.wiki, imageUrl:v.img,
                ct:v.ct, cb:v.cb, cl:v.cl, cr:v.cr, pt:v.pt, pl:v.pl, sc:v.sc, z:v.z};
    EVENTS.push(ev);
    added.push(ev);
    const cell = findCell(mo, dy);
    if (cell) { const img = makeImg(ev); cell.appendChild(img); }
  }
  epCSV();
  // Save each new event immediately
  for (const ev of added) {
    await autoSaveRow('events.csv', buildEventRow(ev), ev.imageUrl, ev.month, ev.day, ev.year, ev.wikiUrl);
  }
  fb('ep-fb', added.length ? `✓ Added and saved (${added.length})` : '⚠ No cells found for that date/year');
}

function epCopyCSV() {
  navigator.clipboard.writeText(document.getElementById('ep-csv').textContent);
  fb('ep-fb','✓ Copied!');
}

async function epSave() {
  const csvText = document.getElementById('ep-csv').textContent.trim();
  const ev = epTarget ? epTarget.ev : null;
  const payload = {
    csvFile: 'events.csv',
    newRow: csvText,
    matchImageUrl: ev ? (ev.imageUrl||'') : '',
    matchMonth:    ev ? String(ev.month||'')    : '',
    matchDay:      ev ? String(ev.day||'')      : '',
    matchYear:     ev ? String(ev.year||'')     : '',
  };
  try {
    const r = await fetch(CSV_WRITE_URL,
      {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if (!r.ok) { fb('ep-fb', `⚠ Server error ${r.status} — check csv_write.php is in History - Zoom folder`); return; }
    const d = await r.json();
    fb('ep-fb', d.success ? '✓ Saved to events.csv' : '⚠ ' + d.error);
  } catch(e) { fb('ep-fb','⚠ ' + e.message); }
}

// ── Format copy/paste/undo/save ───────────────────────────────
function captureFmt() {
  const v = epGetVals();
  return {ct:v.ct,cb:v.cb,cl:v.cl,cr:v.cr,pt:v.pt,pl:v.pl,sc:Math.round(v.sc*100),z:v.z};
}

function applyFmt(fmt) {
  document.getElementById('ep-ct').value = fmt.ct; sv('ep-ct','v-ct');
  document.getElementById('ep-cb').value = fmt.cb; sv('ep-cb','v-cb');
  document.getElementById('ep-cl').value = fmt.cl; sv('ep-cl','v-cl');
  document.getElementById('ep-cr').value = fmt.cr; sv('ep-cr','v-cr');
  document.getElementById('ep-pt').value = fmt.pt; sv('ep-pt','v-pt');
  document.getElementById('ep-pl').value = fmt.pl; sv('ep-pl','v-pl');
  document.getElementById('ep-sc').value = fmt.sc;
  document.getElementById('v-sc').textContent = (fmt.sc/100).toFixed(2);
  document.getElementById('ep-z').value  = fmt.z;  sv('ep-z','v-z');
  epLive(); epCSV();
}

function copyFmt() {
  copiedFmt = captureFmt();
  document.getElementById('btn-pastefmt').disabled = false;
  fb('ep-fb','Format copied');
}

function pasteFmt() {
  if (!copiedFmt) return;
  undoStack.push(captureFmt());
  applyFmt(copiedFmt);
}

function cancelChanges() {
  if (!sessionSnap) { fb('ep-fb', 'Nothing to cancel'); return; }

  // Restore sliders
  restoreSliders(sessionSnap.sliders);

  // Restore ev object and live image if editing existing
  if (sessionSnap.ev && epTarget && epTarget.ev) {
    const orig = sessionSnap.ev;
    const ev   = epTarget.ev;
    Object.assign(ev, orig);
    // Re-apply to the live image
    applyImgStyle(epTarget.img, ev);
    if (selTarget && selTarget.el === epTarget.img) {
      refreshSelection(imgVisualRect(epTarget.img, epTarget.ev));
    }
  }

  epCSV();
  fb('ep-fb', '↩ Changes cancelled');
}

function undoFmt() {} // kept as no-op so any lingering references don't throw

function saveFmt() {
  const name = prompt('Name this format (e.g. "Presidential Portrait"):');
  if (!name || !name.trim()) return;
  const fmt = captureFmt();
  fmt.name = name.trim();
  savedFmts.push(fmt);
  localStorage.setItem('hz_fmts', JSON.stringify(savedFmts));
  rebuildFmtDropdown();
  fb('ep-fb','✓ Format saved');
}

function loadFmt() {
  const sel = document.getElementById('fmt-select');
  const idx = parseInt(sel.value, 10);
  if (isNaN(idx) || idx < 0) return;
  undoStack.push(captureFmt());
  applyFmt(savedFmts[idx]);
  sel.value = '';
}

function deleteFmt() {
  const sel = document.getElementById('fmt-select');
  const idx = parseInt(sel.value, 10);
  if (isNaN(idx) || idx < 0) { fb('ep-fb','Select a format first'); return; }
  if (!confirm(`Delete "${savedFmts[idx].name}"?`)) return;
  savedFmts.splice(idx, 1);
  localStorage.setItem('hz_fmts', JSON.stringify(savedFmts));
  rebuildFmtDropdown();
}

function rebuildFmtDropdown() {
  const sel = document.getElementById('fmt-select');
  sel.innerHTML = '<option value="">— Saved Formats —</option>';
  savedFmts.forEach((f,i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = f.name;
    sel.appendChild(o);
  });
}

// ══════════════════════════════════════════════════════════════
// TEXT BLOCK EDITOR PANEL
// ══════════════════════════════════════════════════════════════
function openBP(mo, dy, yr, block, triggerEl) {
  closeAllPanels();
  bpCurrentBlock = block || null;
  bpSliderSnapped = false; // reset so next slider move snapshots fresh
  document.getElementById('bp-title').textContent = block ? 'EDIT TEXT BLOCK' : 'ADD TEXT BLOCK';
  document.getElementById('bp-sm').value = block ? block.sm : mo;
  document.getElementById('bp-sd').value = block ? block.sd : dy;
  document.getElementById('bp-sy').value = block ? block.sy : yr;
  document.getElementById('bp-em').value = block ? block.em : mo;
  document.getElementById('bp-ed').value = block ? block.ed : dy;
  document.getElementById('bp-ey').value = block ? block.ey : yr;
  document.getElementById('bp-wiki').value  = block ? (block.wiki  || '') : '';
  document.getElementById('bp-text').value  = block ? (block.text  || '') : '';

  // Pre-fill tooltip
  const bpTipField = document.getElementById('bp-tooltip');
  if (bpTipField) {
    bpTipField.value = block ? (getBlockTooltip(block) || wikiTitle(block.wiki || '') || '') : '';
  }
  document.getElementById('bp-color').value = block ? (block.color || 'BLACK') : 'BLACK';
  document.getElementById('bp-bg').value    = block ? (block.bg    || 'GOLD')  : 'GOLD';
  document.getElementById('bp-fs').value    = block ? parseFloat(block.fs || '2.2') : 2.2;
  document.getElementById('v-bfs').textContent = parseFloat(block ? (block.fs || '2.2') : '2.2').toFixed(1);
  document.getElementById('bp-bold').checked = block ? (block.bold !== false) : true;
  document.getElementById('bp-pt').value  = block ? block.pt : 40;  sv('bp-pt','v-bpt');
  document.getElementById('bp-pl').value  = block ? block.pl : 17;  sv('bp-pl','v-bpl');
  document.getElementById('bp-pti').value = block ? (block.pt_inner !== undefined ? block.pt_inner : 20) : 20; sv('bp-pti','v-bpti');
  document.getElementById('bp-vo').value  = block ? block.vo : 0;   sv('bp-vo','v-bvo');
  document.getElementById('bp-h').value   = block ? Math.round(block.h*100) : 80;
  document.getElementById('v-bh').textContent = (block ? block.h : 0.8).toFixed(2);
  document.getElementById('bp-ct').value  = block ? (block.croptop   || 0) : 0; sv('bp-ct','v-bct');
  document.getElementById('bp-cb').value  = block ? (block.cropbot   || 0) : 0; sv('bp-cb','v-bcb');
  document.getElementById('bp-cl').value  = block ? (block.cropleft  || 0) : 0; sv('bp-cl','v-bcl');
  document.getElementById('bp-cr').value  = block ? (block.cropright || 0) : 0; sv('bp-cr','v-bcr');
  document.getElementById('bp-z').value   = block ? block.z : 20; sv('bp-z','v-bz');
  document.getElementById('bp-tw').value  = block ? (block.tw||[]).join(',') : '2';
  // Snapshot original date+wiki for UPDATE matching
  bpOriginal = block ? { sm: block.sm, sd: block.sd, sy: block.sy,
                         em: block.em, ed: block.ed, ey: block.ey,
                         wiki: block.wiki } : null;

  document.getElementById('bp-add-btn').style.display    = block ? 'none'  : 'block';
  document.getElementById('bp-update-btn').style.display = block ? 'block' : 'none';
  document.getElementById('bp-delete-btn').style.display = block ? 'block' : 'none';
  document.getElementById('bp-fb').textContent = '';
  bpCSV();
  document.getElementById('block-panel').classList.add('open');

  // Position panel away from clicked element
  positionPanel(document.getElementById('block-panel'), triggerEl || null);
}

// Track which block is open in the panel — declared above with closeAllPanels

// Read sliders → update block data → live-update DOM → update CSV
function bpLive() {
  const g = id => document.getElementById(id).value;
  if (!bpCurrentBlock) { bpCSV(); return; }
  if (!bpSliderSnapped) { pushUndoSnapshot(); bpSliderSnapped = true; }
  const b = bpCurrentBlock;
  b.pt       = +g('bp-pt');
  b.pl       = +g('bp-pl');
  b.pt_inner = +g('bp-pti');
  b.vo       = +g('bp-vo');
  b.h        = +g('bp-h') / 100;
  b.croptop  = +g('bp-ct');
  b.cropbot  = +g('bp-cb');
  b.cropleft  = +g('bp-cl');
  b.cropright = +g('bp-cr');
  b.z        = +g('bp-z');
  b.color    = g('bp-color');
  b.bg       = g('bp-bg');
  b.fs       = parseFloat(g('bp-fs')).toFixed(1) + 'em';
  b.bold     = document.getElementById('bp-bold').checked;

  // Save tooltip onto block object (gets written with next autoSaveRow)
  const bpTipField = document.getElementById('bp-tooltip');
  if (bpTipField) {
    const tipText = bpTipField.value.trim();
    b.tooltip = tipText;
    // Update live DOM tooltip
    document.querySelectorAll('.txt-block').forEach(el => {
      if (el._block === b) el.title = tipText || wikiTitle(b.wiki || '') || b.text;
    });
  }

  liveUpdateBlock(b);
  bpCSV();
  // Auto-save 1 second after slider stops moving
  clearTimeout(bpSaveTimer);
  bpSaveTimer = setTimeout(() => {
    if (!bpCurrentBlock) return;
    const blk = bpCurrentBlock;
    autoSaveRow('multiDayTextBlocks.csv', buildBlockRow(blk), null, blk.sm, blk.sd, blk.sy, blk.wiki);
  }, 1000);
}

function bpPreset(type) {
  // Full preset: color + bg + positioning for FOMC rate decision blocks
  const P = {
    gold:   { color:'BLACK',   bg:'GOLD',     fs:null, h:null, pt:null, pl:null, pti:null, cr:null },
    war:    { color:'WHITE',   bg:'RED',      fs:null, h:null, pt:null, pl:null, pti:null, cr:null },
    empire: { color:'GOLD',    bg:'RED',      fs:null, h:null, pt:null, pl:null, pti:null, cr:null },
    peace:  { color:'BLACK',   bg:'LIGHTBLUE',fs:null, h:null, pt:null, pl:null, pti:null, cr:null },
    dark:   { color:'WHITE',   bg:'#222',     fs:null, h:null, pt:null, pl:null, pti:null, cr:null },
    // FOMC rate decision presets
    // cropleft=28 clears date number | pl=33 positions text | pt_inner=60 | vo=0
    hike: { color:'#b30000', bg:'#fff0f0', fs:'0.72', h:20, pt:0, pl:33, pti:60, cl:28, cr:0, vo:0, bold:true },
    hold: { color:'#1a1a2e', bg:'#f5f5f0', fs:'0.72', h:20, pt:0, pl:33, pti:60, cl:28, cr:0, vo:0, bold:true },
    cut:  { color:'#006400', bg:'#f0fff0', fs:'0.72', h:20, pt:0, pl:33, pti:60, cl:28, cr:0, vo:0, bold:true },
  };
  const p = P[type]; if (!p) return;

  document.getElementById('bp-color').value = p.color;
  document.getElementById('bp-bg').value    = p.bg;

  // Apply full positioning for FOMC presets
  if (p.fs !== null) {
    document.getElementById('bp-fs').value = p.fs;
    document.getElementById('v-bfs').textContent = parseFloat(p.fs).toFixed(1);
  }
  if (p.h !== null) {
    document.getElementById('bp-h').value = p.h;
    document.getElementById('v-bh').textContent = (p.h/100).toFixed(2);
  }
  if (p.pt  !== null) { document.getElementById('bp-pt').value = p.pt; sv('bp-pt','v-bpt'); }
  if (p.pl  !== null) { document.getElementById('bp-pl').value = p.pl; sv('bp-pl','v-bpl'); }
  if (p.pti !== null) { document.getElementById('bp-pti').value = p.pti; sv('bp-pti','v-bpti'); }
  if (p.cl  !== undefined && p.cl !== null) { document.getElementById('bp-cl').value = p.cl; sv('bp-cl','v-bcl'); }
  if (p.cr  !== null) { document.getElementById('bp-cr').value = p.cr; sv('bp-cr','v-bcr'); }
  if (p.vo  !== undefined && p.vo !== null) { document.getElementById('bp-vo').value = p.vo; sv('bp-vo','v-bvo'); }
  if (p.bold !== undefined) document.getElementById('bp-bold').checked = p.bold;

  if (bpCurrentBlock) {
    bpCurrentBlock.color = p.color;
    bpCurrentBlock.bg    = p.bg;
    if (p.fs  !== null) bpCurrentBlock.fs        = p.fs + 'em';
    if (p.h   !== null) bpCurrentBlock.h         = p.h / 100;
    if (p.pt  !== null) bpCurrentBlock.pt        = p.pt;
    if (p.pl  !== null) bpCurrentBlock.pl        = p.pl;
    if (p.pti !== null) bpCurrentBlock.pt_inner  = p.pti;
    if (p.cl  !== undefined && p.cl !== null) bpCurrentBlock.cropleft  = p.cl;
    if (p.cr  !== null) bpCurrentBlock.cropright = p.cr;
    if (p.vo  !== undefined && p.vo !== null) bpCurrentBlock.vo = p.vo;
    if (p.bold !== undefined) bpCurrentBlock.bold = p.bold;
    liveUpdateBlock(bpCurrentBlock);
  }
  bpCSV();
}

// ── Block color/style presets (saved to localStorage) ─────────
const BP_PRESETS_KEY = 'hz_block_presets';

function bpGetPresets() {
  try { return JSON.parse(localStorage.getItem(BP_PRESETS_KEY) || '[]'); }
  catch { return []; }
}

function bpRebuildPresetDropdown() {
  const sel = document.getElementById('bp-preset-select');
  if (!sel) return;
  const presets = bpGetPresets();
  sel.innerHTML = '<option value="">— Saved Presets —</option>';
  presets.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });
}

function bpSavePreset() {
  const name = prompt('Name this preset (e.g. "War — Red/White"):');
  if (!name || !name.trim()) return;
  const g = id => document.getElementById(id).value;
  const preset = {
    name: name.trim(),
    // NOTE: text is intentionally excluded — presets store style only
    color:    g('bp-color'),
    bg:       g('bp-bg'),
    fs:       parseFloat(g('bp-fs')).toFixed(1),
    bold:     document.getElementById('bp-bold').checked,
    h:        +g('bp-h') / 100,
    croptop:  +g('bp-ct'),
    cropbot:  +g('bp-cb'),
    cropleft:  +g('bp-cl'),
    cropright: +g('bp-cr'),
    pt:       +g('bp-pt'),
    pl:       +g('bp-pl'),
    pt_inner: +g('bp-pti'),
    vo:       +g('bp-vo'),
    z:        +g('bp-z'),
  };
  const presets = bpGetPresets();
  presets.push(preset);
  localStorage.setItem(BP_PRESETS_KEY, JSON.stringify(presets));
  bpRebuildPresetDropdown();
  fb('bp-fb', `✓ Preset "${name.trim()}" saved`);
}

function bpLoadPreset() {
  const sel = document.getElementById('bp-preset-select');
  const idx = parseInt(sel.value, 10);
  if (isNaN(idx) || idx < 0) return;
  const presets = bpGetPresets();
  const p = presets[idx];
  if (!p) return;

  document.getElementById('bp-color').value = p.color;
  document.getElementById('bp-bg').value    = p.bg;
  document.getElementById('bp-fs').value    = p.fs;
  document.getElementById('v-bfs').textContent = p.fs;
  document.getElementById('bp-bold').checked = p.bold;
  document.getElementById('bp-h').value  = Math.round(p.h * 100);
  document.getElementById('v-bh').textContent = p.h.toFixed(2);
  document.getElementById('bp-ct').value = p.croptop;  sv('bp-ct','v-bct');
  document.getElementById('bp-cb').value = p.cropbot;  sv('bp-cb','v-bcb');
  document.getElementById('bp-cl').value = p.cropleft  || 0; sv('bp-cl','v-bcl');
  document.getElementById('bp-cr').value = p.cropright || 0; sv('bp-cr','v-bcr');
  document.getElementById('bp-pt').value = p.pt;       sv('bp-pt','v-bpt');
  document.getElementById('bp-pl').value = p.pl;       sv('bp-pl','v-bpl');
  document.getElementById('bp-pti').value = p.pt_inner; sv('bp-pti','v-bpti');
  document.getElementById('bp-vo').value = p.vo;       sv('bp-vo','v-bvo');
  document.getElementById('bp-z').value  = p.z;        sv('bp-z','v-bz');

  // Keep selected so user can see which preset is active
  bpLive();
  fb('bp-fb', `✓ Loaded "${p.name}"`);
}

function bpDeletePreset() {
  const sel = document.getElementById('bp-preset-select');
  const idx = parseInt(sel.value, 10);
  if (isNaN(idx)) { fb('bp-fb', '⚠ Select a preset first'); return; }
  const presets = bpGetPresets();
  const name = presets[idx]?.name || 'preset';
  if (!confirm(`Delete preset "${name}"?`)) return;
  presets.splice(idx, 1);
  localStorage.setItem(BP_PRESETS_KEY, JSON.stringify(presets));
  bpRebuildPresetDropdown();
  fb('bp-fb', `✓ Deleted "${name}"`);
}

function bpRenamePreset() {
  const sel = document.getElementById('bp-preset-select');
  const idx = parseInt(sel.value, 10);
  if (isNaN(idx)) { fb('bp-fb', '⚠ Select a preset first'); return; }
  const presets = bpGetPresets();
  const oldName = presets[idx]?.name || '';
  const newName = prompt('Rename preset:', oldName);
  if (!newName || !newName.trim()) return;
  presets[idx].name = newName.trim();
  localStorage.setItem(BP_PRESETS_KEY, JSON.stringify(presets));
  bpRebuildPresetDropdown();
  document.getElementById('bp-preset-select').value = idx;
  fb('bp-fb', `✓ Renamed to "${newName.trim()}"`);
}

function bpCSV() {
  const g = id => document.getElementById(id).value;
  const sm=g('bp-sm'),sd=g('bp-sd'),sy=g('bp-sy');
  const em=g('bp-em'),ed=g('bp-ed'),ey=g('bp-ey');
  const wiki=g('bp-wiki').trim();
  const text=(g('bp-text')||'').toUpperCase();
  const bold=document.getElementById('bp-bold').checked?'TRUE':'FALSE';
  const color=g('bp-color'),bg=g('bp-bg');
  const fs = parseFloat(g('bp-fs')).toFixed(1) + 'em'; // slider → string
  const pt=g('bp-pt')+'%', pl=g('bp-pl')+'%';
  const vo=g('bp-vo'), h=(+g('bp-h')/100).toFixed(2), z=g('bp-z');
  const tw=g('bp-tw').trim(); const twVal=tw.includes(',')?`"${tw}"`:tw;
  document.getElementById('bp-csv').textContent =
    `${sm},${sd},${sy},${em},${ed},${ey},${wiki},${text},${fs},Arial,${bold},${color},${bg},30,0,10,0,${pt},${pl},1,${h},${vo},${twVal},${z}`;
}

// Apply the text field to the live block — explicit save required
function bpApplyText() {
  const newText = (document.getElementById('bp-text').value || '').toUpperCase();
  if (!newText) { fb('bp-fb', '⚠ Text cannot be empty'); return; }
  if (!bpCurrentBlock) { fb('bp-fb', '⚠ No block selected'); return; }

  bpCurrentBlock.text = newText;

  document.querySelectorAll('.block-text-span').forEach(span => {
    const seg = span.closest('.txt-block');
    if (!seg || seg._block !== bpCurrentBlock) return;
    if (bpCurrentBlock.tw.includes(seg._weekNum)) span.textContent = newText;
  });

  bpCSV();
  // Save immediately when text is explicitly updated
  const blk = bpCurrentBlock;
  autoSaveRow('multiDayTextBlocks.csv', buildBlockRow(blk), null, blk.sm, blk.sd, blk.sy, blk.wiki)
    .then(() => fb('bp-fb', '✓ Text saved'))
    .catch(() => fb('bp-fb', '✓ Text updated (save failed)'));
}

async function bpAdd() {
  const g = id => document.getElementById(id).value;
  const text = (g('bp-text')||'').toUpperCase();
  if (!text) { fb('bp-fb','⚠ Enter display text first'); return; }
  const fs = parseFloat(g('bp-fs')).toFixed(1) + 'em';
  const block = {
    sm:+g('bp-sm'),sd:+g('bp-sd'),sy:+g('bp-sy'),
    em:+g('bp-em'),ed:+g('bp-ed'),ey:+g('bp-ey'),
    wiki:g('bp-wiki').trim(), text,
    color:g('bp-color'),bg:g('bp-bg'),fs,
    bold:document.getElementById('bp-bold').checked,
    pt:+g('bp-pt'), pl:+g('bp-pl'), pt_inner:+g('bp-pti'),
    vo:+g('bp-vo'), h:+g('bp-h')/100,
    croptop:+g('bp-ct'), cropbot:+g('bp-cb'),
    cropleft:+g('bp-cl'), cropright:+g('bp-cr'),
    z:+g('bp-z'),
    tw: g('bp-tw').split(',').map(Number).filter(n=>!isNaN(n)&&n>0),
    segPl:{}, segPtInner:{}, pt_inner: +g('bp-pti'),
  };
  BLOCKS.push(block);
  renderBlocks();
  bpCSV();
  // Save immediately — no debounce
  const rowToSave = buildBlockRow(block);
  console.log('[bpAdd] saving row:', rowToSave);
  console.log('[bpAdd] match:', block.sm, block.sd, block.sy, block.wiki);
  const result = await autoSaveRow('multiDayTextBlocks.csv', rowToSave, null, block.sm, block.sd, block.sy, block.wiki);
  console.log('[bpAdd] save result:', result);
  fb('bp-fb','✓ Added and saved!');
}

function bpCopyCSV() {
  navigator.clipboard.writeText(document.getElementById('bp-csv').textContent);
  fb('bp-fb','✓ Copied!');
}

async function bpSave() {
  const csvText = document.getElementById('bp-csv').textContent.trim();
  if (!csvText || csvText === '—') { fb('bp-fb','⚠ No row to save'); return; }

  const b = bpCurrentBlock;
  const payload = {
    csvFile:    'multiDayTextBlocks.csv',
    newRow:     csvText,
    matchMonth: b ? String(b.sm) : '',
    matchDay:   b ? String(b.sd) : '',
    matchYear:  b ? String(b.sy) : '',
    matchWiki:  b ? (b.wiki || '') : '',
    matchImageUrl: '',
  };
  try {
    const r = await fetch(CSV_WRITE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) { fb('bp-fb', `⚠ Server error ${r.status}`); return; }
    const d = await r.json();
    fb('bp-fb', d.success ? `✓ Saved (${d.mode})` : '⚠ ' + d.error);
  } catch(e) { fb('bp-fb', '⚠ ' + e.message); }
}

// ── Shared ────────────────────────────────────────────────────
function fb(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  setTimeout(() => el.textContent='', 3000);
}

// ── Panel drag ────────────────────────────────────────────────
function makeDraggable(panelId, hdrId) {
  const panel = document.getElementById(panelId);
  const hdr   = document.getElementById(hdrId);
  let ox=0,oy=0,sx=0,sy=0;
  hdr.addEventListener('mousedown', e => {
    if (e.target.tagName === 'BUTTON') return;
    if (e.button !== 0) return;
    sx=e.clientX; sy=e.clientY;
    const drag = ev => {
      ox=sx-ev.clientX; oy=sy-ev.clientY; sx=ev.clientX; sy=ev.clientY;
      panel.style.top  = (panel.offsetTop -oy)+'px';
      panel.style.left = (panel.offsetLeft-ox)+'px';
      panel.style.right='auto'; panel.style.bottom='auto';
    };
    const stop = () => {
      window.removeEventListener('mousemove',drag);
      window.removeEventListener('mouseup',stop);
    };
    window.addEventListener('mousemove',drag);
    window.addEventListener('mouseup',stop);
  });
}


// ══════════════════════════════════════════════════════════════
// CLIP-ART SELECTION & HANDLE SYSTEM
// ══════════════════════════════════════════════════════════════

const badge = document.getElementById('drag-badge');
function showBadge(x, y, text) {
  badge.textContent = text;
  badge.classList.add('visible');
  badge.style.left = (x + 14) + 'px';
  badge.style.top  = (y - 28) + 'px';
}
function hideBadge() { badge.classList.remove('visible'); }

// Active selection
let selTarget  = null;
let selOverlay = null;
let selHandles = [];

function deselect() {
  if (selOverlay) { selOverlay.remove(); selOverlay = null; }
  selHandles.forEach(h => h.remove());
  selHandles = [];
  // Remove active marker from whatever element had it
  document.querySelectorAll('.el-active').forEach(el => el.classList.remove('el-active'));
  // Unlock all elements
  document.body.classList.remove('element-locked');
  selTarget  = null;
}

// Dismiss selection when clicking empty space
document.addEventListener('click', e => {
  if (!editMode) return;
  if (e.target.classList.contains('sel-handle'))   return;
  if (e.target.classList.contains('sel-overlay'))  return;
  if (e.target.classList.contains('evt-img'))      return;
  if (e.target.classList.contains('txt-block'))    return;
  if (e.target.closest('.txt-block'))              return;
  if (e.target.closest('.ed-panel'))               return;
  deselect();
});

// Build fixed-position selection overlay + handle dots
function showSelection(rect, type) {
  deselect();

  selOverlay = document.createElement('div');
  selOverlay.className = 'sel-overlay';
  applyRect(selOverlay, rect);
  document.body.appendChild(selOverlay);

  // Handle layout: images get 8, blocks get top+bottom only
  const dirs = type === 'block'
    ? [['n',0.5,0],['s',0.5,1]]
    : [['nw',0,0],['n',0.5,0],['ne',1,0],['e',1,0.5],
       ['se',1,1],['s',0.5,1],['sw',0,1],['w',0,0.5]];

  dirs.forEach(([dir,fx,fy]) => {
    const h = document.createElement('div');
    h.className = 'sel-handle';
    h.dataset.dir  = dir;
    h.dataset.type = type;
    placeHandle(h, rect, fx, fy);
    document.body.appendChild(h);
    selHandles.push(h);
  });
}

function applyRect(el, r) {
  el.style.left   = r.left   + 'px';
  el.style.top    = r.top    + 'px';
  el.style.width  = r.width  + 'px';
  el.style.height = r.height + 'px';
}

function placeHandle(h, r, fx, fy) {
  h.style.left = (r.left + r.width  * fx) + 'px';
  h.style.top  = (r.top  + r.height * fy) + 'px';
}

function imgRect(img)   { return img.getBoundingClientRect(); }
function blockRect(block) {
  let l=Infinity,t=Infinity,r=-Infinity,b=-Infinity;
  document.querySelectorAll('.txt-block').forEach(el => {
    if (el._block !== block) return;
    const br = el.getBoundingClientRect();
    l=Math.min(l,br.left); t=Math.min(t,br.top);
    r=Math.max(r,br.right);b=Math.max(b,br.bottom);
  });
  return {left:l,top:t,width:r-l,height:b-t};
}

// ── IMAGE — click to select, drag body to move, handles to scale ──
function attachImgDrag(img, ev) {

  img.addEventListener('click', e => {
    if (!editMode) return;
    e.stopPropagation();
    selectImg(img, ev);
    openEP(ev.month, ev.day, ev.year, img, ev, img);
  });

  img.addEventListener('contextmenu', e => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    showCtx(e, ev.month, ev.day, ev.year, null, ev, null);
  });

  img.addEventListener('mousedown', function(e) {
    if (!editMode) return;
    if (e.button !== 0) return;
    if (e.target.classList.contains('sel-handle')) return;
    e.preventDefault();
    e.stopPropagation();

    if (!selTarget || selTarget.el !== img) selectImg(img, ev);

    pushUndoSnapshot(); // snapshot BEFORE any values change
    const startX = e.clientX, startY = e.clientY;
    const startPt = ev.pt, startPl = ev.pl;
    const cell  = img.closest('.day-cell');
    const cellW = cell ? cell.offsetWidth  : 75;
    const cellH = cell ? cell.offsetHeight : 100;
    let moved = false;

    const onMove = e => {
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (!moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      moved = true;
      ev.pt = Math.round(startPt + (dy / cellH) * 100);
      ev.pl = Math.round(startPl + (dx / cellW) * 100);
      img.style.top  = ev.pt + '%';
      img.style.left = ev.pl + '%';
      refreshSelection(imgVisualRect(img, ev));
      showBadge(e.clientX, e.clientY, `top:${ev.pt}%  left:${ev.pl}%`);
      const pt = document.getElementById('ep-pt');
      const pl = document.getElementById('ep-pl');
      if (pt) { pt.value = ev.pt; sv('ep-pt','v-pt'); }
      if (pl) { pl.value = ev.pl; sv('ep-pl','v-pl'); }
      epCSV();
    };
    const onUp = async () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      hideBadge();
      if (!moved) return;
      pushUndoSnapshot();
      refreshSelection(imgVisualRect(img, ev));
      await autoSaveRow('events.csv', buildEventRow(ev), ev.imageUrl, ev.month, ev.day, ev.year, ev.wikiUrl);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  });
}

// Compute the visible (cropped) rect of an image in screen coordinates
function imgVisualRect(img, ev) {
  const r  = img.getBoundingClientRect();
  const ct = (ev.ct || 0) / 100;
  const cb = (ev.cb || 0) / 100;
  const cl = (ev.cl || 0) / 100;
  const cr = (ev.cr || 0) / 100;
  return {
    left:   r.left   + r.width  * cl,
    top:    r.top    + r.height * ct,
    right:  r.right  - r.width  * cr,
    bottom: r.bottom - r.height * cb,
    get width()  { return this.right  - this.left; },
    get height() { return this.bottom - this.top;  },
  };
}

function selectImg(img, ev) {
  deselect();
  selTarget = {type:'img', el:img, ev};
  document.body.classList.add('element-locked');
  img.classList.add('el-active');

  // Use visual (cropped) rect for handle placement
  const vr = imgVisualRect(img, ev);
  showSelection(vr, 'img');
  selHandles.forEach(h => attachImgHandle(h, img, ev));
}

function attachImgHandle(handle, img, ev) {
  handle.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    pushUndoSnapshot(); // snapshot BEFORE crop/scale changes
    const dir    = handle.dataset.dir;
    const startX = e.clientX, startY = e.clientY;

    // Snapshot starting values
    const startSc = ev.sc;
    const startCt = ev.ct || 0;
    const startCb = ev.cb || 0;
    const startCl = ev.cl || 0;
    const startCr = ev.cr || 0;

    // Reference measurements — use the full (uncropped) element rect
    const fullR = img.getBoundingClientRect();
    const fullW = fullR.width  || 75;
    const fullH = fullR.height || 100;
    // For scale: use diagonal of visual rect
    const vr   = imgVisualRect(img, ev);
    const diag = Math.sqrt(vr.width**2 + vr.height**2) || 100;

    const isCorner = ['nw','ne','sw','se'].includes(dir);

    const onMove = e => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (isCorner) {
        // ── CORNERS → scale ──────────────────────────────────────
        const delta = ({
          se:  (dx + dy) / 2,
          nw: -(dx + dy) / 2,
          ne:  (dx - dy) / 2,
          sw: -(dx - dy) / 2,
        })[dir] || 0;

        const newSc = Math.max(0.05, +(startSc + delta / (diag / 2)).toFixed(3));
        ev.sc = newSc;
        const fitScale = img._fitScale || 1;
        img.style.transform = `scale(${fitScale * newSc})`;
        showBadge(e.clientX, e.clientY, `scale: ${newSc.toFixed(2)}×`);
        const sc = document.getElementById('ep-sc');
        if (sc) { sc.value = Math.round(newSc * 100); document.getElementById('v-sc').textContent = newSc.toFixed(2); }

      } else {
        // ── EDGES → crop ─────────────────────────────────────────
        // Convert pixel delta to % of the full element dimension
        // Dragging an edge INWARD (toward center) increases crop (hides more)
        // Dragging OUTWARD decreases crop (reveals more), min 0%

        let newCt = startCt, newCb = startCb, newCl = startCl, newCr = startCr;

        if (dir === 'n') {
          // North handle: dragging DOWN increases croptop
          newCt = Math.max(0, Math.min(90, +(startCt + (dy / fullH) * 100).toFixed(1)));
        } else if (dir === 's') {
          // South handle: dragging UP increases cropbottom
          newCb = Math.max(0, Math.min(90, +(startCb - (dy / fullH) * 100).toFixed(1)));
        } else if (dir === 'w') {
          // West handle: dragging RIGHT increases cropleft
          newCl = Math.max(0, Math.min(90, +(startCl + (dx / fullW) * 100).toFixed(1)));
        } else if (dir === 'e') {
          // East handle: dragging LEFT increases cropright
          newCr = Math.max(0, Math.min(90, +(startCr - (dx / fullW) * 100).toFixed(1)));
        }

        ev.ct = newCt; ev.cb = newCb; ev.cl = newCl; ev.cr = newCr;
        const hasCrop = newCt || newCb || newCl || newCr;
        img.style.clipPath = hasCrop
          ? `inset(${newCt}% ${newCr}% ${newCb}% ${newCl}%)`
          : 'none';

        showBadge(e.clientX, e.clientY,
          `crop  T:${Math.round(newCt)}% B:${Math.round(newCb)}% L:${Math.round(newCl)}% R:${Math.round(newCr)}%`);

        // Sync crop sliders
        const ids = {ct:'ep-ct',cb:'ep-cb',cl:'ep-cl',cr:'ep-cr'};
        const vals = {ct:newCt, cb:newCb, cl:newCl, cr:newCr};
        Object.entries(ids).forEach(([k,id]) => {
          const el = document.getElementById(id);
          if (el) { el.value = Math.round(vals[k]); sv(id, 'v-' + id.replace('ep-','')); }
        });
      }

      // Reposition handles to the updated visual rect
      refreshSelection(imgVisualRect(img, ev));
      epCSV();
    };

    const onUp = async () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      hideBadge();
      pushUndoSnapshot();
      refreshSelection(imgVisualRect(img, ev));
      await autoSaveRow('events.csv', buildEventRow(ev), ev.imageUrl, ev.month, ev.day, ev.year, ev.wikiUrl);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  });
}

// ── TEXT BLOCK — click to select, drag body vertically, top/bottom handles resize ──
function attachBlockDrag(el, block) {

  el.addEventListener('mousedown', function(e) {
    if (!editMode) return;
    if (e.button !== 0) return;
    if (e.target.classList.contains('sel-handle'))      return;
    if (e.target.classList.contains('block-text-span')) return;
    e.preventDefault();

    pushUndoSnapshot();
    const startY  = e.clientY;
    const startVo = block.vo;
    let moved = false;

    const onMove = e => {
      const dy = e.clientY - startY;
      if (!moved && Math.abs(dy) < 3) return;
      moved = true;
      block.vo = Math.round(startVo + dy);
      liveUpdateBlock(block);
      refreshSelection();
      showBadge(e.clientX, e.clientY, `offset: ${block.vo}px`);
      const vo = document.getElementById('bp-vo');
      if (vo) { vo.value = block.vo; sv('bp-vo','v-bvo'); }
    };

    const onUp = async () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      hideBadge();
      if (!moved) return;
      liveUpdateBlock(block);
      refreshSelection();
      const vo = document.getElementById('bp-vo');
      if (vo) { vo.value = block.vo; sv('bp-vo','v-bvo'); }
      await autoSaveRow('multiDayTextBlocks.csv', buildBlockRow(block), null, block.sm, block.sd, block.sy, block.wiki);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  });
}

function selectBlock(block) {
  deselect();
  selTarget = {type:'block', block};

  // Lock all other elements, enable only segments of this block
  document.body.classList.add('element-locked');
  document.querySelectorAll('.txt-block').forEach(el => {
    if (el._block === block) {
      el.classList.add('el-active');
      const span = el.querySelector('.block-text-span');
      if (span) span.classList.add('el-active');
    }
  });

  // Draw outline + top/bottom handles on EACH segment individually
  document.querySelectorAll('.txt-block').forEach(el => {
    if (el._block !== block) return;
    const r = el.getBoundingClientRect();

    // Thin gold outline around this segment
    const outline = document.createElement('div');
    outline.className = 'sel-overlay';
    outline.style.left   = r.left + 'px';
    outline.style.top    = r.top  + 'px';
    outline.style.width  = r.width  + 'px';
    outline.style.height = r.height + 'px';
    outline._segEl = el; // remember which segment for refresh
    document.body.appendChild(outline);
    selHandles.push(outline); // reuse selHandles array for cleanup

    // Top handle (n) — centre of top edge of this segment
    const hn = document.createElement('div');
    hn.className = 'sel-handle';
    hn.dataset.dir  = 'n';
    hn.dataset.type = 'block';
    hn.style.left = (r.left + r.width / 2) + 'px';
    hn.style.top  = r.top + 'px';
    document.body.appendChild(hn);
    selHandles.push(hn);
    attachBlockHandle(hn, block);

    // Bottom handle (s) — centre of bottom edge
    const hs = document.createElement('div');
    hs.className = 'sel-handle';
    hs.dataset.dir  = 's';
    hs.dataset.type = 'block';
    hs.style.left = (r.left + r.width / 2) + 'px';
    hs.style.top  = r.bottom + 'px';
    document.body.appendChild(hs);
    selHandles.push(hs);
    attachBlockHandle(hs, block);
  });
}

function refreshSelection(rect) {
  if (selTarget && selTarget.type === 'block') {
    // Refresh each segment outline and its two handles
    // selHandles contains: [outline, hn, hs, outline, hn, hs, ...]
    let i = 0;
    document.querySelectorAll('.txt-block').forEach(el => {
      if (!selTarget || el._block !== selTarget.block) return;
      const r = el.getBoundingClientRect();
      const outline = selHandles[i];
      const hn      = selHandles[i+1];
      const hs      = selHandles[i+2];
      i += 3;
      if (!outline || !hn || !hs) return;
      outline.style.left   = r.left + 'px';
      outline.style.top    = r.top  + 'px';
      outline.style.width  = r.width  + 'px';
      outline.style.height = r.height + 'px';
      hn.style.left = (r.left + r.width / 2) + 'px';
      hn.style.top  = r.top + 'px';
      hs.style.left = (r.left + r.width / 2) + 'px';
      hs.style.top  = r.bottom + 'px';
    });
    return;
  }
  // For images: reposition the single overlay and 8 handles
  if (!rect) return;
  if (selOverlay) applyRect(selOverlay, rect);
  const dirs = [['nw',0,0],['n',0.5,0],['ne',1,0],['e',1,0.5],
                ['se',1,1],['s',0.5,1],['sw',0,1],['w',0,0.5]];
  selHandles.forEach((h,i) => {
    if (dirs[i]) placeHandle(h, rect, dirs[i][1], dirs[i][2]);
  });
}

function attachBlockHandle(handle, block) {
  handle.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    pushUndoSnapshot(); // snapshot BEFORE resize
    const dir     = handle.dataset.dir; // 'n' or 's'
    const startY  = e.clientY;
    const startH  = block.h;
    const startPt = block.pt;
    let active = false;

    const onMove = e => {
      const dy = e.clientY - startY;
      if (!active && Math.abs(dy) < 2) return;
      active = true;

      let cellH = 100;
      document.querySelectorAll('.txt-block').forEach(b => {
        if (b._block === block) cellH = b._cellH || cellH;
      });
      const dyPct = dy / cellH;

      let newH = startH, newPt = startPt;
      if (dir === 'n') {
        // Top edge down → shorter + top moves down; up → taller + top moves up
        newH  = Math.max(0.05, +(startH  - dyPct).toFixed(3));
        newPt = Math.max(0,    +(startPt + dyPct * 100).toFixed(1));
      } else {
        // Bottom edge down → taller; up → shorter. Top stays fixed.
        newH  = Math.max(0.05, +(startH  + dyPct).toFixed(3));
      }
      block.h  = newH;
      block.pt = newPt;

      document.querySelectorAll('.txt-block').forEach(seg => {
        if (seg._block !== block) return;
        const cH = seg._cellH || 100;
        if (dir === 'n') {
          const rawTop = parseFloat(seg.dataset.baseTopRaw || seg.dataset.baseTop || 0);
          seg.style.top = rawTop + (newPt - startPt)/100*cH + block.vo + 'px';
        }
        seg.style.height = (cH * newH) + 'px';
      });

      refreshSelection();
      showBadge(e.clientX, e.clientY, `height: ${newH.toFixed(2)}`);

      const hEl  = document.getElementById('bp-h');
      const ptEl = document.getElementById('bp-pt');
      if (hEl)  { hEl.value  = Math.round(newH*100); document.getElementById('v-bh').textContent  = newH.toFixed(2); }
      if (ptEl && dir==='n') { ptEl.value = Math.round(newPt); document.getElementById('v-bpt').textContent = Math.round(newPt); }
      bpCSV();
    };
    const onUp = async () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      hideBadge();
      if (!active) return;
      pushUndoSnapshot();
      await autoSaveRow('multiDayTextBlocks.csv', buildBlockRow(block), null, block.sm, block.sd, block.sy, block.wiki);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  });
}

// ── Text label drag inside block — per segment or all segments ──
function attachTextLabelDrag(span, block, weekNum) {
  span.addEventListener('mousedown', function(e) {
    if (!editMode) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    if (!block.segPl)      block.segPl      = {};
    if (!block.segPtInner) block.segPtInner = {};
    if (block.segPl[weekNum]      === undefined) block.segPl[weekNum]      = block.pl;
    if (block.segPtInner[weekNum] === undefined) block.segPtInner[weekNum] = block.pt_inner !== undefined ? block.pt_inner : 20;

    pushUndoSnapshot();
    const moveAll = document.getElementById('bp-move-all') &&
                    document.getElementById('bp-move-all').checked;

    const startX = e.clientX, startY = e.clientY;
    const snapPl = {}, snapPtI = {};

    if (moveAll) {
      Object.keys(block.segPl).forEach(k => { snapPl[k]  = block.segPl[k]; });
      Object.keys(block.segPtInner).forEach(k => { snapPtI[k] = block.segPtInner[k]; });
      snapPl._default  = block.pl;
      snapPtI._default = block.pt_inner !== undefined ? block.pt_inner : 20;
    } else {
      snapPl[weekNum]  = block.segPl[weekNum];
      snapPtI[weekNum] = block.segPtInner[weekNum];
    }

    let moved = false;
    let currentWeekNum = weekNum;

    // Ghost label that follows cursor freely across rows
    const ghost = document.createElement('span');
    ghost.textContent  = block.text;
    ghost.style.cssText = `
      position: fixed; pointer-events: none; z-index: 99999;
      font-size: ${block.fs}; font-weight: ${block.bold ? 'bold' : 'normal'};
      color: ${block.color}; white-space: nowrap;
      background: ${block.bg}; padding: 0 4px; border-radius: 2px;
      opacity: 0.85; transform: translateY(-50%);
    `;
    document.body.appendChild(ghost);

    // Build a map of all sibling segments for this block: weekNum → DOM rect
    function getSegmentRects() {
      const map = {};
      document.querySelectorAll('.txt-block').forEach(el => {
        if (el._block === block) map[el._weekNum] = el;
      });
      return map;
    }

    const onMove = e => {
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (!moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      moved = true;
      span.style.cursor = 'grabbing';
      span.style.opacity = '0.3'; // dim the original while dragging
      ghost.style.left = e.clientX + 'px';
      ghost.style.top  = e.clientY + 'px';

      if (moveAll) {
        // Move all segments together (existing behavior)
        const parent = span.closest('.txt-block');
        const pw = parent ? parent.offsetWidth  : 1;
        const ph = parent ? parent.offsetHeight : 1;
        const deltaPl  = Math.round((dx / pw) * 100);
        const deltaPtI = Math.round((dy / ph) * 100);
        Object.keys(snapPl).forEach(k => {
          if (k === '_default') return;
          block.segPl[k]      = snapPl[k]  + deltaPl;
          block.segPtInner[k] = snapPtI[k] + deltaPtI;
        });
        block.pl       = snapPl._default  + deltaPl;
        block.pt_inner = snapPtI._default + deltaPtI;
        document.querySelectorAll('.block-text-span').forEach(s => {
          const seg = s.closest('.txt-block');
          if (!seg || seg._block !== block) return;
          const wn  = seg._weekNum;
          s.style.left = (block.segPl[wn]      !== undefined ? block.segPl[wn]      : block.pl)  + '%';
          s.style.top  = (block.segPtInner[wn] !== undefined ? block.segPtInner[wn] : block.pt_inner) + '%';
        });
        showBadge(e.clientX, e.clientY, `ALL  left:${block.pl}%  top:${block.pt_inner}%`);
        return;
      }

      // ── SINGLE SEGMENT: find nearest row by cursor Y position ──
      const segMap = getSegmentRects();
      let targetEl  = null;
      let targetWn  = null;
      let minDist   = Infinity;

      // Find the segment whose vertical center is closest to the cursor
      Object.entries(segMap).forEach(([wn, el]) => {
        const r      = el.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const dist   = Math.abs(e.clientY - center);
        if (dist < minDist) {
          minDist  = dist;
          targetEl = el;
          targetWn = parseInt(wn, 10);
        }
      });

      if (targetWn !== null && targetWn !== currentWeekNum) {
        // ── CROSSED INTO A NEW ROW ──
        block.tw = block.tw.filter(w => w !== currentWeekNum);
        if (!block.tw.includes(targetWn)) block.tw.push(targetWn);
        block.tw.sort((a, b) => a - b);

        if (targetEl) {
          const r     = targetEl.getBoundingClientRect();
          const newPl  = Math.max(0, Math.min(100, Math.round(((e.clientX - r.left) / r.width)  * 100)));
          const newPtI = Math.max(0, Math.min(100, Math.round(((e.clientY - r.top)  / r.height) * 100)));
          block.segPl[targetWn]      = newPl;
          block.segPtInner[targetWn] = newPtI;
          block.pl       = newPl;
          block.pt_inner = newPtI;

          // Update all span text visibility
          document.querySelectorAll('.block-text-span').forEach(s => {
            const seg = s.closest('.txt-block');
            if (!seg || seg._block !== block) return;
            s.textContent = block.tw.includes(seg._weekNum) ? block.text : '';
            s.style.left  = (block.segPl[seg._weekNum]      !== undefined ? block.segPl[seg._weekNum]      : block.pl)       + '%';
            s.style.top   = (block.segPtInner[seg._weekNum] !== undefined ? block.segPtInner[seg._weekNum] : block.pt_inner) + '%';
          });

          currentWeekNum = targetWn;
          snapPl[targetWn]  = newPl;
          snapPtI[targetWn] = newPtI;
        }

        showBadge(e.clientX, e.clientY, `→ row ${targetWn}`);
        const twInput = document.getElementById('bp-tw');
        if (twInput) twInput.value = block.tw.join(',');

      } else if (targetEl) {
        // Normal drag within same segment — use targetEl for measurements
        const r  = targetEl.getBoundingClientRect();
        const pw = r.width  || 1;
        const ph = r.height || 1;
        const newPl  = Math.max(-20, Math.round((snapPl[currentWeekNum]  || 0)  + (dx / pw) * 100));
        const newPtI = Math.max(0,   Math.round((snapPtI[currentWeekNum] || 20) + (dy / ph) * 100));
        block.segPl[currentWeekNum]      = newPl;
        block.segPtInner[currentWeekNum] = newPtI;
        block.pl       = newPl;
        block.pt_inner = newPtI;
        span.style.left = newPl  + '%';
        span.style.top  = newPtI + '%';
        showBadge(e.clientX, e.clientY, `seg ${currentWeekNum}  left:${newPl}%  top:${newPtI}%`);
      }
    };

    const onUp = async () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      ghost.remove();
      span.style.opacity = '';
      if (!moved) return;
      span.style.cursor = 'move';
      hideBadge();
      await autoSaveRow('multiDayTextBlocks.csv', buildBlockRow(block), null, block.sm, block.sd, block.sy, block.wiki);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  });
}

// liveUpdateBlock — called from bpLive slider changes
function liveUpdateBlock(block) {
  document.querySelectorAll('.txt-block').forEach(el => {
    if (el._block !== block) return;
    const cellH = el._cellH || 100;

    // Recalculate top from the stored cell reference so pt slider works
    // and position is always consistent regardless of when block was rendered
    const cell = el._startCell;
    const rawTop = cell
      ? cell.offsetTop + (cellH * block.pt / 100)
      : parseFloat(el.dataset.baseTopRaw || el.dataset.baseTop || 0);

    el.style.top             = rawTop + block.vo + 'px';
    el.style.height          = (cellH * block.h) + 'px';
    el.style.backgroundColor = block.bg;
    el.style.zIndex          = block.z;
    const ct = block.croptop   || 0, cb = block.cropbot   || 0;
    const cl = block.cropleft  || 0, cr = block.cropright || 0;
    el.style.clipPath = (ct||cb||cl||cr) ? `inset(${ct}% ${cr}% ${cb}% ${cl}%)` : 'none';
    const span = el.querySelector('.block-text-span');
    if (span) {
      const wn  = el._weekNum;
      const pl  = (block.segPl      && block.segPl[wn]      !== undefined) ? block.segPl[wn]      : block.pl;
      const pti = (block.segPtInner && block.segPtInner[wn] !== undefined) ? block.segPtInner[wn] : (block.pt_inner || 20);
      span.style.left       = pl  + '%';
      span.style.top        = pti + '%';
      span.style.fontSize   = block.fs;
      span.style.fontWeight = block.bold ? 'bold' : 'normal';
      span.style.color      = block.color;
      if (block.tw.includes(wn)) span.textContent = block.text;
    }
  });
  if (selTarget && selTarget.block === block) refreshSelection();
}

// attachBlockResize is replaced by the handle system — no-op stub for safety
function attachBlockResize() {}

// ══════════════════════════════════════════════════════════════

function buildEventRow(ev) {
  // Quote any field that contains a comma (e.g. URLs with commas like Wikipedia article titles)
  function csvField(val) {
    const s = String(val ?? '');
    return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s;
  }
  return [
    ev.month, ev.day, ev.year,
    csvField(ev.wikiUrl), csvField(ev.imageUrl),
    ev.ct, ev.cr, ev.cb, ev.cl,
    ev.pt + '%', ev.pl + '%',
    ev.sc, ev.z,
    csvField(ev.tooltip || '')
  ].join(',');
}

function buildBlockRow(b) {
  function csvField(val) {
    const s = String(val ?? '');
    return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s;
  }
  const bold    = b.bold ? 'TRUE' : 'FALSE';
  const tw      = (b.tw || []).join(',');
  const twVal   = tw.includes(',') ? `"${tw}"` : tw;
  const ct  = b.croptop   !== undefined ? b.croptop   : 0;
  const cb  = b.cropbot   !== undefined ? b.cropbot   : 0;
  const cl  = b.cropleft  !== undefined ? b.cropleft  : 0;
  const cr  = b.cropright !== undefined ? b.cropright : 0;
  const ptInner = b.pt_inner !== undefined ? b.pt_inner : 20;
  return [
    b.sm, b.sd, b.sy,
    b.em, b.ed, b.ey,
    csvField(b.wiki), csvField(b.text),
    b.fs, 'Arial', bold,
    b.color, b.bg,
    ct, cr, cb, cl,
    b.pt + '%', b.pl + '%',
    ptInner,
    b.h.toFixed(2), b.vo,
    twVal, b.z,
    csvField(b.tooltip || '')
  ].join(',');
}

// saveStatus: small floating indicator near top-right
const saveEl = document.createElement('div');
saveEl.style.cssText = `
  position: fixed; top: 52px; right: 16px;
  background: #1a1a2e; border: 1px solid #d4af37;
  color: #d4af37; font-family: 'Courier New', monospace;
  font-size: 11px; padding: 4px 10px; border-radius: 4px;
  z-index: 99999; display: none; pointer-events: none;
`;
document.body.appendChild(saveEl);

let saveTimer = null;
function showSaveStatus(msg, isError, color) {
  saveEl.textContent = msg;
  saveEl.style.color       = isError ? '#c44' : (color || '#d4af37');
  saveEl.style.borderColor = isError ? '#c44' : (color || '#d4af37');
  saveEl.style.display = 'block';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveEl.style.display = 'none', 3000);
}

async function autoSaveRow(csvFile, newRow, matchImageUrl, matchMonth, matchDay, matchYear, matchWiki) {
  showSaveStatus('⏳ Saving…');
  try {
    const payload = {
      csvFile,
      newRow,
      matchImageUrl: matchImageUrl || '',
      matchMonth:    String(matchMonth),
      matchDay:      String(matchDay),
      matchYear:     String(matchYear),
      matchWiki:     matchWiki || '',
    };
    const res = await fetch(CSV_WRITE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-HZ-Token': hzGetToken(),
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      const color = data.mode === 'appended' ? '#f90' : '#d4af37';
      showSaveStatus(`✓ ${data.mode}`, false, color);
      if (data.debug && data.debug !== 'n/a') console.log('[csv_write]', data.mode, data.debug);
    } else if (data.code === 401) {
      localStorage.removeItem(HZ_TOKEN_KEY);
      showSaveStatus('⚠ Session expired — log in again', true);
      document.getElementById('hz-login-modal').style.display = 'block';
      setTimeout(() => document.getElementById('hz-pw-input')?.focus(), 100);
    } else {
      showSaveStatus('⚠ ' + (data.error || 'Save failed'), true);
      console.error('[autoSaveRow] save failed:', data);
    }
    return data;
  } catch(e) {
    showSaveStatus('⚠ ' + e.message, true);
    return {success: false, error: e.message};
  }
}

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
window.addEventListener('load', () => {
  makeDraggable('event-panel','ep-hdr');
  makeDraggable('block-panel','bp-hdr');
  rebuildFmtDropdown();
  bpRebuildPresetDropdown();

  // Load CSV data then render
  loadCSVFiles(() => {
    setYear(currentYear);
    migrateLocalStorageTooltips(); // one-time: moves localStorage tooltips into CSV
    // Load FOMC data after main CSVs
    if (typeof loadFOMC === 'function') {
      loadFOMC(() => renderFOMC());
    }
  });

  // Auto-refresh text blocks on browser zoom
  let zoomRefreshTimer = null;
  let lastDPR = window.devicePixelRatio;
  const zoomObserver = new ResizeObserver(() => {
    const currentDPR = window.devicePixelRatio;
    if (currentDPR === lastDPR) return;
    lastDPR = currentDPR;
    clearTimeout(zoomRefreshTimer);
    zoomRefreshTimer = setTimeout(() => { renderBlocks(); }, 250);
  });
  zoomObserver.observe(document.body);
});

// ══════════════════════════════════════════════════════════════
// ON THIS DAY — shows all events on today's month/day
// across every year in the CSV data
// ══════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════
// ON THIS DAY
// ══════════════════════════════════════════════════════════════

let otdMonth = null, otdDay = null;

function openOnThisDay() {
  const now = new Date();
  showOnThisDay(now.getMonth() + 1, now.getDate());
}

// Only show block on its END date if text ends with these words
function blockEndsSignificant(text) {
  return /\b(ENDS?|ENDED|CONCLUDES?|CONCLUDED|FALLS?|FELL|SURRENDERS?|SURRENDERED|LIBERATED|LIBERATION)\s*$/i.test(text.trim());
}

// Only show block on its START date if text ends with these words
function blockStartSignificant(text) {
  return /\b(BEGINS?|BEGUN|STARTED?|LAUNCHES?|LAUNCHED|OPENS?|OPENED|COMMENCES?|COMMENCED)\s*$/i.test(text.trim());
}

function showOnThisDay(mo, dy) {
  otdMonth = mo; otdDay = dy;

  const monthNames = ['','January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
  const ordinal = dy + (dy===1||dy===21||dy===31?'st':dy===2||dy===22?'nd':dy===3||dy===23?'rd':'th');

  document.getElementById('otd-title').textContent = monthNames[mo] + ' ' + ordinal;

  // Sync date picker
  const moSel = document.getElementById('otd-mo-select');
  const dySel = document.getElementById('otd-dy-select');
  if (moSel) moSel.value = mo;
  if (dySel) { dySel.innerHTML = ''; for (let i=1;i<=31;i++){const o=document.createElement('option');o.value=i;o.textContent=i;dySel.appendChild(o);} dySel.value = dy; }

  const entries = [];

  // 1. Image events
  EVENTS.forEach(ev => {
    if (parseInt(ev.month)===mo && parseInt(ev.day)===dy) {
      entries.push({ year:ev.year, type:'event', label: ev.tooltip || wikiTitle(ev.wikiUrl), wiki:ev.wikiUrl, note:'' });
    }
  });

  // 2. Text blocks with smart filtering
  multiDayTextBlocks.forEach(b => {
    const text = b.text||'';
    const isSingle = (b.sy===b.ey && b.sm===b.em && b.sd===b.ed);
    const endsOnly  = blockEndsSignificant(text);
    const startOnly = blockStartSignificant(text);

    // Start date match — skip if block text says it only matters when it ENDS
    if (b.sm===mo && b.sd===dy && !endsOnly) {
      entries.push({ year:b.sy, type:'block-start', label: b.tooltip || text, wiki:b.wiki,
                     note: isSingle?'':('begins'), color:b.bg, textColor:b.color });
    }
    // End date match (not single-day) — skip if block text says it only matters when it STARTS
    if (!isSingle && b.em===mo && b.ed===dy && !startOnly) {
      entries.push({ year:b.ey, type:'block-end', label: b.tooltip || text, wiki:b.wiki,
                     note:'ends', color:b.bg, textColor:b.color });
    }
  });

  // 3. FOMC
  if (typeof fomcData!=='undefined') {
    fomcData.forEach(f => {
      if (f.month===mo && f.day===dy) {
        const dir  = f.bps>0?'▲ Hike':f.bps<0?'▼ Cut':'― Hold';
        const col  = f.bps>0?'#fff0f0':f.bps<0?'#f0fff0':'#f5f5f0';
        const tcol = f.bps>0?'#b30000':f.bps<0?'#006400':'#333';
        entries.push({ year:f.year, type:'fomc', label:`Fed Rate: ${dir} → ${f.rate}%`,
                       wiki:'https://en.wikipedia.org/wiki/History_of_Federal_Open_Market_Committee_actions',
                       note: f.bps!==0?`${f.bps>0?'+':''}${f.bps}bp`:'no change', color:col, textColor:tcol });
      }
    });
  }

  entries.sort((a,b) => a.year - b.year);

  const count = document.getElementById('otd-count');
  count.textContent = entries.length
    ? `${entries.length} event${entries.length!==1?'s':''} found across history`
    : 'No events found for this date';

  const list = document.getElementById('otd-list');
  list.innerHTML = '';

  if (!entries.length) {
    list.innerHTML = '<div style="padding:40px;text-align:center;color:#3a3a5e;font-style:italic;">Nothing recorded on this date yet.</div>';
  }

  let lastCentury = null;
  entries.forEach(entry => {
    const century = Math.floor(Math.abs(entry.year)/100)*100;
    const cLbl = entry.year<0?(century+100)+'s BC':century+'s';
    if (cLbl!==lastCentury && entries.length>6) {
      const sep=document.createElement('div');
      sep.style.cssText='padding:4px 18px;font-size:10px;color:#4a4a6e;letter-spacing:0.1em;text-transform:uppercase;background:#0d0d1e;border-bottom:1px solid #1a1a3e;';
      sep.textContent=cLbl; list.appendChild(sep); lastCentury=cLbl;
    }
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:flex-start;gap:12px;padding:11px 18px;border-bottom:1px solid #1a1a3e;cursor:pointer;transition:background 0.1s;';
    row.onmouseenter=()=>row.style.background='#0d0d2e';
    row.onmouseleave=()=>row.style.background='';
    const yb=document.createElement('div');
    yb.style.cssText=`flex-shrink:0;min-width:52px;text-align:center;padding:3px 6px;border-radius:4px;font-weight:bold;font-size:12px;background:${entry.color||'#2a1a4e'};color:${entry.textColor||'#c8a8ff'};border:1px solid rgba(255,255,255,0.1);`;
    yb.textContent=entry.year<0?Math.abs(entry.year)+' BC':entry.year;
    const icon=entry.type==='event'?'📷':entry.type==='block-start'?'▶':entry.type==='block-end'?'■':entry.type==='fomc'?'📈':'•';
    const txt=document.createElement('div');
    txt.style.cssText='flex:1;';
    txt.innerHTML=`<div style="color:#e8e0d0;font-size:13px;font-weight:bold;line-height:1.3;">${icon} ${entry.label}</div>${entry.note?`<div style="color:#7a7a9e;font-size:11px;margin-top:2px;">${entry.note}</div>`:''}`;
    row.onclick=()=>{ closeOnThisDay(); setYear(entry.year); if(entry.wiki) setTimeout(()=>openWiki(entry.wiki),400); };
    row.appendChild(yb); row.appendChild(txt); list.appendChild(row);
  });

  document.getElementById('otd-modal').style.display = 'block';
}

function closeOnThisDay(e) {
  if (e && e.target !== document.getElementById('otd-modal')) return;
  document.getElementById('otd-modal').style.display = 'none';
}

// ── DELETE FUNCTIONS ──────────────────────────────────────────
async function epDeleteEvent() {
  if (!epTarget) return;
  const ev = epTarget.ev;
  const label = ev.tooltip || wikiTitle(ev.wikiUrl) || 'this event';
  if (!confirm(`Delete "${label}" (${ev.month}/${ev.day}/${ev.year})?\n\nThis cannot be undone.`)) return;

  // Remove from in-memory array
  const idx = EVENTS.findIndex(e =>
    e.month === ev.month && e.day === ev.day && e.year === ev.year &&
    e.imageUrl === ev.imageUrl && e.wikiUrl === ev.wikiUrl
  );
  if (idx !== -1) EVENTS.splice(idx, 1);

  // Remove img element from DOM immediately
  if (epTarget.img && epTarget.img.parentNode) epTarget.img.parentNode.removeChild(epTarget.img);

  // Save the entire events array back (replaceAll mode)
  const rows = EVENTS.map(e => buildEventRow(e));
  await autoSaveReplaceAll('events.csv', rows);

  closeEP();
  fb('ep-fb', '✓ Deleted');
}

async function bpDeleteBlock() {
  if (!bpCurrentBlock) return;
  const b = bpCurrentBlock;
  const label = b.tooltip || b.text || 'this block';
  if (!confirm(`Delete "${label}"?\n\nThis cannot be undone.`)) return;

  // Remove from in-memory array
  const idx = multiDayTextBlocks.findIndex(x =>
    x.sm === b.sm && x.sd === b.sd && x.sy === b.sy &&
    x.wiki === b.wiki && x.text === b.text
  );
  if (idx !== -1) multiDayTextBlocks.splice(idx, 1);
  BLOCKS = multiDayTextBlocks;

  // Re-render blocks
  renderBlocks();

  // Save full block array back
  const rows = multiDayTextBlocks.map(x => buildBlockRow(x));
  await autoSaveReplaceAll('multiDayTextBlocks.csv', rows);

  closeBP();
}

async function autoSaveReplaceAll(csvFile, rows) {
  showSaveStatus('⏳ Saving…');
  try {
    const res = await fetch(CSV_WRITE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HZ-Token': hzGetToken() },
      body: JSON.stringify({ csvFile, replaceAll: true, rows })
    });
    const data = await res.json();
    if (data.success) showSaveStatus('✓ deleted');
    else showSaveStatus('⚠ ' + (data.error || 'failed'), true);
    return data;
  } catch(e) {
    showSaveStatus('⚠ ' + e.message, true);
    return { success: false };
  }
}
// Reading is just ev.tooltip / block.tooltip (populated by parser)
// Writing updates the object and saves to CSV immediately

function getTooltip(ev) {
  return ev.tooltip || null;
}
function getBlockTooltip(block) {
  return block.tooltip || null;
}

// Called when user saves a tooltip override in the edit panel
async function setTooltip(ev, text) {
  ev.tooltip = text || '';
  await autoSaveRow('events.csv', buildEventRow(ev), ev.imageUrl, ev.month, ev.day, ev.year, ev.wikiUrl);
}
async function setBlockTooltip(block, text) {
  block.tooltip = text || '';
  await autoSaveRow('multiDayTextBlocks.csv', buildBlockRow(block), null, block.sm, block.sd, block.sy, block.wiki);
}

// Migrate any existing localStorage tooltips into CSV on first load
// (one-time migration so users don't lose edits they made before this update)
async function migrateLocalStorageTooltips() {
  const evStore = (() => { try { return JSON.parse(localStorage.getItem('hz_tooltips')||'{}'); } catch { return {}; } })();
  const bkStore = (() => { try { return JSON.parse(localStorage.getItem('hz_block_tooltips')||'{}'); } catch { return {}; } })();

  let migrated = 0;
  for (const [key, text] of Object.entries(evStore)) {
    // key format: month/day/year/imageUrl
    const parts = key.split('/');
    if (parts.length < 4) continue;
    const [mo, dy, yr] = parts.map(Number);
    const imgUrl = parts.slice(3).join('/');
    const ev = EVENTS.find(e => e.month===mo && e.day===dy && e.year===yr && e.imageUrl===imgUrl);
    if (ev && !ev.tooltip) { await setTooltip(ev, text); migrated++; }
  }
  for (const [key, text] of Object.entries(bkStore)) {
    const parts = key.split('/');
    if (parts.length < 4) continue;
    const [sm, sd, sy] = parts.map(Number);
    const wiki = parts.slice(3).join('/');
    const b = multiDayTextBlocks.find(b => b.sm===sm && b.sd===sd && b.sy===sy && b.wiki===wiki);
    if (b && !b.tooltip) { await setBlockTooltip(b, text); migrated++; }
  }
  if (migrated > 0) {
    localStorage.removeItem('hz_tooltips');
    localStorage.removeItem('hz_block_tooltips');
    console.log(`[tooltips] Migrated ${migrated} tooltips from localStorage to CSV`);
  }
}

// Auto-fill tooltip field from wiki URL (called when wiki URL changes)
function epAutoTooltip(force) {
  const field = document.getElementById('ep-tooltip');
  if (!field) return;
  if (!force && field.value.trim()) return; // don't overwrite manual entry
  field.value = wikiTitle(document.getElementById('ep-wiki').value);
}
function bpAutoTooltip(force) {
  const field = document.getElementById('bp-tooltip');
  if (!field) return;
  if (!force && field.value.trim()) return;
  field.value = wikiTitle(document.getElementById('bp-wiki').value);
}

// Standalone tooltip save — saves just the tooltip without touching URLs
async function epSaveTooltip() {
  if (!epTarget) { return; }
  const ev = epTarget.ev;
  const tipText = document.getElementById('ep-tooltip')?.value.trim() || '';
  ev.tooltip = tipText;
  if (epTarget.img) epTarget.img.title = tipText || wikiTitle(ev.wikiUrl);
  const data = await autoSaveRow('events.csv', buildEventRow(ev), ev.imageUrl, ev.month, ev.day, ev.year, ev.wikiUrl);
  if (data?.success) fb('ep-fb', '✓ Tooltip saved');
}

async function bpSaveTooltip() {
  if (!bpCurrentBlock) { return; }
  const b = bpCurrentBlock;
  const tipText = document.getElementById('bp-tooltip')?.value.trim() || '';
  b.tooltip = tipText;
  document.querySelectorAll('.txt-block').forEach(el => {
    if (el._block === b) el.title = tipText || wikiTitle(b.wiki || '') || b.text;
  });
  const data = await autoSaveRow('multiDayTextBlocks.csv', buildBlockRow(b), null, b.sm, b.sd, b.sy, b.wiki);
  if (data?.success) fb('bp-fb', '✓ Tooltip saved');
}

function wikiTitle(url) {
  if (!url) return 'Unknown event';
  try {
    const path = new URL(url).pathname;
    const raw  = path.split('/wiki/')[1] || '';
    return decodeURIComponent(raw).replace(/_/g,' ').replace(/#.*$/,'').trim() || url;
  } catch { return url; }
}

// ── OTD modal: draggable via header bar ──────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const bar   = document.getElementById('otd-drag-bar');
  const inner = document.getElementById('otd-inner');
  if (!bar || !inner) return;

  let dragging = false, ox = 0, oy = 0;

  bar.addEventListener('mousedown', e => {
    if (e.target.tagName === 'BUTTON') return;
    dragging = true;
    // Convert center-transform to absolute position first
    const r = inner.getBoundingClientRect();
    inner.style.transform = 'none';
    inner.style.left = r.left + 'px';
    inner.style.top  = r.top  + 'px';
    ox = e.clientX - r.left;
    oy = e.clientY - r.top;
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    inner.style.left = (e.clientX - ox) + 'px';
    inner.style.top  = (e.clientY - oy) + 'px';
  });

  document.addEventListener('mouseup', () => { dragging = false; });

  // Escape key closes
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.getElementById('otd-modal').style.display = 'none';
  });
});

// ══════════════════════════════════════════════════════════════
// BROKEN IMAGE FINDER
// ══════════════════════════════════════════════════════════════

function openBrokenImages(scope) {
  const list   = document.getElementById('broken-list');
  const status = document.getElementById('broken-status');

  // If scope not specified, show choice buttons
  if (!scope) {
    list.innerHTML = `
      <div style="padding:30px 18px;display:flex;flex-direction:column;gap:12px;align-items:center;">
        <p style="color:#7a7a9e;font-size:13px;text-align:center;max-width:360px;line-height:1.6;">
          Choose scope — scanning all years can take a minute or two depending on how many images are in the calendar.
        </p>
        <button onclick="openBrokenImages('year')"
                style="width:260px;padding:10px;background:#1a0a2e;border:1px solid #6a4aae;
                       border-radius:6px;color:#c8a8ff;font-size:13px;cursor:pointer;">
          🔍 Scan current year only (${currentYear})
        </button>
        <button onclick="openBrokenImages('all')"
                style="width:260px;padding:10px;background:#0a1a0a;border:1px solid #2a5a2a;
                       border-radius:6px;color:#7ab870;font-size:13px;cursor:pointer;">
          🔍 Scan entire calendar (all years)
        </button>
      </div>`;
    status.textContent = 'Select scan scope:';
    document.getElementById('broken-modal').style.display = 'block';
    return;
  }

  const eventsToScan = scope === 'year'
    ? EVENTS.filter(ev => ev.year === currentYear)
    : EVENTS;

  status.textContent = `Preparing to scan ${eventsToScan.length} events…`;
  list.innerHTML = '<div style="padding:20px 18px;color:#7a7a9e;font-style:italic;">Checking images…</div>';
  document.getElementById('broken-modal').style.display = 'block';

  setTimeout(() => scanBrokenImages(list, status, eventsToScan), 50);
}

function closeBrokenImages() {
  document.getElementById('broken-modal').style.display = 'none';
}

async function scanBrokenImages(list, status, eventsToScan) {
  const results = [];

  const checks = eventsToScan.map(ev => new Promise(resolve => {
    if (!ev.imageUrl || ev.imageUrl.trim() === '') {
      results.push({ ev, reason: 'No image URL', year: ev.year });
      resolve();
      return;
    }
    const img = new Image();
    const timer = setTimeout(() => {
      results.push({ ev, reason: 'Timed out (slow/blocked)', year: ev.year });
      resolve();
    }, 6000);
    img.onload  = () => { clearTimeout(timer); resolve(); };
    img.onerror = () => {
      clearTimeout(timer);
      results.push({ ev, reason: 'Failed to load (404 or blocked)', year: ev.year });
      resolve();
    };
    img.src = ev.imageUrl;
  }));

  // Run in batches of 20 to avoid overwhelming the browser
  const batchSize = 20;
  for (let i = 0; i < checks.length; i += batchSize) {
    status.textContent = `Checking images ${i+1}–${Math.min(i+batchSize, checks.length)} of ${eventsToScan.length}…`;
    await Promise.all(checks.slice(i, i + batchSize));
  }

  results.sort((a, b) => a.year - b.year);

  status.textContent = results.length
    ? `Found ${results.length} broken or missing image${results.length !== 1 ? 's' : ''} out of ${eventsToScan.length} events scanned`
    : `✓ All ${eventsToScan.length} images loaded successfully`;

  list.innerHTML = '';

  if (results.length === 0) {
    list.innerHTML = '<div style="padding:40px;text-align:center;color:#5ab870;font-size:14px;">✓ All images are loading correctly!</div>';
    return;
  }

  results.forEach(({ ev, reason }) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:flex-start;gap:12px;padding:10px 18px;border-bottom:1px solid #1a1a3e;cursor:pointer;transition:background 0.1s;';
    row.onmouseenter = () => row.style.background = '#0d0d2e';
    row.onmouseleave = () => row.style.background = '';

    const yr = document.createElement('div');
    yr.style.cssText = 'flex-shrink:0;min-width:52px;text-align:center;padding:3px 6px;border-radius:4px;font-weight:bold;font-size:12px;background:#3a0a0a;color:#e88;border:1px solid #5a2a2a;';
    yr.textContent = ev.year < 0 ? Math.abs(ev.year) + ' BC' : ev.year;

    const txt = document.createElement('div');
    txt.style.cssText = 'flex:1;min-width:0;';

    const title = wikiTitle(ev.wikiUrl) || 'Unknown event';
    const monthNames = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dateStr = `${monthNames[ev.month] || ev.month}/${ev.day}/${ev.year}`;
    const urlShort = ev.imageUrl
      ? ev.imageUrl.length > 55 ? ev.imageUrl.slice(0, 55) + '…' : ev.imageUrl
      : '(no URL)';

    txt.innerHTML = `
      <div style="color:#e8e0d0;font-size:13px;font-weight:bold;line-height:1.3;">${title}</div>
      <div style="color:#e88;font-size:11px;margin-top:2px;">⚠ ${reason} &nbsp;·&nbsp; <span style="color:#c8a8ff;">${dateStr}</span></div>
      <div style="color:#4a4a6e;font-size:10px;margin-top:2px;word-break:break-all;">${urlShort}</div>
    `;

    // Click → jump to year, highlight the actual image element, open edit panel
    row.onclick = () => {
      closeBrokenImages();
      setYear(ev.year);
      setTimeout(() => {
        const cell = findCell(ev.month, ev.day);
        if (!cell) return;

        cell.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Find the actual img element
        let targetImg = null;
        cell.querySelectorAll('.evt-img').forEach(img => {
          if (img._ev && img._ev.imageUrl === ev.imageUrl) targetImg = img;
        });

        // Clear any previous outlines
        document.querySelectorAll('.broken-outlined').forEach(el => {
          el.style.outline = '';
          el.style.outlineOffset = '';
          el.classList.remove('broken-outlined');
        });
        document.querySelectorAll('.broken-marker').forEach(el => el.remove());

        if (targetImg) {
          // Flash the actual image element
          targetImg.classList.add('broken-outlined');
          let count = 0;
          const flash = setInterval(() => {
            targetImg.style.outline = count % 2 === 0 ? '3px solid #ff4444' : '3px solid #d4af37';
            targetImg.style.outlineOffset = '2px';
            count++;
            if (count > 5) {
              clearInterval(flash);
              targetImg.style.outline = '2px solid #ff4444';
              targetImg.style.outlineOffset = '2px';
            }
          }, 250);
          setTimeout(() => openEP(ev.month, ev.day, ev.year, targetImg, ev, targetImg), 1600);
        } else {
          // Image element missing entirely — place a bright marker in the cell
          const marker = document.createElement('div');
          marker.className = 'broken-marker';
          marker.style.cssText = `
            position:absolute; top:0; left:0; width:100%; height:100%;
            border:3px solid #ff4444; box-sizing:border-box; z-index:99999;
            display:flex; align-items:center; justify-content:center; pointer-events:none;
          `;
          marker.innerHTML = '<span style="background:#ff4444;color:#fff;font-size:9px;padding:2px 4px;border-radius:2px;text-align:center;line-height:1.3;">BROKEN<br>IMAGE</span>';
          cell.style.position = 'relative';
          cell.appendChild(marker);
          setTimeout(() => marker.remove(), 6000);
        }
      }, 600);
    };

    row.appendChild(yr);
    row.appendChild(txt);
    list.appendChild(row);
  });
}

// ══════════════════════════════════════════════════════════════
// AUTH — password protection for edit mode
// ══════════════════════════════════════════════════════════════

const HZ_TOKEN_KEY = 'hz_edit_token';

function hzGetToken() {
  // Check localStorage first (survives page refresh)
  return localStorage.getItem(HZ_TOKEN_KEY) || '';
}

function hzIsAuthed() {
  // On localhost: always allow (no PHP auth running)
  if (IS_LOCAL) return true;
  return !!hzGetToken();
}

async function hzLogin() {
  const pw  = document.getElementById('hz-pw-input').value;
  const err = document.getElementById('hz-login-err');
  if (!pw) { err.textContent = 'Enter a password'; err.style.display = 'block'; return; }

  err.style.display = 'none';
  const btn = document.querySelector('#hz-login-modal button');

  try {
    const loginUrl = IS_LOCAL
      ? window.location.pathname.replace(/\/[^/]*$/, '/hz_login.php')
      : '/hz_login.php';
    const res  = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem(HZ_TOKEN_KEY, data.token);
      document.getElementById('hz-login-modal').style.display = 'none';
      document.getElementById('hz-pw-input').value = '';
      // Now actually toggle edit mode on
      toggleEdit();
    } else {
      err.textContent = data.error || 'Incorrect password';
      err.style.display = 'block';
      document.getElementById('hz-pw-input').value = '';
      document.getElementById('hz-pw-input').focus();
    }
  } catch(e) {
    err.textContent = 'Network error — try again';
    err.style.display = 'block';
  }
}

function hzLogout() {
  localStorage.removeItem(HZ_TOKEN_KEY);
  const logoutUrl = IS_LOCAL
    ? window.location.pathname.replace(/\/[^/]*$/, '/hz_logout.php')
    : '/hz_logout.php';
  fetch(logoutUrl, { method: 'POST' }).catch(() => {});
  if (editMode) toggleEdit(); // exit edit mode
}

// Pass auth token with every CSV write request
const _origAutoSaveRow = autoSaveRow;
// Patch fetch to include token header (done inline in autoSaveRow instead)
