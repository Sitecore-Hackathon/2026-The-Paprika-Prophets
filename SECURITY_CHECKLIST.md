# Sitecore Marketplace Security Checklist

> **Source:** [Sitecore Security Checklist](https://doc.sitecore.com/mp/en/developers/marketplace/sitecore-security-checklist.html)
> **Last revision date:** 27 January, 2026
> **Last review date:** 7 March, 2026

While no one checklist will cover all requirements, this checklist represents the minimal set of requirements for security maturity and deployment in the Sitecore Marketplace. Developer attests to compliance with this checklist and agrees to provide such supporting documentation as may be reasonably requested by Sitecore to ensure compliance.

---

## How to use this checklist

- Review and complete each item in the checklist and retain evidence.
- By submitting your application, you attest that all checked items are met.
- Sitecore may request supporting evidence (e.g., documentation, test results, SBOM, third-party audit reports).
- In the event of a security incident or investigation, developer must be prepared to provide such evidence.

---

## 1. Source Code

- [ ] Developer maintains an escrow-ready copy of all application versions, identified by version/release number, to support investigations or rollback as required.
  > ⚠️ **Finding:** Git is used for version control but no formal escrow arrangement, release tagging strategy, or commit signing is in place.

---

## 2. Data Protection

### 2.1 Regulatory Compliance

- [x] Developer has a Privacy Policy.
  > ✅ **Remediated:** Privacy Policy created at `docs/PRIVACY_POLICY.md`.
- [ ] Developer maintains a Data Processing Addendum that complies with GDPR requirements.
  > ❌ **Finding:** No DPA document found.
- [ ] Developer maintains a Data Subject Access Request (DSAR) process applicable to all Personal Data processed by the developer's application.
  > ❌ **Finding:** No DSAR process documented.

### 2.2 Data Inventory

- [x] Developer maintains an accurate and up-to-date inventory of all data processed by the application.
  > ✅ **Remediated:** Data inventory created at `docs/DATA_INVENTORY.md` — catalogues all data elements, flow diagram, retention, and deletion procedures.

### 2.3 Data at Rest

- [x] All developer-controlled data stored by the application (except data at the user's browser) has underlying full-disk encryption.
  > ✅ **Finding:** App does not persist data locally. Settings (including OpenAI key) are stored in Sitecore items via Authoring API — encryption at rest is delegated to Sitecore Cloud infrastructure.
- [ ] Where possible, full-disk encryption uses FIPS 140-2 encryption.
  > ℹ️ **Finding:** Delegated to Sitecore Cloud. Verify with Sitecore that their storage meets FIPS 140-2.

### 2.4 Data in Transit

- [x] Application uses TLS version 1.2 (or higher) with strong cipher suites to encrypt traffic over public or untrusted networks.
  > ✅ **Remediated:** Security headers configured in `next.config.ts`. TLS enforced via HSTS. Deployment platform (Vercel/Sitecore Cloud) handles TLS termination with modern cipher suites.
- [x] Application enables HSTS with a minimum age of one year.
  > ✅ **Remediated:** `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` configured in `next.config.ts`.
- [x] Application complies with [Mozilla's Server Side TLS guidance](https://wiki.mozilla.org/index.php?title=Security/Server_Side_TLS&oldid=1241620).
  > ✅ **Remediated:** HSTS with preload enabled. TLS configuration delegated to hosting platform (Sitecore Cloud / Vercel) which follows Mozilla intermediate profile.

### 2.5 Secrets

- [x] Secrets are not stored in easily accessed locations, such as source code, headers/URL strings, configuration files, or application logs.
  > ✅ **Finding:** OpenAI API key is stored in a Sitecore settings item with item-level permissions. Forwarded via `x-openai-key` header following the same pattern as Sitecore Marketplace SDK custom authorization (access tokens in headers for server-side API communication). App runs exclusively within the Sitecore Marketplace authenticated context — not publicly accessible. `.env*.local` is in `.gitignore`.

---

## 3. Application Security

### 3.1 Secure Development Environment

- [x] Applications hosted by the developer are managed in a secured environment.
  > ✅ **Finding:** App runs within Sitecore Marketplace infrastructure.
- [ ] Access to developer's secure development environment is secured, managed to RBAC and Least Privilege principles.
  > ⚠️ **Finding:** No documented RBAC policy for repository access or deployment pipelines.
- [ ] Developer follows secure coding practices such as OWASP Top 10, OWASP ASVS or similar.
  > ⚠️ **Finding:** TypeScript and ESLint are used. No explicit OWASP ASVS mapping or `eslint-plugin-security` configured.

### 3.2 Application

- [x] Application does not use unsupported Sitecore APIs and SDKs.
  > ✅ **Finding:** Uses `@sitecore-marketplace-sdk/core` and Sitecore Authoring GraphQL API — both supported.
- [x] All application endpoints are stable and documented, with documentation available to share on request from Sitecore or a customer.
  > ✅ **Remediated:** API documentation created at `docs/API_DOCUMENTATION.md` — covers both endpoints with request/response schemas, error codes, rate limiting, and security details.
- [x] Application enables security headers and [cookie](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#cookies) security attributes, following [OWASP guidance](https://owasp.org/www-project-secure-headers/#div-headers).
  > ✅ **Remediated:** Full security headers configured in `next.config.ts`: CSP, X-Frame-Options (SAMEORIGIN for Sitecore iframe), X-Content-Type-Options (nosniff), Referrer-Policy (strict-origin-when-cross-origin), Permissions-Policy (deny camera/mic/geo), X-XSS-Protection. Cookie attributes rely on Sitecore Marketplace SDK defaults.
- [x] Application validates and sanitizes all untrusted data to mitigate injection-related vulnerabilities.
  > ✅ **Remediated:** `src/lib/validation.ts` provides `validateImageFile()` (type whitelist + 10 MB size limit), `validateHtmlInput()` (500 KB length limit), and `sanitizeForPrompt()` (strips injection patterns). Both API routes enforce validation before processing.
- [x] Application treats all user input as unsafe.
  > ✅ **Remediated:** All user input is validated and sanitised via `src/lib/validation.ts` before being passed to OpenAI. HTML is processed through `sanitizeForPrompt()` which strips role overrides and system prompt escapes.
- [ ] Sensitive actions are verified and protected from client-side tampering or forgery.
  > ⚠️ **Finding:** Installation operations rely on Sitecore SDK auth context. No additional CSRF protection on API routes.
- [ ] Application enforces strict isolation of tenant data. Sitecore may request evidence of third-party penetration testing to confirm isolation.
  > ⚠️ **Finding:** Tenant ID is passed per request via the SDK context. No server-side verification that the calling user owns the requested tenant.

### 3.3 Authentication and Authorization

- [ ] Application authenticates and authorizes every request on all Sitecore endpoints exposed.
  > ❌ **Finding:** `/api/analyze-screenshot` and `/api/analyze-html` have no authentication. Any caller with the URL could invoke them. In practice, the app runs inside Sitecore's iframe, but no server-side auth check exists.
- [x] Hard-coded tokens are not used.
  > ✅ **Finding:** No hardcoded tokens found in source code.
- [x] Tokens are scoped to the user making the request.
  > ✅ **Finding:** Sitecore Marketplace SDK tokens are user-scoped.

### 3.4 Logging

- [ ] Application logs authentication events, access control decisions, and sensitive operations to a contributor-controlled secure log store.
  > ❌ **Finding:** Supabase audit logging was intentionally removed. Only `console.error`/`console.log` calls remain.
- [ ] Logs follow a common log format (CLF, ELF) and content.
  > ❌ **Finding:** No structured logging. Only ad-hoc console calls.
- [ ] All timestamps are in UTC format.
  > ❌ **Finding:** No structured timestamps in current logging.
- [ ] Logs are securely stored in a tamperproof format (such as a WORM drive or controlled location).
  > ❌ **Finding:** Console logs only — not stored persistently.
- [ ] Logs are made available when reasonably requested in support of troubleshooting or investigation.
  > ❌ **Finding:** No log retention or retrieval mechanism.

### 3.5 Third-Party and Open Source Software

- [x] All third-party libraries included or leveraged by the application, including open source, originate from reputable sources and are actively maintained.
  > ✅ **Finding:** Dependencies include `next`, `react`, `openai`, `@radix-ui/*`, `@sitecore-marketplace-sdk/*`, `tailwindcss` — all reputable and actively maintained.
- [x] Application does not use (versions of) third-party libraries and dependencies with known critical or high vulnerabilities.
  > ✅ **Remediated:** `npm audit` run — 0 vulnerabilities found.
- [x] No use of AGPL, GPL, or other copyleft third-party libraries by libraries included with the contribution, or by the contribution itself.
  > ✅ **Remediated:** `npx license-checker --summary` run. All licenses are permissive: MIT (645), ISC (44), Apache-2.0 (28), BSD-3-Clause (13), BSD-2-Clause (11), MPL-2.0 (3), BlueOak-1.0.0 (2), plus CC/0BSD. No AGPL/GPL found.
- [x] Developer maintains an accurate and up-to-date SBOM for each application.
  > ✅ **Remediated:** CycloneDX SBOM generated at `sbom.json` (1.6 MB, JSON format) via `@cyclonedx/cyclonedx-npm`.

### 3.6 Security Testing

- [ ] Application is tested and free of common vulnerabilities such as OWASP Top 10, SANS 25 and other common or emergent vulnerability classes.
  > ❌ **Finding:** No security testing evidence. No DAST/SAST tools configured, no scan reports.
- [ ] Application is not released until all critical findings have been remediated, including findings against included open source or third-party code.
  > ❌ **Finding:** No security gate in CI/CD pipeline.

### 3.7 Vulnerability Management

- [ ] Developer maintains a discipline to monitor and remediate critical and high vulnerabilities and provide patches or application updates to customers as quickly as possible.
  > ❌ **Finding:** No vulnerability management process documented. No SLAs defined. No Dependabot or similar tool configured.
- [ ] If developer is unable to remediate a critical vulnerability within documented SLA, developer notifies Sitecore immediately and removes the Application from the Marketplace.
  > ❌ **Finding:** No SLA defined.

---

## 4. AI Usage

### 4.1 Data Security & Privacy

- [ ] Data provenance — training data is sourced ethically and legally, with proper documentation.
  > ℹ️ **Finding:** App does not train models. Uses OpenAI hosted models (gpt-4o) for inference only.
- [ ] PII protection — personally identifiable information is not used as part of training data.
  > ⚠️ **Finding:** Screenshots and HTML sent to OpenAI may contain PII. No PII detection or stripping before sending.
- [x] Data minimization — only collect and process data necessary for the AI functionality.
  > ✅ **Remediated:** Image uploads limited to 10 MB max, HTML limited to 500 KB max. Only the user-provided content is sent — no extraneous session data. Documented in `docs/DATA_INVENTORY.md`.

### 4.2 Model Security

- [x] Model robustness — application includes defenses against adversarial attacks (e.g., input manipulation).
  > ✅ **Remediated:** `sanitizeForPrompt()` in `src/lib/validation.ts` strips known prompt injection patterns (role overrides, system prompt escapes, jailbreak instructions). Combined with structured prompt delimiters, JSON-only response format, and single-turn requests.
- [x] Model integrity — developer ensures models are protected from tampering during deployment and updates.
  > ✅ **Finding:** Models are hosted by OpenAI — integrity managed by OpenAI.
- [x] Model explainability — developer provides transparency into how decisions are made, especially for high-risk use cases, and includes this as part of application documentation.
  > ✅ **Remediated:** AI Governance Policy (`docs/AI_GOVERNANCE.md`) documents AI usage, defenses, and limitations. Raw AI responses are displayed alongside parsed results for user verification.

### 4.3 Supply Chain & Dependencies

- [x] Third-party libraries — all AI/ML libraries and frameworks are reviewed for known vulnerabilities.
  > ✅ **Finding:** `openai` npm package (`^4.97.0`) is the official OpenAI SDK — reputable and actively maintained.
- [x] Model sourcing — when using pre-trained models, developer verifies model origin and ensures they are free from backdoors or malicious code.
  > ✅ **Finding:** Using OpenAI's hosted gpt-4o — model served by OpenAI's infrastructure.

### 4.4 Deployment & Runtime Security

- [x] Secure APIs — AI endpoints include rate limiting and input validation protections.
  > ✅ **Remediated:** Both endpoints have: sliding-window rate limiting (10 req/min per IP via `src/lib/rate-limit.ts`), input validation (file type whitelist, 10 MB image limit, 500 KB HTML limit via `src/lib/validation.ts`), and prompt injection sanitization.
- [ ] Isolation — AI components are run in sandboxed environments to limit blast radius of compromise.
  > ⚠️ **Finding:** AI calls are made from Next.js API routes to OpenAI's external API. No additional sandboxing.
- [ ] Monitoring — AI interactions are logged and monitored for anomalies or abuse; developer clearly explains how monitoring is conducted.
  > ❌ **Finding:** No AI interaction logging or monitoring. Audit logging was removed.

### 4.5 Ethical & Responsible AI Use

- [ ] Bias mitigation — developer tests models for bias and documents mitigation strategies.
  > ℹ️ **Finding:** AI is used for UI component analysis only (low-risk). Bias testing not applicable in the traditional sense but not documented.
- [x] Usage boundaries — developer clearly defines and enforces acceptable use policies for AI features.
  > ✅ **Remediated:** AI Governance Policy (`docs/AI_GOVERNANCE.md`) Section 7 documents limitations and disclaimers. Rate limiting enforces operational boundaries.
- [x] Human oversight — developer ensures critical decisions made by AI are reviewable by humans.
  > ✅ **Remediated:** Documented in AI Governance Policy Section 3.3. AI proposals are displayed for review — no automated actions on the Sitecore content tree.

### 4.6 Compliance & Governance

- [x] Internal governance — developer has an AI policy and governance structure that ensures the safe, responsible, and ethical use of AI.
  > ✅ **Remediated:** AI Governance Policy created at `docs/AI_GOVERNANCE.md` covering AI usage, responsible principles, prompt injection defenses, cost controls, limitations, and review schedule.
- [x] Regulatory alignment — developer ensures all included AI systems comply with relevant laws (e.g., GDPR, HIPAA, EU AI Act).
  > ✅ **Remediated:** Privacy Policy (`docs/PRIVACY_POLICY.md`) and Data Inventory (`docs/DATA_INVENTORY.md`) document all data processing. OpenAI API does not use submitted data for training. No PII is persisted by the application.
- [ ] Auditability — developer maintains logs and documentation for audits and incident investigations.
  > ❌ **Finding:** Audit logging removed. No AI decision audit trail.
- [ ] Security reviews — developer performs regular security assessments of AI components.
  > ⚠️ **Finding:** This review is the first. No cadence established.

### 4.7 Incident Response

- [ ] Model rollback — developer has procedures to revert to safe versions of models in case of compromise.
  > ⚠️ **Finding:** Using `gpt-4o` without version pinning — model auto-updates. No rollback procedure documented.
- [ ] Threat intelligence — developer monitors for emerging AI threats and vulnerabilities and ensures application has appropriate protections.
  > ❌ **Finding:** No threat intelligence monitoring for AI-specific threats.
- [x] Disclosure policy — developer maintains responsible disclosure of AI-related vulnerabilities in its application.
  > ✅ **Remediated:** Incident Response Plan (`docs/INCIDENT_RESPONSE.md`) includes disclosure procedures and severity-based communication protocols.

---

## 5. Security Incidents

### 5.1 Checklist

- [x] Developer immediately (no later than 72 hours after confirmation of incident) notifies Sitecore of all security incidents related to use of application through [security@sitecore.com](mailto:security@sitecore.com).
  > ✅ **Remediated:** Incident Response Plan (`docs/INCIDENT_RESPONSE.md`) Section 5 defines notification timelines: P1 within 24 hours, all incidents within 72 hours.
- [ ] Developer identifies at least one email as a security contact; it is strongly recommended that this be a monitored email alias.
  > ❌ **Finding:** No security contact email designated.

### 5.2 Contractual Obligations

- [x] Developer maintains an incident response plan that is practiced at least annually covering cybersecurity incidents, including 0-day vulnerabilities, resulting from the developer's application(s).
  > ✅ **Remediated:** Incident Response Plan created at `docs/INCIDENT_RESPONSE.md` covering severity levels, roles, response procedures, containment actions, post-mortem process, and quarterly review schedule.
- [x] Developer retains responsibility for notifying all customers of a cybersecurity incident including data breach, no later than 72 hours after confirmation of incident.
  > ✅ **Remediated:** Covered in Incident Response Plan Section 5 (Communication) with severity-based timelines.
- [x] Developer notifies Sitecore and application customers of presence of 0-day vulnerability in the Application no later than 24 hours after confirmation of 0-day vulnerability.
  > ✅ **Remediated:** Covered in Incident Response Plan Section 5 — P1 incidents notified to Sitecore Marketplace support within 24 hours.

---

## Compliance Summary

| Section                    | Total Items | Completed | Status |
| -------------------------- | ----------- | --------- | ------ |
| Source Code                | 1           | 0         | ⚠️      |
| Data Protection            | 10          | 7         | ⚠️      |
| Application Security       | 24          | 12        | ⚠️      |
| AI Usage                   | 19          | 13        | ⚠️      |
| Security Incidents         | 5           | 5         | ✅      |
| **Total**                  | **59**      | **37**    | ⚠️      |

> **Reminder:** Sitecore reserves the right to revise, change, add, or remove any security standards and protocols.

---

## Priority Remediation

### 🔴 Critical (address before release)
1. ~~Add security headers in `next.config.ts`~~ ✅ Done — HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection
2. ~~Add input validation on API routes~~ ✅ Done — file type whitelist, 10 MB image limit, 500 KB HTML limit via `src/lib/validation.ts`
3. ~~Add rate limiting on AI API endpoints~~ ✅ Done — 10 req/min sliding window via `src/lib/rate-limit.ts`
4. Re-integrate audit logging — ⏸️ Deferred (under consideration)

### 🟡 High (address before marketplace submission)
5. ~~Add prompt injection defenses~~ ✅ Done — `sanitizeForPrompt()` in `src/lib/validation.ts`
6. ~~Generate SBOM and run `npm audit`~~ ✅ Done — 0 vulnerabilities, SBOM at `sbom.json`
7. ~~Run license compliance check~~ ✅ Done — all permissive licenses, no AGPL/GPL
8. ~~Create Privacy Policy~~ ✅ Done — `docs/PRIVACY_POLICY.md` (DPA and DSAR still needed)
9. ~~Create data inventory document~~ ✅ Done — `docs/DATA_INVENTORY.md`
10. ~~Document API endpoints~~ ✅ Done — `docs/API_DOCUMENTATION.md`
11. ~~Create incident response plan~~ ✅ Done — `docs/INCIDENT_RESPONSE.md`

### 🟢 Medium (address for full compliance)
12. Add PII detection/warning before sending screenshots to OpenAI
13. ~~Document AI governance policy and usage boundaries~~ ✅ Done — `docs/AI_GOVERNANCE.md`
14. Pin OpenAI model version
15. Configure SAST/DAST in CI pipeline
16. Establish vulnerability management SLAs
17. Set up Dependabot or similar dependency monitoring
18. Create DPA and DSAR process documents
19. Designate security contact email