# PsyClerk v3: Design (approved 2026-11-24)

## Why
At the moment each clerking is written up to three times: first on paper, then from a voice memo, then into the EMR. The aim is to write it once, at the bedside or straight after, on a phone or a ward PC, and paste the finished note into the EMR. Looks are secondary. Speed and fewer re-writes come first.

## Goals
1. **Replace the paper step.** Fast enough on a phone to fill in during or straight after the interview.
2. **Works well on phone and ward PC/laptop.** Same file, layout adapts to the screen.
3. **Never lose work, several patients at once.** Drafts survive refresh, screen lock and interruptions, on that device, one per patient.
4. **Voice:** (C) dictate your own summary with the keyboard mic; (A) record a consented patient/family conversation and turn it into text on the device, *only if the BM-English test passes*.
5. **Cleaner, calmer look** that makes the next step obvious.

## Non-goals
- Moving a draft between phone and PC (decided: each device keeps its own drafts).
- AI that fills in fields or ticks findings from the transcript.
- Connecting to the EMR, a patient list or a database.
- Keeping audio recordings.

## Anti-goals (a failure even if it works)
- Anything that writes a finding nobody entered. All v2 safety behaviour stays: `[NOT ASSESSED]` for blanks, required risk ratings and basis for judgement, consistency checks, the Clear fix.
- Slower than paper for a routine clerking.
- Patient data leaving the device.

## Approaches considered
| | Approach | Trade-off | Decision |
|---|---|---|---|
| Voice | **C** Phone/PC keyboard dictation | No build; good for short summaries; poor for long conversations | **Chosen** |
| Voice | **A** On-device speech-to-text in the browser | Private, offline after one download (~150 MB); slow on old PCs; mixed BM-English accuracy uncertain | **Chosen, gated on test** |
| Voice | B Cloud AI transcribes *and* fills the form | Fastest; patient data leaves hospital; may write findings nobody elicited | Rejected |
| Drafts | Server sync phone to PC | Convenient; needs server holding patient data and hospital approval | Rejected |
| Drafts | Per-device autosave, several patients at once | No server; finish on the device you started on; more patient data on a shared PC (offset by short labels and auto-wipe) | **Chosen** |

## Design

### 1. Layout
- **Phone (<1024 px):** single column. Two tabs at the top, **Form | Note**. A sticky bottom bar holds *Generate / Copy / End session*. Sections are collapsible; a section menu shows each section with a status dot (empty / started / done) and a "next incomplete" jump.
- **PC:** keep the current two-pane layout (form left, live note right) with the same section menu down the side.
- Chips and buttons at least 40 px tall on the phone. Fewer gradients and no pulsing dot. One accent colour, with red/amber kept only for risk.

### 2. Speed features
- **My phrases:** save phrases you reuse (e.g. "Seen with husband, consented to collateral") and insert them with one tap into any text box. Stored on the device. Phrases are not patient data, so they are kept until you delete them.
- **PC shortcuts:** Alt+1/2/3 switch mode; Ctrl+Shift+C copy note; Ctrl+Shift+N next incomplete section.
- Existing quick-fills ("normal MSE" etc.) stay.

### 3. Drafts: several patients at once (per device)
- **Several drafts open at once**, one per patient, so you can see 2–3 patients and write them up together. Saved in the browser on every change.
- A **Patients** drawer (top bar on the phone, side menu on the PC) lists the drafts. Tap one to switch instantly. Each shows a label you set, a status (e.g. "risk incomplete" / "ready") and when it was last edited.
- **The label is a short tag, not the full name**, e.g. "Bed 12 · AB" or "Clinic 3". The list is the first thing anyone sees on a shared ward PC, so it shouldn't show patient names. The full details stay inside the draft.
- **+ New patient** starts a blank draft. **Done** (after pasting into the EMR) deletes that draft.
- **Device type, asked the first time the app opens on a device** (changeable in settings):
  - **My own phone or laptop:** each draft auto-deletes **24 hours** after its last edit.
  - **Shared ward PC:** each draft auto-deletes **12 hours** after its last edit.
- **Expiry warning:** in its last hour a draft shows "deletes in 45 min", so nothing disappears unannounced.
- **End session** deletes all drafts on the device at once.
- Limit of 10 drafts per device, to keep the list manageable and limit how much patient data sits on a shared PC.
- Not encrypted. Protection comes from short labels, the auto-delete (12 h on shared PCs, 24 h on your own device) and End session. (My call: a PIN adds friction at every use.)

### 4. Voice
- **C:** a short hint beside the narrative boxes: "Tap the keyboard mic to dictate."
- **A** (if the test passes): a mic button on the narrative boxes (HPI, interval notes, MSE notes).
  1. **Consent gate:** recording a patient or family requires ticking "Verbal consent for audio recording obtained". The note then includes that line. Dictating your own summary skips this.
  2. Audio stays in memory only, is transcribed on the device (multilingual Whisper, BM/English), and is deleted once transcribed.
  3. The text is inserted under the heading `[Transcribed: verify before filing]`, for you to edit.
  4. Downloading the model is the only network use. No audio or text is sent anywhere.

### 5. Offline and installable
- Bundle the styles, fonts and icons into the app. This removes the three outside sites, which fixes the offline layout and the third-party code risk.
- Add to home screen on the phone; works with no signal after the first load.
- Needs to be hosted at a web address (static files only; patient data never reaches it). **Where to host is left to decide at the end** (e.g. GitHub Pages under your account).

## Order of work
1. **Voice test (before building A):** you upload a 1–2 min *mock* BM-English role-play; I transcribe it here and show you the result.
2. Layout + autosave + phrases + shortcuts + bundling (useful whatever the test shows).
3. Voice A, if the test passes.
4. Hosting / install.

## Success looks like
- A new routine patient clerked on the phone with no paper, in no more time than paper takes.
- The note pasted into the EMR with no re-typing.

## My calls (check these)
- Up to 10 drafts per device; list shows a short label you set, not the patient name.
- No PIN; device type chosen at first use.
- Phrases persist; patient drafts auto-delete 24 h (own device) / 12 h (shared PC) after last edit.
- Visual refresh builds on the current design rather than starting over.
