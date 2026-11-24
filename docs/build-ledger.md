# SDD ledger — plan: /home/user/psyclerk/docs/plans/2026-11-24-psyclerk-v3.md
Spec: docs/specs/2026-11-24-psyclerk-v3-design.md
Pre-flight:
- T1→all: tests/helpers.js openApp() consumed by T2-T6 — consistent.
- T2→T3: PsyDrafts/PsyForm interfaces; T3 also consumes getRiskGaps (notes.js, from v2) — exists. OK.
- T3→T4: markDone/endSession consumed by layout bottom bar — defined T3. OK.
- T4: copyGeneratedNote/generateNotes from notes.js — exist. OK.
- T5→T3: endSession must keep psyclerk.phrases.v1 — T3 endSession deletes only psyclerk.draft.* keys. OK.
Ruling: plan never says how T2 status 'risk incomplete'|'ready' is computed for non-active drafts — compute at save time from getRiskGaps() and store in meta — cost if wrong: status stale only if code changes, negligible.
Task 1: Ruling: plan's test script 'node --test tests/' fails on Node 22 (treats dir as module) — use 'node --test --test-concurrency=1 "tests/*.test.js"' (serial: browser tests share localStorage later) — cost if wrong: none.
Task 1: complete (commits 0f824ba..21c6f62, tests: npm test → # duration_ms 3458.968603)
Task 2: Ruling: no device type chosen yet → TTL uses shared (12 h) — safer default before first-run choice — cost if wrong: drafts made before choosing expire early (choice is forced on first open in T3).
Task 2: Ruling: fingerprint carried inside captured state (state.fingerprint) and copied to Draft.fingerprint — plan named both without saying where it lives — cost: none.
Task 2: Ruling: saveDraft returns false when the draft no longer exists — prevents a late autosave resurrecting an expired/deleted draft (Review Focus 2) — cost if wrong: none.
Task 2: Ruling: added renameDraft/getActive/setActive to PsyDrafts (needed by T3 drawer, not in plan interface) — cost: none.
Task 2: Ruling: v2 Clear now delegates to PsyForm.clearFormSilently (DRY, plan says "the v2 Clear body"); fields inside [data-no-capture] (future app chrome) excluded — cost: none.
Task 2: complete (commits 21c6f62..4fd8859, tests: npm test → # duration_ms 7108.365073)
Task 3: Ruling: autosave hooked at end of generateNotes (not only triggerLiveUpdate) so quick-fills, sample case and Clear are saved too; auto-create only when form differs from blank (ignoring date/time, mode) — cost if wrong: none seen.
Task 3: Ruling: switchToDraft/newPatient always save the on-screen form to the draft being left before restoring (leaveCurrent) — plan said "flush pending save", but notes.js's 150 ms live debounce may not have scheduled one yet; mutation test confirms it is the load-bearing guard. Capture-at-schedule kept as defence in depth (mutation survives because leaveCurrent cancels timers) — cost: none.
Task 3: Ruling: Done asks for confirmation (irreversible delete) — plan silent — cost: one extra tap per patient.
Task 3: Ruling: Done button added to the PC output panel beside Print (spec needs Done on PC too; phone bottom bar comes in T4); Done only acts on the open draft — cost: can't Done a non-open draft without opening it first.
Task 3: complete (commits 4fd8859..bdbb54b, tests: npm test → # duration_ms 20094.636057)
Task 4: Ruling: section menu is one sticky horizontal bar (phone and PC) instead of "drawer on phone / left list on PC" — same function, one component, no extra tap on phone — cost if wrong: PC users who wanted a vertical list; easy to change later.
Task 4: Ruling: sections tagged with data-section by layout.js at load, not hand-edited into markup — cost: none.
Task 4: Ruling: Sample Case, Clear and Generate hidden on phone (bottom bar has Note/Copy/Done/End) — plan says header actions hidden on phone — cost: Clear unavailable on phone; Done/End cover the real need.
Task 4: Ruling: old comprehensive-only "Jump to" bar removed (replaced by the section menu); header tabs shortened to Rapid/Comprehensive/Follow-up; app title hidden on phone to fit header — cost: none.
Task 4: Ruling: removed the "HIPAA safe" claim (US law, unverified) → "Runs in this browser only · drafts stay on this device" — cost: none.
Task 4: complete (commits bdbb54b..791e2ab, tests: npm test → # duration_ms 26656.125207)
Task 5: Ruling: duplicate phrases are ignored on add; popover warns "Don't save patient details here" because phrases persist past End session — cost: none.
Task 5: complete (commits 791e2ab..0247502, tests: npm test → # duration_ms 30319.495627)
Task 6: Ruling: SW registration lives in js/sw-register.js (keeps index.html free of inline script) and is itself in APP_FILES; test 'file:// registers no SW' passed before implementation — it is a regression guard, not a feature test — cost: none.
Task 6: Ruling: cache-first means each release must bump VERSION in sw.js or installed copies stay stale — to be stated in handover — cost if forgotten: users run old code until cache is cleared.
Task 6: complete (commits 0247502..86978ae, tests: npm test → # duration_ms 33710.541303)
Final: Ruling: review-fixes test #4 first asserted 'no drafts at all' after B types — but new typing in a cleared form legitimately starts a new draft; corrected to assert the deleted patient's data never reappears (the actual finding) before any fix — cost: none.
Final review: fresh reviewer subagent (opus), verdict "With fixes": 1 Critical, 6 Important, 7 Minor.
Final: fixed #1 older-version draft overwritten by on-screen patient — "#1 opening an older-version draft…" RED→GREEN, suite 95/95
Final: fixed #2 older-version active draft at reload silently overwritten — "#2 …" RED→GREEN, suite 95/95
Final: fixed #3 same draft in two tabs wipes work (storage-event sync) — "#3 …" RED→GREEN, suite 95/95
Final: fixed #4 Done/End in one tab undone by another (vanished draft clears form) — "#4 …" RED→GREEN, suite 95/95
Final: fixed #5 Sample Case overwrote open patient (now its own "Sample (fictional)" draft) — "#5 …" RED→GREEN, suite 95/95
Final: fixed #6 fingerprint ignored option values; empty select passed risk gate — "#6a", "#6b" RED→GREEN, suite 95/95
Final: fixed #7 offline failed at folder URL (navigate fallback; SW VERSION 3.0.1) — "#7 …" RED→GREEN, suite 95/95
Final: Ruling: older-version drafts become unopenable rather than migrated — they auto-delete within 12/24 h; migration is YAGNI for a per-device scratch store — cost if wrong: after an update, drafts in progress must be re-entered (rare, update timing is the user's).
Final: Ruling: two tabs on the same draft now sync on every save (last writer wins); simultaneous typing in both tabs within 300 ms could still drop one keystroke burst — cost: negligible, very unusual usage.
Final: minor (deferred): #8 edit in the ≤60 s gap after expiry revives an expired draft.
Final: minor (deferred): #9 crypto.randomUUID throws on plain-http hosts / Safari <15.4 → drafts silently not saved.
Final: minor (deferred): #10 storage-full edge cases (switch proceeds after failed save; misleading "limit of 10" toast; warning never hides).
Final: minor (deferred): #11 SW VERSION must be bumped manually each release.
Final: minor (deferred): #12 Alt+1/2/3 are tab shortcuts on Linux browsers.
Final: minor (deferred): #13 no Clear on phone.
Final: minor (deferred): #14 last printed note stays hidden in the page until reload after End session.
Declined-to-judge rulings: phone touch focus (verify on real phone — user check); Firefox form-value restore (deferred, cheap autocomplete=off); clipboard after End session (outside app control); drawer/bottom-bar/dot wording deviations (stand, documented); Voice A (out of scope).
Task 7: complete (commits 86978ae..7df6dd3, tests: npm test → # duration_ms 49526.659207)
