# Incident Response Plan — Component Forge

**Effective Date:** 2026-03-07
**Owner:** Component Forge Development Team

---

## 1. Scope

This plan covers security incidents affecting the Component Forge Sitecore Marketplace application, including:
- Unauthorised access to the application or its API endpoints
- Exposure of OpenAI API keys or other credentials
- Prompt injection attacks that produce harmful or unintended output
- Supply chain compromise (malicious dependency)
- Data breach involving user-submitted screenshots or HTML

## 2. Severity Levels

| Level | Description | Examples | Response Time |
|---|---|---|---|
| **P1 — Critical** | Active exploitation, credential exposure, data breach | API key leaked publicly; malicious dependency injected | Immediate (< 1 hour) |
| **P2 — High** | Vulnerability discovered, not yet exploited | CVE in a direct dependency; prompt injection bypass found | < 4 hours |
| **P3 — Medium** | Security misconfiguration, policy violation | Missing security header; rate limiter bypass | < 24 hours |
| **P4 — Low** | Minor finding, informational | Unnecessary dependency; documentation gap | Next sprint |

## 3. Roles & Responsibilities

| Role | Responsibility |
|---|---|
| **Incident Commander** | Coordinates response, communicates with stakeholders |
| **Developer On-Call** | Investigates, patches, deploys fixes |
| **Security Lead** | Validates fix, updates security checklist, conducts post-mortem |
| **Project Lead** | Notifies Sitecore Marketplace team if required |

## 4. Response Procedures

### 4.1 Detection & Triage

1. **Detect** — Identify the incident via:
   - Automated monitoring / alerts
   - User report
   - Dependency vulnerability scanning (`npm audit`, Dependabot)
   - Manual security review
2. **Classify** — Assign severity level (P1–P4).
3. **Notify** — Alert the appropriate roles based on severity.

### 4.2 Containment

| Scenario | Containment Action |
|---|---|
| API key exposure | Immediately revoke the exposed key in the OpenAI dashboard. Rotate with a new key. |
| Malicious dependency | Pin the dependency to the last known-good version. Run `npm audit fix`. |
| Prompt injection exploit | Deploy updated sanitisation rules. Consider temporarily disabling the affected endpoint. |
| Unauthorised API access | Review rate limiter logs. Consider IP blocklist at infrastructure level. |

### 4.3 Remediation

1. Develop and test the fix in a branch.
2. Run the full security review prompt (`.github/prompts/security-review.prompt.md`).
3. Run `npm audit` and verify 0 vulnerabilities.
4. Deploy the fix.
5. Verify the fix in production.

### 4.4 Recovery

1. Confirm the incident is fully resolved.
2. Re-enable any disabled features.
3. Monitor for recurrence (minimum 48 hours).

### 4.5 Post-Mortem

Within 5 business days of resolution:
1. Document timeline (detection → containment → resolution).
2. Identify root cause.
3. List contributing factors.
4. Define preventive actions with owners and deadlines.
5. Update `SECURITY_CHECKLIST.md` if new items are needed.
6. Share findings with the team.

## 5. Communication

### Internal
- P1/P2: Immediate notification via team chat channel.
- P3/P4: Documented in the next standup or sprint planning.

### External (Sitecore Marketplace)
- P1: Notify Sitecore Marketplace support within 24 hours.
- P2-P4: Include in next version's release notes if user-facing.

## 6. Credential Rotation Procedure

| Step | Action |
|---|---|
| 1 | Log into the OpenAI dashboard and revoke the compromised API key |
| 2 | Generate a new API key |
| 3 | Update the key in the Sitecore Settings item (`/sitecore/content/Component Forge/Settings`) |
| 4 | Verify the application works with the new key |
| 5 | If the key was in any env file, rotate those as well |
| 6 | Audit git history — ensure the key was never committed |

## 7. Review Schedule

- This plan is reviewed **quarterly** or after any P1/P2 incident.
- Review includes: role assignments, contact info, procedure accuracy, tooling changes.
