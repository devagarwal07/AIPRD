import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { AssistantPanel } from '../AssistantPanel';

function setup() {
  const utils = render(
    <AssistantPanel
      suggestions={['First suggestion']}
      loadingSuggestions={false}
      loadingAssessment={false}
      onUse={()=>{}}
      onRefresh={()=>{}}
      lastUpdated={Date.now()}
      liveScore={75}
      liveGaps={['Gap 1']}
      liveImprovements={['Improve 1']}
      exportPanels={<div data-testid="export-panels">Export Area</div>}
      error={null}
    />
  );
  return { ...utils };
}

describe('AssistantPanel tablist keyboard navigation', () => {
  it('cycles with ArrowRight / ArrowLeft and Home/End set aria-selected', () => {
    const { getByRole, getAllByRole } = setup();
    const tablist = getByRole('tablist', { name: /assistant panels/i });
    const tabs = getAllByRole('tab');
    // Initial: first selected
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    tabs[0].focus();
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    // Wraps
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(tablist, { key: 'End' });
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(tablist, { key: 'Home' });
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  });
});
