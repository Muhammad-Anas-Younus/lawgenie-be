**LAWGENIE**

Online Marriage Lawyer Platform

**PRODUCT REQUIREMENTS DOCUMENT (PRD)**

Version 1.0 \| March 2026 \| CONFIDENTIAL

For Internal Use Only

---

**Document Attribute** **Details**

---

Document Title LawGenie PRD --- Online Marriage Lawyer
Platform

Version 1.0

Status Draft for Review

Date March 2026

Audience Product, Engineering, Legal, Stakeholders

Platform Type Web Application (Mobile-Responsive)

Target Market Women in Pakistan

Languages English & Urdu

---

**1. Executive Summary**

LawGenie is a comprehensive legal-technology platform purpose-built for
Pakistani women seeking guidance, representation, and resolution in
family and marriage law matters. The platform bridges the critical gap
between legally underserved women and qualified legal professionals by
combining AI-powered guidance, verified lawyer matching, integrated
Islamic scholarship, and admin-verified payments into a single,
secure, end-to-end solution.

+-----------------------------------------------------------------------+
| **Mission Statement** |
| |
| To make quality family legal assistance accessible, trustworthy, and |
| affordable for every woman in Pakistan by combining technology, human |
| expertise, and Islamic jurisprudence in one unified platform. |
+-----------------------------------------------------------------------+

**2. Problem Statement & Opportunity**

**2.1 The Problem**

Pakistani women facing marriage and divorce challenges encounter a
fragmented and difficult legal landscape:

- Limited awareness of legal rights under Pakistani family law and
  Islamic jurisprudence

- Difficulty identifying and vetting credible, affordable lawyers

- No integrated mechanism to reconcile civil law requirements with
  Islamic guidance (fatwas)

- Communication breakdowns between clients and lawyers leading to case
  delays

- High rates of time-wasting or fraudulent interactions on both the
  client and lawyer side

- Lack of a single trusted platform covering the entire journey from
  awareness to case closure

**2.2 The Opportunity**

Pakistan\'s legal-tech sector is nascent, and no platform currently
offers the combination of AI legal chatbot, verified lawyer directory,
and Mufti/scholar consultations in one place. LawGenie addresses
a large underserved market with measurable, tangible impact on women\'s
legal empowerment.

**3. Goals & Success Metrics**

**3.1 Product Goals**

- Provide AI-driven initial legal guidance that is accurate,
  accessible, and bilingual

- Verify and onboard a trusted network of qualified family lawyers and
  Islamic scholars

- Enable seamless end-to-end case management from discovery through
  resolution

- Maintain the highest standards of data privacy and confidentiality
  for vulnerable users

- Ensure platform quality through human oversight via admin review of
  payments and disputes

**3.2 Success Metrics**

---

**Metric** **Target** **Timeframe**

---

Verified Lawyers Registered 100+ Within 6 months of
launch

Verified Muftis Onboarded 5--10 Within 3 months of
launch

Client Registrations 500+ Within 6 months of
launch

Client Satisfaction Rate 80%+ Ongoing

Lawyer Response Time \< 24 hours average Ongoing

Mufti Response Time 24--48 hours average Ongoing

Consultation-to-Case 70%+ Ongoing
Conversion

Islamic Guidance 50+ per month By month 3
Consultations

Platform Uptime \> 99% Ongoing

---

**4. User Personas & Roles**

**4.1 Clients (Primary Users)**

Women in Pakistan --- primarily urban and semi-urban --- seeking
guidance, representation, or resolution regarding marriage, divorce,
custody, maintenance, or property rights. Range from digitally savvy
urban professionals to first-time internet users requiring a simple,
guided experience. Language needs: English and Urdu.

**4.2 Lawyers (Legal Professionals)**

Verified legal professionals registered with the relevant Bar Council of
Pakistan, specializing in family law. They use the platform as a channel
to attract new clients, manage active cases, and seek Islamic guidance
when required. They operate under platform quality standards and are
subject to rating and review.

**4.3 Muftis / Islamic Scholars**

Verified Islamic scholars with credentials in Sharia and family law
jurisprudence. They provide binding Islamic guidance (fatwas) to lawyers
managing complex cases. They are compensated per consultation and
contribute to the platform\'s Islamic knowledge base.

**4.4 Platform Administrators**

Internal LawGenie staff responsible for verifying professional
credentials, managing user accounts, moderating content, manually
reviewing and approving payment proofs, resolving disputes, and
overseeing platform analytics and performance.

**5. User Journeys**

**5.1 Client Journey: Discovery to Case Resolution**

---

**Step** **Action** **Platform Role**

---

1 Client browses the platform No account required --- chatbot and lawyer
anonymously directory are open access

2 Client interacts with AI Chatbot assesses case, answers questions in
chatbot English/Urdu, no login required

3 Client browses and contacts Lawyer profiles, comparisons, reviews, AI
lawyers recommendations --- still no login required

4 Client decides to book a Account creation required: email or phone +
consultation OTP verification

5 Client books consultation Client uploads a payment screenshot; status
and pays fee set to \"pending admin review\"

6 Admin reviews payment proof Admin approves or rejects; consultation
marked paid once approved

7 Lawyer sends case proposal Client reviews and accepts; uploads payment
and fee structure screenshot for the retainer

8 Admin reviews retainer Once approved, case is formally created and
payment proof both parties notified

9 Case progresses through Documents shared, court dates tracked
milestones

10 Lawyer requests Islamic Mufti consulted, guidance logged in case
guidance if needed file

11 Milestone payment due Client uploads payment screenshot; admin
reviews and marks milestone as paid

12 Issues arise mid-case Client or lawyer raises a dispute directly
with admin; admin mediates

13 Case concludes Final payment reviewed and approved by admin;
formal case closure

14 Reviews submitted Client rates lawyer; lawyer rates client

---

**6. Core Feature Requirements**

**6.1 Registration & Verification System**

**Client Registration**

- No account required to use the chatbot or browse the lawyer directory
- Account required only when booking a consultation: register via
  email or phone + OTP verification
- No tiered access levels, no CNIC verification, no security deposit

**Lawyer Registration**

- Submit Bar Council license, CNIC, and educational credentials

- Admin verification and approval before profile goes live

- Profile includes: specialization, experience, fee structure,
  availability calendar, languages, court jurisdictions

**Mufti Registration**

- Submit Islamic educational credentials and specialization areas

- Admin verification and approval process

- Profile includes: areas of expertise, languages spoken

**6.2 AI Chatbot System**

The AI chatbot serves as the first point of contact for all clients,
providing immediate, accessible guidance before human professionals are
engaged.

**Functional Requirements**

- Bilingual interaction: English and Urdu

- Answer questions on Pakistani family law (Muslim Family Laws
  Ordinance 1961)

- Explain Islamic family law principles: Nikkah, Talaq, Khula, Mehr,
  Iddat

- Assess case complexity and categorize case type

- Recommend suitable lawyers based on case type, client budget,
  location, ratings, and availability

- Generate document checklists tailored to case type

- Provide estimated timelines and cost ranges

- Handle Islamic jurisprudence questions directly using a pre-approved
  fatwa knowledge base; no escalation path to a Mufti for clients ---
  Mufti consultation is a lawyer-only feature (see 6.5)

**6.3 Lawyer Discovery & Matching**

**Lawyer Profile**

- Credentials, experience, and professional affiliations

- Specializations: divorce, custody, maintenance, property, Khula,
  etc.

- Pricing structure: consultation fees, case retainer, milestone fees,
  hourly option

- Client reviews, star ratings, and categorized scores

- Success rate statistics

- Availability calendar

- Languages spoken and court jurisdictions served

**Search & Filter**

- Filter by: specialization, location, price range, rating,
  availability

- AI-powered recommendations based on case profile

- Side-by-side comparison of up to 3 lawyers

**6.4 Communication System**

**Client-Lawyer Messaging**

- Secure, encrypted in-platform messaging (no external contact until
  consultation paid)

- Each consultation and each case has its own separate message thread
  --- not one continuous inbox per client-lawyer pair

- File and document sharing within messages

- Email and in-app notifications for new messages

**6.5 Islamic Guidance System (Lawyer --- Mufti Only)**

Mufti consultation is exclusive to lawyers. Clients have no direct
access to Muftis --- their only source of Islamic guidance is the AI
chatbot's fatwa knowledge base (see 6.2).

**For Lawyers --- Mufti Consultation**

---

**Urgency Level** **Response Time** **Fee (PKR)**

---

Standard 48 hours 300

Urgent 24 hours 600

Critical 4 hours 1,000

---

- Lawyer submits query with anonymized case details and uploads a
  payment screenshot for the applicable fee

- Query only enters the Mufti's queue once admin approves the payment;
  the Mufti never sees a query with an unapproved payment

- Receives Sharia compliance guidance and formal Islamic rulings
  (fatwas)

- All Mufti consultations are logged in the case file

**Mufti Dashboard**

- Query queue organized by urgency level

- Response composition with mandatory Islamic source citations

- Contribution to platform knowledge base for future AI use

- Earnings tracking and payment history

**6.6 Case Management System**

**Case Initiation**

- A lawyer may only send a case proposal to a client following a prior
  paid (admin-approved) consultation between them --- there is no
  cold-proposal path

- Client contacts lawyer; lawyer sends formal case proposal and fee
  structure

- Client accepts and uploads a payment screenshot for the retainer

- Case status set to Active once admin approves the payment; both
  parties notified

**Case Load Limits**

- A client may have only one Active case at a time; new case proposals
  cannot be accepted (nor a new consultation converted into a case)
  while an existing case is Active. The limit lifts once the case is
  closed

- A lawyer has no such limit and manages multiple concurrent cases
  across different clients

**Active Case Features (All Parties)**

- Case dashboard with visual progress timeline

- Milestone tracking: document submission, court dates, decisions

- Secure document repository with categorization and version control

- Task lists and deadline reminders

- Court hearing schedule with automated reminders

- Full message history

- Always-visible \'Report an Issue\' button routing to admin support

**Special Trackers**

- Iddat period tracker for divorce cases

- Mehr (dower) payment tracking

- Islamic guidance history for the specific case

**Lawyer-Specific Features**

- Case update controls: the lawyer adds/edits hearing dates, uploads
  documents, and updates milestone/progress status from their case
  view; all updates are immediately reflected in the client\'s \"My
  Case\" section

- \'Request Islamic Guidance\' button in case dashboard

- Private case notes and legal strategy planning area

**Admin Visibility**

- Admin can open any case and view its full details: proposal, payment
  status, milestones, hearing dates, documents, and message history
  (read-only unless handling a dispute)

**6.7 Payment System**

All payments happen off-platform (bank transfer, JazzCash, EasyPaisa,
cash, etc.) directly between client and lawyer/Mufti. LawGenie does not
integrate a payment gateway and does not hold funds in escrow --- it
only tracks and verifies that a payment occurred.

**Payment Verification Flow**

- Client or lawyer makes the payment off-platform and uploads a
  screenshot of the payment as proof

- Payment status is set to \"Pending Review\"

- Admin manually reviews the screenshot and approves or rejects it

- Once approved, the payment is marked \"Paid\" and the relevant action
  unlocks (consultation confirmed, case created, milestone marked
  complete, etc.)

- Rejected payments notify the uploader with a reason and allow
  re-upload

**Fee Structure**

---

**Payment Type** **Range (PKR)** **Details**

---

Lawyer Consultation 500 -- 3,000 Paid by client before
(one-time) consultation

Case Retainer Variable Upfront fee per case proposal

Milestone Payments Variable Marked paid once admin
approves the screenshot

Mufti Consultation 300 -- 1,000 Standard / Urgent / Critical
(lawyer only) tiers

---

**Payment Features**

- Screenshot upload for every payment type above

- Admin review queue for pending payment proofs

- Receipt/history generation and payment history tracking

- Manual refund or rejection handling by admin

- Dispute resolution mechanism for contested payments, handled
  directly by admin

**6.8 Review & Rating System**

---

**Who Rates** **Who They Can Rate**

---

Clients Lawyers (after consultation or case close)

Lawyers Clients (after case close); Muftis (after
guidance received)

All parties Ratings displayed publicly on profiles with
response time and success metrics

---

Rating categories: overall star rating (1--5), written review, plus
specific scores for Communication, Expertise, Value for Money,
Professionalism, and Responsiveness.

**6.9 Document Management**

- Secure cloud storage for all case documents

- Document categorization: pleadings, evidence, court orders, personal
  documents

- Version control for document updates

- Download and print capabilities

- File sharing between client and lawyer

**7. Non-Functional Requirements**

**7.1 Security & Privacy**

- HTTPS encryption across all connections

- Encrypted document and message storage at rest

- Client information anonymized in Mufti queries

- Confidentiality agreements required for all professional parties

- Role-based access control (RBAC) --- strict data separation between
  roles

- Session management with automatic timeout

- Audit logs for all sensitive operations

- Anonymous browsing permitted for the chatbot and lawyer directory;
  an account is required only to book a consultation

- Data retention policies compliant with Pakistani data protection
  standards

**7.2 Platform Availability**

- Target uptime: \> 99% (less than \~88 hours downtime per year)

- Responsive web design supporting mobile, tablet, and desktop

- Full Urdu language support including RTL text rendering where
  applicable

**8. Anti-Abuse Measures**

**8.1 Client-Side Abuse Prevention**

- Account required only at consultation booking (email/phone + OTP),
  not for browsing or chatbot use

- Rate limiting on lawyer contact requests

- Required questionnaire prior to contacting any lawyer

- AI pre-screening of case details for completeness and legitimacy

- Admin monitoring of flagged cases and messages

- Feedback system to flag and escalate problematic client behavior

- Account suspension for repeat policy violations

**8.2 Lawyer-Side Misconduct Prevention**

- Credential verification and Bar Council license validation before
  approval

- Case communication auditable by admin when flagged or disputed

- Client review and rating system as public accountability mechanism

- Response time tracking with performance benchmarks

- Regular quality assurance reviews by admin

- Suspension policy for sustained poor performance or misconduct

**9. Admin Panel Requirements**

**9.1 User Management**

- Verify and approve lawyer and Mufti registration applications

- Manage client accounts

- Suspend or permanently delete accounts with appropriate audit trail

**9.2 Payment Verification**

- Review queue of pending payment screenshots (consultations,
  retainers, milestones, Mufti fees)

- Approve or reject each payment with a reason

- Mark the corresponding consultation/case/milestone as paid once
  approved

- Maintain an audit trail of all payment decisions

**9.3 Content Moderation**

- Review flagged messages from any conversation

- Moderate reviews, ratings, and public profile content

- Approve and curate Islamic guidance content for knowledge base

**9.4 Dispute Resolution**

- Handle disputes raised directly by clients or lawyers on a case

- Review and approve/reject uploaded payment proofs

- Process refund or re-payment requests

- Impose suspensions and financial penalties as appropriate

**9.5 Analytics Dashboard**

- User registration trends by role

- Case volume statistics: active, completed, stalled

- Payment volume and approval statistics

- Performance reports for Lawyers and Muftis

- Platform usage statistics and most-requested services

- Client satisfaction metrics and NPS tracking

**10. Key Differentiators**

---

**Differentiator** **Description**

---

End-to-End Case Not just lawyer discovery --- full lifecycle
Management from first question to case closure

AI Trained on Chatbot specializes in MFLO 1961, Islamic family
Pakistani Family Law law, custody, maintenance, property

Integrated Islamic Verified Muftis accessible to both lawyers and
Guidance clients within the same platform

Frictionless Access Chatbot and lawyer directory usable with no
account required; an account is only needed to
book a consultation

Admin-Verified Every payment is manually reviewed and approved
Payments by an admin before it counts as paid

Everything On-Platform Case documents, messages, and proposals stay
on-platform for auditability and security

Women\'s Rights Focus Specialized focus on Pakistani women\'s legal
rights in family law matters

Bilingual Support Full English and Urdu support throughout the
platform

---

**Appendix: Glossary**

---

**Term** **Definition**

---

Nikkah Islamic marriage contract

Talaq Islamic divorce initiated by the husband

Khula Islamic divorce initiated by the wife

Mehr Mandatory gift/dower paid by groom to bride as part of
Nikkah

Iddat Mandatory waiting period observed by Muslim women
after divorce or death of spouse

Fatwa A formal Islamic ruling or legal opinion issued by a
qualified scholar

MFLO 1961 Muslim Family Laws Ordinance 1961 --- primary
Pakistani family law statute

CNIC Computerized National Identity Card --- Pakistan\'s
national identity document

PKR Pakistani Rupee --- currency of Pakistan

---

Document End --- LawGenie PRD v1.0 \| March 2026 \| CONFIDENTIAL
