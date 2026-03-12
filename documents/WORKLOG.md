# Fukumoto Acupuncture Clinic Online Appointment System (OAS) — Work Log

## Project Overview
- **Domain**: kojinius.jp
- **Firebase**: Online Appointment System
- **Architecture**: Firebase Hosting + Firestore + Functions + Authentication

---

## 2026-03-05 Work Log

### Completed Tasks

#### Domain Acquisition
- Registered `kojinius.jp` via Sakura Internet
- Payment completed (credit card)

#### Firebase Environment Setup
- Created Firebase project (Online Appointment System)
- Created Firestore DB
  - Plan: Standard Edition
  - Region: asia-northeast1 (Tokyo)
  - Security rules: Strict
- Configured Firebase Authentication (enabled email/password)
- Configured Firebase Hosting

#### Firebase CLI Setup
- Installed `firebase-tools` globally
- Completed `firebase login`
- Ran `firebase init` (Firestore + Functions + Hosting)
  - Functions language: JavaScript
  - Public directory: `.` (root)
  - SPA setting: No
- Due to Google Drive constraints, `node_modules` for Functions was placed under
  `C:\Users\SM7B\Workspace\dev\Fukumoto`
- Updated `firebase.json` `functions.source` to the path above

#### DNS / SSL Configuration
- Registered kojinius.jp as a custom domain in the Firebase Console
- Added the following to Sakura DNS zone settings:
  - A record: `@` → `199.36.158.100`
  - TXT record: kojinius.jp → hosting-site-project-... (Firebase verification)
- SSL certificate will be automatically issued by Firebase after DNS propagation

---

## 2026-03-06 Work Log

### Completed Tasks

#### DNS / SSL Verification
- `nslookup kojinius.jp` → `199.36.158.100` confirmed ✅
- Firebase Console custom domain status "Connected" confirmed ✅

#### Resend Email Sending API Setup
- Created Resend account and issued API key (`fukumoto-reservation`)
- API key managed via Firebase Secret Manager (`RESEND_API_KEY`)
- Added Resend DNS records to Sakura DNS:
  - TXT `resend._domainkey` → DKIM
  - MX `send` → `10 feedback-smtp.ap-northeast-1.amazonses.com.` (Sakura format includes priority in data field)
  - TXT `send` → `v=spf1 include:amazonses.com ~all`
- `kojinius.jp` Verified on Resend dashboard ✅
- Implemented and deployed Firebase Functions `sendReservationEmail`
  - Endpoint: `https://sendreservationemail-po3aztuimq-uc.a.run.app`
  - Test send successful ✅
  - Verified via curl → `{"success":true,"id":"7a7fae47-99ff-46bb-badb-03cce09b32ee"}`
  - Confirmed receipt in Gmail (spam folder, no encoding issues)

#### GCP Permission Setup (Troubleshooting)
- Granted `Secret Manager Secret Accessor` role to Cloud Build SA
- Granted `Log Writer` and `Editor` roles to `214213328195-compute@developer.gserviceaccount.com`
- **TODO (before release)**: Narrow down `Editor` role to minimum required permissions

---

---

## 2026-03-06 Work Log (continued)

### Completed Tasks

#### Directory Structure Reorganization
- Moved `style.css` → `css/style.css`
- Moved `app.js` / `admin.js` → `js/` folder (also created `js/config.js`, `js/firebase.js`, `js/auth.js`, `js/utils.js`)
- Abolished `dev/Fukumoto` (Functions workaround folder) and merged into `functions/`
- Updated `firebase.json` `functions.source` to `./functions`
- Added `functions/**`, `README.md`, `firestore.rules`, etc. to `firebase.json` `hosting.ignore` (excluded from production)

#### Workspace Migration
- Migrated from `G:\マイドライブ\Workspace` to `C:\Users\SM7B\Workspace`
- Google Drive remains as backup via GoogleDriveSync
- Updated Windows Terminal startup folder to `C:\Users\SM7B\Workspace`

#### Phase 2 Implementation (localStorage → Firestore Migration)
- **js/config.js** (new): Firebase config values module
- **js/firebase.js** (new): Firebase initialization / db/auth exports
- **js/auth.js** (new): requireAdmin / login / logout (admin Custom Claim check)
- **js/utils.js** (updated): Added ES Module exports (esc / DAY_NAMES / formatDate, etc.)
- **js/app.js** (full rewrite): Firestore slot retrieval / double-booking prevention via runTransaction
- **js/admin.js** (full rewrite): requireAdmin auth guard / onSnapshot real-time sync / writeBatch updates
- **login.html** (new): Staff-only login screen
- **firestore.rules** (updated): Default deny / isValidReservation validation
- **functions/index.js** (updated): Added setInitialAdmin Function
- **index.html / admin.html** (updated): type="module" support / added logout button
- **README.md** (updated): Refreshed tech stack and directory structure
- Commit: `50e765e` "feat: Phase 2 implementation — Firestore migration, authentication, double-booking prevention, real-time sync"
- Pushed to GitHub (main) ✅

---

---

## 2026-03-06 Work Log (continued 3)

### Completed Tasks

#### Firebase Emulator Environment Setup
- Installed Java 25 LTS
- Ran `firebase init emulators` (Authentication / Functions / Firestore / Hosting)
- Updated `js/firebase.js` for emulator support (`connectFirestoreEmulator` / `connectAuthEmulator`)
- Confirmed all emulators start successfully with `firebase emulators:start` ✅

#### Admin Initial Setup (Granting admin Claim)
- Installed Google Cloud CLI and completed `gcloud auth application-default login`
- Set quota project via `gcloud auth application-default set-quota-project`
- Created account in Firebase Auth (production) with Boss's email address
- Granted `admin: true` claim to production account via Node.js script ✅
- Granted `admin: true` claim to emulator user as well ✅
- Confirmed login and admin screen access at `http://localhost:5000/login.html` ✅
- Redeployed `setInitialAdmin` Function using `--only functions:sendReservationEmail` and deleted it ✅

---

## 2026-03-07 Work Log

### Completed Tasks

#### admin@kojinius.jp Email Setup (Google Workspace)
- Signed up for Google Workspace Business Starter (14-day free trial)
- Verified domain ownership for `kojinius.jp`: Added TXT record to Sakura DNS
  - TXT `@` → `google-site-verification=...`
- Enabled Gmail: Added MX record to Sakura DNS
  - MX `@` → `1 SMTP.GOOGLE.COM.`
- Send/receive test completed ✅

#### Phase 3 Implementation (Notification Features)
- **sendReservationEmail** (updated): Added reservation number and cancellation instructions to email template ✅
- **notifyAdminOnReservation** (new): HTTP Function to notify `admin@kojinius.jp` when a reservation is confirmed ✅
  - Initially implemented with Firestore trigger (onDocumentCreated), but Eventarc permission issues prevented firing → switched to HTTP Function
- **sendDailyReminders** (new): Automatic reminder emails to next-day appointment holders at 15:00 JST daily ✅
  - Cloud Scheduler job `firebase-schedule-sendDailyReminders-us-central1` created automatically
- **firestore.indexes.json** (updated): Added composite index for `date + status`
- **js/app.js** (updated): Added async call to admin notification endpoint on reservation confirmation
- Commit: `2ffcdb4` "feat: Phase 3 implementation — enhanced patient confirmation email, admin new-booking notification, day-before reminders"
- Pushed to GitHub (main) ✅

---

---

## 2026-03-07 Work Log (continued 2)

### Completed Tasks

#### Phase 4 Finalization (4-3) PDF Japanese Font Support
- Placed `NotoSansJP-Regular.woff2` (Japanese) and `NotoSansJP-Latin.woff2` in `fonts/`
- Fully rewrote `exportPdf()` in `js/app.js` with fontkit support
  - Registered font via `pdfDoc.registerFontkit(fontkit)`
  - Added memory cache (`_fontCache`) to speed up subsequent exports
  - Localized PDF labels to Japanese (name, furigana, date of birth, etc.)
- Phone number and address placeholder fixes deferred to Phase 6 Admin Enhancement

---

#### Phase 4 Finalization (4-1 / 4-2)
- **4-1 Privacy Consent Checkbox**
  - Added "Personal Information Handling" section to Step 2 form in `index.html`
  - Implemented custom checkbox (`#consentCheck`)
  - Added consent check validation to `validateForm()` in `js/app.js`
  - Added `.consent-label` / `.consent-check-box` styles to `css/style.css`
- **4-2 Privacy Policy Page**
  - Created `privacy-policy.html` (10-item policy)
  - Linked from consent checkbox

---

## 2026-03-07 Work Log (continued 3)

### Completed Tasks

#### Phase 6 Admin Screen Enhancement — Business Hours Settings (1-5) Extension

- **AM/PM Individual ON/OFF Support**
  - Added "AM" and "PM" checkboxes to `renderBizHoursTable()` (10-column layout)
  - Added `toggleBizAmPm(d, period)`: disables corresponding select when unchecked
  - Updated `getBizHoursFromForm()` to include `amOpen` / `pmOpen` on save
  - Added `amOpen: true, pmOpen: true` to `DEFAULT_BIZ_HOURS`
- **Business Hours Dropdown Range Restriction**
  - AM: 7:00–12:00 / PM: 12:30–22:00 (separated)
  - Added arguments to `genTimeOptions(fromH, fromM, toH, toM)`, constants `AM_TIMES` / `PM_TIMES`
- **Day-Off Toggle → Holiday Calendar Sync**
  - Added `getWeekdayOpenStateFromForm()` (retrieves checkbox state from form)
  - Updated `renderHolidayCal()`: displays closed weekdays with `.weekday-closed` (gray) and tooltip
  - `toggleBizDay()` calls `renderHolidayCal()` for immediate update
  - Added `.cal-cell.weekday-closed` style to `css/style.css`
- **Business Hours Validation**
  - Added `validateBizHours()`: detects start ≥ end errors / both AM and PM OFF on a business day
  - Called before saving in `saveSettings()`; cancels Firestore write on error
- **`app.js` `buildBusinessHours()` Update**: Dynamically generates AM/PM slots referencing `amOpen` / `pmOpen`

#### 2-4 Gender Field (Patient Side)

- Added gender radio buttons to Step 2 "Basic Info" in `index.html` (Male / Female / Prefer not to say, optional, no default selection)
- Added gender row to Step 3 confirmation screen in `index.html`
- Updated `js/app.js`: reflected gender in booking object, `fillConfirmation()`, and `newReservation()` reset
- Updated `js/admin.js`: added gender column to detail modal and CSV export

#### 2-2 Appointment Cancellation Feature (Patient Side)

- **`cancel.html`** (new): Search by reservation number + phone → review details → execute cancellation → completion
- **`js/cancel.js`** (new):
  - Retrieves single record from Firestore, validates phone number (client-side)
  - Checks cancellation deadline by referencing `cancelCutoffMinutes` setting
  - Atomically updates `reservations` + `slots` via `writeBatch`
- **`firestore.rules`** updated:
  - `reservations`: Added `get` (single read) and limited `update` to `status: cancelled` for patients
  - `slots`: Allowed bidirectional update for `cancelled → pending` (re-booking) and `* → cancelled` (cancellation)
- Added link to cancellation page in Step 4 completion screen of `index.html`

#### Bug Fixes / Improvements

- **403 error on second booking**: `tx.set()` on a cancelled slot was treated as an `update`, violating rules → added rule allowing `cancelled → pending` update on `slots`
- **8-digit reservation ID**: Changed from Firestore auto-ID to 8-character alphanumeric (excluding ambiguous characters) via `generateBookingId()`
- **Admin detail modal status localization**: `pending → Unconfirmed`, `confirmed → Confirmed`, `cancelled → Cancelled`

---

## 2026-03-08 Work Log

### Completed Tasks

#### Dynamic Clinic Name / Phone / Address Across All Pages

- Added `id="clinic-name-heading"` to all pages (index.html / admin.html / cancel.html / login.html / privacy-policy.html)
- `loadClinicSettings()` in `js/app.js` reads `clinicName` / `phone` from Firestore and immediately updates header, title, and Step 4 phone number
- Added same update logic to `js/cancel.js` and `login.html`

#### Admin Settings Extension (Clinic Info Tab)

- Added **Website URL** field (`settingClinicUrl`) with format validation via `new URL()`
- Added **Postal Code** field (`settingClinicZip`) with auto-address lookup button using zipcloud API
- Added **Clinic Address** field (`settingClinicAddress`)
- Made clinic name and phone number required (cancels save if empty)
- Immediately updates clinic name in header and title after saving

#### Appointment Confirmation Email Enhancement (Functions)

- Updated `sendReservationEmail` in `functions/index.js`: added clinic address, phone, URL, and Google Maps link button to the end of email template
- All Functions dynamically retrieve clinicName and phone from Firestore via `getClinicSettings()`

#### Patient Form — Address Field Split into 3

- Changed Step 2 address input in `index.html` to 3 fields: "Postal Code (required)", "Prefecture / City / Street (required)", "Apartment / Building (optional)"
- Added `fetchAddressFromZip()` to `js/app.js` (calls zipcloud API → auto-fills `addressMain`)
- Added postal code row with `〒` prefix to confirmation screen (Step 3)
- Updated booking object: added `zip`, changed `address` to concatenation of `addressMain + addressSub`

#### Google Maps Embed (Appointment Completion Screen)

- Added Google Maps iframe section to Step 4 of `index.html` (`id="clinic-map-section"`)
- `loadClinicSettings()` dynamically injects iframe when clinicAddress is set (`&hl=ja` for Japanese display)

#### PDF Enhancements

- Address wrapping: supports 14 chars × 3 lines (up to 42 characters)
- Added postal code row, phone number, and business hours text (dynamically generated by `buildBizHoursText()`) to footer

#### Calendar Display Bug Fix

- **`js/app.js` `renderCalendar()`**: Removed `dow === 0` (Sunday hardcoded) from `isDisabled` check
  - Sunday open/closed is now determined by presence of `BUSINESS_HOURS[0]`
- **`loadClinicSettings()`**: Added fallback to maintain default `BUSINESS_HOURS` if `buildBusinessHours()` returns empty (all days `open: false`)
  - Prevents all days from graying out even if Firestore has all days `open: false`

---

## 2026-03-08 Work Log (continued)

### Completed Tasks

#### Custom Logo Upload Feature
- Added 80×80 square crop UI using Cropper.js to the "Clinic Info" tab in admin screen
- Saves cropped base64 PNG to Firestore `settings/clinic.clinicLogo`
- Reflected in header logo across index.html / admin.html / cancel.html / login.html / privacy-policy.html

#### Color Theme Switcher
- Added `THEMES` (6 types: warm/navy/forest/rose/sky/charcoal) and `applyTheme()` to `js/utils.js`
- Overrides CSS custom properties (`--brown`, `--orange`, etc.) per theme
- Added theme picker UI to "Clinic Info" tab in admin screen; reflected across all pages

#### Announcement / Warning Banner Feature
- Added "Announcements" tab to admin screen (ON/OFF / type / message / display period)
- Types: `info` (blue) / `warning` (orange) / `maintenance` (red)
- Display period uses `datetime-local` for start/end datetime (empty = no time restriction)
- Added banner elements to index.html / cancel.html; period evaluated using local time
- Banner colors adjusted to avoid confusion with page background (beige) for all types
- Validation: message required when ON; detects start > end reversal error

#### PDF Clinic Name Overflow Handling
- Dynamically adjusts font size based on clinic name length (≤12:17px / ≤17:14px / ≤22:11px / else:9px)

#### Settings Modal UI Improvement
- Expanded modal width from 620px → 700px
- Applied `flex-wrap: nowrap; overflow-x: auto` to prevent tab wrapping

---

## 2026-03-08 Work Log (continued 2)

### Completed Tasks

#### "Call" Button — Hide on PC, Show on Mobile Only
- `css/style.css`: `.header-phone` set to `display:none` by default, shown with `tel:` link style at ≤900px
- `css/style.css`: `.btn-phone-mobile` (admin detail modal "📞 Call" button) similarly hidden on PC, shown on mobile only
- `js/app.js`: Updated `header-phone` content to `<a href="tel:...">` link
- `js/admin.js`: Added `.btn-phone-mobile` class to "Call" button

#### Production Directory Structure Change (5-5)
- Moved all app files under `apps/FukumotoGroup/OnlineAppointSystem/`
- Replaced root `index.html` with portfolio page ("Built with Claude")
- `js/auth.js`: Changed `/login.html` to relative path `login.html`
- `reset-password-done.html`: Same fix
- `js/app.js`: Updated font paths to absolute path `/apps/FukumotoGroup/OnlineAppointSystem/fonts/...`
- `firebase.json`: Added rewrite for URLs without trailing slash
- README.md: Updated URL and directory structure

#### Notion WBS — New Tasks Added (from Enhancement Requirements 2026-03-08)
- E1-11 Staff email address / password change (with email verification)
- E3-3 Maintenance period setting feature (redirect to maintenance.html)
- E3-4 Maintenance message UI slide switch
- 5-4 Hide "Reservation Management (Staff)" button in production
- 5-5 Production directory structure change (completed simultaneously with addition → tagged as Done)

---

## 2026-03-08 Work Log (continued 3)

### Completed Tasks

#### E3-4 Announcement ON/OFF as Slide Switch
- `css/style.css`: Added `.toggle-switch` / `.toggle-track` / `.toggle-label` styles
- `admin.html`: Changed `#annActive` checkbox to slide switch UI wrapped in `<label class="toggle-switch">`

#### E3-3 Maintenance Period Setting Feature
- `admin.html`: Added "🔧 Maintenance period from/to" fields (`#maintStartDate` / `#maintEndDate`) to Announcements tab
- `js/admin.js`: Added maintenance period read, save, and validation (start ≥ end check)
- `js/app.js`: Added `checkMaintenancePeriod()`. Redirects to `maintenance.html` via `location.replace()` during maintenance
- `js/cancel.js`: Added same maintenance period check

---

## 2026-03-08 Work Log (continued 4)

### Completed Tasks

#### E1-11 Staff Email Address / Password Change Feature
- `admin.html`: Added "Account Settings" tab to settings modal
- `js/admin.js`: Imported `EmailAuthProvider` / `reauthenticateWithCredential` / `updatePassword` / `verifyBeforeUpdateEmail`
- `js/admin.js`: Stored return value of `requireAdmin()` as `currentUser`
- `js/admin.js`: Initialized account tab in `openSettings()` (displays current email address)
- `js/admin.js`: Added `saveAccount()` (re-authenticate → send email change confirmation or change password)

#### Gmail Pre-fetch Link Expiration Countermeasure
- Created `auth-action.html` (custom action URL handler)
  - `mode=resetPassword`: Verifies code only via `verifyPasswordResetCode` → shows form → submits via `confirmPasswordReset` (code is not consumed until form submission)
  - `mode=verifyEmail` / `mode=recoverEmail`: Automatically runs `applyActionCode` and shows completion
  - Reflects clinic name, logo, and theme from Firestore
- `js/auth.js`: Added `actionCodeSettings` to `sendPasswordResetEmail` (points continueURL to `auth-action.html`)
- ⚠️ **Additional Firebase Console setup required**: Authentication → Templates → Password reset → Change Action URL to `https://kojinius.jp/apps/OnlineAppointSystem/auth-action.html`

---

## 2026-03-08 Work Log (continued 5)

### Completed Tasks

#### Various Bug Fixes
- `maintenance.html`: Fixed redirect loop bug (changed `announcement` check → `maintenance.startDate/endDate` check)
- `css/style.css`: Fixed CSS where slide switch overlapped text (changed `input` to `display:none`)
- `admin.html`: Expanded system settings modal width from 700px → 820px (wide enough to avoid tab clipping)
- `js/admin.js`: Fixed `unauthorized-continue-uri` error in `verifyBeforeUpdateEmail` (removed actionCodeSettings)
- `auth-action.html`: Added `verifyAndChangeEmail` mode support

#### 5-2 UAT Specification Document (Notion)
- Created acceptance test specification in Notion (62 items)
  - URL: https://www.notion.so/31db36007a1981a9b236ee47894e2aad
- `admin.html`: Added "📋 Test Spec" button to header (links to Notion page)

#### E3-1 Deleted
- "System admin login screen" deemed unnecessary after E1-11 implementation; tagged as 【Not Required / Deleted】 in Notion WBS

---

## 2026-03-08 Work Log (continued 6)

### Completed Tasks

#### Phase 9 Security Tasks (All Completed)

**Priority: High**
- **H-1** Completely removed `setInitialAdmin` Function (from Cloud Functions and local source)
- **H-2** Functions CORS: Removed `localhost:5000` from allowed list; added reservation existence and email match validation before sending email
- **H-3** Migrated cancellation phone number verification to Firestore rules (`_cancelVerify == resource.data.phone`)

**Priority: Medium**
- **M-1** Fixed XSS vulnerabilities via `innerHTML` (3 locations in admin.js, app.js, cancel.js) → unified to `createElement('img')`
- **M-2** Firestore rule hardening: added field type and character length limit validation
- **M-3** Added format check + Firestore reservation lookup to Functions email sending
- **M-4** Added SRI (Subresource Integrity) to CDN scripts (pdf-lib, fontkit, Cropper.js)

**Priority: Low**
- **L-1** CORS localhost removal (covered in H-2, tagged as Done)
- **L-2** Changed reservation ID to UUID v4 (`crypto.randomUUID()`, 122-bit entropy)

#### Other
- Created staff account setup procedure doc (`documents/スタッフアカウント追加手順.md`)
- Admin screen header buttons show icon-only on mobile portrait (`btn-label` + CSS media query)
- Fixed FOUC (flash): `localStorage` theme cache + inline `<head>` script (applied to all 8 HTML files)
- Updated Skills library: Added CSS-Theme-Switcher (FOUC support), Zipcloud-Address-Autocomplete, Firebase-Admin-Claims

---

## 2026-03-08 Work Log (continued 7)

### Completed Tasks

#### Various Bug Fixes / Feature Additions

- **Fixed email sending failure**: Removed Firestore existence check from Functions (caused 403 due to race condition); kept only email format check
- **Fixed submission failure on second+ bookings**: Added `undefined` fallbacks for `visitType`, `insurance`, `contactMethod`, `symptoms`, `notes` (Firestore SDK rejects undefined values)
- **Fixed PDF reservation number overflow**: Changed UUID v4 (36 chars) to 2-line display at font size 7
- **Fixed PDF symptoms overflow**: Changed to 2-line display at 13 chars
- **Fixed full-width email normalization**: Added `toHankaku()` to normalize phone and email to half-width ASCII before saving
- **Added reservation number copy button**: Added `⧉` copy icon in 3 locations — completion screen, cancellation screen, and admin screen
- **Added password visibility toggle**: Added eye icon to all password input fields in login.html / admin.html / auth-action.html (6 total)

---

## 2026-03-08 Work Log (continued 8)

### Completed Tasks

#### Skill Library Update (memory/skills/)

- **`advanced-pdf-engine/SKILL.md`**: Added `wrapPdfText()` section (auto word wrap using CJK/ASCII character width estimation)
- **`input-validation/SKILL.md`**: Added `toHankaku()` section (§7) (full-width ASCII → half-width normalization)
- **`password-toggle/SKILL.md`**: Created new (eye icon password visibility toggle + copy button pattern)
- **`skills/README.md`**: Filled in #19–23 gaps and added #24 Password-Toggle

#### PDF Symptoms Full-Text Display Fix (app.js)

- Changed symptoms and notes to auto word wrap using `wrapPdfText()` (abolished 13-char clip method)

---

---

## 2026-03-09 Work Log

### Completed Tasks

#### Documentation — User Manual with Actual Screenshots

##### Playwright Screenshot Capture (Admin Side)

- Investigated and fixed login failure
  - Confirmed email address is `admin@kojinius.jp` (`.jp` not `.com`)
  - Identified issue where `browserSessionPersistence` async processing caused `time.sleep + URL check` to fail
  - Resolved by switching to `page.wait_for_url("**/admin.html", timeout=30000)`
- Resolved pointer-events interference with modal and settings tab
  - Changed `closeModal('detailModal')` / `openSettings()` / `switchSettingsTab()` to direct JS calls via `page.evaluate()`
- Successfully captured all 8 admin-side screenshots (08–15)

##### User Manual PPTX Overhaul (Real Screenshot Edition)

- Fully rewrote `documents/make_user_manual.py`
  - Changed from screen mockups to real screenshot embedding
  - Centered with aspect ratio preserved using PIL (Pillow)
  - 16:9 slides (13.33 × 7.5 inches)
  - 20 slides: cover, table of contents, 7 patient screens, 8 admin screens, summary
- Output: `documents/OnlineAppointSystem_ユーザーマニュアル.pptx` (1.3MB)
- Captured screenshots: 18 images under `documents/screenshots/`

#### Documents Folder Reorganization

- Reorganized into subdirectory structure (specs/ manuals/ scripts/ ops/ screenshots/)
- Renamed `福元鍼灸整骨院_本番運用ロードマップ.pptx` → `OnlineAppointSystem_本番運用ロードマップ.pptx`

#### Skill Library Update (pptx-engine)

- `bullet_block()` — Added helper to vertically stack `##` headings and `・` bullet points
- `divider_slide()` — Added full-color background chapter divider slide pattern
- `add_image_fit()` — Added image embed function that maintains aspect ratio and centers via PIL
- `screen_slide()` — Added 2-column slide pattern (left description pane + right screenshot)

---

---

## 2026-03-10 Work Log

### Completed Tasks

#### OAS Custom Domain Setup (oas.kojinius.jp)

- Created Firebase Hosting site `oas-kojinius`
- Changed `firebase.json` from single to array format for multi-site configuration (portfolio + oas, 2 targets)
- Added target settings to `.firebaserc`
- Added `oas.kojinius.jp` to Firebase Auth authorized domains (via REST API)
- DNS setup (Sakura DNS): 2-step flow of TXT verification → CNAME replacement
- SSL certificate obtained; connectivity confirmed ✅
- `apps/OnlineAppointSystem/js/app.js`: Changed font paths from absolute to relative (using `import.meta.url`)
- `apps/OnlineAppointSystem/js/auth.js`: Changed password reset URL from absolute to relative path

#### Portfolio Refresh

- `index.html`: Updated OAS link to `https://oas.kojinius.jp`
- `index.html`: Changed resume / curriculum vitae cards to open in new tab (`target="_blank"`)

#### ResumeCreator / CVCreator Mobile Scroll Bug Fix

- Fixed issue where preview tab was not displayed on mobile (`display: block !important` removed)
- Fixed page not scrolling on mobile
  - Cause: `overflow: hidden` on `body` / `app-container` was blocking scroll
  - Fix: Overrode with `height: auto; overflow: auto;` in mobile media query

#### Screenshot Recapture / Document Update

- `documents/capture_screenshots.py`: Updated oas.kojinius.jp / selectors to match latest HTML
- Recaptured OAS screenshots (login, dashboard, settings tabs, etc. — 14 images)
- Updated user manual (`manuals/OnlineAppointSystem_ユーザーマニュアル.pptx`) to latest spec
- Updated detailed design document (`specs/OnlineAppointSystem_詳細設計書.pptx`) to latest spec

---

## Upcoming Tasks

### Remaining Tasks (Last updated: 2026-03-10)

- [ ] **5-2 UAT**: Acceptance testing by client

---

## Phase Change Notes
- **4-4 Public Holiday API Integration** → Merged into Phase 6 "E1-3 Holiday Settings Feature"
  - Changed to allow admin-configurable holidays since the clinic may operate on public holidays
- **4-3 Phone Number / Address Placeholder Fix** → Deferred to Phase 6 Admin Enhancement

---

## Previous Upcoming Tasks (Reference)

1. **Admin Initial Setup (once before production launch)**
   1. Create staff account in Firebase Auth using staff email address
   2. Change setupKey in `setInitialAdmin` in `functions/index.js` and deploy
   3. Grant admin claim via `firebase functions:call setInitialAdmin --data '{"email":"...", "setupKey":"..."}'`
   4. Delete setInitialAdmin Function from Firebase Console
2. Phase 4: Privacy consent checkbox / privacy policy / phone and content edits / public holiday API / **Staff admin screen (staff account CRUD, admin claim grant/revoke)**
3. Phase 5: Firestore security rules deploy / UAT / Firebase Hosting production deploy

---

## 2026-03-06 Work Log (continued 2)

### Completed Tasks

#### Security: Firebase API Key Leak Alert Response
- Received API key exposure alerts from GitHub / Google Cloud
- Firebase Web API key is a client-side identifier by design; no actual harm done
- Added HTTP referrer restriction in GCP Console: only `https://kojinius.jp/*` allowed
- Decided to use Firebase Emulator for local development going forward

---

## Pre-Release Checklist (Don't forget!)

- [ ] Restrict `Editor` role on GCP to minimum required permissions (`214213328195-compute@developer.gserviceaccount.com`)
- [x] Delete `setInitialAdmin` Function from Firebase Console (completed 2026-03-06)
- [ ] Confirm whether staff management screen is needed (GUI for admin claim grant/revoke)
- [ ] In Firebase Console, go to "Authentication → Templates → Password Reset" and change Action URL to `https://kojinius.jp/reset-password-done.html`

### Copyright Verification (perform before release)

- [ ] **Step 1** Self-written code review (`js/` / `css/` / `functions/index.js`): Check for any logic of unknown origin
- [ ] **Step 2** Bulk npm package license check: `cd functions && npx license-checker --csv > ../documents/license-report.csv`
- [ ] **Step 3** Verify licenses for CDN libraries (identify all `<script src>` in HTML files)
- [ ] **Step 4** Confirm commercial use rights for fonts, icons, and images
- [ ] **Step 5** Verify compliance with external service ToS (Firebase / Resend / Public Holiday API)
- [ ] **Step 6** Prepare license attribution notices (handle MIT etc. Attribution requirements)

---

---

## 2026-03-11 Work Log

### Completed Tasks

#### Bug Fix: "Failed to fetch" Error in User Management Tab

- **Cause**: `https://oas.kojinius.jp` was not included in the CORS allowed list in `functions/index.js`
  - Allowed list was only `["https://kojinius.jp"]`, blocking requests from the `oas.kojinius.jp` subdomain
- **Fix**: Added `"https://oas.kojinius.jp"` to the `allowed` array
- **Affected Functions**: Common CORS header function affecting `listUsers` (user list retrieval), `deleteUser`, and `createAdminUser`
- Deployed Firebase Functions to production ✅

---

## 2026-03-11 Work Log (2)

### Completed Tasks

#### Feature: Allow Admin to View Patient Pages During Maintenance

- **Target file**: `apps/OnlineAppointSystem/js/app.js`
- **Details**: Made `checkMaintenancePeriod` async and waits for Auth initialization to complete via `onAuthStateChanged` before checking admin claim
  - Users with admin claim will not be redirected to `maintenance.html` during maintenance
  - Fixed issue where `auth.currentUser` returned `null` before initialization by using `onAuthStateChanged`
- Deployed to Firebase Hosting ✅

---

## Notes
- Sakura rental server contract is not needed (replaced by Firebase Hosting)
- Sakura DNS MX record data field format: `priority + single space + hostname.`

---

## 2026-03-11 Work Log (3)

### Completed Tasks

#### Feature: Forced Initial Password Change

- **Target files**:
  - `functions/index.js`: Sets `users/{uid}.mustChangePassword=true` in Firestore when creating a user via `createAdminUser`
  - `apps/OnlineAppointSystem/login.html`: After successful login, checks Firestore flag → if `true`, redirects to `admin.html?forcePasswordChange=1`
  - `apps/OnlineAppointSystem/admin.html`: Added warning banner to Account Settings tab
  - `apps/OnlineAppointSystem/js/admin.js`:
    - Detects `?forcePasswordChange=1` on page load; automatically opens settings modal and switches to Account Settings tab
    - Updates `mustChangePassword=false` and hides banner after password change is complete
    - Disables close (×) button, cancel button, outside-modal click, and other tab switching during forced change (determined by `isForcePasswordChange()`)
  - `firestore.rules`: Added rules for `users/{userId}` collection (read by self / update only `mustChangePassword` field)
- Separated try-catch so that Firestore write failures are not treated as user creation failures

---

## 2026-03-12 Work Log (2)

### Completed Tasks

#### [SEC-11] Security Fix: Cloud Functions Rate Limiting

- **Problem**: All 5 public Cloud Functions (`sendReservationEmail`, `notifyAdminOnReservation`, `createAdminUser`, `listUsers`, `deleteUser`) had no rate limiting, enabling DoS and billing abuse
- **Fix**: Added IP-based rate limiting (5 req/min per IP, in-memory Map with 60-second sliding window) to all functions
- **Changed files**:
  - `functions/index.js`: Added `[SEC-11]` rate limiting block to each of the 5 functions

#### [SEC-5] Security Fix: Cancel Authentication — Server-Side Phone Verification

- **Problem**: Reservation cancellation was performed via client-side `writeBatch` with phone verification only on Firestore rules (`_cancelVerify`). Slot cancellation had no phone verification at all — anyone knowing the `date_time` slot ID could cancel any slot
- **Solution**: Moved cancellation to a new `cancelReservation` Cloud Function with server-side verification; removed all unauthenticated `allow update` rules from Firestore
- **Changed files**:
  - `functions/index.js`: Added `cancelReservation` Cloud Function
    - Server-side phone number verification (normalized comparison)
    - Unified error message for not-found and phone-mismatch (enumeration attack prevention)
    - Cancel cutoff check using `settings/clinic.cancelCutoffMinutes`
    - Firestore transaction for atomic reservation + slot cancellation
    - IP-based rate limiting
  - `apps/OnlineAppointSystem/js/cancel.js`: Replaced `writeBatch` with `fetch(cancelReservation)`; added `getFunctionUrl()` helper; removed `writeBatch` import
  - `firestore.rules` (OAS): Removed unauthenticated `allow update` from both `reservations` and `slots`
- **Test results** (all PASS):
  - Normal cancel: 200 + success
  - Wrong phone number: 404 "予約が見つかりません" (enumeration prevention)
  - Nonexistent booking: 404
  - Double cancel: 400 "すでにキャンセル済み"
  - Missing params: 400
  - Browser cancel.html: Confirmed working after hard refresh

#### [SEC-3] Security Fix: Unauthenticated Reservation Read Access

- **Problem**: `allow get: if request.auth == null;` in Firestore rules allowed anyone with a reservation ID to read full reservation data without authentication
- **Solution**: Created `verifyReservation` Cloud Function that requires phone number verification before returning reservation data; removed unauthenticated `allow get` from rules
- **Changed files**:
  - `functions/index.js`: Added `verifyReservation` Cloud Function (phone verification + field filtering + rate limiting)
  - `apps/OnlineAppointSystem/js/cancel.js`: Replaced `getDoc()` with `fetch(verifyReservation)` in `searchBooking()`
  - `firestore.rules` (OAS + AMS): Removed `allow get: if request.auth == null` from reservations
- **Test results**: Normal verify OK, wrong phone → 404 (enumeration prevention), nonexistent ID → 404

#### [SEC-4] Security Fix: mustChangePassword Flag Write Failure Rollback

- **Problem**: If Firestore write of `mustChangePassword` flag failed after Auth user creation, user was created without the forced password change flag (silent failure)
- **Fix**: On Firestore write failure, delete the Auth user and return error (rollback)
- **Changed file**: `functions/index.js` `createAdminUser`

#### [SEC-6] Security Fix: Email Address Full Exposure in Admin Panel

- **Problem**: User management table displayed full email addresses and exposed UIDs in `data-uid` attributes and `onclick` handlers
- **Fix**: Email masked display (e.g. `a*****@test.com`), removed `data-uid` attribute, replaced `onclick` with `addEventListener` using closure-managed UID
- **Changed file**: `apps/OnlineAppointSystem/js/admin.js` `loadUserList()`
- Also fixed: `FN_URL` helper now supports localhost for emulator testing

---

## 2026-03-12 Work Log (2)

### Tasks Completed

#### [SEC-8] Security Fix: Cancel Reservation TOCTOU Race Condition

- **Problem**: `cancelReservation` read reservation status outside Firestore transaction — TOCTOU race condition on concurrent cancel requests
- **Fix**: Added `tx.get(resRef)` inside transaction to re-verify status atomically; throws `ALREADY_CANCELLED` on stale status
- **Changed file**: `functions/index.js` (`cancelReservation`)

#### [SEC-19] Security Fix: Password Complexity + Email Validation (Input-Validation Skill)

- **Problem**: Only `password.length < 8` was checked; weak passwords accepted. Email validation too permissive (`test@test.com......` accepted)
- **Fix**: All 4 character categories required (uppercase + lowercase + digit + symbol), 8–128 chars. Stricter email regex rejecting consecutive/trailing dots and missing TLD
- **Server-side**: `validatePasswordComplexity()` + `validateEmail()` in `functions/index.js`, applied to `createAdminUser`
- **Client-side**: `checkPasswordComplexity()`, `isValidEmail()`, `toHankaku()` helpers in `apps/OnlineAppointSystem/js/admin.js`
- **UX fixes**:
  - Added `userMgmtMsg` div outside add-user form for persistent feedback (delete/add success messages)
  - Add-user form auto-closes on success
  - Placeholders updated to reflect complexity requirements
- **Skill updated**: `skills/input-validation/SKILL.md` — added `password()` validator, improved `email()` regex, added client-side helpers section

#### Security Task Inventory Verification

- Verified all 22 SEC tasks in Notion "AMS,OASにおける既知の課題点" database
- **Completed: 12 tasks** (SEC-1, 2, 3, 4, 5, 6, 7, 8, 11, 17, 18, 19)
- **Remaining: 10 tasks** (confirmed):
  | Priority | ID | Task | Severity | Effort |
  |---|---|---|---|---|
  | 7 | SEC-22 | [共通] settingsコレクションのlist許可 | P2-Medium | S |
  | 8 | SEC-20 | [AMS] admin.htmlグローバル関数公開+onclick | P3-Low | M |
  | 9 | SEC-9 | [AMS] sessionStorageに勤務情報保存 | P2-Medium | M |
  | 9 | SEC-21 | [共通] CDNスクリプトにSRIハッシュなし | P3-Low | S |
  | 10 | SEC-10 | [OAS] グローバル関数のwindow公開 | P2-Medium | M |
  | 12 | SEC-12 | [OAS] 郵便番号API呼び出しの検証不足 | P2-Medium | S |
  | 13 | SEC-13 | [共通] Firebase APIキーのハードコード | P2-Medium | M |
  | 14 | SEC-14 | [OAS] 監査ログの欠如 | P3-Low | M |
  | 15 | SEC-15 | [共通] CSPヘッダー不完全 | P3-Low | S |
  | 16 | SEC-16 | [AMS] console.logデバッグコード残存 | P3-Low | S |

---

## 2026-03-12 Work Log (3)

### Tasks Completed

#### Security Hardening: OAS-Related SEC Tasks Completed

##### [SEC-10] window global function exposure removed
- **Problem**: `window.saveAccount` in `js/admin.js` exposed module-scoped function globally
- **Fix**: Changed to regular function `saveAccount()`; bound via `addEventListener('click', saveAccount)` at init; removed `onclick` from `admin.html`
- **Changed files**: `apps/OnlineAppointSystem/js/admin.js`, `apps/OnlineAppointSystem/admin.html`

##### [SEC-12] zipcloud API response validation
- **Problem**: `json.results[0]` accessed without array/length check; address fields used without type or length validation
- **Fix**: Added `Array.isArray(json.results) && json.results.length > 0` guard; each address field validated with `typeof === 'string' ? .slice(0, 50) : ''`
- **Changed files**: `apps/OnlineAppointSystem/js/admin.js`, `apps/OnlineAppointSystem/js/app.js`

##### [SEC-14] Audit logging added to Cloud Functions
- **Problem**: No structured logging for security-critical events
- **Fix**: Added `auditLog(event, data)` helper; logs to GCP Cloud Logging as JSON with severity `INFO`
  - Events: `reservation.created`, `reservation.slot_taken`, `reservation.cancelled`, `user.created` (emailDomain only), `user.deleted`, `rate_limit.exceeded`
- **Changed file**: `functions/index.js`

##### [SEC-15] CSP headers — full implementation via firebase.json
- **Fix**: Added complete security header set to both `portfolio` and `oas` targets in `firebase.json`
  - `frame-src https://www.google.com https://maps.google.com` (Google Maps embed support)
  - `connect-src` includes `*.a.run.app`, `zipcloud.ibsnet.co.jp`, `holidays-jp.github.io`
  - `X-Frame-Options: SAMEORIGIN` (DENY avoided due to Google Maps iframe)
- **Changed file**: `firebase.json`
