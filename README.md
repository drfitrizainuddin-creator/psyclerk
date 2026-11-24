# PsyClerk v3

Adult psychiatry clerking notes on a phone or ward PC. Patient drafts stay in this browser on this device and nothing is sent anywhere.

## Open it
- **Quickest:** unzip the folder and double-click `index.html`. It works offline from your disk on a laptop or ward PC.
- **On your phone, installable and offline:** the folder must be hosted at an `https://` address (e.g. GitHub Pages). Open the address in Safari or Chrome, then use **Share → Add to Home Screen** (iPhone) or **Install app** (Android). After the first visit it works with no signal.

## Daily use
1. First open on a device: choose **My own phone or laptop** (drafts kept 24 h) or **Shared ward PC** (12 h).
2. **Patients** (top right) → type a short label like `Bed 12 · AB` (not the name) → **New patient**.
3. Fill in the form. It saves as you type. Use the section bar and **Next** (Alt+N) to find what's empty or risk-incomplete.
4. Copy (Alt+C) and paste into the EMR, then press **Done** to delete that draft.
5. End of shift on a shared PC: **End session** deletes every draft on that PC.

Phone: **Form | Note** tabs at the top, actions on the bottom bar. To dictate, tap the microphone on your keyboard.
Phrases: click any text box → **Phrases** button → insert or save text you reuse. Phrases are kept on the device, so never save patient details in them.

## Safety behaviour (unchanged from v2)
Blank fields print `[NOT ASSESSED]`. Copy and Print are blocked until every risk is rated and the basis for the risk judgement is written. Consistency prompts ask for confirmation.

## For whoever maintains it
- Run the tests: `npm install`, then `npm test` (Playwright + Chromium).
- After changing classes in HTML or JS, rebuild the CSS with `npm run build:css`.
- **Every release: bump `VERSION` in `sw.js`.** Otherwise installed phones keep the old version.
- Drafts saved by an older version of the form are refused (not migrated) and delete themselves within 12–24 h.
