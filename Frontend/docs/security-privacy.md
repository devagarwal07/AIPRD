# Security & Privacy

This document explains how data is handled, stored, and protected in the current architecture, plus planned enhancements.

## 1. Data Classes
| Data Type | Examples | Source | Storage | Persistence Scope |
|-----------|----------|--------|---------|-------------------|
| PRD Content | objectives, user stories, requirements, notes | User input | localStorage (Zustand persist) | Until user clears or browser storage eviction |
| Snapshots | historical PRD states | Derived | localStorage | Same as above |
| Share Payload | Encoded PRD subset + mode | Derived (on demand) | URL only (base64) | Ephemeral (user controlled) |
| AI Prompts | Prompt text + context excerpts | Generated client-side | Sent to Gemini API | Not stored locally after request (except logs if enabled) |
| Telemetry Events | snapshot_saved, error events | Generated | Sentry (if enabled) | Remote retention per Sentry policy |
| Integration Config | Notion credentials, etc. (future) | User provided | Backend DB (if used) | Until deleted by user |

## 2. Storage & Retention
- **LocalStorage**: Primary persistence for in-progress PRD and snapshots. No encryption (browser default). User can purge via browser tools.
- **Backend (optional)**: If enabled, Express + Mongo persists integration configs & synced PRDs—scoped by future auth layer. Not active for core offline workflow.
- **In-URL Sharing**: Exported share links contain an encoded JSON structure; users should treat links as sensitive if they contain proprietary content. The encoding is NOT encryption.

## 3. Telemetry & Observability
Telemetry is optional (explicit user consent toggle planned). When enabled:
- Errors: Basic stack traces (minimized PII—avoid embedding user text).
- Performance Metrics: High-level timing (no raw PRD content).
- Custom Events: Labeled events (e.g., `snapshot.save`) without payload data.

## 4. AI Privacy Considerations
- Prompts include only the minimal subset of PRD context needed for generation.
- Sensitive identifiers (if any) should be masked prior to submission (future enhancement: pluggable redaction function).
- Responses are not auto-persisted unless user accepts/appends them.

## 5. Threat Model (Current Scope)
| Threat | Vector | Impact | Mitigation | Status |
|--------|--------|--------|-----------|--------|
| Local device compromise | Malware, shared machine | Data exposure | User environment responsibility | Out of scope |
| Shoulder surfing | Visible screen | Data leak | Encourage private work environment | User dependent |
| Link leakage | Shared URL posted publicly | PRD disclosure | Educate: link is plain encoded, treat as sensitive | Partial |
| XSS via stored content | Malicious input in PRD fields | Script execution | React auto-escapes; avoid dangerouslySetInnerHTML | Mitigated |
| AI prompt injection | User content manipulates system prompt | Biased/unsafe output | Prompt sanitization & delimiting | Basic |
| Storage quota failure | Large PRDs exceed quota | Data loss (failure to save) | Planned quota handler & cleanup guidance | Pending |
| Clipboard API failure | Insecure context / permissions | UX friction | Planned fallback to hidden textarea | Pending |

## 6. Known Gaps / Backlog
| Area | Planned Action |
|------|----------------|
| Quota Handling | Wrap persistence layer with try/catch; show cleanup modal on `QuotaExceededError`; optional snapshot pruning. |
| Clipboard Fallback | Graceful `execCommand('copy')` backup using ephemeral textarea. |
| Redaction | Configurable redaction rules for proper nouns / IDs before AI calls. |
| Multi-User Auth | Integrate Clerk fully, scope remote data by user ID. |
| Encryption at Rest | Optional: encrypt local snapshot payloads with user-supplied passphrase. |
| Diff Highlight | Ensure highlighting logic escapes HTML to prevent injection. |
| Backoff & Classification | Structured retry policy to reduce repeated failing AI calls (avoid rate-limit escalation). |

## 7. Secure Coding Practices
- Avoid dynamic HTML injection; trust React's escaping.
- Validate all decoded share payloads with Zod before use.
- Keep dependencies patched; run `npm audit` periodically.
- Minimize 3rd-party additions—review licenses & supply chain risk.

## 8. Operational Recommendations
For production deployment (future):
- Enable HTTPS strictly.
- Set robust CSP headers (script-src 'self').
- Add security.txt and disclosure policy.
- Configure Sentry PII scrubbing filters.
- Automate dependency scanning (e.g., GitHub Dependabot).

## 9. User Guidance (Summarized)
- Treat share links as sensitive documents.
- Clear local data when device is transferred.
- Disable telemetry if working with classified content.

## 10. FAQ
**Is my PRD sent to servers automatically?** No—only if a future sync/integration feature is explicitly used.

**Are share links secret?** No—they are obfuscated only. Anyone with the link can decode.

**Does AI receive my full document?** Only the specific sections required for the requested suggestion.

---
_Last updated: 2025-09-15_
