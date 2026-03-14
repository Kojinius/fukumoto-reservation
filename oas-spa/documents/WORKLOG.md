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
