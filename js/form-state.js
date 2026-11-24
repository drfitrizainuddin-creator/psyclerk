// Snapshot / restore of the whole clerking form, with a fingerprint so a draft saved by an
// older version of the form is refused rather than ticking the wrong chips.
(function () {
  const CHIP_SEL = '[onclick^="toggleChip"],[onclick^="selectSingleChip"]';
  const FIELD_SEL = 'main input[id], main select[id], main textarea[id]';
  const chips = () => Array.from(document.querySelectorAll(CHIP_SEL));
  const fields = () => Array.from(document.querySelectorAll(FIELD_SEL)).filter(el => el.id !== 'output-textarea' && !el.closest('[data-no-capture]'));

  function hash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function formFingerprint() {
    const c = chips().map(el => el.textContent.trim());
    const opts = fields().filter(f => f.tagName === 'SELECT').map(f => f.id + ':' + Array.from(f.options).map(o => o.value).join(','));
    return c.length + '-' + hash(c.join('|') + '#' + fields().map(f => f.id).join('|') + '#' + opts.join('|'));
  }
  function captureForm() {
    const f = {}; fields().forEach(el => { f[el.id] = el.value; });
    const all = chips(); const on = [];
    all.forEach((el, i) => { if (el.classList.contains('active')) on.push(i); });
    return { mode: currentMode, format: currentFormat, fields: f, chips: on, fingerprint: formFingerprint() };
  }
  function clearFormSilently() {
    document.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(el => { if (!el.closest('[data-no-capture]')) el.value = ''; });
    document.querySelectorAll('.chip-toggle').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('main select').forEach(el => { if (el.closest('[data-no-capture]')) return; const i = Array.from(el.options).findIndex(o => o.defaultSelected); el.selectedIndex = i >= 0 ? i : 0; });
    const now = new Date();
    document.getElementById('encounter_datetime').value = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    generateNotes();
  }
  function restoreForm(state) {
    if (!state || state.fingerprint !== formFingerprint()) return false;
    clearFormSilently();
    const byId = new Set(fields().map(f => f.id));
    Object.entries(state.fields || {}).forEach(([id, v]) => { if (byId.has(id)) document.getElementById(id).value = v; });
    const all = chips(); (state.chips || []).forEach(i => { if (all[i]) all[i].classList.add('active'); });
    if (state.format) setDocFormat(state.format);
    switchTemplateMode(state.mode || 'comprehensive');
    return true;
  }
  window.PsyForm = { captureForm, restoreForm, formFingerprint, clearFormSilently };
})();
