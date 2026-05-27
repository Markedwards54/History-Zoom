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
  // ── 1951-1969 Martin era ──────────────────────────────────
  '3,4,1951':   'Hike +0.25% | Treasury-Fed Accord: Fed regains independence. New era of independent monetary policy.',
  '1,16,1952':  'Hike +0.25% | Post-Korean War tightening.',
  '6,1,1953':   'Hold | Rates held through 1953; economy expanding.',
  '2,5,1954':   'Cut -0.25% | Post-Korean War recession; easing.',
  '4,16,1954':  'Cut -0.25% | Further easing into 1954 recession.',
  '4,15,1955':  'Hike +0.25% | New tightening cycle; economy recovering strongly.',
  '8,5,1955':   'Hike +0.25%',
  '9,9,1955':   'Hike +0.25%',
  '11,18,1955': 'Hike +0.25%',
  '4,13,1956':  'Hike +0.25% | Continued tightening amid inflation.',
  '8,24,1956':  'Hike +0.25%',
  '8,23,1957':  'Hike +0.50% | Cycle peak; 1957-58 recession follows.',
  '11,15,1957': 'Cut -0.50% | Easing into recession.',
  '1,24,1958':  'Cut -0.25%',
  '3,7,1958':   'Cut -0.50%',
  '4,18,1958':  'Cut -0.50% | Recession trough; aggressive easing.',
  '9,12,1958':  'Hike +0.25% | Recovery begins; tightening resumes.',
  '11,7,1958':  'Hike +0.50%',
  '3,6,1959':   'Hike +0.50%',
  '5,29,1959':  'Hike +0.50%',
  '9,11,1959':  'Hike +0.50% | Cycle peak at 4% — highest since 1930s.',
  '6,10,1960':  'Cut -0.50% | Easing into 1960-61 recession.',
  '8,12,1960':  'Cut -0.50%',
  '1,1,1961':   'Hold | Rates stable 1961-63; Operation Twist 1961 flattened yield curve without rate change.',
  '7,17,1963':  'Hike +0.50% | Balance of payments concerns; defensive hike.',
  '11,24,1964': 'Hike +0.50% | Response to UK pound crisis; coordinated with Bank of England.',
  '1,1,1966':   'Hold | Reserve requirements and open market ops tightened in 1966 credit crunch.',
  '4,7,1967':   'Cut -0.50% | Easing after 1966 credit crunch.',
  '11,20,1967': 'Hike +0.50% | UK devaluation; balance of payments crisis.',
  '3,22,1968':  'Hike +0.50% | Gold crisis / Great Society spending pressure.',
  '4,19,1968':  'Hike +0.50%',
  '8,30,1968':  'Cut -0.25% | Tax surcharge passed; brief easing.',
  '12,18,1968': 'Hike +0.25% | Inflation re-accelerating.',
  '4,4,1969':   'Hike +0.50% | Cycle peak under Martin; effective fed funds hit ~10%.',
  // 1970-1978 Burns/Miller
  '11,13,1970': 'Cut -0.25% | Nixon recession easing begins. Burns era.',
  '12,4,1970':  'Cut -0.25%',
  '1,8,1971':   'Cut -0.25% | Nixon wage/price controls era.',
  '1,22,1971':  'Cut -0.25% | Discount + fed funds cut.',
  '2,19,1971':  'Cut -0.25%',
  '7,16,1971':  'Hike +0.25% | Dollar/gold tension; Nixon closes gold window Aug 15.',
  '11,19,1971': 'Cut -0.25%',
  '12,17,1971': 'Cut -0.25% | Fed funds declining toward 4%.',
  '3,1,1972':   'Hold | Fed funds held ~3.5-4.5% through 1972.',
  '1,15,1973':  'Hike +0.50% | Inflation surging; Arab oil embargo ahead.',
  '2,26,1973':  'Hike +0.50%',
  '5,4,1973':   'Hike +0.25%',
  '5,11,1973':  'Hike +0.25%',
  '6,11,1973':  'Hike +0.50%',
  '7,2,1973':   'Hike +0.50%',
  '8,14,1973':  'Hike +0.50% | Fed funds reaching 10-11%.',
  '4,25,1974':  'Hike +0.50% | Oil shock; inflation peaked ~12%.',
  '12,9,1974':  'Cut -0.25% | Post-oil-shock recession; easing begins.',
  '1,10,1975':  'Cut -0.50%',
  '2,5,1975':   'Cut -0.50%',
  '3,10,1975':  'Cut -0.50% | Rapid easing; fed funds plunging.',
  '5,16,1975':  'Cut -0.25%',
  '1,16,1976':  'Cut -0.50% | Fed funds falling toward 4.75%.',
  '11,22,1976': 'Cut -0.25%',
  '8,30,1977':  'Hike +0.50% | Inflation re-emerging.',
  '10,26,1977': 'Hike +0.25% | G. William Miller becomes chair Mar 1978.',
  '1,9,1978':   'Hike +0.50% | Miller era begins.',
  '5,11,1978':  'Hike +0.50%',
  '7,3,1978':   'Hike +0.25%',
  '8,21,1978':  'Hike +0.50% | Fed funds ~8%.',
  '9,22,1978':  'Hike +0.25%',
  '10,16,1978': 'Hike +0.50%',
  '11,1,1978':  'Hike +1.00% | Emergency dollar defense; largest single hike to date.',
  // 1979-1987 Volcker/early Greenspan
  '7,20,1979':  'Hike +0.50% | Volcker appointed Aug 1979.',
  '8,17,1979':  'Hike +0.50%',
  '9,19,1979':  'Hike +0.50%',
  '2,15,1980':  'Hike +1.00% | Fed funds climbing toward 17-18%.',
  '5,29,1980':  'Cut -1.00% | Credit controls; brief 1980 recession.',
  '6,13,1980':  'Cut -1.00% | Fed funds collapsing to ~9%.',
  '7,28,1980':  'Cut -1.00%',
  '9,26,1980':  'Hike +1.00% | Resume tightening; second Volcker cycle.',
  '11,17,1980': 'Hike +1.00%',
  '12,5,1980':  'Hike +1.00% | Fed funds approaching 20%.',
  '5,5,1981':   'Hike +1.00% | Fed funds near all-time peak ~19-20%.',
  '11,2,1981':  'Cut -1.00% | Recession deepens; easing begins.',
  '12,4,1981':  'Cut -1.00%',
  '7,20,1982':  'Cut -0.50%',
  '8,2,1982':   'Cut -0.50%',
  '8,16,1982':  'Cut -0.50%',
  '8,27,1982':  'Cut -0.50% | Fed funds falling rapidly.',
  '10,12,1982': 'Cut -0.50%',
  '11,22,1982': 'Cut -0.50%',
  '12,14,1982': 'Cut -0.50% | Fed funds ~8.5%.',
  '5,24,1983':  'Hold | FOMC implying fed funds ~8.5-8.75%.',
  '6,23,1983':  'Hike | Emergency inter-meeting tightening; funds rate toward 9%.',
  '7,12,1983':  'Hike +~0.25%',
  '10,4,1983':  'Hike +0.25% | Tightening on strong recovery.',
  '3,27,1984':  'Hike +~1.00% | 1984 credit boom.',
  '4,9,1984':   'Hike +0.50%',
  '7,17,1984':  'Hike +~0.75% | Fed funds near 11.5%.',
  '10,2,1984':  'Cut -0.75% | Easing begins after peak.',
  '11,7,1984':  'Cut -1.00%',
  '11,21,1984': 'Cut -0.50% | Inter-meeting cut.',
  '12,18,1984': 'Cut -0.50%',
  '2,13,1985':  'Cut -0.25%',
  '2,21,1985':  'Cut -0.25% | Inter-meeting adjustment.',
  '4,18,1985':  'Cut -0.25% | Plaza Accord context (Sept 1985).',
  '5,17,1985':  'Cut -0.50%',
  '5,20,1985':  'Cut -0.50%',
  '8,1,1985':   'Hold | Slight upward bias.',
  '9,6,1985':   'Hike +0.25%',
  '12,16,1985': 'Cut -0.25%',
  '3,7,1986':   'Cut -0.50% | Oil price collapse; discount rate also cut.',
  '4,18,1986':  'Cut -0.50%',
  '6,5,1986':   'Cut -0.25%',
  '7,10,1986':  'Cut -0.50% | Discount rate also cut.',
  '8,14,1986':  'Cut -0.25%',
  '8,20,1986':  'Cut -0.375% | Discount rate cut to 5.5%.',
  '12,4,1986':  'Hike +0.125%',
  '1,15,1987':  'Slight firming. Final Volcker action.',
  '4,30,1987':  'Hike +0.50% | Greenspan confirmed; took office Aug 11.',
  '5,19,1987':  'Modest firming.',
  '9,4,1987':   "Hike +0.50% | Greenspan's first hike as chair.",
  '9,22,1987':  'Hike +0.125%',
  '10,28,1987': 'Cut -0.25% | Post-Black Monday easing.',
  '1,28,1988':  'Cut -0.25%',
  '2,10,1988':  'Cut -0.25%',
  '3,30,1988':  'Hike +0.25% | New tightening cycle.',
  '5,9,1988':   'Hike +0.25%',
  '5,25,1988':  'Hike +0.25%',
  '6,22,1988':  'Hike +0.25%',
  '8,9,1988':   'Hike +0.625% | Discount rate also raised to 6.5%.',
  '11,22,1988': 'Hike +0.25%',
  '12,15,1988': 'Hike +0.3125%',
  '1,5,1989':   'Hike +0.3125%',
  '2,14,1989':  'Hike +0.0625%',
  '2,24,1989':  'Hike +0.6875% | Discount rate raised to 7%; near-peak.',
  '6,6,1989':   'Cut -0.1875% | Cycle peak; easing begins.',
  '7,6,1989':   'Cut -0.25%',
  '7,27,1989':  'Cut -0.25%',
  '10,19,1989': 'Cut -0.3125% | Inter-meeting cut.',
  '11,6,1989':  'Cut -0.25%',
  '12,20,1989': 'Cut -0.25%',
  // 1990-2001 Greenspan
  '7,13,1990':  'Cut -0.25% | 1990-91 recession begins Aug 1990.',
  '10,29,1990': 'Cut -0.25%',
  '11,14,1990': 'Cut -0.25% | Inter-meeting cut.',
  '12,7,1990':  'Cut -0.25% | Inter-meeting cut.',
  '12,19,1990': 'Cut -0.25% | Discount rate also cut to 6.5%.',
  '1,9,1991':   'Cut -0.25% | Inter-meeting cut.',
  '2,1,1991':   'Cut -0.50% | Discount rate cut to 6%.',
  '3,8,1991':   'Cut -0.25% | Inter-meeting cut.',
  '4,30,1991':  'Cut -0.25% | Discount rate cut to 5.5%.',
  '8,6,1991':   'Cut -0.25%',
  '9,13,1991':  'Cut -0.25% | Inter-meeting cut; discount rate cut to 5%.',
  '10,31,1991': 'Cut -0.25%',
  '11,6,1991':  'Cut -0.25% | Inter-meeting cut; discount rate cut to 4.5%.',
  '12,6,1991':  'Cut -0.25%',
  '12,20,1991': 'Cut -0.50% | Inter-meeting cut; discount rate slashed to 3.5% — biggest cut in 40 years.',
  '4,9,1992':   'Cut -0.25% | Inter-meeting cut.',
  '7,2,1992':   'Cut -0.50% | Inter-meeting cut; discount rate cut to 3%.',
  '9,4,1992':   'Cut -0.25% | Cycle low for decade; held 17 months.',
  '1,1,1993':   'Hold | No changes all of 1993; economy slowly healing.',
  '3,22,1994':  'Hike +0.25%',
  '5,17,1994':  'Hike +0.50% | Discount rate raised to 3.5%.',
  '8,16,1994':  'Hike +0.50% | Discount rate raised to 4%.',
  '12,19,1995': 'Cut -0.25%',
  '1,31,1996':  'Cut -0.25% | Insurance cut.',
  '11,17,1998': 'Cut -0.25% | Insurance cut.',
  '6,30,1999':  'Hike +0.25% | Y2K / dot-com boom tightening.',
  '8,24,1999':  'Hike +0.25%',
  '11,16,1999': 'Hike +0.25%',
  '2,2,2000':   'Hike +0.25%',
  '3,21,2000':  'Hike +0.25%',
  '8,22,2000':  'Hold — At 6.50% cycle peak.',
  '10,3,2000':  'Hold',
  '11,15,2000': 'Hold',
  '12,19,2000': 'Hold',
  '1,31,2001':  'Cut -0.50%',
  '3,20,2001':  'Cut -0.50%',
  '5,15,2001':  'Cut -0.50%',
  '6,27,2001':  'Cut -0.25%',
  '8,21,2001':  'Cut -0.25%',
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

  // Tooltip: check override first, then built-in, then basic
  const tooltipKey = `${entry.month},${entry.day},${entry.year}`;
  const override  = getFomcTooltipOverride(entry);
  const enhanced  = FOMC_TOOLTIPS[tooltipKey];
  const dir = entry.bps > 0 ? 'Hike' : entry.bps < 0 ? 'Cut' : 'Hold';
  label.title = override
    ? override
    : enhanced
      ? `${dir} — ${enhanced}`
      : `${dir}: ${entry.bps > 0 ? '+' : ''}${entry.bps}bp → ${entry.rate}%`;
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

// ── FOMC Tooltip storage ──────────────────────────────────────
const FOMC_TOOLTIP_OVERRIDE_KEY = 'hz_fomc_tooltips';

function getFomcTooltipStore() {
  try { return JSON.parse(localStorage.getItem(FOMC_TOOLTIP_OVERRIDE_KEY) || '{}'); } catch { return {}; }
}
function getFomcTooltipOverride(entry) {
  return getFomcTooltipStore()[`${entry.month},${entry.day},${entry.year}`] || null;
}
function setFomcTooltipOverride(entry, text) {
  const store = getFomcTooltipStore();
  const key = `${entry.month},${entry.day},${entry.year}`;
  if (text) store[key] = text; else delete store[key];
  localStorage.setItem(FOMC_TOOLTIP_OVERRIDE_KEY, JSON.stringify(store));
}

function fomcEditTooltip() {
  const entry = fomcCtxTarget; // save BEFORE hideFomcCtx clears it
  hideFomcCtx();
  if (!entry) return;
  fomcCtxTarget = entry; // restore so tooltip save can use it
  const key     = `${entry.month},${entry.day},${entry.year}`;
  const builtin = FOMC_TOOLTIPS[key] || null;
  const override = getFomcTooltipOverride(entry);
  const dir = entry.bps > 0 ? 'Hike' : entry.bps < 0 ? 'Cut' : 'Hold';
  const defaultText = builtin
    ? `${dir} — ${builtin}`
    : `${dir} ${entry.bps > 0 ? '+' : ''}${entry.bps}bp → ${entry.rate}%`;
  document.getElementById('fomc-tooltip-text').value = override || defaultText;
  document.getElementById('fomc-tooltip-dialog').style.display = 'block';
}

function fomcTooltipReset() {
  if (!fomcCtxTarget) return;
  setFomcTooltipOverride(fomcCtxTarget, null);
  // Reset the label title in DOM
  document.querySelectorAll('.fomc-label').forEach(lbl => {
    if (+lbl.dataset.month === fomcCtxTarget.month &&
        +lbl.dataset.day   === fomcCtxTarget.day   &&
        +lbl.dataset.year  === fomcCtxTarget.year) {
      const key = `${fomcCtxTarget.month},${fomcCtxTarget.day},${fomcCtxTarget.year}`;
      const builtin = FOMC_TOOLTIPS[key] || null;
      const dir = fomcCtxTarget.bps > 0 ? 'Hike' : fomcCtxTarget.bps < 0 ? 'Cut' : 'Hold';
      lbl.title = builtin ? `${dir} — ${builtin}` : `${dir} ${fomcCtxTarget.bps > 0?'+':''}${fomcCtxTarget.bps}bp → ${fomcCtxTarget.rate}%`;
    }
  });
  document.getElementById('fomc-tooltip-dialog').style.display = 'none';
}

function fomcTooltipSave() {
  if (!fomcCtxTarget) return;
  const text = document.getElementById('fomc-tooltip-text').value.trim();
  setFomcTooltipOverride(fomcCtxTarget, text || null);
  // Update the label title in DOM immediately
  document.querySelectorAll('.fomc-label').forEach(lbl => {
    if (+lbl.dataset.month === fomcCtxTarget.month &&
        +lbl.dataset.day   === fomcCtxTarget.day   &&
        +lbl.dataset.year  === fomcCtxTarget.year) {
      lbl.title = text || lbl.title;
    }
  });
  document.getElementById('fomc-tooltip-dialog').style.display = 'none';
  if (typeof showSaveStatus === 'function') showSaveStatus('✓ Tooltip saved');
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
