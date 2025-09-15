# Deployment Hardening Guide

This document outlines recommended production hardening steps for the AI PRD application. It covers security headers, Content Security Policy (CSP), privacy / PII controls for telemetry, build/runtime integrity, and operational safeguards.

---
## 1. Threat Model (Concise)
| Area | Primary Risks | Mitigations |
|------|---------------|-------------|
| Supply chain | Malicious dependency / typosquat | Pin versions, enable Dependabot / Renovate, verify integrity hashes for critical libs |
| XSS (DOM) | User-provided PRD text rendered with markup | Current UI uses plain text; keep `dangerouslySetInnerHTML` out unless sanitized; enforce CSP + Trusted Types (future) |
| Data exfil (AI) | Sensitive text sent to Gemini inadvertently | Redaction toggle + extended patterns; default off for maximal fidelity; document opt-in |
| Local storage leakage | Device shared / compromised | Avoid storing secrets; only store non-sensitive PRD content + flags |
| Clickjacking | App embedded in hostile iframe | `X-Frame-Options: DENY` / `frame-ancestors 'none'` in CSP |
| Mixed content | Insecure asset load | Force HTTPS + HSTS |
| DoS (AI quota) | Excessive AI calls / loops | Caching, backoff, abort logic, TTL on suggestions |

---
## 2. Essential HTTP Security Headers
Add via reverse proxy (NGINX, Cloudflare, Vercel edge, etc.). Adjust values if you enable additional third‑party domains.

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: <SEE BELOW>
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cache-Control: no-store, max-age=0 (for HTML); immutable, max-age=31536000 (for hashed static assets)
```

Note: COEP+COOP may be relaxed if you embed cross‑origin iframes; remove if compatibility issues arise.

---
## 3. Baseline CSP
Start with a restrictive CSP; widen only as needed. Replace `YOUR_DOMAIN` appropriately. If using inline styles from Tailwind JIT (should not), remove `'unsafe-inline'`.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:; 
  font-src 'self';
  connect-src 'self' https://generativelanguage.googleapis.com https://api.openai.com; 
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
```

If you add analytics: append its domain to `script-src` & `connect-src`. Avoid broad wildcards.

### 3.1 CSP Reporting (Optional)
Add a report endpoint:
```
report-uri https://YOUR_REPORT_COLLECTOR.example/csp;
report-to csp-endpoint;
```
Implement rate limiting on the receiver.

---
## 4. Sentry / Telemetry PII Scrubbing
If integrating Sentry or similar:

- Disable automatic capture of headers that may include Authorization.
- Strip email‑like substrings with the existing `redact` helper before sending custom payloads.
- Avoid logging raw model prompts if redaction disabled; log only character counts + hash.
- Provide user toggle (already present for telemetry enablement assumption—ensure UI exposes it clearly).

Example (pseudocode):
```ts
Sentry.init({
  beforeSend(event){
    if(event.request?.headers) delete event.request.headers['Authorization'];
    if(event.request?.cookies) delete event.request.cookies; // minimize
    return event;
  }
});
```

---
## 5. Build Integrity & Supply Chain
- Lock dependencies (`package-lock.json` or `pnpm-lock.yaml` committed).
- Use `npm audit --production` (or equivalent) in CI; fail on high severity.
- Optionally verify integrity via `npm ci --ignore-scripts` in a hardened build stage.
- Separate build and runtime images (multi-stage Docker) to reduce attack surface.

### 5.1 Subresource Integrity (SRI)
If any external scripts are added (try to avoid), include integrity hashes + `crossorigin="anonymous"`.

---
## 6. Runtime Protections
| Protection | Action |
|------------|--------|
| Rate limiting | Apply at reverse proxy for /api server endpoints (burst + sustained) |
| TLS enforcement | Redirect HTTP → HTTPS early |
| Logging hygiene | Avoid storing PRD text in server logs; log hashes/length only |
| Error sanitation | Serve generic 5xx messages (detailed stack only in development) |

---
## 7. AI Boundary Controls
- Enforce max token size (already via `trimPrompt` variant handling, verify upper bound < provider hard limit).
- Backoff + retry classification (implemented) prevents tight failure loops.
- Add circuit breaker metric: if >N failures in M minutes, short‑circuit AI calls temporarily and surface UI warning.

---
## 8. Privacy & Data Retention
| Data | Location | Retention | Controls |
|------|----------|-----------|----------|
| PRD content | Browser local storage | Until user clears | Provide clear "Reset" option |
| Snapshots | Local storage | Last 50 | User manual delete & auto cap |
| Telemetry events | Remote (if enabled) | Operator defined | Opt-in toggle; redact before send |

---
## 9. Optional Advanced Hardening
- Trusted Types (Chrome): set `Content-Security-Policy: require-trusted-types-for 'script';` once no unsafe DOM sinks remain.
- CSP nonces + removal of `'unsafe-inline'` style once Tailwind compiled output validated.
- Service Worker integrity pinning: hash-check cached core assets.
- Add integrity hash banner in UI (short commit SHA) for provenance.
- Implement offline data encryption (local passphrase) if storing sensitive drafts.

---
## 10. Deployment Checklist
- [ ] HTTPS enforced (HSTS preload submitted)
- [ ] CSP passes smoke test (no unexpected violations after 5 min of typical use)
- [ ] Security headers present (curl -I)
- [ ] Dependency audit clean (no high severity)
- [ ] Telemetry toggle visible & functional
- [ ] Redaction toggle tested (before/after sample text)
- [ ] No unexpected third-party network calls (verify via DevTools)
- [ ] Error pages sanitized (no stack traces in prod)
- [ ] Snapshot restore + undo still functional under CSP

---
## 11. Future Ideas
- Add per-field sensitivity toggles (never send to AI certain sections)
- Pluggable on-device LLM fallback (WebGPU) for fully private mode
- Secret scanning pre-flight (warn user if likely credential in text)

---
**Maintainer Note:** Revisit this document quarterly or upon adding any new third-party integration.
