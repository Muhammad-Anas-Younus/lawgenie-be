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
Islamic scholarship, and dedicated human case management into a single,
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
Mufti/scholar consultations, and active case agents. LawGenie addresses
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

- Ensure platform quality through human oversight via dedicated case
  agents

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

Case Agent Response Time \< 12 hours average Ongoing

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
managing complex cases and to clients with religious questions. They are
compensated per consultation and contribute to the platform\'s Islamic
knowledge base.

**4.4 Case Agents**

Platform-employed case managers assigned automatically when a case is
created. They serve as a quality assurance layer --- monitoring case
progress, mediating disputes, sending reminders, and escalating issues.
Each agent manages 15--20 concurrent cases.

**4.5 Platform Administrators**

Internal Anthropic/LawGenie staff responsible for verifying professional
credentials, managing user accounts, moderating content, processing
escalated disputes, and overseeing platform analytics and performance.

**5. User Journeys**

**5.1 Client Journey: Discovery to Case Resolution**

---

**Step** **Action** **Platform Role**

---

1 Client discovers the OTP verification, Tier 1 access granted
platform and signs up

2 Client interacts with AI Chatbot assesses case, answers
chatbot for initial questions in English/Urdu
guidance

3 Client upgrades to Tier 2 CNIC verification + refundable security
deposit (PKR 500--1000)

4 Client browses and contacts Lawyer profiles, comparisons, reviews,
lawyers AI recommendations

5 Client books consultation Tier 3 access unlocked; escrow payment
and pays fee processed

6 Lawyer sends case proposal Client reviews and accepts; pays
and fee structure retainer

7 Case is formally created Case Agent automatically assigned; both
parties notified

8 Case progresses through Documents shared, court dates tracked,
milestones agent monitors

9 Lawyer requests Islamic Mufti consulted, guidance logged in
guidance if needed case file

10 Milestones completed; Escrow system releases funds upon
payments released milestone verification

11 Issues arise mid-case Agent mediates; escalation process
invoked if needed

12 Case concludes Final payment, formal case closure

13 Reviews submitted Client rates lawyer and agent; lawyer
rates client

---

**6. Core Feature Requirements**

**6.1 Registration & Verification System**

**Client Verification Tiers**

---

**Tier** **Requirements** **Access Level** **Fee**

---

Tier 1 --- Email/phone + OTP AI chatbot access Free
Basic verification only

Tier 2 --- CNIC verification + Can contact and PKR 500--1000
Verified security deposit message lawyers (refundable)

Tier 3 --- Paid consultation fee Full platform access PKR 500--3,000
Paying per consultation

---

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

- Handle basic Islamic jurisprudence questions; route complex queries
  to Muftis

- Access a pre-approved fatwa knowledge base for common scenarios

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

- File and document sharing within messages

- Email and SMS notifications for new messages

**Three-Way Communication (Client --- Agent --- Lawyer)**

- Case Agent has read access to all case messages

- Agent can send reminders to either party

- Agent facilitates communication and clarifies legal terminology for
  clients

**6.5 Islamic Guidance System**

**For Lawyers --- Mufti Consultation**

---

**Urgency Level** **Response Time** **Fee (PKR)**

---

Standard 48 hours 300

Urgent 24 hours 600

Critical 4 hours 1,000

---

- Lawyer submits query with anonymized case details

- Receives Sharia compliance guidance and formal Islamic rulings
  (fatwas)

- All Mufti consultations are logged in the case file

**For Clients --- Islamic Q&A**

- Basic Islamic questions answered by AI chatbot via pre-approved
  fatwa database

- Complex queries routed to verified Mufti (PKR 200--500)

**Mufti Dashboard**

- Query queue organized by urgency level

- Response composition with mandatory Islamic source citations

- Contribution to platform knowledge base for future AI use

- Earnings tracking and payment history

**6.6 Case Management System**

**Case Initiation**

- Client contacts lawyer; lawyer sends formal case proposal and fee
  structure

- Client accepts and pays retainer; Case Agent automatically assigned

- Case status set to Active with both parties notified

**Active Case Features (All Parties)**

- Case dashboard with visual progress timeline

- Milestone tracking: document submission, court dates, decisions

- Secure document repository with categorization and version control

- Task lists and deadline reminders

- Court hearing schedule with automated reminders

- Full message history

- Always-visible \'Contact Your Agent\' button

**Special Trackers**

- Iddat period tracker for divorce cases

- Mehr (dower) payment tracking

- Islamic guidance history for the specific case

**Lawyer-Specific Features**

- \'Request Islamic Guidance\' button in case dashboard

- Private case notes and legal strategy planning area

**6.7 Case Agent System**

**Responsibilities**

- Progress Monitoring: Track milestones, flag stalled or at-risk
  cases, run weekly check-ins

- Communication Facilitation: View all messages, send reminders,
  schedule meetings, clarify legal terminology

- Dispute Mediation: Handle complaints from either party through
  structured escalation

- Quality Assurance: Review documentation, collect milestone feedback,
  identify problematic users early

**Escalation Process**

---

**Level** **Handler** **Trigger**

---

Level 1 Assigned Case Agent Initial complaint or issue
raised

Level 2 Senior Case Agent Agent unable to resolve within
48 hours

Level 3 Admin Team Senior agent escalation or
policy violation

---

**Agent Dashboard**

- List of all assigned cases (15--20 per agent) with status
  indicators: on-track, at-risk, stalled

- Consolidated view of upcoming deadlines across all cases

- Issue tracking and communication tools

- Personal performance metrics

**6.8 Payment System**

**Fee Structure**

---

**Payment Type** **Range (PKR)** **Details**

---

Lawyer Consultation 500 -- 3,000 Paid by client before
(one-time) consultation

Case Retainer Variable Upfront fee per case proposal

Milestone Payments Variable Released from escrow upon
completion

Mufti Consultation 200 -- 500 For complex Islamic guidance
(client) queries

Mufti Consultation 300 -- 1,000 Standard / Urgent / Critical
(lawyer) tiers

Client Security 500 -- 1,000 Refundable upon good standing
Deposit (Tier 2)

---

**Platform Commission**

- 10--15% commission on all lawyer transactions

- 10% commission on Mufti consultations

**Payment Features**

- Integration with JazzCash, EasyPaisa, bank transfers, credit/debit
  cards

- Escrow system: payments held until milestone completion, then
  auto-released

- Invoice generation and payment history tracking

- Refund processing with agent/admin approval

- Dispute resolution mechanism for contested payments

**6.9 Review & Rating System**

---

**Who Rates** **Who They Can Rate**

---

Clients Lawyers (after consultation or case close); Case
Agents (after case close)

Lawyers Clients (after case close); Muftis (after
guidance received); Case Agents

All parties Ratings displayed publicly on profiles with
response time and success metrics

---

Rating categories: overall star rating (1--5), written review, plus
specific scores for Communication, Expertise, Value for Money,
Professionalism, and Responsiveness.

**6.10 Document Management**

- Secure cloud storage for all case documents

- Document categorization: pleadings, evidence, court orders, personal
  documents

- Version control for document updates

- Download and print capabilities

- File sharing between client, lawyer, and agent

- OCR support for scanned documents (text searchable)

**7. Non-Functional Requirements**

**7.1 Security & Privacy**

- HTTPS encryption across all connections

- Encrypted document and message storage at rest

- Client information anonymized in Mufti queries

- Confidentiality agreements required for all professional parties

- Role-based access control (RBAC) --- strict data separation between
  roles

- Optional two-factor authentication (2FA) for all users

- Session management with automatic timeout

- Audit logs for all sensitive operations

- Anonymous browsing permitted until Tier 2 verification

- Data retention policies compliant with Pakistani data protection
  standards

**7.2 Platform Availability**

- Target uptime: \> 99% (less than \~88 hours downtime per year)

- Responsive web design supporting mobile, tablet, and desktop

- Full Urdu language support including RTL text rendering where
  applicable

**8. Anti-Abuse Measures**

**8.1 Client-Side Abuse Prevention**

- Multi-tier verification with mandatory CNIC check before lawyer
  contact

- Refundable security deposit as commitment signal

- Rate limiting on lawyer contact requests

- Required questionnaire prior to contacting any lawyer

- AI pre-screening of case details for completeness and legitimacy

- Continuous agent monitoring throughout case lifecycle

- Feedback system to flag and escalate problematic client behavior

- Account suspension for repeat policy violations

**8.2 Lawyer-Side Misconduct Prevention**

- Credential verification and Bar Council license validation before
  approval

- All case communication visible to assigned Case Agent

- Client review and rating system as public accountability mechanism

- Response time tracking with performance benchmarks

- Regular quality assurance reviews by Case Agent

- Suspension policy for sustained poor performance or misconduct

**9. Admin Panel Requirements**

**9.1 User Management**

- Verify and approve lawyer and Mufti registration applications

- Manage and update client accounts and tier statuses

- Assign, reassign, and manage Case Agent workloads

- Suspend or permanently delete accounts with appropriate audit trail

**9.2 Content Moderation**

- Review flagged messages from any conversation

- Moderate reviews, ratings, and public profile content

- Approve and curate Islamic guidance content for knowledge base

**9.3 Dispute Resolution**

- Handle Level 3 escalated issues from senior agents

- Process refund requests beyond agent authority

- Impose suspensions and financial penalties as appropriate

**9.4 Analytics Dashboard**

- User registration trends by role and tier

- Case volume statistics: active, completed, stalled

- Revenue tracking and commission summaries

- Performance reports for Lawyers, Muftis, and Case Agents

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

Dedicated Case Agents Human quality-control layer ensuring cases
progress and disputes are resolved

Multi-Tier Prevents time-wasters and fraudulent actors on
Verification both client and lawyer sides

Complete Payment & Milestone-based payments protect both clients
Escrow System and lawyers

Everything On-Platform No external communication required --- maintains
auditability and security

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

Escrow Funds held by a neutral party until contractual
conditions are met

PKR Pakistani Rupee --- currency of Pakistan

---

Document End --- LawGenie PRD v1.0 \| March 2026 \| CONFIDENTIAL
