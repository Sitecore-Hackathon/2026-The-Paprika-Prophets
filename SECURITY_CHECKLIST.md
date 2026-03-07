# Sitecore Marketplace Security Checklist

> **Source:** [Sitecore Security Checklist](https://doc.sitecore.com/mp/en/developers/marketplace/sitecore-security-checklist.html)
> **Last revision date:** 27 January, 2026

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

---

## 2. Data Protection

### 2.1 Regulatory Compliance

- [ ] Developer has a Privacy Policy.
- [ ] Developer maintains a Data Processing Addendum that complies with GDPR requirements.
- [ ] Developer maintains a Data Subject Access Request (DSAR) process applicable to all Personal Data processed by the developer's application.

### 2.2 Data Inventory

- [ ] Developer maintains an accurate and up-to-date inventory of all data processed by the application.

### 2.3 Data at Rest

- [ ] All developer-controlled data stored by the application (except data at the user's browser) has underlying full-disk encryption.
- [ ] Where possible, full-disk encryption uses FIPS 140-2 encryption.

### 2.4 Data in Transit

- [ ] Application uses TLS version 1.2 (or higher) with strong cipher suites to encrypt traffic over public or untrusted networks.
- [ ] Application enables HSTS with a minimum age of one year.
- [ ] Application complies with [Mozilla's Server Side TLS guidance](https://wiki.mozilla.org/index.php?title=Security/Server_Side_TLS&oldid=1241620).

### 2.5 Secrets

- [ ] Secrets are not stored in easily accessed locations, such as source code, headers/URL strings, configuration files, or application logs.

---

## 3. Application Security

### 3.1 Secure Development Environment

- [ ] Applications hosted by the developer are managed in a secured environment.
- [ ] Access to developer's secure development environment is secured, managed to RBAC and Least Privilege principles.
- [ ] Developer follows secure coding practices such as OWASP Top 10, OWASP ASVS or similar.

### 3.2 Application

- [ ] Application does not use unsupported Sitecore APIs and SDKs.
- [ ] All application endpoints are stable and documented, with documentation available to share on request from Sitecore or a customer.
- [ ] Application enables security headers and [cookie](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#cookies) security attributes, following [OWASP guidance](https://owasp.org/www-project-secure-headers/#div-headers).
- [ ] Application validates and sanitizes all untrusted data to mitigate injection-related vulnerabilities.
- [ ] Application treats all user input as unsafe.
- [ ] Sensitive actions are verified and protected from client-side tampering or forgery.
- [ ] Application enforces strict isolation of tenant data. Sitecore may request evidence of third-party penetration testing to confirm isolation.

### 3.3 Authentication and Authorization

- [ ] Application authenticates and authorizes every request on all Sitecore endpoints exposed.
  - Anonymous access can be allowed in scenarios where it is needed.
- [ ] Hard-coded tokens are not used.
- [ ] Tokens are scoped to the user making the request.

### 3.4 Logging

- [ ] Application logs authentication events, access control decisions, and sensitive operations to a contributor-controlled secure log store.
- [ ] Logs follow a common log format (CLF, ELF) and content.
- [ ] All timestamps are in UTC format.
- [ ] Logs are securely stored in a tamperproof format (such as a WORM drive or controlled location).
- [ ] Logs are made available when reasonably requested in support of troubleshooting or investigation.

### 3.5 Third-Party and Open Source Software

- [ ] All third-party libraries included or leveraged by the application, including open source, originate from reputable sources and are actively maintained.
- [ ] Application does not use (versions of) third-party libraries and dependencies with known critical or high vulnerabilities.
- [ ] No use of AGPL, GPL, or other copyleft third-party libraries by libraries included with the contribution, or by the contribution itself.
- [ ] Developer maintains an accurate and up-to-date SBOM for each application.
  - Developer must be prepared to provide the SBOM to Sitecore on reasonable request.

### 3.6 Security Testing

- [ ] Application is tested and free of common vulnerabilities such as OWASP Top 10, SANS 25 and other common or emergent vulnerability classes.
- [ ] Application is not released until all critical findings have been remediated, including findings against included open source or third-party code.
  - Developer may not downgrade a finding more than one level (a critical vulnerability may not be downgraded to moderate severity).

### 3.7 Vulnerability Management

- [ ] Developer maintains a discipline to monitor and remediate critical and high vulnerabilities and provide patches or application updates to customers as quickly as possible.
- [ ] If developer is unable to remediate a critical vulnerability within documented SLA, developer notifies Sitecore immediately and removes the Application from the Marketplace.
  - Sitecore reserves the right to remove applications at any time.

---

## 4. AI Usage

### 4.1 Data Security & Privacy

- [ ] Data provenance — training data is sourced ethically and legally, with proper documentation.
- [ ] PII protection — personally identifiable information is not used as part of training data.
- [ ] Data minimization — only collect and process data necessary for the AI functionality.

### 4.2 Model Security

- [ ] Model robustness — application includes defenses against adversarial attacks (e.g., input manipulation).
- [ ] Model integrity — developer ensures models are protected from tampering during deployment and updates.
- [ ] Model explainability — developer provides transparency into how decisions are made, especially for high-risk use cases, and includes this as part of application documentation.

### 4.3 Supply Chain & Dependencies

- [ ] Third-party libraries — all AI/ML libraries and frameworks are reviewed for known vulnerabilities.
- [ ] Model sourcing — when using pre-trained models, developer verifies model origin and ensures they are free from backdoors or malicious code.

### 4.4 Deployment & Runtime Security

- [ ] Secure APIs — AI endpoints include rate limiting and input validation protections.
- [ ] Isolation — AI components are run in sandboxed environments to limit blast radius of compromise.
- [ ] Monitoring — AI interactions are logged and monitored for anomalies or abuse; developer clearly explains how monitoring is conducted.

### 4.5 Ethical & Responsible AI Use

- [ ] Bias mitigation — developer tests models for bias and documents mitigation strategies.
- [ ] Usage boundaries — developer clearly defines and enforces acceptable use policies for AI features.
- [ ] Human oversight — developer ensures critical decisions made by AI are reviewable by humans.

### 4.6 Compliance & Governance

- [ ] Internal governance — developer has an AI policy and governance structure that ensures the safe, responsible, and ethical use of AI.
- [ ] Regulatory alignment — developer ensures all included AI systems comply with relevant laws (e.g., GDPR, HIPAA, EU AI Act).
- [ ] Auditability — developer maintains logs and documentation for audits and incident investigations.
- [ ] Security reviews — developer performs regular security assessments of AI components.

### 4.7 Incident Response

- [ ] Model rollback — developer has procedures to revert to safe versions of models in case of compromise.
- [ ] Threat intelligence — developer monitors for emerging AI threats and vulnerabilities and ensures application has appropriate protections.
- [ ] Disclosure policy — developer maintains responsible disclosure of AI-related vulnerabilities in its application.

---

## 5. Security Incidents

### 5.1 Checklist

- [ ] Developer immediately (no later than 72 hours after confirmation of incident) notifies Sitecore of all security incidents related to use of application through [security@sitecore.com](mailto:security@sitecore.com).
- [ ] Developer identifies at least one email as a security contact; it is strongly recommended that this be a monitored email alias.

### 5.2 Contractual Obligations

- [ ] Developer maintains an incident response plan that is practiced at least annually covering cybersecurity incidents, including 0-day vulnerabilities, resulting from the developer's application(s).
- [ ] Developer retains responsibility for notifying all customers of a cybersecurity incident including data breach, no later than 72 hours after confirmation of incident.
- [ ] Developer notifies Sitecore and application customers of presence of 0-day vulnerability in the Application no later than 24 hours after confirmation of 0-day vulnerability.

---

## Compliance Summary

| Section                    | Total Items | Completed |
| -------------------------- | ----------- | --------- |
| Source Code                | 1           |           |
| Data Protection            | 10          |           |
| Application Security       | 24          |           |
| AI Usage                   | 19          |           |
| Security Incidents         | 5           |           |
| **Total**                  | **59**      |           |

> **Reminder:** Sitecore reserves the right to revise, change, add, or remove any security standards and protocols.
