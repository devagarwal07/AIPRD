# Browser Compatibility Matrix

This matrix tracks tested browsers / versions and notes on feature support. Update when adding new APIs or polyfills.

| Browser | Version Tested | Core App | Clipboard Fallback | Service Worker / PWA | LocalStorage Persist | AI (Gemini) | Notes |
|---------|----------------|----------|--------------------|----------------------|---------------------|------------|-------|
| Chrome (Desktop) | 128+ | ✅ | ✅ | ✅ | ✅ | ✅ | Primary development target |
| Firefox (Desktop) | 128+ | ✅ | ✅ | ✅ | ✅ | ✅ | Slightly slower initial paint due to devtools source maps |
| Safari (macOS) | 17+ | ✅ | ✅ | ✅ | ✅ | ✅ | Clipboard native may prompt permission; fallback works |
| Edge (Chromium) | 128+ | ✅ | ✅ | ✅ | ✅ | ✅ | Equivalent to Chrome support |
| Mobile Safari | 17+ | ✅ | ✅ | PWA (standalone) ⚠️ | ✅ | ✅ | Install prompt differs; offline banner styling narrower |
| Mobile Chrome (Android) | 128+ | ✅ | ✅ | ✅ | ✅ | ✅ | Virtual keyboard resize affects layout (acceptable) |

Legend:
- ✅ Supported / works as expected
- ⚠️ Partial or with minor visual/UX caveats
- ❌ Not supported / blocked

## Feature Notes
- Clipboard fallback triggers automatically if `navigator.clipboard.writeText` throws or is unavailable.
- Service worker registration skipped in development mode.
- AI (Gemini) requires network + API key in environment; offline mode cleanly disables panel actions.

## Testing Checklist
| Area | Scenario |
|------|----------|
| Offline Banner | Disable network -> banner appears & AI actions disabled |
| Clipboard | Force insecure context simulation -> fallback copies via textarea |
| Storage Quota | Fill localStorage artificially -> quota toast appears |
| Diff Highlight | Modify problem/solution after snapshot -> colored inline diff visible |
| Multi-PRD Switch | Create new PRD -> switch retains previous content when returning |

_Last updated: 2025-09-15_
