// Ported v2 safety checks (originally docs/t2.js, docs/t3.js). Each check() is a subtest.
const test = require('node:test'); const assert = require('node:assert');
const { openApp } = require('./helpers');
function mk(t) { return (name, ok, extra='') => t.test(name, () => assert.ok(ok, String(extra))); }

test('v2 regression suite', async (t) => {
  const app = await openApp(); const p = app.page; const errs = app.errors; const b = app.browser;
  const check = mk(t);
  try {
  const out = () => p.$eval('#output-textarea', e => e.value);
  const lines = (o, re) => o.split('\n').filter(l => re.test(l)).join('\n');
  const click = (sel, names) => p.evaluate(([sel, names]) => [...document.querySelectorAll(sel)].filter(s => names.includes(s.textContent.trim())).forEach(s => s.click()), [sel, names]);
  const toast = () => p.$eval('#toast-msg', e => e.textContent);

  // Blank form, every mode: no fabricated normals
  for (const m of ['rapid','comprehensive','followup']) {
    await p.evaluate(m => switchTemplateMode(m), m); const o = await out();
    const bad = ['NKDA','Within normal limits','BMI normal','Family support, future plans','Grossly intact','Standard safety precautions','Confirmed intact','reasons for living','Euthymic','Well groomed','Sensorium was','Low Risk','[ LOW ]','Male'].filter(x => o.includes(x));
    await check(`${m}: blank form has no assumed-normal text ${bad.length ? JSON.stringify(bad) : ''}`, !bad.length);
    await check(`${m}: INCOMPLETE banner on blank form`, o.startsWith('*** INCOMPLETE'));
  }
  // T1 retest
  await p.evaluate(() => switchTemplateMode('comprehensive'));
  await click('#comp-suicide-chips span', ['Suicidal ideation','Plan','Intent']);
  await p.evaluate(() => prefillNoSuicideRisk());
  let o = await out();
  await check('T1: quick-fill no longer leaves SI/plan behind', !/Ideation.*(Suicidal ideation|Plan)/.test(o));
  await check('T1: quick-fill no longer invents protective factors', /Protective Factors     : \[NOT ASSESSED\]/.test(o));
  // copy blocked when incomplete
  await p.evaluate(() => copyGeneratedNote());
  await check('Copy blocked while risk incomplete', (await toast()).startsWith('Incomplete'));
  // T2 sample case
  await p.evaluate(() => loadSampleCase()); o = await out();
 
  await check('T2: sample has no Intent/Plan', !/Ideation.*(Intent|Plan)/.test(o));
  await check('T2: sample risk factors present', /Risk Factors Identified: Current depression, Recent loss/.test(o));
  await check('T2: sample is complete (no banner)', !o.startsWith('*** INCOMPLETE'));
  await p.evaluate(() => copyGeneratedNote()); await check('Copy allowed when complete', !(await toast()).startsWith('Incomplete'));
  // Fix 5: single-select toggles reach the note
  await click('#comp-sub-withdrawal span', ['Yes']); await p.waitForTimeout(300); o = await out();
  await check('Withdrawal toggle appears in note', /Withdrawal\/complications: Yes/.test(o));
  await p.evaluate(() => switchTemplateMode('rapid'));
  await click('#rapid-dep-impair span', ['Severe']); await click('#rapid-mania-prev span', ['Yes']); await p.waitForTimeout(300); o = await out();
 
  await check('Impairment + previous-episode toggles appear', /Impairment: Severe/.test(o) && /Previous episodes: Yes/.test(o));
  // T3 retest: Clear
  await click('#rapid-psy-chips span, #rapid-risk-chips span', ['Command hallucination','Plan','Weapon access']);
  await p.evaluate(() => { document.getElementById('rapid_risk_suicide').value = 'High / Imminent'; document.getElementById('rapid_risk_rationale').value='x'; });
  await p.evaluate(() => { confirmClearForm(); document.getElementById('modal-confirm-btn').click(); });
  o = await out();
  await check('T3: Clear wipes risk chips, dropdowns, toggles, rationale', !/Command hallucination|Weapon access|HIGH|Impairment:|Previous episodes/.test(o) && /Basis for Judgement     : \[NOT ASSESSED\]/.test(o));
  // Print escaping
  await p.evaluate(() => loadSampleCase());
  await p.evaluate(() => { document.getElementById('comp_vitals_bp').value = 'BP <90/60 & HR >110'; generateNotes(); window.print = () => {}; printFormalReport(); });
  const pr = await p.$eval('#print-report-container pre', e => e.textContent);
  await check('Print keeps "<" text intact', pr.includes('BP <90/60 & HR >110'));
  await check('No JS errors', errs.length === 0);
  
  } finally { await b.close(); }
});

test('v2 merge + consistency checks', async (t) => {
  const app = await openApp(); const p = app.page; const errs = app.errors; const b = app.browser;
  const check = mk(t);
  try {
  const out = () => p.$eval('#output-textarea', e => e.value);
  const flags = () => p.evaluate(() => getConsistencyFlags());
  const click = (sel, names) => p.evaluate(([sel, names]) => [...document.querySelectorAll(sel)].filter(s => names.includes(s.textContent.trim())).forEach(s => s.click()), [sel, names]);
  const set = (o) => p.evaluate(o => { for (const [k, v] of Object.entries(o)) document.getElementById(k).value = v; generateNotes(); }, o);
  const reset = async (m) => { await p.evaluate(() => { confirmClearForm(); document.getElementById('modal-confirm-btn').click(); }); await p.evaluate(m => switchTemplateMode(m), m); };
  const modalOpen = () => p.evaluate(() => !document.getElementById('custom-modal').classList.contains('hidden'));

  // --- MERGE
  await p.evaluate(() => loadSampleCase());
  await check('Sample case raises zero flags', (await flags()).length === 0, JSON.stringify(await flags()));
  await set({ comp_suicide_level: 'High', comp_violence_level: 'Moderate' }); let o = await out();
  const m = await p.evaluate(() => [matrix_suicide.value, matrix_violence.value, matrix_suicide.disabled]);
  await check('Matrix mirrors C and L and is locked', m[0]==='High' && m[1]==='Moderate' && m[2]===true, JSON.stringify(m));
  await check('Note X section matches C and L', /1\. Suicide\s+: \[ HIGH \]/.test(o) && /3\. Violence\s+: \[ MODERATE \]/.test(o) && /Stratified Suicide Risk: \[ HIGH \]/.test(o));
  await reset('comprehensive'); o = await out();
  await check('Matrix suicide/violence no longer listed as separate required items', !/Matrix: suicide|Matrix: violence/.test(o) && /Suicide \(C\) risk not rated/.test(o));

  // --- COMPREHENSIVE rules
  await reset('comprehensive');
  await click('#comp-suicide-chips span', ['No suicidal thoughts', 'Plan']); await set({ comp_suicide_level: 'Low' });
  let f = await flags();
  await check('C: No-SI + Plan clash flagged', f.some(x => /No suicidal thoughts.*Plan/.test(x)));
  await check('C: Plan + LOW flagged', f.some(x => /rated LOW despite: Plan/.test(x)));
  await check('Panel visible with count', await p.evaluate(() => getComputedStyle(document.getElementById('consistency-panel')).display !== 'none' && document.getElementById('consistency-count').textContent === String(getConsistencyFlags().length)));
  await check('Flags never appear inside the note text', !(await out()).includes('both selected') && !(await out()).includes('despite'));
  await click('#comp-psych-chips span', ['Command hallucination', 'Persecutory delusion']); await click('#full-mse-thought-chips span', ['No hallucination', 'No delusion']); await set({ comp_violence_level: 'Low' });
  f = await flags();
  await check('C: command hallucination + both LOW flagged', f.some(x => /Command hallucinations/.test(x)));
  await check('C: history vs MSE hallucination/delusion flagged', f.some(x => /section G.*No hallucination/.test(x)) && f.some(x => /section G.*No delusion/.test(x)));
  await click('#comp-mgmt-chips span', ['Outpatient management']); await set({ comp_suicide_level: 'Imminent' });
  f = await flags(); await check('C: Imminent + outpatient flagged', f.some(x => /HIGH\/IMMINENT with outpatient/.test(x)));
  await click('#comp-mgmt-chips span', ['Psychiatric admission']); f = await flags();
  await check('C: flag clears once admission selected', !f.some(x => /HIGH\/IMMINENT with outpatient/.test(x)));
  await click('#comp-sub-withdrawal span', ['Yes']); await set({ matrix_substance_harm: 'Low' }); f = await flags();
  await check('C: withdrawal YES + substance harm LOW flagged', f.some(x => /Withdrawal/.test(x)));

  // --- GATE: complete the note, leave flags → copy asks, confirm copies
  await p.evaluate(() => { ['matrix_selfharm','matrix_neglect','matrix_vulnerability','matrix_absconding'].forEach(i => document.getElementById(i).value='Low'); comp_violence_level.value='Low'; comp_risk_rationale.value='test'; generateNotes(); });
  await p.evaluate(() => copyGeneratedNote());
  await check('Copy opens confirmation when flags exist', await modalOpen());
  await check('Modal button says "Copy anyway"', (await p.$eval('#modal-confirm-btn', e => e.textContent)) === 'Copy anyway');
  await p.evaluate(() => document.getElementById('modal-confirm-btn').click());
  await check('Confirming completes the copy', (await p.$eval('#toast-msg', e => e.textContent)).includes('copied') && !(await modalOpen()));
  await p.evaluate(() => { window.print = () => { window.__printed = true; }; printFormalReport(); });
  await check('Print also gated', await modalOpen() && (await p.$eval('#modal-confirm-btn', e => e.textContent)) === 'Print anyway');
  await p.evaluate(() => document.getElementById('modal-confirm-btn').click());
  await check('Confirming prints', await p.evaluate(() => window.__printed === true));
  await p.evaluate(() => { confirmClearForm(); });
  await check('Clear modal label restored to "Confirm"', (await p.$eval('#modal-confirm-btn', e => e.textContent)) === 'Confirm');
  await p.evaluate(() => document.getElementById('modal-confirm-btn').click());

  // --- RAPID rules
  await reset('rapid');
  await click('#rapid-risk-chips span', ['No current suicidal thoughts', 'Intent', 'Weapon access', 'Self-neglect']);
  await click('#rapid-psy-chips span', ['Hallucinations']); await click('#rapid-mse-chips span', ['No hallucination', 'Mood euthymic', 'Mood depressed']);
  await set({ rapid_risk_suicide: 'Low', rapid_risk_violence: 'Low', rapid_risk_neglect: 'Low' });
  f = await flags();
  await check('R: 6 expected flags', f.length === 6, f.length);
  await set({ rapid_risk_suicide: 'High / Imminent' }); await click('#rapid-plan-chips span', ['Outpatient management']); f = await flags();
  await check('R: High + outpatient flagged', f.some(x => /HIGH\/IMMINENT/.test(x)));
  // --- FOLLOW-UP
  await reset('followup'); await click('#fu-risk-chips span', ['No suicidal thoughts', 'Suicidal ideation']); f = await flags();
  await check('FU: No-SI + SI flagged', f.length === 1);
  // --- No false positives on clean, consistent entries
  await reset('rapid'); await click('#rapid-risk-chips span', ['Passive death wish']); await set({ rapid_risk_suicide: 'Low' });
  await check('No flag for passive death wish rated Low (legitimate)', (await flags()).length === 0);
  await check('No JS errors', errs.length === 0, JSON.stringify(errs));
  
  } finally { await b.close(); }
});
