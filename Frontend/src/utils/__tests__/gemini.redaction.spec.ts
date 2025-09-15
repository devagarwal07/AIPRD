import { describe, it, expect, beforeEach } from 'vitest';
// We import indirectly so we can toggle redaction flag via public API
import { setRedactionEnabled } from '../gemini';

// Because redact() is internal, we exercise it via public generation helpers by calling maybeRedactPrompt through a crafted function.
// To avoid a real network call, we'll dynamically import the module and access the internal function via bracket notation (TypeScript won't check at runtime).

let geminiMod: any;

beforeEach(async () => {
  setRedactionEnabled(true);
  geminiMod = await import('../gemini');
});

function applyRedact(sample: string): string {
  // Internal function name is 'redact'; we intentionally access it for focused unit validation.
  return geminiMod.__esModule && typeof geminiMod === 'object' && geminiMod['__proto__']
    ? (geminiMod as any).redact?.(sample) ?? (geminiMod as any).default?.redact?.(sample) ?? '[NO_REDaction]'
    : (geminiMod as any).redact?.(sample) ?? '[NO_REDaction]';
}

describe('redaction patterns', () => {
  it('redacts emails, URLs, UUIDs, long numbers', () => {
    const input = 'Contact me at test.user@example.com visit https://example.com/id/123 and uuid 123e4567-e89b-12d3-a456-426614174000 and card 1234567890123456';
    const out = applyRedact(input);
    expect(out).not.toMatch(/test.user@example.com/);
    expect(out).not.toMatch(/https:\/\/example.com/);
    expect(out).not.toMatch(/123e4567-e89b-12d3-a456-426614174000/);
    expect(out).not.toMatch(/1234567890123456/);
  });

  it('redacts phone numbers', () => {
    const input = '+1 (415) 555-1234 then 415-555-6789';
    const out = applyRedact(input);
    expect(out).not.toMatch(/415/); // coarse check that digits removed
    expect(out).toContain('[REDACTED_PHONE]');
  });

  it('redacts tokens, repo paths, filesystem paths', () => {
    const input = 'Token ghp_ABCDEF1234567890ABCDEF1234567890 path /Users/alice/secrets.txt repo user/repo C:/Windows/System32 drivers';
    const out = applyRedact(input);
    expect(out).toContain('[REDACTED_TOKEN]');
    expect(out).toContain('[REDACTED_PATH]');
    expect(out).toContain('[REDACTED_REPO]');
  });
});
