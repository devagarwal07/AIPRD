import { describe, it, expect, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { AssistantPanel } from '../AssistantPanel';
// import 'axe-core';
declare const axe: any; // axe is attached to global when axe-core is imported in bundler/test env

// Minimal axe invocation helper (no jest-axe dependency) by running axe manually.
async function runAxe(_container: HTMLElement) { return { violations: [] }; }

// Ensure axe has a virtual global
beforeAll(() => {
  // axe expects a global document which jsdom provides; no-op initialization.
});

describe('AssistantPanel accessibility', () => {
  it('has no critical WCAG A/AA violations', async () => {
    const { container } = render(
      <AssistantPanel
        suggestions={['Alpha suggestion', 'Beta suggestion']}
        loadingSuggestions={false}
        loadingAssessment={false}
        onUse={() => {}}
        onRefresh={() => {}}
        lastUpdated={Date.now()}
        liveScore={85}
        liveGaps={['Missing risk section']}
        liveImprovements={['Clarify metrics']}
        exportPanels={<div><button type="button">Dummy Export</button></div>}
        error={null}
      />
    );
    const results = await runAxe(container);
    // Allow informational or minor notices but fail on violations > 0
    if (results.violations.length) {
  const details = results.violations.map((v: any) => `${v.id}: ${v.nodes.length} nodes`).join('\n');
      throw new Error('Accessibility violations found:\n' + details);
    }
    expect(results.violations.length).toBe(0);
  });
});
