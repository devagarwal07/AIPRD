import { describe, it, expect } from 'vitest';
import { buildAssessPrompt, buildSuggestionsPrompt } from '../prompts';
import { encodeSharePayload, decodeSharePayload, type SharedPRD } from '../share';

// These are pure-function style edge checks to avoid heavy AI/network interactions.

describe('edge cases', () => {
  it('assess prompt with empty PRD yields JSON structure placeholders', () => {
    const prompt = buildAssessPrompt({ formJson: JSON.stringify({ title: '', problem: '', solution: '', objectives: [], userStories: [], requirements: [] }) });
    expect(prompt).toContain('score');
    expect(prompt).toContain('missing');
    expect(prompt).toContain('suggestions');
  });

  it('suggestions prompt for large PRD remains under safe size', () => {
    const hugeText = 'Feature description. '.repeat(1000); // ~20k chars
    const form = { title: 'Big', problem: hugeText, solution: hugeText, objectives: [], userStories: [], requirements: [] };
    const json = JSON.stringify(form);
    const prompt = buildSuggestionsPrompt({ step: 2, focus: 'requirements', formJson: json });
    // Ensure prompt not explosively large (> 80k chars arbitrary guard)
    expect(prompt.length).toBeLessThan(80000);
  });

  it('share payload decode gracefully returns null for truncated base64', () => {
    const obj: SharedPRD = { v: 1, prd: { title: 'T', problem: 'P', solution: 'S', objectives: [], userStories: [], requirements: [] }, sections: { problem: true, solution: true, userStories: true, requirements: true }, ts: Date.now() };
    const enc = encodeSharePayload(obj);
    const truncated = enc.slice(0, Math.floor(enc.length / 2));
    const dec = decodeSharePayload(truncated);
    expect(dec).toBeNull();
  });
});
