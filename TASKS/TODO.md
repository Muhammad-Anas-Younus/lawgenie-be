# LawGenie — Build TODO

Tracks every remaining backend + frontend task to bring the platform up to the
current [PRD](../documentation/PRD.md). Backend and frontend halves of the
same feature are kept adjacent so whoever (or whichever agent) picks up a
feature does both sides before moving on.

## How to use this file

Phases 0–5 are done (kept below for the record). Everything after that is
organized into **waves**, not a flat sequence — within a wave, the listed
**tracks** have no file overlap and no dependency on each other, so they're
meant to be worked in parallel (separate branches/worktrees, one agent per
track). A wave doesn't start until every track in the previous wave has
merged.

- Within a track, still work top to bottom — a track's own tasks are
  sequential.
- Don't start a task whose stated dependency hasn't merged yet, even if it's
  technically the "next" line in the file.
- If a task turns out to need something not listed here, add a task for it in
  place rather than improvising undocumented scope.
- Checking a box means the work is done AND verified working (manually hit the
  endpoint / clicked through the page), not just written.

## Parallel execution model

- Each track gets its own branch: `track/a`, `track/b`, `track/c`, `track/d`,
  etc. (reuse the letter for a track across waves if it's a continuation,
  e.g. Track B in Wave 1 and Wave 2 are the same branch/agent).
- Never push directly to `master`. A track's branch merges to `master` only
  once every task in it for the current wave is checked off and verified.
- A track's dependency (e.g. "needs 6.3") means: wait until the branch that
  did 6.3 has actually merged to `master`, then branch the dependent track
  off the updated `master` — don't build on top of another track's
  unmerged branch.
- If two tracks in the same wave turn out to touch the same file after all,
  stop and flag it rather than pushing through — that's a sign the track
  split needs adjusting, not just a merge conflict to power through.

## Locked decisions (don't re-litigate these)

- **Database**: PostgreSQL + Prisma.
- **File storage**: local disk (`uploads/` on the backend), not cloud storage.
- **Auth**: JWT, stateless — no server-side session store.
- **No** payment gateway, **no** escrow — payments are verified via manually
  uploaded screenshots + admin approval (see PRD §6.7).
- **No** Case Agent role — admin absorbs those responsibilities (see PRD §4.4).
- **No** 2FA, **no** client tiers/CNIC-for-clients, **no** SMS, **no** OCR.
- Mufti consultation is **lawyer-only** — clients have no direct Mufti access,
  only the AI chatbot (see PRD §6.5).
- A client can have only **one Active case at a time**; lawyers have no such
  limit (see PRD §6.6).
- A lawyer can only send a case proposal after a prior **approved**
  consultation with that client — no cold proposals.
- Messaging threads are scoped **per consultation / per case**, not one
  continuous inbox per client-lawyer pair.

## Repo map

- Backend: `/home/anas/Documents/Code/lawgenie-be` (this repo) — Express API.
- Frontend: `/home/anas/Documents/Code/lawgenie-frontend` — React + Vite +
  react-router + TanStack Query. All frontend paths below are relative to
  `lawgenie-frontend/src/` unless stated otherwise. Every page currently
  renders hardcoded dummy arrays (look for `// Call API here` comments) —
  wiring a page means replacing that dummy data with real fetches and wiring
  up the actions (buttons, forms) to real mutations.

---

## Phase 0 — Foundations

- [x] **0.1** Backend: `npm install prisma @prisma/client` and `npx prisma init`;
      add `DATABASE_URL` to `.env.example`.
- [x] **0.2** Backend: Stand up a Postgres instance (local Docker or a
      free-tier host — Neon/Supabase/Railway) and confirm `npx prisma migrate dev`
      runs cleanly against it.
- [x] **0.3** Backend: Install `bcrypt`, `jsonwebtoken`, `multer`, and a
      validation library (`zod` recommended).
- [x] **0.4** Backend: Create a gitignored `uploads/` directory with
      subfolders `payments/`, `documents/`, `credentials/`; add a route to
      serve/download files with an auth check (not plain `express.static` for
      anything sensitive).
- [x] **0.5** Backend: Add shared Express middleware: `requireAuth`,
      `requireRole(...roles)`, a centralized error handler, and a request
      validation wrapper.
- [x] **0.6** Frontend: Create `src/lib/apiClient.js` — a fetch wrapper that
      attaches the JWT, handles 401 (redirect to `/login`), and centralizes
      base-URL/error handling. Leave the existing chatbot `src/lib/api.js` as
      is or fold it in.
- [x] **0.7** Frontend: Create an `AuthContext`/`useAuth` hook (stores user +
      token, exposes `login`/`logout`) and a `ProtectedRoute` component.

---

## Phase 1 — Auth & Accounts

- [x] **1.1** Backend: Prisma models — `User` (id, email, phone,
      passwordHash, role enum `CLIENT|LAWYER|MUFTI|ADMIN`, createdAt),
      `LawyerProfile`, `MuftiProfile`, `AdminProfile` (1:1 with `User`).
- [x] **1.2** Backend: `POST /api/auth/register`, `POST /api/auth/verify-otp`,
      `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- [x] **1.3** Backend: OTP service (generate + expiry + verify). No real SMS
      gateway — for now, log/return the OTP in the API response in
      non-production mode.
- [x] **1.4** Backend: Lawyer & Mufti registration endpoints accepting
      credential file uploads (Bar Council license/CNIC for lawyers, Islamic
      credentials for muftis); new accounts start `PENDING_VERIFICATION`.
- [x] **1.5** Backend: JWT issuing/verification middleware with role embedded
      in the token claims.
- [x] **1.6** Frontend: Wire `RegisterPage.jsx` to real registration (role
      selection + OTP step) and `LoginPage.jsx` to `/api/auth/login`.
- [x] **1.7** Frontend: Add post-login redirect by role → `/client/dashboard`,
      `/lawyer/dashboard`, `/mufti/dashboard`, `/admin/dashboard`.
- [x] **1.8** Frontend: Wrap all `/client/*`, `/lawyer/*`, `/mufti/*`,
      `/admin/*` routes in `App.jsx` with `ProtectedRoute`; keep `/`, `/about`,
      `/browse`, `/lawyer/:id` public (no login required, per PRD).

---

## Phase 2 — Lawyer Directory (public, no auth)

- [x] **2.1** Backend: `GET /api/lawyers` (filters: specialization, location,
      price range, rating, availability) + `GET /api/lawyers/:id`.
- [x] **2.2** Backend: Authenticated `PATCH /api/lawyers/me` for a lawyer to
      edit their own profile (specialization, fees, availability calendar,
      languages, jurisdictions).
- [x] **2.3** Backend: `GET /api/lawyers/recommendations?caseType=...` —
      reuse the existing Gemini setup in `src/config/gemini.js`.
- [x] **2.4** Frontend: Wire `BrowseLawyersPage.jsx` search/filters/list to
      2.1.
- [x] **2.5** Frontend: Wire `LawyerDetailPage.jsx` to `GET /api/lawyers/:id`;
      wire the "compare up to 3" UI if present.
- [x] **2.6** Frontend: Wire `lawyer/LawyerProfile.jsx` (the lawyer's own
      editable profile) to 2.2.

---

## Phase 3 — Consultations & Payment-Screenshot Flow

- [x] **3.1** Backend: Prisma models — `Consultation` (clientId, lawyerId,
      fee, status: `pending_payment|pending_review|approved|rejected|completed`),
      `Payment` (polymorphic FK: consultationId/caseId/milestoneId/
      muftiQueryId — nullable, exactly one set; screenshotUrl, status,
      reviewedById, reason).
      Consultations are video meetings: `Consultation` also carries
      `scheduledAt` and a `meetingLink` (populated once Phase 4's admin
      approval generates one — see Phase 4.1).
- [x] **3.2** Backend: `POST /api/consultations` (client, auth required —
      this is the first point a client account is needed), `POST
/api/payments` (multipart screenshot upload tied to a target),
      `GET /api/consultations/mine`, `GET /api/consultations/:id`.
- [x] **3.3** Backend: Confirm browsing/chatbot endpoints (Phase 2, chat
      route) remain unauthenticated while booking requires auth.
- [x] **3.4** Frontend: Wire `client/ConsultationsPage.jsx` (list) and
      `client/ConsultationDetailPage.jsx` (payment screenshot upload + status)
      to 3.2. Rebuilt these pages from scratch — the old mockups modeled
      consultations as video/phone/chat calls with AI-generated transcripts
      and per-session scores, none of which exist in the PRD/PROPOSAL; the
      real flow is book → pay → admin review → meeting link.
- [x] **3.5** Frontend: Wire `lawyer/LawyerConsultationsPage.jsx` and
      `lawyer/LawyerConsultationDetailPage.jsx` to 3.2. No lawyer-side
      accept/decline step exists in the PRD's actual booking flow (PRD
      §steps 4-6) — admin payment approval is the only gate — so the lawyer
      view is read-only (see incoming bookings, join the meeting once
      approved); "Send Proposal" is stubbed pending Phase 6.

---

## Phase 4 — Admin Payment Verification & User Verification

- [x] **4.1** Backend: `GET /api/admin/payments/pending`, `PATCH
/api/admin/payments/:id` (approve/reject + reason) — approval flips the
      linked consultation/case/milestone/mufti-query to "paid" and unlocks
      the next step.
- [x] **4.2** Backend: `GET /api/admin/verifications/pending` (lawyers +
      muftis), `PATCH /api/admin/verifications/:id` (approve/reject).
- [x] **4.3** Backend: Apply `requireRole('ADMIN')` to every `/api/admin/*`
      route.
- [x] **4.4** Frontend: Add a payments queue to the admin area (new route
      `/admin/payments`, new page or a tab inside `AdminDashboardPage.jsx`)
      wired to 4.1.
- [x] **4.5** Frontend: Wire the existing "Verification Queue" widget in
      `admin/AdminDashboardPage.jsx` (currently the dummy
      `PENDING_VERIFICATIONS` array) to 4.2.

---

## Phase 5 — Messaging

- [x] **5.1** Backend: `Message` model (threadType `CONSULTATION|CASE`,
      threadId, senderId, body, attachmentUrl, createdAt); `GET/POST
/api/threads/:type/:id/messages`.
- [x] **5.2** Backend: Enforce "no contact until paid" — reject sends on a
      consultation/case whose payment isn't yet approved.
- [x] **5.3** Frontend: Wire `lawyer/MessagesPage.jsx` to 5.1; add the
      equivalent thread UI inside `client/ConsultationDetailPage.jsx` (and
      later the case views in Phase 7) for the client side.

---

## Wave 1 — start now (2 tracks in parallel)

### Track A — small independents (branch `track/a`)

No dependency on anything below Phase 5. Bundle these together — none of
them touch a file another Wave-1/2 track touches.

- [x] **10.1** Backend: `Document` model (ownerId, caseId nullable, category
      `pleading|evidence|court_order|personal|credential`, url, version,
      uploadedAt); `POST /api/documents`, `GET /api/documents?caseId=`, with
      versioning on re-upload of the same logical document.
- [x] **10.2** Frontend: Wire `lawyer/LawyerDocumentsPage.jsx` (cross-case
      document library) to 10.1.
- [x] **12.1** Backend: `GET/PATCH /api/users/me/settings` (profile info,
      password change, notification prefs — shared across roles).
- [x] **12.2** Frontend: Wire `client/SettingsPage.jsx`,
      `lawyer/LawyerSettingsPage.jsx`, `mufti/MuftiSettingsPage.jsx` to 12.1.
- [x] **11.2a** Backend: Message flagging only — `isFlagged` on `Message` +
      `PATCH /api/admin/messages/:id/flag`. (The review-flagging half, 11.2b,
      needs the `Review` model from 9.1 — done later, in the convergence
      wave.)

### Track B — case backbone, part 1 (branch `track/b`)

The main line everything else hangs off. Start now; stays sequential within
itself for the rest of the build.

- [x] **6.1** Backend: `Proposal` model (consultationId, lawyerId, clientId,
      feeStructure, status `sent|accepted|declined`) — creatable only from an
      `approved` consultation.
- [x] **6.2** Backend: `POST /api/proposals` (lawyer), `PATCH
/api/proposals/:id/accept` (client — requires a retainer payment
      screenshot upload), `GET /api/proposals/mine`.
- [x] **6.3** Backend: `Case` model (proposalId, clientId, lawyerId, status
      `pending_payment|active|closed`) + enforce the one-active-case-per-
      client rule at creation time (reject if the client already has an
      `active` case).
- [x] **6.4** Frontend: Wire `client/ClientProposalsPage.jsx` (view/accept +
      upload retainer payment) and `lawyer/LawyerProposalsPage.jsx`
      (create/send proposal) to 6.2/6.3.
- [x] **6.5** Frontend: Show a clear blocked-state message when a client with
      an existing active case tries to accept another proposal.

**Wave 1 ends when both tracks merge to `master`.** Track A can merge
whenever it's done — it doesn't block or get blocked by Track B. Track B's
`6.3` (the `Case` model landing) is what unlocks Wave 2.

---

## Wave 2 — starts once Track B's `6.3` has merged (3 tracks in parallel)

### Track B — case backbone, part 2 (continues on `track/b`)

Phase 7 (minus 7.11 — that needs Track D's `11.1` first) then Phase 9.
Kept as one sequential track because both rewrite the same case-detail
pages; splitting them across tracks would just mean fighting over the same
files at merge time.

- [x] **7.1** Backend: `Milestone` model (caseId, title, description,
      dueDate, status, paymentId) + endpoints (lawyer creates/updates, both
      parties + admin can view).
- [x] **7.2** Backend: `Hearing` model (caseId, date, location, notes) +
      endpoints (lawyer creates/updates, both parties + admin view).
- [x] **7.3** Backend: Case-scoped document endpoints, reusing the
      `Document` model from Track A's `10.1` (must already be merged).
- [x] **7.4** Backend: Iddat tracker (start date + computed end date) and
      Mehr tracker (amount + paid status) fields/model on `Case`.
- [x] **7.5** Backend: `GET /api/cases/:id` returns full case detail
      (milestones, hearings, documents, trackers, Mufti guidance log).
      Ownership check: client/lawyer restricted to their own case; **admin
      can fetch any case**, no ownership check.
- [x] **7.6** Backend: `PATCH /api/cases/:id` restricted to the assigned
      lawyer for progress/status updates — this is also where a case
      transitions to `closed`, which is what unlocks Phase 9 below.
- [ ] **7.7** Frontend: Wire `lawyer/CaseDetail.jsx` with full update
      controls: add/edit hearing dates, upload documents, update
      milestone/progress — this is the lawyer's "update the case" surface.
- [ ] **7.8** Frontend: Wire `client/ClientCasePage.jsx` ("My Case") as the
      client-facing mirror of 7.7 — it should reflect the lawyer's updates
      (use React Query invalidation/refetch on a reasonable interval or after
      relevant mutations).
- [ ] **7.9** Frontend: Wire `lawyer/CourtHearingsPage.jsx` to aggregate
      hearings across all of that lawyer's active cases.
- [ ] **7.10** Frontend: Build a new admin case-detail view (new file, e.g.
      `admin/AdminCaseDetailPage.jsx`, new route `/admin/cases/:id`) — this
      page doesn't exist yet on the frontend and is needed for the "admin can
      open any case" requirement. Read-only, using 7.5.
- [x] **9.1** Backend: `Review` model (raterId, rateeId, context
      `consultation|case`, overallStars, category scores — communication,
      expertise, value, professionalism, responsiveness — plus text) with
      rules: client→lawyer (post consultation or case close), lawyer→client
      (post case close), lawyer→mufti (post guidance).
- [x] **9.2** Backend: `POST /api/reviews`, `GET /api/lawyers/:id/reviews`
      (public — feeds the Phase 2 profile display).
- [ ] **9.3** Frontend: Add review-submission UI at case-close in
      `client/ClientCasePage.jsx` / `lawyer/CaseDetail.jsx`; display
      aggregate ratings on `LawyerDetailPage.jsx` and `BrowseLawyersPage.jsx`.

### Track C — Mufti system (branch `track/c`)

Only needs `6.3` (the `Case` model) — nothing here touches a file Track B
or D touches, until `8.6`, which is deliberately held for the convergence
wave.

- [ ] **8.1** Backend: `MuftiQuery` model (caseId, lawyerId, muftiId,
      urgency, fee, paymentId, question, answer, citations, status) — a
      query is only visible to the Mufti once its linked payment is
      `approved`.
- [ ] **8.2** Backend: `POST /api/mufti-queries` (lawyer — submits query +
      uploads payment screenshot together), `GET /api/mufti-queries/queue`
      (Mufti — only approved-payment queries), `PATCH
/api/mufti-queries/:id/respond` (Mufti).
- [ ] **8.3** Backend: On response, append an entry to the case's Islamic
      guidance history.
- [ ] **8.4** Frontend: Wire `lawyer/FatwaRequests.jsx` (submit query, see
      own query statuses) to 8.2.
- [ ] **8.5** Frontend: Wire `mufti/MuftiDashboard.jsx` (queue) and
      `mufti/MuftiQueryDetail.jsx` (respond with citations) to 8.2.

### Track D — disputes backbone + client roster (branch `track/d`)

Only needs `6.3`. Different files than B and C.

- [ ] **11.1** Backend: `Dispute` model (raisedById, caseId, reason, status,
      resolution) + `POST /api/disputes`, `GET /api/admin/disputes`, `PATCH
/api/admin/disputes/:id`.
- [ ] **11.5** Frontend: Wire `admin/AdminDisputesPage.jsx` to 11.1.
- [ ] **12.5** Frontend: Wire `lawyer/MyClientsPage.jsx` (roster of clients/
      cases) to `GET /api/cases/mine` (lawyer view — many concurrent cases).

**Wave 2 ends when Tracks B, C, and D have all merged to `master`.**

---

## Wave 3 — convergence (sequential, single track, after Wave 2 merges)

Everything here specifically touches files two Wave-2 tracks both built
toward — do these one at a time on `master` (or one short-lived branch)
instead of trying to parallelize further.

- [ ] **7.11** Frontend: Wire the "Report an Issue" button (in both the
      client and lawyer case views) to create a dispute, using `11.1`.
- [ ] **8.6** Frontend: Surface the Islamic guidance history inside
      `lawyer/CaseDetail.jsx` and `client/ClientCasePage.jsx`, using `8.1-8.5`.
- [ ] **10.3** Frontend: Confirm the case-scoped upload/list built in `7.3`
      reuses the `10.1` model/endpoints rather than a separate one.
- [ ] **11.2b** Backend: Review flagging — `isFlagged` on `Review` + `PATCH
/api/admin/reviews/:id/moderate` (the other half of `11.2`, needs `9.1`).
- [ ] **11.3** Backend: Fatwa knowledge-base curation — endpoint to approve a
      Mufti's answer for reuse by the chatbot's fatwa database (ties into the
      existing `src/services/documentLoader.js` / vector store ingestion) —
      needs Phase 8.
- [ ] **11.7** Frontend: Add a flagged-content moderation view (new admin
      section) wired to `11.2a`/`11.2b`/`11.3`.

---

## Wave 4 — Earnings

Needs `7.1` (milestones) and Phase 8 (Mufti fees) — both done as of Wave 2.

- [ ] **12.3** Backend: `GET /api/lawyers/me/earnings` and the Mufti
      equivalent — aggregate consultation/retainer/milestone/Mufti-fee
      payment history.
- [ ] **12.4** Frontend: Wire `lawyer/LawyerEarningsPage.jsx` and the
      earnings section of `mufti/MuftiDashboard.jsx` to 12.3.

---

## Wave 5 — Analytics

Aggregates across everything above — genuinely needs it all done first.

- [ ] **11.4** Backend: Analytics endpoints — registrations by role, case
      volume by status, payment volume/approval stats, lawyer/Mufti
      performance, satisfaction/NPS (`GET /api/admin/analytics/*`).
- [ ] **11.6** Frontend: Replace the dummy `STATS`/`GROWTH_DATA`/
      `RECENT_USERS` arrays in `admin/AdminDashboardPage.jsx` with 11.4 plus
      a real, searchable user list.

---

## Wave 6 — Non-Functional Hardening (last, no parallelism)

- [ ] **13.1** Backend: Audit-log model; write an entry on every payment
      decision, verification decision, dispute resolution, and account
      suspension.
- [ ] **13.2** Backend: Rate limiting on lawyer-contact and
      consultation-booking endpoints.
- [ ] **13.3** Backend: Validation schemas (zod) on every mutating endpoint;
      confirm the centralized error handler (0.5) covers all routes.
- [ ] **13.4** Backend: Lock CORS to the deployed frontend origin.
- [ ] **13.5** Frontend: Add a global error boundary + consistent
      loading/empty/error states across all newly wired pages.
- [ ] **13.6** Both: Full end-to-end smoke test of the client journey —
      browse → chatbot → book consultation → pay → admin approves → proposal
      → accept + pay retainer → case active → lawyer updates milestones/
      hearings/documents → client sees updates → Mufti guidance requested →
      case closed → reviews submitted.
