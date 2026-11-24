// Patients drawer, device setup and autosave. Builds on PsyDrafts (storage) and PsyForm (snapshot).
(function () {
  const AUTOSAVE_MS = 300;
  const WARN_MS = 3600000; // show "deletes in N min" in a draft's final hour
  let activeId = null;
  let timer = null;
  let blankSignature = null;

  const UI = { now: () => Date.now(), tick, scheduleAutosave };
  window.PsyDraftsUI = UI;
  const $ = (id) => document.getElementById(id);
  const show = (id, on) => { const el = $(id); if (el) el.style.display = on ? '' : 'none'; };
  const hhmm = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // "Content" = anything beyond a blank form (ignores the auto-filled date/time and the mode).
  function signature(state) {
    const { encounter_datetime, ...rest } = state.fields;
    return JSON.stringify([rest, state.chips]);
  }
  const hasContent = (state) => signature(state) !== blankSignature;
  const riskStatus = () => (typeof getRiskGaps === 'function' && getRiskGaps().length ? 'risk incomplete' : 'ready');

  function storageFailed() { show('storage-warning', true); }

  // Saves the current form to `target` (the draft that was active when the save was scheduled).
  function saveTo(target) {
    const state = PsyForm.captureForm();
    if (!target) {
      if (!hasContent(state)) return;
      const d = PsyDrafts.createDraft('Unlabelled · ' + hhmm(UI.now()), UI.now());
      if (!d) { if (!PsyDrafts.storageAvailable()) storageFailed(); else showToast('Limit of 10 drafts: not saved. Mark a patient Done first.', 'fa-triangle-exclamation', true); return; }
      target = activeId = d.id; PsyDrafts.setActive(d.id);
    }
    const existing = PsyDrafts.loadDraft(target);
    if (!existing) { draftVanished(target); return; } // deleted/expired elsewhere: never resurrect
    if (!compatible(existing)) return; // saved by an older form version: never overwrite it
    if (!PsyDrafts.saveDraft(target, state, { mode: state.mode, status: riskStatus() }, UI.now())) storageFailed();
    renderPatients();
  }
  function scheduleAutosave() {
    if (blankSignature === null) return; // not initialised yet
    const target = activeId; // captured now, not when the timer fires
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; saveTo(target); }, AUTOSAVE_MS);
  }
  function cancelPending() { clearTimeout(timer); timer = null; clearTimeout(window.liveTimer); }
  // Save what is on screen to the draft being left, before anything else changes the form.
  function leaveCurrent() { cancelPending(); saveTo(activeId); }

  // A draft is usable only if it was saved by this version of the form (or has no content yet).
  function compatible(d) { return !d.state || d.fingerprint === PsyForm.formFingerprint(); }
  const OLD_VERSION_MSG = (label) => '"' + label + '" was saved by an older version of PsyClerk and can\'t be opened. It will delete itself automatically.';
  function draftVanished(id) {
    if (id !== activeId) return;
    cancelPending(); activeId = null;
    PsyForm.clearFormSilently(); cancelPending(); renderPatients();
    showToast('This patient\'s draft was deleted (Done, End session or time limit).', 'fa-circle-info', true);
  }
  function setActiveDraft(id) { activeId = id; PsyDrafts.setActive(id); }
  function switchToDraft(id) {
    if (id === activeId) return closePatients();
    const d = PsyDrafts.loadDraft(id); if (!d) { renderPatients(); return; }
    if (!compatible(d)) { showToast(OLD_VERSION_MSG(d.label), 'fa-triangle-exclamation', true); return; }
    leaveCurrent();
    setActiveDraft(id);
    if (d.state) PsyForm.restoreForm(d.state); else PsyForm.clearFormSilently();
    cancelPending();
    renderPatients(); closePatients();
  }
  function newPatient() {
    leaveCurrent();
    const input = $('new-patient-label');
    const label = (input.value.trim() || 'Unlabelled · ' + hhmm(UI.now()));
    const d = PsyDrafts.createDraft(label, UI.now());
    if (!d) { showToast(PsyDrafts.storageAvailable() ? 'Limit of 10: mark a patient Done first.' : 'Drafts cannot be saved on this device.', 'fa-triangle-exclamation', true); renderPatients(); return; }
    input.value = '';
    setActiveDraft(d.id);
    PsyForm.clearFormSilently(); cancelPending();
    PsyDrafts.saveDraft(d.id, PsyForm.captureForm(), { mode: currentMode, status: riskStatus() }, UI.now());
    renderPatients(); closePatients();
    showToast('New patient: ' + label);
  }
  function markDone() {
    const d = activeId && PsyDrafts.loadDraft(activeId);
    if (!d) { showToast('No saved draft open.', 'fa-circle-exclamation', true); return; }
    openCustomModal('Mark "' + d.label + '" done?', 'This deletes the draft from this device. Only do this after pasting the note into the EMR.', () => {
      cancelPending(); PsyDrafts.deleteDraft(d.id); activeId = null;
      PsyForm.clearFormSilently(); cancelPending(); renderPatients();
      showToast('Draft deleted: ' + d.label);
    }, 'Done: delete draft');
  }
  function endSession() {
    const n = PsyDrafts.listDrafts(UI.now()).length;
    openCustomModal('Delete all ' + n + ' draft' + (n === 1 ? '' : 's') + ' on this device?', 'Use this at the end of your shift. Saved phrases are kept.', () => {
      cancelPending(); PsyDrafts.deleteAllDrafts(); activeId = null;
      PsyForm.clearFormSilently(); cancelPending(); renderPatients(); closePatients();
      showToast('Session ended: all drafts deleted.');
    }, 'Delete all');
  }
  function renameActive(label) { if (activeId && PsyDrafts.renameDraft(activeId, label)) renderPatients(); }

  function tick() {
    const gone = PsyDrafts.purgeExpired(UI.now());
    if (activeId && gone.includes(activeId)) {
      cancelPending(); activeId = null;
      PsyForm.clearFormSilently(); cancelPending();
      showToast('Draft auto-deleted (time limit reached).', 'fa-clock', true);
    }
    renderPatients();
  }

  function renderPatients() {
    const list = $('patients-list'); if (!list) return;
    const now = UI.now(); const drafts = PsyDrafts.listDrafts(now);
    list.replaceChildren();
    if (!drafts.length) { const p = document.createElement('p'); p.className = 'text-xs text-slate-500 py-3'; p.textContent = 'No saved patients on this device.'; list.appendChild(p); }
    drafts.forEach(d => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'w-full text-left p-2.5 rounded-lg border text-xs mb-1.5 ' + (d.id === activeId ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white hover:bg-slate-50');
      row.onclick = () => switchToDraft(d.id);
      const top = document.createElement('div'); top.className = 'font-semibold text-slate-800 truncate'; top.textContent = d.label;
      const meta = document.createElement('div'); meta.className = 'flex flex-wrap gap-x-2 text-[11px] mt-0.5';
      const st = document.createElement('span'); st.className = d.status === 'ready' ? 'text-emerald-700' : 'text-rose-700'; st.textContent = d.status;
      const ed = document.createElement('span'); ed.className = 'text-slate-500'; ed.textContent = 'edited ' + hhmm(d.updatedAt);
      meta.append(st, ed);
      const left = d.expiresAt - now;
      if (left < WARN_MS) { const w = document.createElement('span'); w.className = 'text-amber-700 font-semibold'; w.textContent = 'deletes in ' + Math.max(1, Math.round(left / 60000)) + ' min'; meta.appendChild(w); }
      row.append(top, meta); list.appendChild(row);
    });
    const full = drafts.length >= PsyDrafts.MAX_DRAFTS;
    $('new-patient-btn').disabled = full; show('draft-limit-msg', full);
    const active = activeId && PsyDrafts.loadDraft(activeId);
    $('active-draft-label').textContent = active ? active.label : 'No patient saved';
    $('patients-count').textContent = drafts.length;
    const li = $('draft-label-input'); if (document.activeElement !== li) li.value = active ? active.label : '';
    li.disabled = !active;
    const dev = PsyDrafts.getDeviceType();
    $('device-type-text').textContent = dev === 'own' ? 'My own device: drafts kept 24 h' : dev === 'shared' ? 'Shared ward PC: drafts kept 12 h' : 'Device type not set';
  }

  // Another tab changed storage: keep this tab in step so a stale tab never overwrites or revives data.
  function onOtherTabChange(e) {
    if (!e.key || !e.key.startsWith('psyclerk.draft.')) return;
    if (activeId && e.key === 'psyclerk.draft.' + activeId) {
      if (e.newValue === null) return draftVanished(activeId);
      const d = PsyDrafts.loadDraft(activeId);
      if (d && d.state && compatible(d)) { cancelPending(); PsyForm.restoreForm(d.state); cancelPending(); }
    }
    renderPatients();
  }

  // Sample Case always opens as its own clearly-labelled draft, never over a real patient.
  const origSample = window.loadSampleCase;
  window.loadSampleCase = function () {
    if (blankSignature === null || !PsyDrafts.storageAvailable()) return origSample();
    leaveCurrent();
    const d = PsyDrafts.createDraft('Sample (fictional)', UI.now());
    if (!d) { showToast('Limit of 10: mark a patient Done before loading the sample.', 'fa-triangle-exclamation', true); return; }
    setActiveDraft(d.id); PsyForm.clearFormSilently(); cancelPending();
    origSample();
    renderPatients();
  };

  function openPatients() { renderPatients(); show('patients-drawer', true); }
  function closePatients() { show('patients-drawer', false); }
  function openDeviceModal() { show('device-modal', true); }
  function setDevice(t) {
    try { PsyDrafts.setDeviceType(t); } catch { storageFailed(); }
    show('device-modal', false); renderPatients();
  }

  function init() {
    blankSignature = signature(PsyForm.captureForm());
    if (!PsyDrafts.storageAvailable()) { storageFailed(); renderPatients(); return; }
    PsyDrafts.purgeExpired(UI.now());
    if (!PsyDrafts.getDeviceType()) openDeviceModal();
    const id = PsyDrafts.getActive(); const d = id && PsyDrafts.loadDraft(id);
    if (d && !compatible(d)) { PsyDrafts.setActive(null); showToast(OLD_VERSION_MSG(d.label), 'fa-triangle-exclamation', true); }
    else if (d) {
      activeId = id;
      if (d.state && PsyForm.restoreForm(d.state)) showToast('Restored ' + d.label + ' (edited ' + hhmm(d.updatedAt) + ')', 'fa-rotate-left');
      cancelPending();
    } else if (!d) PsyDrafts.setActive(null);
    renderPatients();
    setInterval(tick, 60000);
    window.addEventListener('storage', onOtherTabChange);
  }

  Object.assign(window, { switchToDraft, newPatient, markDone, endSession, openPatients, closePatients, openDeviceModal, setDevice, renderPatients, renameActive, scheduleAutosave });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
