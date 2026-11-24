// Responsive layout: section menu with status, collapsible cards, phone Form|Note tabs, shortcuts.
(function () {
  const PHONE_MQ = window.matchMedia('(max-width: 1023px)');
  const isPhone = () => PHONE_MQ.matches;
  const SHORT = {
    'sec-demographics': 'Patient details', 'sec-hpi': 'A. HPI', 'sec-dep-suicide': 'B–C. Mood & suicide', 'sec-mania-anx-ocd': 'D–F. Mania, anxiety, OCD',
    'sec-psych-trauma-adhd': 'G–J. Psychosis, trauma, ADHD', 'sec-substance-violence': 'K–L. Substance & violence', 'sec-past-background': 'M–R. Background',
    'sec-mse': 'S. MSE', 'sec-formulation-mgmt': 'V–Y. Formulation, risk, plan',
  };
  const PsyLayout = { lastJump: null };
  window.PsyLayout = PsyLayout;
  const $ = (id) => document.getElementById(id);

  function sections() {
    return [$('sec-demographics'), ...document.querySelectorAll(`#view-${currentMode} > div.bg-white.rounded-2xl`)].filter(Boolean);
  }
  function headOf(card) { return Array.from(card.children).find(c => c.matches('h2,h3') || c.querySelector('h2,h3')); }
  function labelOf(card) {
    if (SHORT[card.id]) return SHORT[card.id];
    const h = card.querySelector('h3,h2'); const c = h.cloneNode(true);
    c.querySelectorAll('span').forEach(s => { if (s.textContent.trim().length <= 2) s.remove(); });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }
  function tagSections() {
    let n = 0;
    document.querySelectorAll('[id^="view-"] > div.bg-white.rounded-2xl').forEach(card => {
      if (!card.id) card.id = 'sec-auto-' + (++n);
      card.dataset.section = labelOf(card);
      const head = headOf(card);
      if (head && !head.hasAttribute('data-section-head')) {
        head.setAttribute('data-section-head', ''); head.classList.add('cursor-pointer');
        head.addEventListener('click', (e) => { if (e.target.closest('button,select,input,textarea,a,.chip-toggle,[onclick]')) return; setCollapsed(card, card.dataset.collapsed !== '1'); });
      }
    });
    const demo = $('sec-demographics'); demo.dataset.section = SHORT['sec-demographics'];
  }

  function setCollapsed(card, on) { card.dataset.collapsed = on ? '1' : '0'; }

  function riskIdsIn(card) {
    if (typeof RISK_REQUIRED === 'undefined') return [];
    const req = RISK_REQUIRED[currentMode];
    return [...Object.keys(req.selects), req.rationale].filter(id => { const el = $(id); return el && card.contains(el); });
  }
  function sectionStatus(card) {
    const risk = riskIdsIn(card);
    if (risk.length) return risk.some(id => { const el = $(id); return el.tagName === 'SELECT' ? el.value === 'Not assessed' : !el.value.trim(); }) ? 'risk-incomplete' : 'complete';
    const touched = Array.from(card.querySelectorAll('input[id],textarea[id],select[id]')).some(el => {
      if (el.id === 'encounter_datetime') return false;
      if (el.tagName === 'SELECT') { const i = Array.from(el.options).findIndex(o => o.defaultSelected); return el.selectedIndex !== (i >= 0 ? i : 0); }
      return el.value.trim() !== '';
    }) || !!card.querySelector('.chip-toggle.active');
    return touched ? 'started' : 'empty';
  }

  const DOT = { empty: 'bg-slate-300', started: 'bg-sky-500', 'risk-incomplete': 'bg-rose-500', complete: 'bg-emerald-500' };
  function renderMenu() {
    const nav = $('section-menu-items'); if (!nav) return;
    nav.replaceChildren();
    sections().forEach(card => {
      const st = sectionStatus(card);
      const b = document.createElement('button'); b.type = 'button';
      b.dataset.target = card.id; b.dataset.status = st; b.title = st.replace('-', ' ');
      b.className = 'shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-sky-50 text-[11px] font-semibold text-slate-700 whitespace-nowrap';
      const dot = document.createElement('span'); dot.className = 'w-2 h-2 rounded-full ' + DOT[st];
      const t = document.createElement('span'); t.textContent = card.dataset.section;
      b.append(dot, t); b.onclick = () => goTo(card); nav.appendChild(b);
    });
  }
  function goTo(card) {
    PsyLayout.lastJump = card; setCollapsed(card, false);
    if (isPhone()) setPhoneTab('form');
    card.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function jumpToNextIncomplete() {
    const next = sections().find(c => ['empty', 'risk-incomplete'].includes(sectionStatus(c)));
    if (next) goTo(next); else showToast('Every section has been started.');
  }

  function setPhoneTab(tab) {
    document.body.dataset.phoneTab = tab;
    ['form', 'note'].forEach(t => { const b = $('phone-tab-' + t); if (b) b.className = 'flex-1 py-2 rounded-lg text-sm font-bold ' + (t === tab ? 'bg-white text-sky-800 shadow-sm' : 'text-slate-600'); });
  }
  function applyPhoneDefaults() {
    if (!isPhone()) { document.querySelectorAll('[data-section]').forEach(c => setCollapsed(c, false)); return; }
    sections().forEach((c, i) => setCollapsed(c, i !== 0));
  }

  // Wrap mode switching and note generation so the menu and mode picker stay in sync.
  const origSwitch = window.switchTemplateMode;
  window.switchTemplateMode = function (mode) {
    origSwitch(mode);
    const sel = $('mode-select'); if (sel) sel.value = mode;
    applyPhoneDefaults(); renderMenu();
  };
  const origGenerate = window.generateNotes;
  window.generateNotes = function () { origGenerate(); renderMenu(); };

  document.addEventListener('keydown', (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const act = { Digit1: () => switchTemplateMode('rapid'), Digit2: () => switchTemplateMode('comprehensive'), Digit3: () => switchTemplateMode('followup'), KeyC: () => copyGeneratedNote(), KeyN: () => jumpToNextIncomplete() }[e.code];
    if (act) { e.preventDefault(); act(); }
  });

  function init() { tagSections(); setPhoneTab('form'); applyPhoneDefaults(); renderMenu(); }
  Object.assign(window, { sectionStatus, jumpToNextIncomplete, setPhoneTab, setCollapsed, renderMenu });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
