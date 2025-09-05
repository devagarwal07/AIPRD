import { describe, it, expect } from 'vitest';
import { prdToMarkdown } from '../integrations';

describe('prdToMarkdown', () => {
  it('renders markdown with selected sections', () => {
    const md = prdToMarkdown(
      {
        title: 'My PRD',
        problem: 'P',
        solution: 'S',
        objectives: ['O1', 'O2'],
        userStories: ['U1', 'U2'],
        requirements: ['R1', 'R2'],
      },
      { problem: true, solution: true, objectives: true, userStories: true, requirements: true },
      { score: 85, gaps: ['Add NFRs'] }
    );
    expect(md).toMatchSnapshot();
  });

  it('omits sections toggled off', () => {
    const md = prdToMarkdown(
      {
        title: 'My PRD',
        problem: 'P',
        solution: 'S',
        objectives: ['O1'],
        userStories: [],
        requirements: [],
      },
      { problem: true, solution: false, objectives: false, userStories: false, requirements: false }
    );
    expect(md).not.toContain('## Solution Overview');
    expect(md).toContain('## Problem Statement');
  });
});
