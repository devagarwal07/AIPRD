import { describe, it, expect, beforeEach } from 'vitest';
import { encodeSharePayload, decodeSharePayload, buildShareUrl, randomToken, type SharedPRD } from '../share';

function sample(): SharedPRD {
  return {
    v: 1,
    prd: {
      title: 'Title',
      problem: 'Problem',
      solution: 'Solution',
      objectives: ['O1'],
      userStories: ['As a user I want X so that Y'],
      requirements: ['Must do Z'],
    },
    sections: { problem: true, solution: true, objectives: true, userStories: true, requirements: true },
    templateId: 'base',
    ts: Date.now(),
    token: 'TOK123',
  };
}

describe('share encode/decode', () => {
  beforeEach(() => {
    // Simulate window origin/path for buildShareUrl
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com', pathname: '/app' },
      writable: true,
    });
  });

  it('round trips payload via encode/decode', () => {
    const obj = sample();
    const enc = encodeSharePayload(obj);
    const dec = decodeSharePayload(enc);
    expect(dec).not.toBeNull();
    expect(dec?.prd.title).toBe('Title');
    expect(dec?.sections.problem).toBe(true);
  });

  it('builds share URL with token parameter', () => {
    const obj = sample();
    const url = buildShareUrl(obj);
    expect(url).toContain('view=prd');
    expect(url).toContain('data=');
    expect(url).toContain('token=TOK123');
  });

  it('returns null for corrupted data', () => {
    const bad = '%%%INVALID%%';
    const dec = decodeSharePayload(bad);
    expect(dec).toBeNull();
  });

  it('randomToken produces correct length and charset', () => {
    const t = randomToken(16);
    expect(t).toHaveLength(16);
    expect(/^[A-Z2-9]+$/.test(t)).toBe(true);
  });
});
