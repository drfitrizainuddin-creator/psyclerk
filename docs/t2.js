const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/^https?:/, r => r.abort());
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(300);
  const out = () => p.$eval('#output-textarea', e => e.value);
  const lines = (o, re) => o.split('\n').filter(l => re.test(l)).join('\n');
  const click = (sel, names) => p.evaluate(([sel, names]) => [...document.querySelectorAll(sel)].filter(s => names.includes(s.textContent.trim())).forEach(s => s.click()), [sel, names]);
  const toast = () => p.$eval('#toast-msg', e => e.textContent);
  const check = (name, ok) => console.log((ok ? 'PASS ' : 'FAIL ') + name);

  // Blank form, every mode: no fabricated normals
  for (const m of ['rapid','comprehensive','followup']) {
    await p.evaluate(m => switchTemplateMode(m), m); const o = await out();
    const bad = ['NKDA','Within normal limits','BMI normal','Family support, future plans','Grossly intact','Standard safety precautions','Confirmed intact','reasons for living','Euthymic','Well groomed','Sensorium was','Low Risk','[ LOW ]','Male'].filter(x => o.includes(x));
    check(`${m}: blank form has no assumed-normal text ${bad.length ? JSON.stringify(bad) : ''}`, !bad.length);
    check(`${m}: INCOMPLETE banner on blank form`, o.startsWith('*** INCOMPLETE'));
  }
  // T1 retest
  await p.evaluate(() => switchTemplateMode('comprehensive'));
  await click('#comp-suicide-chips span', ['Suicidal ideation','Plan','Intent']);
  await p.evaluate(() => prefillNoSuicideRisk());
  let o = await out(); console.log(lines(o, /Ideation & Ind|Protective Factors  /));
  check('T1: quick-fill no longer leaves SI/plan behind', !/Ideation.*(Suicidal ideation|Plan)/.test(o));
  check('T1: quick-fill no longer invents protective factors', /Protective Factors     : \[NOT ASSESSED\]/.test(o));
  // copy blocked when incomplete
  await p.evaluate(() => copyGeneratedNote()); console.log('  toast:', await toast());
  check('Copy blocked while risk incomplete', (await toast()).startsWith('Incomplete'));
  // T2 sample case
  await p.evaluate(() => loadSampleCase()); o = await out();
  console.log(lines(o, /Ideation & Ind|Risk Factors Id|Basis for Judgement|Primary Diag|NRIC/));
  check('T2: sample has no Intent/Plan', !/Ideation.*(Intent|Plan)/.test(o));
  check('T2: sample risk factors present', /Risk Factors Identified: Current depression, Recent loss/.test(o));
  check('T2: sample is complete (no banner)', !o.startsWith('*** INCOMPLETE'));
  await p.evaluate(() => copyGeneratedNote()); check('Copy allowed when complete', !(await toast()).startsWith('Incomplete'));
  // Fix 5: single-select toggles reach the note
  await click('#comp-sub-withdrawal span', ['Yes']); await p.waitForTimeout(300); o = await out();
  check('Withdrawal toggle appears in note', /Withdrawal\/complications: Yes/.test(o));
  await p.evaluate(() => switchTemplateMode('rapid'));
  await click('#rapid-dep-impair span', ['Severe']); await click('#rapid-mania-prev span', ['Yes']); await p.waitForTimeout(300); o = await out();
  console.log(lines(o, /Depression Screen|Mania \/ Hyp/));
  check('Impairment + previous-episode toggles appear', /Impairment: Severe/.test(o) && /Previous episodes: Yes/.test(o));
  // T3 retest: Clear
  await click('#rapid-psy-chips span, #rapid-risk-chips span', ['Command hallucination','Plan','Weapon access']);
  await p.evaluate(() => { document.getElementById('rapid_risk_suicide').value = 'High / Imminent'; document.getElementById('rapid_risk_rationale').value='x'; });
  await p.evaluate(() => { confirmClearForm(); document.getElementById('modal-confirm-btn').click(); });
  o = await out(); console.log(lines(o, /Psychosis Screen|Positive Risk|Suicide \/ Self|Impairment|Previous ep|Basis/));
  check('T3: Clear wipes risk chips, dropdowns, toggles, rationale', !/Command hallucination|Weapon access|HIGH|Impairment:|Previous episodes/.test(o) && /Basis for Judgement     : \[NOT ASSESSED\]/.test(o));
  // Print escaping
  await p.evaluate(() => loadSampleCase());
  await p.evaluate(() => { document.getElementById('comp_vitals_bp').value = 'BP <90/60 & HR >110'; generateNotes(); window.print = () => {}; printFormalReport(); });
  const pr = await p.$eval('#print-report-container pre', e => e.textContent);
  check('Print keeps "<" text intact', pr.includes('BP <90/60 & HR >110'));
  check('No JS errors', errs.length === 0); if (errs.length) console.log(errs);
  await b.close();
})();
