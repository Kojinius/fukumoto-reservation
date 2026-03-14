# OAS SPA — Work Log

## Project Overview
Full migration of the Online Appointment System (OAS) from Vanilla HTML/CSS/JS MPA to Vite 8 + React 19 + TypeScript + Tailwind CSS SPA. Shares the same Firebase project as AMS (`project-3040e21e-879f-4c66-a7d`). Functions region: `us-central1`.

---

## 2026-03-14 — Phase 0-8: Full SPA Implementation

### Phase 0: Scaffolding
- [OAS-P0-T01] Vite + React + TS project initialization
- [OAS-P0-T02] Dependencies installed (firebase, react-router-dom, pdf-lib, clsx, tailwind-merge)
- [OAS-P0-T03] Tailwind CSS configured with "Lien Rapport" palette
- [OAS-P0-T04] Vite config: @/ alias, manualChunks (firebase/vendor/pdf), port 5174
- [OAS-P0-T05] Firebase SDK initialization with emulator auto-detect

### Phase 1: Foundation
- [OAS-P1-T01] TypeScript types: ReservationRecord, ClinicSettings, UserProfile
- [OAS-P1-T02] 12 UI components: Button, Input, Select, Textarea, Card, Badge, Modal, Spinner, EmptyState, Alert, Toast, ThemeToggle
- [OAS-P1-T03] Contexts: AuthContext (OAS login), ThemeContext, ToastContext
- [OAS-P1-T04] Layouts: PatientLayout, AuthLayout, AdminLayout (with auth guard)
- [OAS-P1-T05] Utilities: cn, date (calcAge, formatDateShort), security, validation, zip
- [OAS-P1-T06] Routing in App.tsx (6 routes + 404)
- [OAS-P1-T07] ClinicContext: real-time Firestore listener, maintenance mode detection

### Phase 2-3: Patient Booking Flow
- [OAS-P2] PatientLayout with Header (clinic name/logo/phone), announcement banner, footer
- [OAS-P3-T01] 4-step booking wizard (DateTimeSelect → PatientForm → Confirm → Complete)
- [OAS-P3-T02] Calendar component: month view, holiday/business hours awareness
- [OAS-P3-T03] TimeSlots: AM/PM split, 30min slots, booked/past detection, remaining count
- [OAS-P3-T04] PatientForm: 3-section form, zipcode lookup, age auto-calc, consent validation
- [OAS-P3-T05] Confirm: review all data with age display
- [OAS-P3-T06] Complete: success message, booking ID copy, cancel button (/cancel link with state)
- [OAS-P3-T07] Reservation hooks: createReservation, fetchBookedSlots, sendConfirmationEmail, notifyAdmin
- [OAS-P3-T08] SLOT_TAKEN recovery: re-fetch slots and return to step 1

### Phase 4: Cancel + Static Pages
- [OAS-P4-T01] Cancel page: ID+phone search → detail → cutoff check → cancel via Cloud Functions
- [OAS-P4-T02] Cancel page accepts bookingId via React Router state (from Complete page)
- [OAS-P4-T03] PrivacyPolicy, Maintenance, NotFound pages

### Phase 5: Auth
- [OAS-P5-T01] Login page: email/password, redirect to /admin
- [OAS-P5-T02] AuthAction: Firebase email actions handler

### Phase 6: Admin Dashboard
- [OAS-P6-T01] KPI cards (today/month/new patients/pending)
- [OAS-P6-T02] Reservation table with status/date/name filters
- [OAS-P6-T03] Detail modal with status change actions
- [OAS-P6-T04] CSV export

### Phase 7: Admin Settings
- [OAS-P7-T01] 5-tab settings panel (基本情報, 営業時間, 休日, お知らせ, アカウント)
- [OAS-P7-T02] Business hours editor per weekday
- [OAS-P7-T03] Holiday manager with Japanese holiday auto-fetch
- [OAS-P7-T04] Announcement banner config
- [OAS-P7-T05] Maintenance mode config
- [OAS-P7-T06] Admin user CRUD

### Phase 8: Integration
- [OAS-P8-T01] firebase.json: OAS hosting target → oas-spa/dist
- [OAS-P8-T02] CSP hardened: removed CDN sources (unpkg, cdnjs), SPA bundles everything
- [OAS-P8-T03] Cache headers: assets/** with Cache-Control immutable
- [OAS-P8-T04] Portfolio ignore updated: oas-spa/**, legacy/**

### Design Improvements
- Applied frontend-design skill for production-grade aesthetics
- "Lien Rapport" warm palette with bold accent orange usage
- Background: warm gradient scene with floating orange/purple orbs
- Header: gradient logo icon (heart), accent stripe, phone pill button
- Cards: section color-coding (orange=basic, purple=contact, green=medical) via left border
- Hero banner: orange gradient with dot pattern overlay for Confirm/Complete/Login
- Complete page: confetti animation (40 pieces, 8 colors, fixed positioning, 5s duration)
- StepBar: gradient circles, check-pop animation, animated connector progress
- Calendar: year in mono accent, hover scale, gradient selected state
- Input fields: width-appropriate sizing (zip=w-32, phone=w-44, gender=8rem)
- Consent checkbox: green border on checked state
- Staggered entrance animations across all booking steps

### Bug Fixes
- Generalized clinic name (removed hardcoded 福元鍼灸整骨院)
- Added calcAge() for automatic age display
- Consent error moved inline (not top-of-form)
- Email required when contactMethod is メール
- CSS @import order fixed (before @tailwind directives)
- Firebase emulator admin claim setup via firebase-admin
- Vite 8 Rolldown function-format manualChunks

---

## 2026-03-15 — V3 Redesign + Security Audit + Admin Features

### V3 Redesign: Bold Navy × Gold (AMS-quality)
- Applied AMS design analysis: split-screen AuthLayout, box-style inputs, shadow lift buttons
- Updated 12 core files: Button, Input, Select, Card, Modal, AuthLayout, Header, Login, Complete, NotFound, Maintenance, Dashboard
- AuthLayout: navy-900 gradient left panel + gold concentric circles + decorative dots
- Input/Select: box-style with `rounded-lg` + `focus:ring-2 focus:ring-gold/30`
- Button: `shadow-sm hover:shadow-md hover:-translate-y-px` lift effect
- Card: upgraded to `rounded-xl`
- Modal: `bg-black/40 backdrop-blur-sm` + `shadow-xl`
- Background: darkened from `#FAFAF8` to `#EDE9E0` (cream palette adjusted)
- Tailwind config: cream DEFAULT `#EDE9E0`, 100 `#E8E4DA`, 200 `#DDD8CD`

### UI/UX Fixes
- Gender select: widened to `w-[5.5rem]` to prevent text cutoff
- Age badge: always visible ("— 歳" when birthdate empty)
- PrivacyPolicy: removed `dangerouslySetInnerHTML`, added `parseSections()` for numbered-paragraph splitting
- PatientForm: added `isValidPhone`, `isValidEmail`, `isValidFurigana`, `isValidZip` validation
- Announcement banner: 3 distinct visual styles (info=sky+info icon, warning=amber+triangle, maintenance=navy+wrench)
- Dashboard: replaced "電話する" button with "閉じる" button in reservation detail modal

### Admin Features
- [OAS-P7-T06] Admin password change page (`ChangePassword.tsx`): forced mode (`?forced=1`), reauthentication, `isStrongPassword` validation, live requirement indicators
- Admin user CRUD fix: `callFunction` HTTP method support (GET for listUsers, DELETE for deleteUser)
- Admin user list refresh: `await fetchUsers()` after create/delete
- 429 fix: lifted `useAdminUsers()` to Settings parent to prevent re-fetch on tab switch
- Admin user limit: max 2 accounts with Alert warning + form disable
- Announcement tab: clear button for banner settings
- Maintenance tab: clear button for date fields
- Maintenance page: "更新して確認" refresh button with `isMaintenanceOver()` check
- Settings zip auto-lookup: converted to `useEffect` pattern (CVCreator-style)

### Security Audit — 12 Findings Fixed
- [SEC-EMAIL] Email endpoints (`sendReservationEmail`, `notifyAdminOnReservation`) converted to internal helpers — no longer exposed as HTTP endpoints
- [SEC-CORS] CORS whitelist enforced on all endpoints (production domain + localhost)
- [SEC-RATE] Rate limiter memory leak fixed: entries older than 60s evicted
- [SEC-ERR] Error message leakage fixed in `createAdminUser`, `listUsers`, `deleteUser` — generic fallback only
- [SEC-XSS] Removed `dangerouslySetInnerHTML` from PrivacyPolicy
- [SEC-CSP] CSP headers tightened (removed CDN sources, added `*.cloudfunctions.net` to connect-src)
- [SEC-ADMIN-SUBJECT] Admin notification email subject changed from patient name to generic text
- [SEC-AUDIT] CSV export audit logging added to `audit_logs` Firestore collection
- [SEC-RULES] Firestore rules: `audit_logs` collection added, reservations split into create (validated) / update,delete

### Re-Audit — 3 Regression Fixes
- `audit_logs` Firestore rule was missing — added `allow create/read: if isAdmin()`
- `listUsers`/`deleteUser` still leaked `err.message` — replaced with generic fallback
- Admin email subject leaked patient name — changed to generic "【新規予約】新しい予約が入りました"

### Deployment
- Firestore rules deployed from AMS side (canonical, shared between AMS/OAS)
- Cloud Functions deployed (deleted orphaned email endpoints first)
- OAS Hosting deployed with updated CSP
- Legacy URL 301 redirects added: OAS (`/login.html`, `/index.html`, `/admin.html`, `/cancel.html`)
- AMS legacy 301 redirects added: all `.html` pages (login, admin, attendance-*, shift-*, etc.)
- Verified production: `https://oas.kojinius.jp/` all routes working
