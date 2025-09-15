import { describe, it, expect } from 'vitest';
import { prdToHtml, prdToPdfPlaceholder } from '../exporters';
import type { PRDSections, PRDFormLike } from '@core';

const form: PRDFormLike = {
  title: 'Title',
  problem: 'Prob',
  solution: 'Sol',
  objectives: ['Obj1'],
  userStories: ['Story1'],
  requirements: ['Req1'],
  riceScores: [],
  acceptanceCriteria: [],
  acceptanceBurndown: [],
};
const sections: PRDSections = { problem: true, solution: true, objectives: true, userStories: true, requirements: true };

describe('exporters', () => {
  it('generates HTML with sections', () => {
    const html = prdToHtml(form, sections);
    expect(html).toContain('<h2>Problem');
    expect(html).toContain('Obj1');
  });
  it('pdf placeholder returns blob', async () => {
    const blob = await prdToPdfPlaceholder('<html></html>');
    expect(blob.type).toBe('application/pdf');
  });
});
