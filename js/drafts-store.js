// Per-device patient drafts in localStorage. One key per draft so two tabs never overwrite each other.
// No network use: drafts never leave this browser.
(function () {
  const DEVICE_KEY = 'psyclerk.device';
  const DRAFT_PREFIX = 'psyclerk.draft.';
  const ACTIVE_KEY = 'psyclerk.active';
  const MAX_DRAFTS = 10;
  const TTL = { own: 24 * 3600000, shared: 12 * 3600000 };

  function ttlMs(deviceType) { return TTL[deviceType] || TTL.shared; }
  function getDeviceType() { try { const v = localStorage.getItem(DEVICE_KEY); return v === 'own' || v === 'shared' ? v : null; } catch { return null; } }
  function setDeviceType(t) { if (t !== 'own' && t !== 'shared') throw new Error('device type must be own|shared'); localStorage.setItem(DEVICE_KEY, t); }

  function withExpiry(d) { return { ...d, expiresAt: d.updatedAt + ttlMs(getDeviceType()) }; }
  function readAll() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(DRAFT_PREFIX)) continue;
      try { const d = JSON.parse(localStorage.getItem(k)); if (d && d.id) out.push(withExpiry(d)); } catch { /* skip corrupt entry */ }
    }
    return out;
  }
  function listDrafts(now) { return readAll().filter(d => now <= d.expiresAt).sort((a, b) => b.updatedAt - a.updatedAt); }
  function loadDraft(id) { try { const raw = localStorage.getItem(DRAFT_PREFIX + id); return raw ? withExpiry(JSON.parse(raw)) : null; } catch { return null; } }
  function write(d) { const { expiresAt, ...stored } = d; localStorage.setItem(DRAFT_PREFIX + d.id, JSON.stringify(stored)); }

  function createDraft(label, now) {
    if (readAll().length >= MAX_DRAFTS) return null;
    const d = { id: crypto.randomUUID(), label: String(label || '').slice(0, 30), mode: null, status: 'risk incomplete', updatedAt: now, fingerprint: null, state: null };
    try { write(d); } catch { return null; }
    return withExpiry(d);
  }
  // Returns false if the draft no longer exists (deleted/expired) so a late autosave cannot resurrect it.
  function saveDraft(id, state, meta, now) {
    const d = loadDraft(id); if (!d) return false;
    Object.assign(d, { state, mode: meta.mode, status: meta.status, updatedAt: now, fingerprint: state ? state.fingerprint : null });
    try { write(d); return true; } catch { return false; }
  }
  function renameDraft(id, label) { const d = loadDraft(id); if (!d) return false; d.label = String(label || '').slice(0, 30); try { write(d); return true; } catch { return false; } }
  function deleteDraft(id) { try { localStorage.removeItem(DRAFT_PREFIX + id); if (localStorage.getItem(ACTIVE_KEY) === id) localStorage.removeItem(ACTIVE_KEY); } catch { } }
  function deleteAllDrafts() { readAll().forEach(d => deleteDraft(d.id)); try { localStorage.removeItem(ACTIVE_KEY); } catch { } }
  function purgeExpired(now) { const gone = readAll().filter(d => now > d.expiresAt).map(d => d.id); gone.forEach(deleteDraft); return gone; }
  function storageAvailable() { try { const k = 'psyclerk.__probe'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch { return false; } }
  function getActive() { try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; } }
  function setActive(id) { try { id ? localStorage.setItem(ACTIVE_KEY, id) : localStorage.removeItem(ACTIVE_KEY); } catch { } }

  window.PsyDrafts = { MAX_DRAFTS, ttlMs, getDeviceType, setDeviceType, listDrafts, createDraft, saveDraft, renameDraft, loadDraft, deleteDraft, deleteAllDrafts, purgeExpired, storageAvailable, getActive, setActive };
})();
