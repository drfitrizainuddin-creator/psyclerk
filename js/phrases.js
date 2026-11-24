// "My phrases": reusable text saved on this device (not patient data; survives End session).
(function () {
  const KEY = 'psyclerk.phrases.v1';
  const MAX_LEN = 500;
  const $ = (id) => document.getElementById(id);
  let target = null, sel = null, hideTimer = null;

  function list() { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch { return []; } }
  function store(arr) { try { localStorage.setItem(KEY, JSON.stringify(arr)); return true; } catch { showToast('Phrases cannot be saved on this device.', 'fa-triangle-exclamation', true); return false; } }
  function add(text) { const t = String(text || '').trim().slice(0, MAX_LEN); if (!t) return false; const a = list(); if (a.includes(t)) return true; a.push(t); return store(a); }
  function remove(index) { const a = list(); a.splice(index, 1); store(a); }
  // Inserts at the saved (or current) cursor position and fires `input` so the note updates.
  function insertInto(el, text, at) {
    const start = at ? at.start : (el.selectionStart ?? el.value.length);
    const end = at ? at.end : (el.selectionEnd ?? start);
    el.value = el.value.slice(0, start) + text + el.value.slice(end);
    const pos = start + text.length;
    el.focus(); try { el.setSelectionRange(pos, pos); } catch { }
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const isTextField = (el) => el && el.closest('main') && !el.closest('[data-no-capture]') && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text')) && el.id !== 'output-textarea';
  function placeButton() {
    const b = $('phrases-btn'); if (!target || b.style.display === 'none') return;
    const r = target.getBoundingClientRect();
    b.style.top = Math.max(4, r.top + 4) + 'px'; b.style.left = Math.max(4, r.right - b.offsetWidth - 4) + 'px';
  }
  function showButton(el) { clearTimeout(hideTimer); target = el; $('phrases-btn').style.display = ''; placeButton(); }
  function hideButtonSoon() { clearTimeout(hideTimer); hideTimer = setTimeout(() => { if ($('phrases-popover').style.display === 'none') $('phrases-btn').style.display = 'none'; }, 150); }

  function render() {
    const ul = $('phrases-list'); ul.replaceChildren(); const a = list();
    if (!a.length) { const p = document.createElement('p'); p.className = 'text-xs text-slate-500 py-2'; p.textContent = 'No saved phrases yet. Add text you type often below.'; ul.appendChild(p); }
    a.forEach((t, i) => {
      const row = document.createElement('div'); row.className = 'flex items-start gap-1 mb-1';
      const ins = document.createElement('button'); ins.type = 'button'; ins.dataset.insert = i;
      ins.className = 'flex-1 text-left text-xs p-2 rounded-lg border border-slate-200 hover:bg-sky-50 hover:border-sky-300';
      ins.textContent = t; ins.onclick = () => { if (target) insertInto(target, t, sel); closePopover(); };
      const del = document.createElement('button'); del.type = 'button'; del.title = 'Delete phrase'; del.setAttribute('aria-label', 'Delete phrase');
      del.className = 'w-8 h-8 shrink-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50';
      del.innerHTML = '<i class="fa-solid fa-trash-can"></i>'; del.onclick = () => { remove(i); render(); };
      row.append(ins, del); ul.appendChild(row);
    });
  }
  function openPopover() { if (target) sel = { start: target.selectionStart ?? target.value.length, end: target.selectionEnd ?? target.value.length }; render(); $('phrases-popover').style.display = ''; }
  function closePopover() { $('phrases-popover').style.display = 'none'; $('phrases-btn').style.display = 'none'; }
  function saveNew() { const i = $('new-phrase-input'); if (add(i.value)) { i.value = ''; render(); } }

  function init() {
    const b = $('phrases-btn');
    b.addEventListener('mousedown', e => e.preventDefault()); // keep focus (and cursor) in the field
    b.addEventListener('click', openPopover);
    document.addEventListener('focusin', e => { if (isTextField(e.target)) showButton(e.target); });
    document.addEventListener('focusout', e => { if (isTextField(e.target)) hideButtonSoon(); });
    window.addEventListener('scroll', placeButton, true); window.addEventListener('resize', placeButton);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('phrases-popover').style.display !== 'none') closePopover(); });
    $('new-phrase-input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveNew(); } });
  }
  window.PsyPhrases = { list, add, remove, insertInto };
  Object.assign(window, { closePhrases: closePopover, saveNewPhrase: saveNew });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
