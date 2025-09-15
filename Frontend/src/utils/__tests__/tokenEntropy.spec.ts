import { describe, it, expect } from 'vitest';
import { randomToken } from '../share';

describe('randomToken entropy & charset', () => {
  it('generates unique tokens and adheres to charset', () => {
    const set = new Set<string>();
    const pattern = /^[A-Z2-9]+$/;
    for(let i=0;i<200;i++){
      const t = randomToken(10);
      expect(pattern.test(t)).toBe(true);
      set.add(t);
    }
    // Expect high uniqueness (no enforced guarantee, but collisions improbable with 200 samples)
    expect(set.size).toBeGreaterThan(195);
  });
});
