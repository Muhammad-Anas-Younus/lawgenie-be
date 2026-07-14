# **Sir Syed University of Engineering & Technology Department of Software Engineering FYP Proposal Form**

## **1.** **<u>Project Credentials</u>**

- a. Project Number:

(For FYP Member use only)

- b. Project Title: LawGenie

- c. Group Members

| S.<br>No. | Group Member Name | Group Member Roll Number | Email (SSUET email<br>address) |
| --------- | ----------------- | ------------------------ | ------------------------------ |
| 1.        | Syed Shahzaib     | 2022F-BSE-323            | SE22f-323@ssuet.edu.pk         |
| 2.        | Muhammad Anas     | 2022F-BSE-119            | SE22f-119@ssuet.edu.pk         |
| 3.        | Sareem Saleem     | 2022F-BSE-105            | SE22f-105@ssuet.edu.pk         |
| 4.        | Sarwar Alam Khan  | 2022F-BSE-258            | SE22f-258@ssuet.edu.pk         |

## d. Project Status

Research Based Project

Product Based / Service Based Project

- e. Project Category (Write down the name if not available)

| **Category Name**                       | **√ or**<br>**X** | **Category Name**                             | **√ or**<br>**X** |
| --------------------------------------- | ----------------- | --------------------------------------------- | ----------------- |
| Artificial Intelligence and Big<br>Data | **x**             | <sup>Cloud Computing and Cyber Security</sup> |                   |
| Augmented and Virtual Reality           |                   | Game Development                              |                   |
| E-Health                                |                   | Graphics Animation                            |                   |
| E-Commerce                              |                   | Nano Technology                               |                   |
| Internet of Things (IoT)                |                   | Shared Economy                                |                   |
| Block Chain                             |                   | Other                                         |                   |

## f. Project related to SDGs

| **SDG Name**                               | **√ or**<br>**X** | **SDG Name**                              | **√ or**<br>**X** |
| ------------------------------------------ | ----------------- | ----------------------------------------- | ----------------- |
| No Poverty                                 |                   | Zero Hunger                               |                   |
| Good Health and Well-Being                 |                   | Quality Education                         |                   |
| Gender Equality                            | **x**             | Clean Water and Sanitation                |                   |
| Affordable and Clean Energy                |                   | Decent Work and Economic Growth           |                   |
| Industry, Innovation and<br>Infrastructure |                   | Reduce Inequalities                       | **x**             |
| Sustainable Cities and<br>Communities      |                   | Responsible Consumption and<br>Production |                   |
| Climate Action                             |                   | Life Below Water                          |                   |
| Life On Land                               |                   | Peace, Justice and Strong Institutions    | **x**             |
| Partnerships for the Goals                 |                   |                                           |                   |

## **2.** **<u>Project Background, Scope and Introduction</u>**

In Pakistan, thousands of women face issues such as domestic abuse, lack of awareness of their marital rights, and exploitation during divorce proceedings. Unfortunately, many are unaware of their legal rights and the protective measures provided under Pakistani law. Access to legal counsel is often expensive and not easily available, particularly for women belonging to marginalized communities.

To address this gap, our project, **LawGenie** , proposes a conversational AI chatbot trained on Pakistani law books and legal resources. The system will focus specifically on **marriage, divorce, and domestic violence laws** . It will act as a **first point of contact** for women seeking guidance on whether their situation qualifies under existing laws, possible penalties, available protections, and steps to consult a lawyer safely.

#### **Scope:**

- Limited to Pakistani laws (especially family and domestic violence laws).

- Provides **non-binding legal guidance** , not a replacement for lawyers.

- Designed to create awareness, reduce exploitation, and encourage informed decision-making.

- Accessible through a simple web interface.

## **3.** **<u>Similar Projects and Literature Review:</u>**

Several projects and tools exist worldwide that use AI for legal assistance:

- **DoNotPay** (USA/UK): A legal chatbot that helps users contest parking tickets and handle simple legal tasks.

- **LexisNexis Chatbots** : Used by law firms for case research and document drafting.

- **Indian Legal Aid Apps** : Some apps exist in India for women’s legal rights awareness, but they lack AI-driven

conversational capability.

**In Pakistan** , there is currently **no publicly available chatbot** dedicated to guiding women on domestic laws and divorce rights. Existing legal aid NGOs often provide hotlines or physical consultation, which may not be accessible to all. **How our project is different:**

- Specifically tailored to **Pakistani legal context** (e.g., Dissolution of Muslim Marriages Act 1939, Domestic Violence Acts, Family Courts Act).

- Focused on **women’s issues** – not general law.

- Provides **step-by-step guidance** on dealing with lawyers, avoiding scams, and understanding rights before hiring legal services.

- Combines **natural language processing (NLP)** with **legal knowledge bases** .

## **4.** **<u>Problem Statement</u>**

Women in Pakistan facing domestic violence or marital issues often:

- Lack awareness of their legal rights and protections.

- Cannot afford initial consultation fees of lawyers.

- Face exploitation by lawyers charging excessive fees or misguiding them.

- Do not have an easily accessible, judgment-free platform to seek guidance.

There is currently no AI-powered legal awareness platform specifically for women in Pakistan. Our project aims to solve this problem by providing free, accessible, and contextualized legal guidance through a chatbot.

## **5.** **<u>Features</u>**

**1. AI-Powered Chatbot**

- Trained on Pakistani family and domestic violence laws.

- Provides instant responses in **English and Urdu**

**2. Case Categorization**

- Guides users to identify whether their situation qualifies as domestic violence, divorce grounds, or other family issues.

**3. Legal Rights Information**

- Explains relevant laws, penalties, and protections available.

- Breaks down legal jargon into **simple language** .

**4. Guidance for Lawyer Consultation**

- Prepares users with **questions to ask lawyers** .

- Provides awareness of **standard lawyer fees** to avoid scams.

**5. Anonymous & Secure Interaction**

- Users can ask questions **without revealing identity** .

- Maintains privacy and confidentiality.

**6. Resource Recommendations**

- Provides links to **helplines, women protection centers, and NGOs** .

## **6.** **<u>Expected Tools and Technology Requirements</u>**

#### **Software Requirements:**

- Programming Languages: Python, JavaScript/TypeScript

- Backend Framework: **FastAPI / Node.js**

- Frontend Framework: **React.js / Next.js**

- AI/NLP: **OpenAI GPT / HuggingFace Transformers** (fine-tuned on local laws)

- • Database: **MongoDB / PostgreSQL**

- Deployment: **Docker + Cloud (AWS/Heroku/Vercel)**

#### **Hardware Requirements:**

- Development laptops (8GB+ RAM, i5+)

- Cloud hosting or university server for deployment

If the university does not provide hosting, we will use **AWS Educate credits** or deploy on **Heroku/Vercel/Railway** for free/student tiers.

## **7.** **<u>Design and Development Methodology</u>**

**Methodology:** Agile (Scrum) with iterative sprints.

#### **Phases:**

1. Requirement Analysis (laws, scope, user needs)

2. Data Collection (local law books, domestic law sections)

3. Model Training (fine-tuning AI with Q&A pairs)

4. Backend Development (API for chatbot)

5. Frontend Development (UI for chatbot interaction)

6. Integration & Testing

7. Deployment

#### **System Design (Simplified):**

User → Web App → Chatbot Interface → NLP Engine → Legal Knowledge Base → Response Generator → User

## **8.** **<u>Project Planning</u>**

#### **Phase 1: Requirement Gathering & Research (Month 1 – Month 2)**

- Conduct detailed research on Pakistani family and domestic violence laws.

- Meet with legal experts or NGOs (if possible).

- Define functional requirements of chatbot.

- Prepare initial dataset (law text + case scenarios).

**Deliverables:** Requirement Specification Document, Dataset v1.

#### **Phase 2: Dataset Preparation & Preprocessing (Month 3 – Month 4)**

- Collect and digitize law books and resources.

- Translate essential laws into **bilingual format (English/Urdu)** .

- Preprocess legal texts (cleaning, tokenization, Q&A pair generation).

- Build initial knowledge base.

- **Deliverables:** Dataset v2, Preprocessing Scripts.

#### **Phase 3: Backend & AI Development (Month 5 – Month 6)**

- Select and fine-tune AI model (e.g., GPT, HuggingFace model).

- Develop backend API to interact with chatbot engine.

- Implement rule-based fallback for **critical legal accuracy** .

- Test AI with sample queries.

**Deliverables:** Backend prototype + trained model v1.

#### **Phase 4: Frontend Development (Month 7 – Month 8)**

- Design UI/UX for chatbot (web).

- Develop bilingual chatbot interface (Urdu & English).

- Integrate frontend with backend API.

- Add features: anonymous chat, privacy, resource links.

- **Deliverables:** Frontend prototype integrated with backend.

#### **Phase 5: Testing & Refinement (Month 9 – Month 10)**

- Conduct **unit testing** , **integration testing** , and **user testing** with sample queries.

- Refine AI responses using feedback.

- Optimize dataset with real scenarios.

- Test bilingual responses and edge cases.

- **Deliverables:** Tested chatbot system v2.

#### **Phase 6: Deployment & Finalization (Month 11 – Month 12)**

- Deploy project on **cloud hosting (Heroku, Vercel, AWS Educate)** .

- Conduct pilot run with a small group of users.

- Prepare **documentation, final report, and presentation** .

- Collect feedback for possible future improvements.

- **Deliverables:** Deployed chatbot, Final Report, Presentation.

#### **Responsibilities**

- **Muhammad Anas:** Backend development, AI model training, API integration.

- **Sareem Saleem:** Frontend design, UI/UX development, multilingual support.

- **Syed Shahzaib:** Data collection, preprocessing, building legal dataset, testing.

- **Sarwar Alam Khan:** Documentation, project management, deployment, report writing.

## **9.** **<u>Letters/Recommendations</u>**

#### We may require:

- **Letter to NGOs/Legal Aid Societies** requesting access to digitized law material.

- **Recommendation letter to Pakistan Bar Council or Law libraries** for legal resources _._

## **10.** **<u>References</u>**

1. <u>Dissolution of Muslim Marriages Act, 1939 (Pakistan).</u>

2. <u>The Family Courts Act, 1964 (Pakistan).</u>

3. <u>Protection Against Domestic Violence Acts (Federal & Provincial).</u>

4. <u>DoNotPay – AI Legal Services [Online]. Available: https://donotpay.com</u>

5. <u>LexisNexis Legal AI Tools [Online]. Available: https://www.lexisnexis.com</u>

6. <u>HuggingFace Transformers Documentation.</u>

### **11.** **<u>Appendices</u>**

### **Expected FYP Supervisors**

1.

2.

3.

| **FYP Committee Comments (For FYP Us** | **e Only)**<br> |             |
| -------------------------------------- | --------------- | ----------- |
| **Decision**                           | **√ or X**      | **Remarks** |
| Project Accepted                       |                 |             |
| Project Accepted with Modifications    |                 |             |
| Project Needs Major Revision           |                 |             |
| Project Disapproved                    |                 |             |

## **Other Comments and Suggestions.**
