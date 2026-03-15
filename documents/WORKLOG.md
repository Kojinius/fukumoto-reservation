# Fukumoto Acupuncture Clinic Online Appointment System (OAS) — Work Log

## Project Overview
- **Domain**: kojinius.jp
- **Firebase**: Online Appointment System
- **Architecture**: Vite + React 19 + TypeScript 5 + Tailwind CSS 3.4 / Firebase v10 (Auth / Firestore / Functions / Hosting)
- **Deployment**: Firebase Hosting (oas.kojinius.jp)
- **Start Date**: 2026-03-05

> **Archive**: Logs before 2026-03-12 → `G:/マイドライブ/Workspace/archive/WORKLOG_Backup/WORKLOG_Archive.md`

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

##### [SEC-13] Firebase API Key Hardcoding — Won't Fix (By Design)

- **Analysis**: Firebase Web API key is a client-side identifier, not a secret (per Firebase official docs)
- **Protections verified**: Domain restriction (3 domains only) + 25 API restriction + private repos + hardened Firestore Rules + rate limiting
- **Action taken**: Added rationale comment to `apps/OnlineAppointSystem/js/config.js`
- **Decision**: Closed as Won't Fix

##### [SEC-15] CSP headers — full implementation via firebase.json
- **Fix**: Added complete security header set to both `portfolio` and `oas` targets in `firebase.json`
  - `frame-src https://www.google.com https://maps.google.com` (Google Maps embed support)
  - `connect-src` includes `*.a.run.app`, `zipcloud.ibsnet.co.jp`, `holidays-jp.github.io`
  - `X-Frame-Options: SAMEORIGIN` (DENY avoided due to Google Maps iframe)
- **Changed file**: `firebase.json`
---

## 2026-03-15 Work Log

### Tasks Completed

#### [OAS-DOC-T01] Document Rewrite — Detailed Design Document v2 (22 slides)

- **Scope**: Full rewrite of `documents/make_design_doc.py` and regenerated `documents/specs/OnlineAppointSystem_詳細設計書.pptx`
- **Key updates**: React SPA tech stack (Vite + React 19 + TypeScript 5 + Tailwind CSS 3.4 + React Router 7), Bold Navy×Gold design system, updated directory structure (oas-spa/src/), 7 Cloud Functions, comprehensive Firestore rules (isAdmin/isValidReservation), all 12 SEC fixes reflected, new slides: 予約作成フロー / レート制限 / audit_logs / レガシー URL リダイレクト
- **Security emphasis**: 4 dedicated security slides (認証認可 / Firestore rules / XSS+validation / rate limiting+audit)

#### [OAS-DOC-T02] Document Rewrite — User Manual v2 (23 slides)

- **Scope**: Full rewrite of `documents/make_user_manual.py` and regenerated `documents/manuals/OnlineAppointSystem_ユーザーマニュアル.pptx`
- **Key updates**: SPA routes (/cancel, /privacy-policy, /login, /admin, /admin/settings, /admin/change-password), パスワード変更強制フロー, リマインダーメール slide, セキュリティ注記 (電話番号照合・パスワード要件) 追加

#### [OAS-DOC-T03] Screenshot Capture Script Rewrite

- **Script**: Full rewrite of `documents/capture_screenshots.py` for React SPA
- **Changes**: SPA routes (/cancel not /cancel.html, /privacy-policy, /login, /admin/settings tabs via button click), `domcontentloaded` + fixed wait (Firebase listener 対策), `exact=True` ラベル選択, 管理者タブは button role クリックで遷移
