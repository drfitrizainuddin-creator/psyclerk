const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/^https?:/, r => r.abort());
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(300);
  const out = () => p.$eval('#output-textarea', e => e.value);
  const flags = () => p.evaluate(() => getConsistencyFlags());
  const click = (sel, names) => p.evaluate(([sel, names]) => [...document.querySelectorAll(sel)].filter(s => names.includes(s.textContent.trim())).forEach(s => s.click()), [sel, names]);
  const set = (o) => p.evaluate(o => { for (const [k, v] of Object.entries(o)) document.getElementById(k).value = v; generateNotes(); }, o);
  const reset = async (m) => { await p.evaluate(() => { confirmClearForm(); document.getElementById('modal-confirm-btn').click(); }); await p.evaluate(m => switchTemplateMode(m), m); };
  const check = (n, ok, extra='') => console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok ? '' : '  ' + extra));
  const modalOpen = () => p.evaluate(() => !document.getElementById('custom-modal').classList.contains('hidden'));

  // --- MERGE
  await p.evaluate(() => loadSampleCase());
  check('Sample case raises zero flags', (await flags()).length === 0, JSON.stringify(await flags()));
  await set({ comp_suicide_level: 'High', comp_violence_level: 'Moderate' }); let o = await out();
  const m = await p.evaluate(() => [matrix_suicide.value, matrix_violence.value, matrix_suicide.disabled]);
  check('Matrix mirrors C and L and is locked', m[0]==='High' && m[1]==='Moderate' && m[2]===true, JSON.stringify(m));
  check('Note X section matches C and L', /1\. Suicide\s+: \[ HIGH \]/.test(o) && /3\. Violence\s+: \[ MODERATE \]/.test(o) && /Stratified Suicide Risk: \[ HIGH \]/.test(o));
  await reset('comprehensive'); o = await out();
  check('Matrix suicide/violence no longer listed as separate required items', !/Matrix: suicide|Matrix: violence/.test(o) && /Suicide \(C\) risk not rated/.test(o));

  // --- COMPREHENSIVE rules
  await reset('comprehensive');
  await click('#comp-suicide-chips span', ['No suicidal thoughts', 'Plan']); await set({ comp_suicide_level: 'Low' });
  let f = await flags(); console.log('  comp flags:', f);
  check('C: No-SI + Plan clash flagged', f.some(x => /No suicidal thoughts.*Plan/.test(x)));
  check('C: Plan + LOW flagged', f.some(x => /rated LOW despite: Plan/.test(x)));
  check('Panel visible with count', await p.evaluate(() => getComputedStyle(document.getElementById('consistency-panel')).display !== 'none' && document.getElementById('consistency-count').textContent === String(getConsistencyFlags().length)));
  check('Flags never appear inside the note text', !(await out()).includes('both selected') && !(await out()).includes('despite'));
  await click('#comp-psych-chips span', ['Command hallucination', 'Persecutory delusion']); await click('#full-mse-thought-chips span', ['No hallucination', 'No delusion']); await set({ comp_violence_level: 'Low' });
  f = await flags();
  check('C: command hallucination + both LOW flagged', f.some(x => /Command hallucinations/.test(x)));
  check('C: history vs MSE hallucination/delusion flagged', f.some(x => /section G.*No hallucination/.test(x)) && f.some(x => /section G.*No delusion/.test(x)));
  await click('#comp-mgmt-chips span', ['Outpatient management']); await set({ comp_suicide_level: 'Imminent' });
  f = await flags(); check('C: Imminent + outpatient flagged', f.some(x => /HIGH\/IMMINENT with outpatient/.test(x)));
  await click('#comp-mgmt-chips span', ['Psychiatric admission']); f = await flags();
  check('C: flag clears once admission selected', !f.some(x => /HIGH\/IMMINENT with outpatient/.test(x)));
  await click('#comp-sub-withdrawal span', ['Yes']); await set({ matrix_substance_harm: 'Low' }); f = await flags();
  check('C: withdrawal YES + substance harm LOW flagged', f.some(x => /Withdrawal/.test(x)));

  // --- GATE: complete the note, leave flags → copy asks, confirm copies
  await p.evaluate(() => { ['matrix_selfharm','matrix_neglect','matrix_vulnerability','matrix_absconding'].forEach(i => document.getElementById(i).value='Low'); comp_violence_level.value='Low'; comp_risk_rationale.value='test'; generateNotes(); });
  await p.evaluate(() => copyGeneratedNote());
  check('Copy opens confirmation when flags exist', await modalOpen());
  check('Modal button says "Copy anyway"', (await p.$eval('#modal-confirm-btn', e => e.textContent)) === 'Copy anyway');
  await p.evaluate(() => document.getElementById('modal-confirm-btn').click());
  check('Confirming completes the copy', (await p.$eval('#toast-msg', e => e.textContent)).includes('copied') && !(await modalOpen()));
  await p.evaluate(() => { window.print = () => { window.__printed = true; }; printFormalReport(); });
  check('Print also gated', await modalOpen() && (await p.$eval('#modal-confirm-btn', e => e.textContent)) === 'Print anyway');
  await p.evaluate(() => document.getElementById('modal-confirm-btn').click());
  check('Confirming prints', await p.evaluate(() => window.__printed === true));
  await p.evaluate(() => { confirmClearForm(); });
  check('Clear modal label restored to "Confirm"', (await p.$eval('#modal-confirm-btn', e => e.textContent)) === 'Confirm');
  await p.evaluate(() => document.getElementById('modal-confirm-btn').click());

  // --- RAPID rules
  await reset('rapid');
  await click('#rapid-risk-chips span', ['No current suicidal thoughts', 'Intent', 'Weapon access', 'Self-neglect']);
  await click('#rapid-psy-chips span', ['Hallucinations']); await click('#rapid-mse-chips span', ['No hallucination', 'Mood euthymic', 'Mood depressed']);
  await set({ rapid_risk_suicide: 'Low', rapid_risk_violence: 'Low', rapid_risk_neglect: 'Low' });
  f = await flags(); console.log('  rapid flags:', f);
  check('R: 6 expected flags', f.length === 6, f.length);
  await set({ rapid_risk_suicide: 'High / Imminent' }); await click('#rapid-plan-chips span', ['Outpatient management']); f = await flags();
  check('R: High + outpatient flagged', f.some(x => /HIGH\/IMMINENT/.test(x)));
  // --- FOLLOW-UP
  await reset('followup'); await click('#fu-risk-chips span', ['No suicidal thoughts', 'Suicidal ideation']); f = await flags();
  check('FU: No-SI + SI flagged', f.length === 1);
  // --- No false positives on clean, consistent entries
  await reset('rapid'); await click('#rapid-risk-chips span', ['Passive death wish']); await set({ rapid_risk_suicide: 'Low' });
  check('No flag for passive death wish rated Low (legitimate)', (await flags()).length === 0);
  check('No JS errors', errs.length === 0, JSON.stringify(errs));
  await b.close();
})();
