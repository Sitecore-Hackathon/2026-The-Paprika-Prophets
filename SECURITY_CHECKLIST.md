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

- [ ] Developer has a Privacy Policy.
  > ❌ **Finding:** No Privacy Policy page or document exists in the project.
- [ ] Developer maintains a Data Processing Addendum that complies with GDPR requirements.
  > ❌ **Finding:** No DPA document found.
- [ ] Developer maintains a Data Subject Access Request (DSAR) process applicable to all Personal Data processed by the developer's application.
  > ❌ **Finding:** No DSAR process documented.

### 2.2 Data Inventory

- [ ] Developer maintains an accurate and up-to-date inventory of all data processed by the application.
  > ❌ **Finding:** No data inventory document. App processes: Sitecore tenant metadata, uploaded screenshots, HTML snippets, OpenAI API keys (stored in Sitecore settings items), and AI analysis results.

### 2.3 Data at Rest

- [x] All developer-controlled data stored by the application (except data at the user's browser) has underlying full-disk encryption.
  > ✅ **Finding:** App does not persist data locally. Settings (including OpenAI key) are stored in Sitecore items via Authoring API — encryption at rest is delegated to Sitecore Cloud infrastructure.
- [ ] Where possible, full-disk encryption uses FIPS 140-2 encryption.
  > ℹ️ **Finding:** Delegated to Sitecore Cloud. Verify with Sitecore that their storage meets FIPS 140-2.

### 2.4 Data in Transit

- [ ] Application uses TLS version 1.2 (or higher) with strong cipher suites to encrypt traffic over public or untrusted networks.
  > ❌ **Finding:** No security headers configured in `next.config.ts`. No TLS enforcement or cipher suite configuration at the application level.
- [ ] Application enables HSTS with a minimum age of one year.
  > ❌ **Finding:** No HSTS header configured. Add `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` in `next.config.ts`.
- [ ] Application complies with [Mozilla's Server Side TLS guidance](https://wiki.mozilla.org/index.php?title=Security/Server_Side_TLS&oldid=1241620).
  > ❌ **Finding:** No TLS configuration at the application level.

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
- [ ] All application endpoints are stable and documented, with documentation available to share on request from Sitecore or a customer.
  > ⚠️ **Finding:** Two API routes exist (`/api/analyze-screenshot`, `/api/analyze-html`) but no endpoint documentation.
- [ ] Application enables security headers and [cookie](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#cookies) security attributes, following [OWASP guidance](https://owasp.org/www-project-secure-headers/#div-headers).
  > ❌ **Finding:** No security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) configured in `next.config.ts`. Cookie attributes rely on Sitecore Marketplace SDK defaults.
- [ ] Application validates and sanitizes all untrusted data to mitigate injection-related vulnerabilities.
  > ❌ **Finding:** HTML analysis endpoint (`src/app/api/analyze-html/route.ts`) accepts raw HTML without validation or sanitization. Screenshot endpoint has no file type or size validation.
- [ ] Application treats all user input as unsafe.
  > ❌ **Finding:** User input is passed directly to OpenAI prompts without sanitization. See `src/app/api/analyze-html/route.ts:12`.
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
- [ ] Application does not use (versions of) third-party libraries and dependencies with known critical or high vulnerabilities.
  > ⚠️ **Finding:** `npm audit` has not been run or documented. No dependency scanning in CI.
- [ ] No use of AGPL, GPL, or other copyleft third-party libraries by libraries included with the contribution, or by the contribution itself.
  > ⚠️ **Finding:** License compliance not formally verified. Run `npx license-checker --summary`.
- [ ] Developer maintains an accurate and up-to-date SBOM for each application.
  > ❌ **Finding:** No SBOM generated. Run `npx @cyclonedx/cyclonedx-npm --output-file sbom.json`.

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
- [ ] Data minimization — only collect and process data necessary for the AI functionality.
  > ⚠️ **Finding:** Full screenshots and full HTML are sent. No cropping, redaction, or size limits applied.

### 4.2 Model Security

- [ ] Model robustness — application includes defenses against adversarial attacks (e.g., input manipulation).
  > ❌ **Finding:** Raw user HTML is sent directly as prompt content (`src/app/api/analyze-html/route.ts`). No prompt injection defenses.
- [x] Model integrity — developer ensures models are protected from tampering during deployment and updates.
  > ✅ **Finding:** Models are hosted by OpenAI — integrity managed by OpenAI.
- [ ] Model explainability — developer provides transparency into how decisions are made, especially for high-risk use cases, and includes this as part of application documentation.
  > ⚠️ **Finding:** Analysis prompts are well-structured but no end-user documentation explaining how AI decisions are made.

### 4.3 Supply Chain & Dependencies

- [x] Third-party libraries — all AI/ML libraries and frameworks are reviewed for known vulnerabilities.
  > ✅ **Finding:** `openai` npm package (`^4.97.0`) is the official OpenAI SDK — reputable and actively maintained.
- [x] Model sourcing — when using pre-trained models, developer verifies model origin and ensures they are free from backdoors or malicious code.
  > ✅ **Finding:** Using OpenAI's hosted gpt-4o — model served by OpenAI's infrastructure.

### 4.4 Deployment & Runtime Security

- [ ] Secure APIs — AI endpoints include rate limiting and input validation protections.
  > ❌ **Finding:** No rate limiting on `/api/analyze-screenshot` or `/api/analyze-html`. No file size limits. No HTML input length limits.
- [ ] Isolation — AI components are run in sandboxed environments to limit blast radius of compromise.
  > ⚠️ **Finding:** AI calls are made from Next.js API routes to OpenAI's external API. No additional sandboxing.
- [ ] Monitoring — AI interactions are logged and monitored for anomalies or abuse; developer clearly explains how monitoring is conducted.
  > ❌ **Finding:** No AI interaction logging or monitoring. Audit logging was removed.

### 4.5 Ethical & Responsible AI Use

- [ ] Bias mitigation — developer tests models for bias and documents mitigation strategies.
  > ℹ️ **Finding:** AI is used for UI component analysis only (low-risk). Bias testing not applicable in the traditional sense but not documented.
- [ ] Usage boundaries — developer clearly defines and enforces acceptable use policies for AI features.
  > ⚠️ **Finding:** No acceptable use policy documented for AI features.
- [ ] Human oversight — developer ensures critical decisions made by AI are reviewable by humans.
  > ⚠️ **Finding:** Analysis results are displayed for human review before any action is taken. Not formally documented.

### 4.6 Compliance & Governance

- [ ] Internal governance — developer has an AI policy and governance structure that ensures the safe, responsible, and ethical use of AI.
  > ❌ **Finding:** No AI governance policy document.
- [ ] Regulatory alignment — developer ensures all included AI systems comply with relevant laws (e.g., GDPR, HIPAA, EU AI Act).
  > ❌ **Finding:** No regulatory alignment documentation. Screenshots may contain personal data sent to OpenAI (GDPR implications).
- [ ] Auditability — developer maintains logs and documentation for audits and incident investigations.
  > ❌ **Finding:** Audit logging removed. No AI decision audit trail.
- [ ] Security reviews — developer performs regular security assessments of AI components.
  > ⚠️ **Finding:** This review is the first. No cadence established.

### 4.7 Incident Response

- [ ] Model rollback — developer has procedures to revert to safe versions of models in case of compromise.
  > ⚠️ **Finding:** Using `gpt-4o` without version pinning — model auto-updates. No rollback procedure documented.
- [ ] Threat intelligence — developer monitors for emerging AI threats and vulnerabilities and ensures application has appropriate protections.
  > ❌ **Finding:** No threat intelligence monitoring for AI-specific threats.
- [ ] Disclosure policy — developer maintains responsible disclosure of AI-related vulnerabilities in its application.
  > ❌ **Finding:** No responsible disclosure policy.

---

## 5. Security Incidents

### 5.1 Checklist

- [ ] Developer immediately (no later than 72 hours after confirmation of incident) notifies Sitecore of all security incidents related to use of application through [security@sitecore.com](mailto:security@sitecore.com).
  > ❌ **Finding:** No incident notification process documented.
- [ ] Developer identifies at least one email as a security contact; it is strongly recommended that this be a monitored email alias.
  > ❌ **Finding:** No security contact email designated.

### 5.2 Contractual Obligations

- [ ] Developer maintains an incident response plan that is practiced at least annually covering cybersecurity incidents, including 0-day vulnerabilities, resulting from the developer's application(s).
  > ❌ **Finding:** No incident response plan.
- [ ] Developer retains responsibility for notifying all customers of a cybersecurity incident including data breach, no later than 72 hours after confirmation of incident.
  > ❌ **Finding:** No customer notification process documented.
- [ ] Developer notifies Sitecore and application customers of presence of 0-day vulnerability in the Application no later than 24 hours after confirmation of 0-day vulnerability.
  > ❌ **Finding:** No 0-day notification process documented.

---

## Compliance Summary

| Section                    | Total Items | Completed | Status |
| -------------------------- | ----------- | --------- | ------ |
| Source Code                | 1           | 0         | ⚠️      |
| Data Protection            | 10          | 2         | ❌      |
| Application Security       | 24          | 5         | ❌      |
| AI Usage                   | 19          | 3         | ❌      |
| Security Incidents         | 5           | 0         | ❌      |
| **Total**                  | **59**      | **10**    | ❌      |

> **Reminder:** Sitecore reserves the right to revise, change, add, or remove any security standards and protocols.

---

## Priority Remediation

### 🔴 Critical (address before release)
1. Add security headers in `next.config.ts` (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
2. Add input validation on API routes (file type/size limits, HTML length limits, content-type checks)
3. Add rate limiting on AI API endpoints
4. Re-integrate audit logging

### 🟡 High (address before marketplace submission)
5. Add prompt injection defenses (sanitize user input before including in OpenAI prompts)
6. Generate SBOM and run `npm audit`
7. Run license compliance check
8. Create Privacy Policy, DPA, and DSAR process documents
9. Create data inventory document
10. Document API endpoints
11. Create incident response plan and designate security contact

### 🟢 Medium (address for full compliance)
12. Add PII detection/warning before sending screenshots to OpenAI
13. Document AI governance policy and usage boundaries
14. Pin OpenAI model version
15. Configure SAST/DAST in CI pipeline
16. Establish vulnerability management SLAs
17. Set up Dependabot or similar dependency monitoring