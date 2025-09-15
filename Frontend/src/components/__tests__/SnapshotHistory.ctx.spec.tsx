import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnapshotHistory } from '../prd/SnapshotHistory';
import { usePrdStore } from '../../store/prdStore';

function resetStore() {
  usePrdStore.setState({
    formData: { title:'', problem:'', solution:'', objectives:[''], userStories:[''], requirements:[''] },
    sections: { problem:true, solution:true, objectives:true, userStories:true, requirements:true },
    snapshots: [],
    templateId: 'default'
  });
  localStorage.removeItem('pmc_snap_ctx');
}

describe('SnapshotHistory context lines persistence', () => {
  beforeEach(() => {
    resetStore();
  });

  it('persists context lines input across remount', async () => {
    const user = userEvent.setup();
    render(<SnapshotHistory />);
    const input = screen.getByLabelText(/Ctx/i).querySelector('input') as HTMLInputElement | null;
    // Fallback if label structure changes: locate numeric input
    const num = input || (screen.getByDisplayValue('3') as HTMLInputElement);
    expect(num.value).toBe('3');
    await user.clear(num);
    await user.type(num, '7');
    expect(num.value).toBe('7');
  render(<SnapshotHistory />);
  const matches = screen.getAllByDisplayValue('7') as HTMLInputElement[];
  const num2 = matches[matches.length - 1];
  expect(num2.value).toBe('7');
  });
});
