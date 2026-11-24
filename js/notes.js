    // State management
    let currentMode = 'comprehensive'; // 'rapid', 'comprehensive', 'followup'
    let currentFormat = 'emr';          // 'emr', 'report', 'letter'

    // Initialize datetime default on page load
    window.addEventListener('DOMContentLoaded', () => {
      const now = new Date();
      const formatted = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + 
                        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dtInput = document.getElementById('encounter_datetime');
      if (dtInput) dtInput.value = formatted;
      
      // Initial render
      generateNotes();
    });

    // Chip toggle utility
    function toggleChip(el) {
      el.classList.toggle('active');
      triggerLiveUpdate();
    }

    // Select single chip in button group
    function selectSingleChip(el) {
      const parent = el.parentElement;
      parent.querySelectorAll('.chip-toggle').forEach(chip => chip.classList.remove('active'));
      el.classList.add('active');
      triggerLiveUpdate();
    }

    // Helper: collect active chips from container
    function getActiveChips(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return [];
      return Array.from(container.querySelectorAll('.active')).map(el => el.textContent.trim());
    }

    // Toast notification
    function showToast(msg, icon = 'fa-circle-check', isError = false) {
      const toast = document.getElementById('toast');
      const toastMsg = document.getElementById('toast-msg');
      const toastIcon = document.getElementById('toast-icon');
      
      toastMsg.textContent = msg;
      toastIcon.className = `fa-solid ${icon} ${isError ? 'text-rose-400' : 'text-emerald-400'} text-sm`;
      
      toast.classList.remove('translate-y-20', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
      
      setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
      }, 2500);
    }

    // Custom safe modal helpers
    function openCustomModal(title, desc, onConfirm, confirmLabel = 'Confirm') {
      document.getElementById('modal-title').textContent = title;
      const d = document.getElementById('modal-desc'); d.textContent = desc; d.style.whiteSpace = 'pre-line';
      const confirmBtn = document.getElementById('modal-confirm-btn');
      confirmBtn.textContent = confirmLabel;
      confirmBtn.onclick = () => {
        onConfirm();
        closeCustomModal();
      };
      document.getElementById('custom-modal').classList.remove('hidden');
    }

    function closeCustomModal() {
      document.getElementById('custom-modal').classList.add('hidden');
    }

    // Switch between Part 1 (Rapid), Part 2 (Comprehensive), Part 3 (Follow-up)
    function switchTemplateMode(mode) {
      currentMode = mode;
      
      const modes = ['rapid', 'comprehensive', 'followup'];
      modes.forEach(m => {
        const tabBtn = document.getElementById(`tab-${m}`);
        const viewEl = document.getElementById(`view-${m}`);

        if (m === mode) {
          if (tabBtn) tabBtn.className = 'px-3 sm:px-4 py-1.5 rounded-lg transition-all bg-white text-sky-700 shadow-sm flex items-center gap-1.5';
          if (viewEl) viewEl.classList.remove('hidden');
        } else {
          if (tabBtn) tabBtn.className = 'px-3 sm:px-4 py-1.5 rounded-lg transition-all text-slate-600 hover:text-slate-900 flex items-center gap-1.5';
          if (viewEl) viewEl.classList.add('hidden');
        }
      });

      const badge = document.getElementById('active-mode-badge');
      if (mode === 'rapid') {
        badge.textContent = 'Part 1: Rapid Checklist';
        badge.className = 'text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200';
      } else if (mode === 'comprehensive') {
        badge.textContent = 'Part 2: Comprehensive Clerking';
        badge.className = 'text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-sky-100 text-sky-800 border border-sky-200';
      } else {
        badge.textContent = 'Part 3: Follow-Up Review';
        badge.className = 'text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200';
      }

      generateNotes();
    }

    // Switch Documentation Format (EMR Note, Full Clerking, Clinic Letter)
    function setDocFormat(format) {
      currentFormat = format;
      const formats = ['emr', 'report', 'letter'];
      formats.forEach(f => {
        const btn = document.getElementById(`format-${f}`);
        if (f === format) {
          btn.className = 'py-1.5 px-2 rounded-lg bg-white text-sky-700 shadow-sm transition flex items-center justify-center gap-1';
        } else {
          btn.className = 'py-1.5 px-2 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center gap-1';
        }
      });
      generateNotes();
    }

    // Core Engine: Formulate output note based on mode and selected format
    function generateNotes() {
      const NA = '[NOT ASSESSED]', NR = '[NOT RECORDED]';
      const name = document.getElementById('pt_name').value.trim() || NR;
      const mrn = document.getElementById('pt_mrn').value.trim() || NR;
      const nric = document.getElementById('pt_nric').value.trim() || NR;
      const age = document.getElementById('pt_age').value.trim() || NR;
      const gender = document.getElementById('pt_gender').value;
      const marital = document.getElementById('pt_marital').value;
      const occ = document.getElementById('pt_occupation').value.trim() || NR;
      const dt = document.getElementById('encounter_datetime').value;
      const loc = document.getElementById('encounter_location').value;
      const referral = document.getElementById('encounter_referral').value.trim() || NR;
      const informant = document.getElementById('encounter_informant').value.trim() || NR;
      const reliability = document.getElementById('encounter_reliability').value;
      const clinician = document.getElementById('clinician_name').value.trim() || NA;

      let output = '';

      if (currentMode === 'rapid') {
        // =========================================================================
        // PART 1: RAPID ADULT PSYCHIATRY CLERKING NOTE GENERATOR
        // =========================================================================
        const pc = document.getElementById('rapid_pc').value.trim() || NA;
        const course = getActiveChips('rapid-course-chips').join(', ') || NA;
        const precipitant = document.getElementById('rapid_precipitant').value.trim() || NA;
        const depChips = getActiveChips('rapid-dep-chips').join(', ') || NA;
        const depDetails = document.getElementById('rapid_dep_details').value.trim();
        const maniaChips = getActiveChips('rapid-mania-chips').join(', ') || NA;
        const maniaDetails = document.getElementById('rapid_mania_details').value.trim();
        const anxChips = getActiveChips('rapid-anx-chips').join(', ') || NA;
        const anxDetails = document.getElementById('rapid_anx_details').value.trim();
        const psyChips = getActiveChips('rapid-psy-chips').join(', ') || NA;
        const psyDetails = document.getElementById('rapid_psy_details').value.trim();
        const ocdChips = getActiveChips('rapid-ocd-chips').join(', ') || NA;
        const traumaChips = getActiveChips('rapid-trauma-chips').join(', ') || NA;
        const adhdChips = getActiveChips('rapid-adhd-chips').join(', ') || NA;
        const subChips = getActiveChips('rapid-substance-chips').join(', ') || NA;
        const subDetails = document.getElementById('rapid_substance_details').value.trim();
        const riskChips = getActiveChips('rapid-risk-chips').join(', ') || NA;
        const riskSuicide = document.getElementById('rapid_risk_suicide').value;
        const riskViolence = document.getElementById('rapid_risk_violence').value;
        const riskNeglect = document.getElementById('rapid_risk_neglect').value;
        const depImpair = getActiveChips('rapid-dep-impair').join('');
        const maniaPrev = getActiveChips('rapid-mania-prev').join('');
        const rapidRationale = document.getElementById('rapid_risk_rationale').value.trim() || NA;
        const riskProtective = document.getElementById('rapid_risk_protective').value.trim() || NA;
        const pastHx = document.getElementById('rapid_past_hx').value.trim() || NA;
        const socialHx = document.getElementById('rapid_social_hx').value.trim() || NA;
        const mseChips = getActiveChips('rapid-mse-chips').join(', ') || NA;
        const mseDetails = document.getElementById('rapid_mse_details').value.trim();
        const dx = document.getElementById('rapid_dx').value.trim() || NA;
        const planChips = getActiveChips('rapid-plan-chips').join(', ') || NA;
        const planText = document.getElementById('rapid_plan_text').value.trim() || NA;

        if (currentFormat === 'emr' || currentFormat === 'report') {
          output = `===============================================================
RAPID ADULT PSYCHIATRY CLERKING CHECKLIST (PART 1)
===============================================================
Date / Time   : ${dt}
Location      : ${loc}
Clinician     : ${clinician}

PATIENT DEMOGRAPHICS:
Name          : ${name}
MRN / ID      : ${mrn} | NRIC: ${nric}
Age / Sex     : ${age} y/o | ${gender} | Marital: ${marital} | Occ: ${occ}
Informant     : ${informant} (${reliability} reliability) | Referral: ${referral}

1. PRESENTING PROBLEM & TIMELINE
- Presenting Complaint(s) : ${pc}
- Course & Evolution      : ${course}
- Precipitant / Stressor  : ${precipitant}

2. CORE SYMPTOM SCREEN (8 DOMAINS)
- Depression Screen       : ${depChips}${depImpair ? ' [Impairment: ' + depImpair + ']' : ''} ${depDetails ? '(' + depDetails + ')' : ''}
- Mania / Hypomania       : ${maniaChips}${maniaPrev ? ' [Previous episodes: ' + maniaPrev + ']' : ''} ${maniaDetails ? '(' + maniaDetails + ')' : ''}
- Anxiety / Panic         : ${anxChips} ${anxDetails ? '(' + anxDetails + ')' : ''}
- Psychosis Screen        : ${psyChips} ${psyDetails ? '(' + psyDetails + ')' : ''}
- OCD Screen              : ${ocdChips}
- Trauma / PTSD Screen    : ${traumaChips}
- ADHD / Neurodevelopment : ${adhdChips}
- Substance Use Screen    : ${subChips} ${subDetails ? '— ' + subDetails : ''}

3. RISK SCREEN & STRATIFICATION
- Positive Risk Flags     : ${riskChips}
- Suicide / Self-Harm     : [ ${riskSuicide.toUpperCase()} ]
- Violence to Others      : [ ${riskViolence.toUpperCase()} ]
- Self-Neglect/Vulnerab.  : [ ${riskNeglect.toUpperCase()} ]
- Protective Factors      : ${riskProtective}
- Basis for Judgement     : ${rapidRationale}

4. RELEVANT BACKGROUND
- Psychiatric & Medical   : ${pastHx}
- Family, Social & Legal  : ${socialHx}

5. MENTAL STATE EXAMINATION (RAPID)
${mseChips}
${mseDetails ? 'Details: ' + mseDetails : ''}

6. IMPRESSION & MANAGEMENT PLAN
- Working Diagnosis / Diff: ${dx}
- Plan Actions            : ${planChips}
- Treatment & Regimen     :
${planText}

Signed: ${clinician}
===============================================================`;
        } else {
          // Clinic letter format
          output = `RAPID PSYCHIATRIC CONSULTATION SUMMARY

Date: ${dt}
To: Attending Primary Care / Referring Team
Re: ${name} (MRN: ${mrn}, Age: ${age}, ${gender})

CLINICAL REASON FOR ENCOUNTER:
${name} presented to ${loc} with ${pc}. Timeline is characterized as ${course}, following stressors: ${precipitant}.

SYMPTOM SCREEN:
- Affective: ${depChips}${depImpair ? ' [Impairment: ' + depImpair + ']' : ''}. Mania screen: ${maniaChips}${maniaPrev ? ' [Previous episodes: ' + maniaPrev + ']' : ''}.
- Anxiety & Psychosis: ${anxChips}. Psychotic symptoms: ${psyChips}.
- Substances & Trauma: ${subChips}. ${traumaChips}.

RISK STRATIFICATION:
- Suicide / Self-Harm Risk: ${riskSuicide.toUpperCase()}
- Violence / Aggression: ${riskViolence.toUpperCase()}
- Self-Neglect: ${riskNeglect.toUpperCase()}
Protective factors: ${riskProtective}.
Basis for judgement: ${rapidRationale}

MENTAL STATE SUMMARY:
Findings: ${mseChips}. ${mseDetails}

WORKING IMPRESSION & RECOMMENDATIONS:
Diagnosis: ${dx}
Plan: ${planChips}. ${planText}

Sincerely,
${clinician}`;
        }

      } else if (currentMode === 'comprehensive') {
        // =========================================================================
        // PART 2: COMPREHENSIVE ADULT PSYCHIATRY CLERKING GENERATOR (A-Z)
        // =========================================================================
        const pc = document.getElementById('comp_pc').value.trim() || NA;
        const course = getActiveChips('comp-course-chips').join(', ') || NA;
        const precipitants = getActiveChips('comp-precipitant-chips').join(', ') || NA;
        const hpi = document.getElementById('comp_hpi_narrative').value.trim() || NA;
        
        const depDuration = document.getElementById('comp_dep_duration').value.trim();
        const depChips = getActiveChips('comp-dep-chips').join(', ') || NA;
        const suicideChips = getActiveChips('comp-suicide-chips').join(', ') || NA;
        const suicideDetails = document.getElementById('comp_suicide_details').value.trim();
        const suicideRF = getActiveChips('comp-suicide-rf-chips').join(', ') || NA;
        const suicideProt = getActiveChips('comp-suicide-prot-chips').join(', ') || NA;
        const suicideLevel = document.getElementById('comp_suicide_level').value;

        const maniaChips = getActiveChips('comp-mania-chips').join(', ') || NA;
        const maniaNotes = document.getElementById('comp_mania_notes').value.trim();
        const anxChips = getActiveChips('comp-anx-chips').join(', ') || NA;
        const anxNotes = document.getElementById('comp_anx_notes').value.trim();
        const ocdObs = getActiveChips('comp-ocd-obs-chips').join(', ') || NA;
        const ocdComp = getActiveChips('comp-ocd-comp-chips').join(', ') || NA;
        const ocdNotes = document.getElementById('comp_ocd_notes').value.trim();

        const psychChips = getActiveChips('comp-psych-chips').join(', ') || NA;
        const psychNotes = document.getElementById('comp_psych_notes').value.trim();
        const traumaChips = getActiveChips('comp-trauma-chips').join(', ') || NA;
        const traumaNotes = document.getElementById('comp_trauma_notes').value.trim();
        const adhdInatt = getActiveChips('comp-adhd-inatt-chips').join(', ') || NA;
        const adhdHyp = getActiveChips('comp-adhd-hyp-chips').join(', ') || NA;
        const adhdImpact = getActiveChips('comp-adhd-impact-chips').join(', ') || NA;
        const adhdNotes = document.getElementById('comp_adhd_notes').value.trim();
        const eatingChips = getActiveChips('comp-eating-chips').join(', ') || NA;
        const eatingDetails = document.getElementById('comp_eating_details').value.trim();

        const subChips = getActiveChips('comp-substance-chips').join(', ') || NA;
        const subDetails = document.getElementById('comp_substance_details').value.trim();
        const subWithdrawal = getActiveChips('comp-sub-withdrawal').join('');
        const compRationale = document.getElementById('comp_risk_rationale').value.trim() || NA;
        const violenceChips = getActiveChips('comp-violence-chips').join(', ') || NA;
        const violenceLevel = document.getElementById('comp_violence_level').value;
        const violenceDetails = document.getElementById('comp_violence_details').value.trim();

        const pastDx = getActiveChips('comp-past-dx-chips').join(', ') || NA;
        const pastPsych = document.getElementById('comp_past_psych').value.trim() || NA;
        const medHxChips = getActiveChips('comp-med-hx-chips').join(', ') || NA;
        const medHx = document.getElementById('comp_medical_hx').value.trim() || NA;
        const famChips = getActiveChips('comp-fam-chips').join(', ') || NA;
        const famDetails = document.getElementById('comp_family_details').value.trim();
        const devChips = getActiveChips('comp-dev-chips').join(', ') || NA;
        const devDetails = document.getElementById('comp_personal_details').value.trim();
        const socialHx = document.getElementById('comp_social_hx').value.trim() || NA;
        const personality = getActiveChips('comp-personality-chips').join(', ') || NA;
        const forensicDetails = document.getElementById('comp_forensic_details').value.trim();

        // MSE
        const mseApp = getActiveChips('full-mse-app-chips').join(', ') || NA;
        const mseSpeech = getActiveChips('full-mse-speech-chips').join(', ') || NA;
        const mseSubj = document.getElementById('full_mse_subj_mood').value.trim() || NA;
        const mseMood = getActiveChips('full-mse-mood-chips').join(', ') || NA;
        const mseThought = getActiveChips('full-mse-thought-chips').join(', ') || NA;
        const mseInsight = getActiveChips('full-mse-insight-chips').join(', ') || NA;
        const mseNotes = document.getElementById('full_mse_notes').value.trim();

        // Vitals, 4Ps, Diagnoses, Matrix
        const vitalsBp = document.getElementById('comp_vitals_bp').value.trim();
        const vitalsBmi = document.getElementById('comp_vitals_bmi').value.trim();
        const psychometrics = document.getElementById('comp_psychometrics').value.trim();

        const fPredisposing = document.getElementById('form_predisposing').value.trim() || NA;
        const fPrecipitating = document.getElementById('form_precipitating').value.trim() || NA;
        const fPerpetuating = document.getElementById('form_perpetuating').value.trim() || NA;
        const fProtective = document.getElementById('form_protective').value.trim() || NA;

        const primaryDx = document.getElementById('comp_primary_dx').value.trim() || NA;
        const diffDx = document.getElementById('comp_diff_dx').value.trim() || NA;

        // Single source of truth: matrix rows 1 & 3 mirror sections C and L
        document.getElementById('matrix_suicide').value = suicideLevel;
        document.getElementById('matrix_violence').value = violenceLevel;
        const mSuicide = suicideLevel;
        const mSelfharm = document.getElementById('matrix_selfharm').value;
        const mViolence = violenceLevel;
        const mNeglect = document.getElementById('matrix_neglect').value;
        const mVuln = document.getElementById('matrix_vulnerability').value;
        const mAbscond = document.getElementById('matrix_absconding').value;
        const mSubHarm = document.getElementById('matrix_substance_harm').value;
        const mImmediate = document.getElementById('matrix_immediate_action').value.trim();

        const mgmtChips = getActiveChips('comp-mgmt-chips').join(', ') || NA;
        const rxPlan = document.getElementById('comp_rx_plan').value.trim() || NA;
        const psychoPlan = document.getElementById('comp_psycho_plan').value.trim() || NA;

        if (currentFormat === 'emr') {
          output = `===============================================================
COMPREHENSIVE ADULT PSYCHIATRIC ASSESSMENT & CLERKING
===============================================================
ENCOUNTER & DEMOGRAPHICS:
Date / Time    : ${dt}
Location       : ${loc}
Clinician      : ${clinician}
Patient Name   : ${name}
MRN / NRIC     : ${mrn} / ${nric}
Age / Sex      : ${age} y/o | ${gender} | Marital: ${marital} | Occ: ${occ}
Informant      : ${informant} (${reliability} reliability) | Referral: ${referral}

---------------------------------------------------------------
A. PRESENTING COMPLAINT(S) & HPI
---------------------------------------------------------------
Presenting Complaint(s): ${pc}
Course & Evolution     : ${course}
Identified Precipitants: ${precipitants}

History of Presenting Illness:
${hpi}

---------------------------------------------------------------
B. DEPRESSIVE SYMPTOMS
---------------------------------------------------------------
${depChips}
${depDuration ? 'Duration / Impairment: ' + depDuration : ''}

---------------------------------------------------------------
C. SUICIDE & SELF-HARM ASSESSMENT
---------------------------------------------------------------
Ideation & Indicators  : ${suicideChips}
Details                : ${suicideDetails || NA}
Risk Factors Identified: ${suicideRF}
Protective Factors     : ${suicideProt}
Stratified Suicide Risk: [ ${suicideLevel.toUpperCase()} ]

---------------------------------------------------------------
D-F. MANIA, ANXIETY / PANIC & OCD
---------------------------------------------------------------
- Mania / Hypomania    : ${maniaChips} ${maniaNotes ? '(' + maniaNotes + ')' : ''}
- Anxiety / Panic      : ${anxChips} ${anxNotes ? '(' + anxNotes + ')' : ''}
- OCD Obsessions       : ${ocdObs}
- OCD Compulsions      : ${ocdComp} ${ocdNotes ? '(' + ocdNotes + ')' : ''}

---------------------------------------------------------------
G-J. PSYCHOSIS, TRAUMA, ADHD & EATING
---------------------------------------------------------------
- Psychosis Symptoms   : ${psychChips} ${psychNotes ? '(' + psychNotes + ')' : ''}
- Trauma / PTSD        : ${traumaChips} ${traumaNotes ? '(' + traumaNotes + ')' : ''}
- ADHD (Inattention)   : ${adhdInatt}
- ADHD (Hyperactivity) : ${adhdHyp}
- ADHD Impact/Criteria : ${adhdImpact} ${adhdNotes ? '(' + adhdNotes + ')' : ''}
- Eating Symptoms      : ${eatingChips} ${eatingDetails ? '(' + eatingDetails + ')' : ''}

---------------------------------------------------------------
K-L. SUBSTANCE USE & VIOLENCE RISK
---------------------------------------------------------------
- Substance History    : ${subChips}${subWithdrawal ? ' [Withdrawal/complications: ' + subWithdrawal + ']' : ''} ${subDetails ? '— ' + subDetails : ''}
- Violence Indicators  : ${violenceChips} ${violenceDetails ? '(' + violenceDetails + ')' : ''}
- Stratified Violence  : [ ${violenceLevel.toUpperCase()} ]

---------------------------------------------------------------
M-R. PAST HISTORY, FAMILY, PERSONAL, SOCIAL & FORENSIC
---------------------------------------------------------------
- Past Psych Diagnoses : ${pastDx}
- Treatment / Adm Hx   : ${pastPsych}
- Medical / Surgical   : ${medHxChips} | ${medHx}
- Family History       : ${famChips} ${famDetails ? '(' + famDetails + ')' : ''}
- Personal/Development : ${devChips} ${devDetails ? '(' + devDetails + ')' : ''}
- Social & Occupational: ${socialHx}
- Premorbid Traits     : ${personality} ${forensicDetails ? '(' + forensicDetails + ')' : ''}

---------------------------------------------------------------
S. MENTAL STATE EXAMINATION (MSE)
---------------------------------------------------------------
1. Appearance/Behaviour: ${mseApp}
2. Psychomotor & Speech: ${mseSpeech}
3. Subjective Mood     : "${mseSubj}"
   Objective Affect    : ${mseMood}
4. Thought Form/Content: ${mseThought}
5. Sensorium/Cognition : ${mseInsight}
${mseNotes ? 'MSE Notes: ' + mseNotes : ''}

---------------------------------------------------------------
T. VITALS & PSYCHOMETRIC MONITORING
---------------------------------------------------------------
Vitals: ${vitalsBp || NA} | ${vitalsBmi || NA}
Scales: ${psychometrics || NA}

---------------------------------------------------------------
V. BIOPSYCHOSOCIAL FORMULATION (4Ps)
---------------------------------------------------------------
[PREDISPOSING]  : ${fPredisposing}
[PRECIPITATING] : ${fPrecipitating}
[PERPETUATING]  : ${fPerpetuating}
[PROTECTIVE]    : ${fProtective}

---------------------------------------------------------------
W. DIAGNOSTIC IMPRESSION
---------------------------------------------------------------
Primary Diagnosis   : ${primaryDx}
Differential / Comor: ${diffDx}

---------------------------------------------------------------
X. RISK ASSESSMENT SUMMARY (7 DOMAINS)
---------------------------------------------------------------
1. Suicide          : [ ${mSuicide.toUpperCase()} ]
2. Self-Harm        : [ ${mSelfharm.toUpperCase()} ]
3. Violence         : [ ${mViolence.toUpperCase()} ]
4. Self-Neglect     : [ ${mNeglect.toUpperCase()} ]
5. Vulnerability    : [ ${mVuln.toUpperCase()} ]
6. Absconding       : [ ${mAbscond.toUpperCase()} ]
7. Substance Harm   : [ ${mSubHarm.toUpperCase()} ]
Immediate Risk Plan : ${mImmediate || NA}
Basis for Judgement : ${compRationale}

---------------------------------------------------------------
Y. COMPREHENSIVE MANAGEMENT PLAN
---------------------------------------------------------------
Plan Modalities : ${mgmtChips}
Pharmacotherapy :
${rxPlan}

Psychosocial & Safety Plan:
${psychoPlan}

Assessing Clinician: ${clinician}
===============================================================`;
        } else if (currentFormat === 'report') {
          // Full formal clinical clerking report
          output = `ADULT PSYCHIATRY CLINICAL ASSESSMENT REPORT
Department of Psychiatry • Formal Intake Clerking

PATIENT DEMOGRAPHICS:
Name     : ${name}
MRN/NRIC : ${mrn} / ${nric}
Age / Sex: ${age} years old | ${gender}
Marital  : ${marital} | Occupation: ${occ}
Date/Loc : ${dt} | ${loc}
Informant: ${informant} (${reliability} reliability)
Referral : ${referral}

1. REASON FOR REFERRAL & PRESENTING COMPLAINT:
${pc}

2. HISTORY OF PRESENTING ILLNESS:
The onset and trajectory are characterized as ${course}. Precipitating circumstances include ${precipitants}.
${hpi}

3. SYSTEMATIC PSYCHIATRIC INQUIRY:
- Affective: ${depChips}. Manic screen: ${maniaChips}.
- Anxiety & OCD: ${anxChips}. Obsessions: ${ocdObs}; Compulsions: ${ocdComp}.
- Psychosis & PTSD: ${psychChips}. Trauma screen: ${traumaChips}.
- Neurodevelopment & Eating: ${adhdInatt}, ${adhdHyp}. Eating: ${eatingChips}.
- Substance Use: ${subChips}${subWithdrawal ? ' [Withdrawal/complications: ' + subWithdrawal + ']' : ''}. ${subDetails}

4. COMPREHENSIVE RISK ASSESSMENT:
- Suicide Risk: Stratified as ${suicideLevel.toUpperCase()}. Factors: ${suicideChips}. Protective: ${suicideProt}.
- Violence Risk: Stratified as ${violenceLevel.toUpperCase()}. Features: ${violenceChips}.
- Basis for risk judgement: ${compRationale}

5. PAST BACKGROUND:
- Past Psychiatric: ${pastDx}. ${pastPsych}
- Medical / Surgical: ${medHxChips}. ${medHx}
- Family History: ${famChips}. ${famDetails}
- Personal & Social: ${devChips}. ${socialHx}. Premorbid traits: ${personality}.

6. MENTAL STATE EXAMINATION:
Patient was ${mseApp}. Speech and psychomotor: ${mseSpeech}.
Subjective mood stated as "${mseSubj}". Objective affect was ${mseMood}.
Thought processes revealed ${mseThought}. Sensorium / cognition: ${mseInsight}. ${mseNotes}

7. BIOPSYCHOSOCIAL FORMULATION (4Ps):
- Predisposing: ${fPredisposing}
- Precipitating: ${fPrecipitating}
- Perpetuating: ${fPerpetuating}
- Protective: ${fProtective}

8. DIAGNOSTIC IMPRESSION:
- Primary: ${primaryDx}
- Differential: ${diffDx}

9. MULTIMODAL MANAGEMENT PLAN:
- Disposition: ${mgmtChips}
- Biological: ${rxPlan}
- Psychosocial & Safety: ${psychoPlan}

Prepared by:
${clinician}`;
        } else {
          // Clinic consultation letter
          output = `CONFIDENTIAL PSYCHIATRIC CONSULTATION LETTER

Date: ${dt}
To: Referring Doctor / Clinical Care Team
Re: ${name} (MRN: ${mrn}, NRIC: ${nric}, Age: ${age}, Gender: ${gender})

Dear Colleague,

Thank you for referring ${name}, whom I assessed today at ${loc}.

PRESENTING COMPLAINT & HISTORY:
${name} presented with ${pc}. The course has been ${course}, triggered or compounded by ${precipitants}.
${hpi}

CLINICAL EVALUATION & RISK:
On review of systems, the patient demonstrates features of ${depChips}. Psychosis screen: ${psychChips}.
Suicide risk has been formally stratified as ${suicideLevel.toUpperCase()}, with protective factors including ${suicideProt}. Violence risk is assessed as ${violenceLevel.toUpperCase()}. Basis for these judgements: ${compRationale}

MENTAL STATE EXAMINATION:
${name} was ${mseApp}, speech was ${mseSpeech}. Subjective mood was described as "${mseSubj}", with ${mseMood}. Thought process showed ${mseThought}. Sensorium / cognition: ${mseInsight}.

IMPRESSION:
${primaryDx}
(Differentials considered: ${diffDx})

MANAGEMENT PLAN:
1. Care Setting: ${mgmtChips}
2. Pharmacotherapy: ${rxPlan}
3. Psychosocial Interventions: ${psychoPlan}

We will continue to follow up ${name} in our clinic. Please do not hesitate to contact our department if you require further discussion.

Yours sincerely,

${clinician}`;
        }

      } else {
        // =========================================================================
        // PART 3: FOLLOW-UP / REVIEW NOTE GENERATOR
        // =========================================================================
        const progress = getActiveChips('fu-progress-chips').join(', ') || NA;
        const intervalText = document.getElementById('fu_interval_text').value.trim() || NA;
        const moodChips = getActiveChips('fu-mood-chips').join(', ') || NA;
        const sympChips = getActiveChips('fu-symptom-chips').join(', ') || NA;
        const riskLevel = document.getElementById('fu_risk_suicide').value;
        const riskChips = getActiveChips('fu-risk-chips').join(', ') || NA;
        const fuRationale = document.getElementById('fu_risk_rationale').value.trim() || NA;
        const medsText = document.getElementById('fu_meds_text').value.trim() || NA;
        const sideEffects = getActiveChips('fu-side-effect-chips').join(', ') || NA;
        const planText = document.getElementById('fu_plan_text').value.trim() || NA;

        output = `===============================================================
ADULT PSYCHIATRY FOLLOW-UP / REVIEW NOTE (PART 3)
===============================================================
Date / Time   : ${dt}
Location      : ${loc}
Clinician     : ${clinician}
Patient Name  : ${name} | MRN: ${mrn} | Age: ${age} | ${gender}

1. INTERVAL PROGRESS
Clinical Course: [ ${progress.toUpperCase()} ]
Interval Notes : ${intervalText}

2. CURRENT SYMPTOMS & FUNCTION
- Affect & Sleep: ${moodChips}
- Symptom Screen: ${sympChips}

3. INTERVAL RISK RE-STRATIFICATION
- Suicide & Harm Risk : [ ${riskLevel.toUpperCase()} ]
- Active Risk Findings: ${riskChips}
- Basis for Judgement : ${fuRationale}

4. MEDICATION REVIEW & TOLERABILITY
- Current Regimen & Compliance:
  ${medsText}
- Side Effect Screen:
  ${sideEffects}

5. ASSESSMENT & UPDATED PLAN
Impression : Course consistent with ${progress.toLowerCase()}.
Management : ${planText}

Signed:
${clinician}
===============================================================`;
      }

      const gaps = getRiskGaps();
      if (gaps.length) output = '*** INCOMPLETE - NOT FOR FILING ***\nOutstanding: ' + gaps.join('; ') + '\n\n' + output;

      // Populate textarea output
      const outputTextarea = document.getElementById('output-textarea');
      outputTextarea.value = output;
      document.getElementById('char-count').textContent = output.length;
      renderConsistencyPanel();
      if (window.PsyDraftsUI) PsyDraftsUI.scheduleAutosave();
    }

    // Quick-fill: Normal MSE for Rapid Mode
    function prefillRapidNormalMSE() {
      const normalChips = ['Appearance appropriate', 'Calm/cooperative', 'Speech normal', 'Mood euthymic', 'Affect reactive/full', 'Thought goal-directed', 'No delusion', 'No hallucination', 'Cognition grossly intact', 'Insight good', 'Judgment intact'];
      document.querySelectorAll('#rapid-mse-chips .chip-toggle').forEach(el => {
        if (normalChips.includes(el.textContent.trim())) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
      document.getElementById('rapid_mse_details').value = 'Cooperative, pleasant, euthymic, no perceptual abnormalities.';
      generateNotes();
      showToast('Grossly Normal Rapid MSE loaded!');
    }

    // Quick-fill: Full Grossly Normal MSE for Comprehensive Mode
    function prefillFullNormalMSE() {
      // Appearance
      document.querySelectorAll('#full-mse-app-chips .chip-toggle').forEach(el => {
        const t = el.textContent.trim();
        if (['Well/fairly groomed', 'Calm/cooperative', 'Good eye contact', 'Rapport easily established'].includes(t)) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
      // Speech
      document.querySelectorAll('#full-mse-speech-chips .chip-toggle').forEach(el => {
        const t = el.textContent.trim();
        if (['Normal psychomotor', 'Speech normal rate/volume'].includes(t)) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
      // Mood
      document.getElementById('full_mse_subj_mood').value = 'Fine, feeling stable';
      document.querySelectorAll('#full-mse-mood-chips .chip-toggle').forEach(el => {
        const t = el.textContent.trim();
        if (['Euthymic', 'Affect reactive/full', 'Congruent'].includes(t)) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
      // Thought
      document.querySelectorAll('#full-mse-thought-chips .chip-toggle').forEach(el => {
        const t = el.textContent.trim();
        if (['Form goal-directed', 'No delusion', 'No hallucination'].includes(t)) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
      // Insight
      document.querySelectorAll('#full-mse-insight-chips .chip-toggle').forEach(el => {
        const t = el.textContent.trim();
        if (['Alert & oriented x3', 'Attention intact', 'Immediate/recent/remote memory intact', 'Insight good', 'Judgment intact'].includes(t)) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });

      generateNotes();
      showToast('Grossly Normal Comprehensive MSE loaded!');
    }

    // Quick-fill: No Suicide Risk
    function prefillNoSuicideRisk() {
      document.querySelectorAll('#comp-suicide-chips .chip-toggle').forEach(el => {
        if (el.textContent.trim() === 'No suicidal thoughts') {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
      document.querySelectorAll('#comp-suicide-rf-chips .chip-toggle').forEach(el => el.classList.remove('active'));
      document.getElementById('comp_suicide_level').value = 'Low';
      document.getElementById('comp_suicide_details').value = 'Patient strictly denies suicidal ideation, intent or preparatory acts. Strong reasons for living.';
      generateNotes();
      showToast('Low / Negative Suicide Screen applied!');
    }

    // Load Complete Realistic Sample Case (Comprehensive MDD)
    function loadSampleCase() {
      switchTemplateMode('comprehensive');

      document.getElementById('pt_name').value = 'Evelyn Lim Shu Hui';
      document.getElementById('pt_mrn').value = 'MRN-902841';
      document.getElementById('pt_nric').value = 'SAMPLE-000000';
      document.getElementById('pt_age').value = '35';
      document.getElementById('pt_gender').value = 'Female';
      document.getElementById('pt_marital').value = 'Married';
      document.getElementById('pt_occupation').value = 'Senior Architect';
      document.getElementById('encounter_location').value = 'Psychiatry Specialist Clinic';
      document.getElementById('encounter_referral').value = 'Polyclinic Family Physician';
      document.getElementById('encounter_informant').value = 'Patient accompanied by husband';
      document.getElementById('encounter_reliability').value = 'Good';
      document.getElementById('clinician_name').value = 'Dr. Julian Sterling (Senior Registrar)';

      document.getElementById('comp_pc').value = 'Pervasive low mood, severe early morning awakening, and passive death wishes for 7 weeks';

      // Course & Precipitants
      document.querySelectorAll('#comp-course-chips .chip-toggle').forEach(el => {
        if (['Subacute', 'Continuous', 'Worsening'].includes(el.textContent.trim())) el.classList.add('active');
        else el.classList.remove('active');
      });
      document.querySelectorAll('#comp-precipitant-chips .chip-toggle').forEach(el => {
        if (['Work stress', 'Family stress'].includes(el.textContent.trim())) el.classList.add('active');
        else el.classList.remove('active');
      });

      document.getElementById('comp_hpi_narrative').value = 'Patient describes a progressive 7-week decline following high-stakes architectural tender deadlines and recent parental illness. Presents with persistent dysphoria worse in the mornings, profound anhedonia towards her hobbies and family time, and severe terminal insomnia (waking at 3:30 AM unable to sleep). Appetite markedly reduced with 4.5kg unintentional weight loss. Experiencing intense guilt and feeling like an emotional burden to her husband and 4-year-old daughter. Denies any manic or hypomanic history.';

      // Depression symptoms
      document.querySelectorAll('#comp-dep-chips .chip-toggle').forEach(el => {
        if (['Depressed/sad mood', 'Anhedonia', 'Reduced energy', 'Reduced motivation', 'Poor concentration', 'Indecisiveness', 'Worthlessness', 'Excessive guilt', 'Hopelessness', 'Early waking', 'Reduced appetite', 'Weight loss'].includes(el.textContent.trim())) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
      document.getElementById('comp_dep_duration').value = '7 weeks, severe occupational disruption';

      // Suicide assessment
      document.querySelectorAll('#comp-suicide-chips .chip-toggle').forEach(el => {
        if (['Passive death wish', 'Suicidal ideation'].includes(el.textContent.trim())) el.classList.add('active');
        else el.classList.remove('active');
      });
      document.getElementById('comp_suicide_details').value = 'Endorses fleeting thoughts that "it would be easier not to wake up". Denies any active plan, intent, or preparatory behaviour. Lethal means secured.';
      document.querySelectorAll('#comp-suicide-rf-chips .chip-toggle').forEach(el => {
        if (['Current depression', 'Recent loss'].includes(el.textContent.trim())) el.classList.add('active');
        else el.classList.remove('active');
      });
      document.querySelectorAll('#comp-suicide-prot-chips .chip-toggle').forEach(el => {
        if (['Family', 'Children', 'Future plans', 'Help-seeking'].includes(el.textContent.trim())) el.classList.add('active');
        else el.classList.remove('active');
      });
      document.getElementById('comp_suicide_level').value = 'Moderate';
      document.getElementById('comp_violence_level').value = 'Low';
      Object.entries({ matrix_selfharm:'Low', matrix_neglect:'Low', matrix_vulnerability:'Low', matrix_absconding:'Low', matrix_substance_harm:'Low' })
        .forEach(([id, v]) => document.getElementById(id).value = v);
      document.getElementById('matrix_immediate_action').value = 'Outpatient with family supervision; means restricted; crisis line given; review in 2 weeks or earlier if worse.';
      document.getElementById('comp_risk_rationale').value = 'Passive death wish without plan, intent or preparation; first-degree family history and severe current episode raise baseline; mitigated by strong family bond, help-seeking, prior SSRI response and means restriction. Would escalate if active intent emerges, insomnia worsens or psychotic features develop.';

      // Background
      document.getElementById('comp_past_psych').value = 'Postpartum depressive episode 4 years ago following birth of daughter; remitted with Sertraline 50mg for 9 months under psychiatric care.';
      document.getElementById('comp_medical_hx').value = 'No chronic medical illness. No head injury or seizures. NKDA.';
      document.getElementById('comp_family_details').value = 'Maternal aunt treated for Bipolar II disorder; mother experienced recurrent depression.';
      document.getElementById('comp_personal_details').value = 'Normal birth and childhood milestones. University graduate with honors. High premorbid perfectionism.';
      document.getElementById('comp_social_hx').value = 'Lives in owned apartment with supportive husband and daughter. Financially stable. No legal issues.';
      document.querySelectorAll('#comp-personality-chips .chip-toggle').forEach(el => {
        if (['No forensic history', 'Perfectionistic', 'Sensitive'].includes(el.textContent.trim())) el.classList.add('active');
        else el.classList.remove('active');
      });

      // MSE
      document.querySelectorAll('#full-mse-app-chips .chip-toggle').forEach(el => {
        if (['Well/fairly groomed', 'Calm/cooperative', 'Good eye contact', 'Rapport easily established'].includes(el.textContent.trim())) el.classList.add('active');
        else el.classList.remove('active');
      });
      document.querySelectorAll('#full-mse-speech-chips .chip-toggle').forEach(el => {
        if (['Psychomotor retardation', 'Slow speech', 'Soft volume'].includes(el.textContent.trim())) el.classList.add('active');
        else el.classList.remove('active');
      });
      document.getElementById('full_mse_subj_mood').value = 'Exhausted, hopeless and sad';
      document.querySelectorAll('#full-mse-mood-chips .chip-toggle').forEach(el => {
        if (['Depressed', 'Restricted/blunted', 'Congruent'].includes(el.textContent.trim())) el.classList.add('active');
        else el.classList.remove('active');
      });
      document.querySelectorAll('#full-mse-thought-chips .chip-toggle').forEach(el => {
        if (['Form goal-directed', 'No delusion', 'No hallucination'].includes(el.textContent.trim())) el.classList.add('active');
        else el.classList.remove('active');
      });
      document.querySelectorAll('#full-mse-insight-chips .chip-toggle').forEach(el => {
        if (['Alert & oriented x3', 'Attention intact', 'Immediate/recent/remote memory intact', 'Insight good', 'Judgment intact'].includes(el.textContent.trim())) el.classList.add('active');
        else el.classList.remove('active');
      });

      // Vitals, Formulation & Management
      document.getElementById('comp_vitals_bp').value = '118/74 mmHg, HR 72';
      document.getElementById('comp_vitals_bmi').value = '54 kg, BMI 20.8 (4.5kg weight loss)';
      document.getElementById('comp_psychometrics').value = 'PHQ-9: 19/27 (Moderately Severe Depression); GAD-7: 11/21 (Moderate Anxiety)';

      document.getElementById('form_predisposing').value = 'Genetic affective loading (maternal aunt bipolar, mother depression); premorbid perfectionistic temperament; prior vulnerability to postpartum depression.';
      document.getElementById('form_precipitating').value = 'Severe work restructuring & project tender deadlines; acute parental health crisis.';
      document.getElementById('form_perpetuating').value = 'Severe terminal insomnia with nocturnal rumination; withdrawing from exercise and marital communication; cognitive distortions of self-blame.';
      document.getElementById('form_protective').value = 'Strong protective bond with 4-year-old daughter; deeply supportive spouse; previous excellent therapeutic response to SSRI; good insight.';

      document.getElementById('comp_primary_dx').value = 'Major Depressive Disorder, Recurrent Episode, Severe without Psychotic Features (DSM-5-TR F33.2)';
      document.getElementById('comp_diff_dx').value = 'Bipolar II Disorder (depressed phase), Adjustment Disorder with Depressed Mood';

      document.querySelectorAll('#comp-mgmt-chips .chip-toggle').forEach(el => {
        if (['Outpatient management', 'Safety plan formulated', 'Family supervision', 'Start medication', 'Psychoeducation', 'CBT referral', 'Baseline labs (FBC/Renal/Liver/TFT)', 'Medical certificate', 'Early follow-up'].includes(el.textContent.trim())) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });

      document.getElementById('comp_rx_plan').value = '1. Tab. Escitalopram 10mg PO OM after food.\n2. Short-term hypnotic: Tab. Zolpidem 5mg PO PRN nocte (max 5 nights for severe terminal insomnia).\n3. Baseline laboratory workup: FBC, Renal panel, LFT, TFT, Vitamin D, HbA1c.';
      document.getElementById('comp_psycho_plan').value = 'Detailed collaborative safety plan enacted with patient and husband. Husband assumes temporary custody of household medications. 24/7 Psychiatric Emergency and Crisis hotline provided. Referral to Clinical Psychology for CBT. Medical certificate for 2 weeks. Clinic review in 2 weeks.';

      generateNotes();
      showToast('Comprehensive clinical sample case loaded!');
    }

    // Clear Form Dialog
    function confirmClearForm() {
      openCustomModal(
        'Clear Entire Clerking Form?',
        'All patient demographics, checklist items, and formulation notes will be reset.',
        () => {
          PsyForm.clearFormSilently();
          showToast('Form cleared successfully.');
        }
      );
    }

    // Required risk fields per mode: copy/print are blocked until all are set
    const RISK_REQUIRED = {
      rapid: { selects: { rapid_risk_suicide:'Suicide', rapid_risk_violence:'Violence', rapid_risk_neglect:'Self-neglect' }, rationale: 'rapid_risk_rationale' },
      comprehensive: { selects: { comp_suicide_level:'Suicide (C)', comp_violence_level:'Violence (L)', matrix_selfharm:'Matrix: self-harm', matrix_neglect:'Matrix: self-neglect', matrix_vulnerability:'Matrix: vulnerability', matrix_absconding:'Matrix: absconding', matrix_substance_harm:'Matrix: substance harm' }, rationale: 'comp_risk_rationale' },
      followup: { selects: { fu_risk_suicide:'Suicide/harm' }, rationale: 'fu_risk_rationale' }
    };
    function getRiskGaps() {
      const req = RISK_REQUIRED[currentMode]; const gaps = [];
      Object.entries(req.selects).forEach(([id, label]) => { if (document.getElementById(id).value === 'Not assessed') gaps.push(label + ' risk not rated'); });
      if (!document.getElementById(req.rationale).value.trim()) gaps.push('basis for risk judgement not written');
      return gaps;
    }
    function blockIfIncomplete() {
      const gaps = getRiskGaps();
      if (gaps.length) { showToast('Incomplete: ' + gaps[0] + (gaps.length > 1 ? ' (+' + (gaps.length - 1) + ' more)' : ''), 'fa-triangle-exclamation', true); return true; }
      return false;
    }

    // ---------- Consistency checks: strong-signal contradictions only (avoid alert fatigue)
    function chipsOn(containerId) { return getActiveChips(containerId); }
    function anyOf(containerId, names) { const on = chipsOn(containerId); return names.filter(n => on.includes(n)); }
    function val(id) { return document.getElementById(id).value; }
    function pairClash(containerId, a, bList, label, out) {
      const on = chipsOn(containerId);
      if (on.includes(a)) bList.filter(b => on.includes(b)).forEach(b => out.push(`${label}: "${a}" and "${b}" both selected.`));
    }
    const SUICIDAL = ['Passive death wish', 'Suicidal ideation', 'Intent', 'Plan', 'Preparatory behaviour', 'Recent attempt'];
    const HIGH_SIGNAL = ['Intent', 'Plan', 'Preparatory behaviour', 'Recent attempt'];
    const isLow = v => v === 'Low';
    const isHigh = v => /High|Imminent/.test(v);

    function getConsistencyFlags() {
      const f = [];
      if (currentMode === 'rapid') {
        const sui = val('rapid_risk_suicide'), vio = val('rapid_risk_violence'), neg = val('rapid_risk_neglect');
        pairClash('rapid-risk-chips', 'No current suicidal thoughts', SUICIDAL, 'Risk screen', f);
        let x = anyOf('rapid-risk-chips', HIGH_SIGNAL); if (x.length && isLow(sui)) f.push(`Suicide risk rated LOW despite: ${x.join(', ')}.`);
        x = anyOf('rapid-risk-chips', ['Thoughts of harming others', 'Recent aggression', 'Weapon access']); if (x.length && isLow(vio)) f.push(`Violence risk rated LOW despite: ${x.join(', ')}.`);
        x = anyOf('rapid-risk-chips', ['Self-neglect', 'Vulnerability / exploitation']); if (x.length && isLow(neg)) f.push(`Self-neglect/vulnerability rated LOW despite: ${x.join(', ')}.`);
        if (anyOf('rapid-psy-chips', ['Command hallucination']).length && isLow(sui) && isLow(vio)) f.push('Command hallucinations documented, but suicide and violence are both LOW. Record what the commands say and whether the patient can resist them.');
        if (chipsOn('rapid-mse-chips').includes('No hallucination') && anyOf('rapid-psy-chips', ['Hallucinations', 'Command hallucination']).length) f.push('Hallucinations in the history, but the MSE says "No hallucination". Clarify whether they are current.');
        if (chipsOn('rapid-mse-chips').includes('No delusion') && anyOf('rapid-psy-chips', ['Delusions', 'Passivity / interference']).length) f.push('Delusions/passivity in the history, but the MSE says "No delusion". Clarify whether they are current.');
        [['No delusion', ['Delusion present']], ['No hallucination', ['Hallucination present']], ['Mood euthymic', ['Mood depressed', 'Mood irritable/elevated']],
         ['Affect reactive/full', ['Affect restricted/blunted']], ['Speech normal', ['Speech pressured', 'Speech reduced']], ['Thought goal-directed', ['Thought disordered']],
         ['Cognition grossly intact', ['Cognitive concern']], ['Insight good', ['Insight partial/poor']], ['Judgment intact', ['Judgment impaired']], ['Calm/cooperative', ['Agitated/restless']]]
          .forEach(([a, b]) => pairClash('rapid-mse-chips', a, b, 'MSE', f));
        const plan = chipsOn('rapid-plan-chips');
        if (isHigh(sui) && plan.includes('Outpatient management') && !plan.includes('Admission considered')) f.push('Suicide risk HIGH/IMMINENT with outpatient management and no admission considered. Document why.');
      } else if (currentMode === 'comprehensive') {
        const sui = val('comp_suicide_level'), vio = val('comp_violence_level');
        pairClash('comp-suicide-chips', 'No suicidal thoughts', SUICIDAL, 'C. Suicide', f);
        let x = anyOf('comp-suicide-chips', HIGH_SIGNAL); if (x.length && isLow(sui)) f.push(`Suicide risk (C) rated LOW despite: ${x.join(', ')}.`);
        x = anyOf('comp-suicide-chips', ['NSSI', 'Recent attempt']); if (x.length && isLow(val('matrix_selfharm'))) f.push(`Self-harm (matrix) rated LOW despite: ${x.join(', ')}.`);
        pairClash('comp-violence-chips', 'No current concern', ['Recent aggression', 'Threats', 'Thoughts of harming others', 'Weapon access', 'Identified target', 'Command hallucination', 'Persecutory delusion'], 'L. Violence', f);
        x = anyOf('comp-violence-chips', ['Threats', 'Thoughts of harming others', 'Identified target']); if (x.length && isLow(vio)) f.push(`Violence risk (L) rated LOW despite: ${x.join(', ')}.`);
        const cmd = anyOf('comp-psych-chips', ['Command hallucination']).length || anyOf('comp-violence-chips', ['Command hallucination']).length;
        if (cmd && isLow(sui) && isLow(vio)) f.push('Command hallucinations documented, but suicide and violence are both LOW. Record what the commands say and whether the patient can resist them.');
        const HALL = ['Auditory hallucination', 'Visual hallucination', 'Tactile', 'Olfactory', 'Gustatory', 'Second person voice', 'Third person voice', 'Running commentary', 'Voices discussing patient', 'Command hallucination'];
        const DEL = ['Persecutory delusion', 'Referential delusion', 'Grandiose delusion', 'Religious delusion', 'Somatic delusion', 'Jealous delusion', 'Erotomanic delusion', 'Nihilistic delusion', 'Delusion of guilt', 'Thought insertion', 'Thought withdrawal', 'Thought broadcasting', 'Passivity phenomenon', 'Delusional perception'];
        const mseT = chipsOn('full-mse-thought-chips');
        if (mseT.includes('No hallucination') && anyOf('comp-psych-chips', HALL).length) f.push('Hallucinations in section G, but the MSE says "No hallucination". Clarify whether they are current.');
        if (mseT.includes('No delusion') && anyOf('comp-psych-chips', DEL).length) f.push('Delusions/passivity in section G, but the MSE says "No delusion". Clarify whether they are current.');
        pairClash('full-mse-thought-chips', 'No delusion', ['Delusion present'], 'MSE', f);
        pairClash('full-mse-thought-chips', 'No hallucination', ['Auditory hallucination'], 'MSE', f);
        pairClash('full-mse-mood-chips', 'Euthymic', ['Depressed', 'Elevated'], 'MSE', f);
        pairClash('full-mse-mood-chips', 'Affect reactive/full', ['Restricted/blunted'], 'MSE', f);
        pairClash('full-mse-mood-chips', 'Congruent', ['Incongruent'], 'MSE', f);
        if (chipsOn('comp-sub-withdrawal').includes('Yes') && isLow(val('matrix_substance_harm'))) f.push('Withdrawal/complications marked YES, but substance harm (matrix) is LOW.');
        const mg = chipsOn('comp-mgmt-chips');
        if (isHigh(sui) && mg.includes('Outpatient management') && !mg.some(m => /admission/i.test(m))) f.push('Suicide risk HIGH/IMMINENT with outpatient management and no admission option selected. Document why.');
      } else {
        pairClash('fu-risk-chips', 'No suicidal thoughts', ['Passive death wish', 'Suicidal ideation'], 'Follow-up risk', f);
      }
      return f;
    }
    function renderConsistencyPanel() {
      const flags = getConsistencyFlags();
      const panel = document.getElementById('consistency-panel');
      panel.style.display = flags.length ? 'block' : 'none';
      document.getElementById('consistency-count').textContent = flags.length;
      const ul = document.getElementById('consistency-list'); ul.replaceChildren();
      flags.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      return flags;
    }
    // Gate an export behind confirmation when prompts are unresolved
    function withConsistencyGate(actionLabel, proceed) {
      const flags = getConsistencyFlags();
      if (!flags.length) return proceed();
      openCustomModal(`${flags.length} unresolved consistency check${flags.length > 1 ? 's' : ''}`,
        flags.map(t => '• ' + t).join('\n') + '\n\nOnly proceed if your "Basis for risk judgement" explains these.', proceed, actionLabel);
    }

    // Safe Copy to Clipboard (Fallback for iframe restrictions)
    function copyGeneratedNote() {
      const textarea = document.getElementById('output-textarea');
      if (!textarea.value.trim()) {
        showToast('Form is empty. Fill fields or load sample case first.', 'fa-circle-exclamation', true);
        return;
      }
      if (blockIfIncomplete()) return;
      withConsistencyGate('Copy anyway', doCopy);
    }
    function doCopy() {
      const textarea = document.getElementById('output-textarea');
      try {
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        const successful = document.execCommand('copy');
        if (successful) {
          const btnText = document.getElementById('copy-btn-text');
          btnText.textContent = 'Copied!';
          setTimeout(() => { btnText.textContent = 'Copy Note'; }, 2000);
          showToast('Clerking note copied to clipboard!');
        } else {
          showToast('Please copy text manually.', 'fa-triangle-exclamation', true);
        }
      } catch (err) {
        showToast('Clipboard operation blocked by browser.', 'fa-triangle-exclamation', true);
      }
    }

    // Clean Print / Save as PDF Function
    function printFormalReport() {
      const content = document.getElementById('output-textarea').value;
      if (!content.trim()) {
        showToast('Generate a note first before printing.', 'fa-circle-exclamation', true);
        return;
      }
      if (blockIfIncomplete()) return;
      withConsistencyGate('Print anyway', () => doPrint(content));
    }
    function doPrint(content) {
      const safe = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const printContainer = document.getElementById('print-report-container');
      printContainer.innerHTML = `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.45; color: #0f172a; max-width: 900px; margin: 0 auto;">
          <div style="border-bottom: 2.5px solid #0369a1; padding-bottom: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <h1 style="margin: 0; font-size: 16pt; color: #0369a1; font-weight: bold;">PSYCHIATRIC CLINICAL CLERKING & REPORT</h1>
              <p style="margin: 2px 0 0 0; font-size: 8.5pt; color: #64748b;">Adult Psychiatry Service • Confidential Medical Documentation</p>
            </div>
            <div style="text-align: right; font-size: 8pt; color: #64748b;">
              Confidential Hospital Record
            </div>
          </div>
          <pre style="white-space: pre-wrap; font-family: 'Courier New', Courier, monospace; font-size: 9.5pt; line-height: 1.4; color: #1e293b; margin: 0;">${safe}</pre>
          <div style="margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 8pt; color: #94a3b8; display: flex; justify-content: space-between;">
            <span>Adult Psychiatry Clerking System</span>
            <span>Confidential Medical Information</span>
          </div>
        </div>
      `;
      printContainer.classList.remove('hidden');
      window.print();
      printContainer.classList.add('hidden');
    }

    // Live update debounce
    function triggerLiveUpdate() {
      clearTimeout(window.liveTimer);
      window.liveTimer = setTimeout(generateNotes, 150);
    }

    // Attach listeners to inputs
    document.querySelectorAll('input, select, textarea').forEach(element => {
      element.addEventListener('input', triggerLiveUpdate);
    });
