# OAS SPA — Remaining Tasks

## Completed: 9/9 Phases + Security Audit + V3 Redesign

### Phase 9: Test + Deploy [DONE]
- [x] [OAS-P9-T01] Full build verification (`tsc --noEmit` + `vite build`)
- [x] [OAS-P9-T02] Manual testing: all 4 booking steps
- [x] [OAS-P9-T03] Manual testing: cancel flow
- [x] [OAS-P9-T04] Manual testing: admin dashboard + settings
- [x] [OAS-P9-T07] Deploy to production: `firebase deploy --only hosting:oas`
- [x] [OAS-P9-T08] Production smoke test

### Security Audit [DONE]
- [x] Full security audit: 12 findings identified and fixed
- [x] Re-audit: 3 regressions caught and fixed
- [x] Email endpoints internalized (no longer exposed as HTTP)
- [x] CORS, rate limiting, error sanitization, CSP hardened
- [x] Firestore rules updated (audit_logs, reservation split rules)

### V3 Redesign [DONE]
- [x] Bold Navy × Gold theme applied (AMS-quality)
- [x] AuthLayout split-screen with gold concentric circles
- [x] Box-style inputs + gold focus ring
- [x] Button shadow lift + Card rounded-xl + Modal strong backdrop
- [x] Background darkened to #EDE9E0

### Admin Features [DONE]
- [x] Password change page (forced + voluntary modes)
- [x] Admin user CRUD (HTTP method fix, 429 fix, limit 2)
- [x] Announcement/maintenance clear buttons
- [x] Legacy URL 301 redirects (OAS + AMS)

---

### Remaining / Future Improvements
- [ ] [OAS-P9-T05] Dark mode testing across all pages
- [ ] [OAS-P9-T06] Mobile responsive audit
- [ ] PDF receipt/summary export for reservations
- [ ] Reservation email templates (currently plain text via Cloud Functions)
- [ ] Accessibility audit (screen reader, keyboard navigation)
- [ ] Performance: lazy loading for admin routes
