import { mergePresetSeed, scenarioPresets } from '../scenarioPresets';
import { PRDFormState } from '../../store/prdStore';
// Explicit Vitest imports to satisfy TypeScript in environments not auto-injecting globals
import { describe, it, expect } from 'vitest';

describe('scenarioPresets', () => {
  const base: PRDFormState = { title:'', problem:'', solution:'', objectives:[''], userStories:[''], requirements:[''], riceScores: [], acceptanceCriteria: [], acceptanceBurndown: [] };
  it('MVP preset seeds only empty fields', () => {
    const mvp = scenarioPresets.find(p=>p.id==='mvp')!;
    const seeded = mergePresetSeed(base, mvp);
    expect(seeded.title).toBeTruthy();
    expect(seeded.problem).toContain('Describe');
    expect(Array.isArray(seeded.objectives)).toBe(true);
    expect(Array.isArray(seeded.userStories)).toBe(true);
    // Requirements should be omitted (preset sets requirements false)
    expect(seeded.requirements).toBeUndefined();
  });
  it('does not overwrite existing non-empty content', () => {
    const mvp = scenarioPresets.find(p=>p.id==='mvp')!;
    const custom: PRDFormState = { ...base, title: 'Existing', problem: 'Has problem', objectives:['Keep'], userStories:['Story'], requirements:['Req'] };
    const seeded = mergePresetSeed(custom, mvp);
    expect(seeded.title).toBeUndefined();
    expect(seeded.problem).toBeUndefined();
    expect(seeded.objectives).toBeUndefined();
    expect(seeded.userStories).toBeUndefined();
    expect(seeded.requirements).toBeUndefined();
  });
});
