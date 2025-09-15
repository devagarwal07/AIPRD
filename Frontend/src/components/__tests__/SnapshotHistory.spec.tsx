import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnapshotHistory } from '../prd/SnapshotHistory';
import { usePrdStore } from '../../store/prdStore';

function resetStore() {
  // Clear snapshots & reset form
  usePrdStore.setState({
    formData: { title:'', problem:'', solution:'', objectives:[''], userStories:[''], requirements:[''] },
    sections: { problem:true, solution:true, objectives:true, userStories:true, requirements:true },
    snapshots: [] as any,
    templateId: 'default'
  });
  // Clear persistence flags affecting behavior
  localStorage.removeItem('pmc_snap_comparePrev');
  localStorage.removeItem('pmc_snap_sideBySide');
  localStorage.removeItem('pmc_snap_ctx');
  localStorage.removeItem('pmc_snap_virtual_enabled');
  localStorage.removeItem('pmc_snap_virtual_override');
}

describe('SnapshotHistory interactions', () => {
  beforeEach(() => {
    resetStore();
  });

  it('expands a snapshot and shows diff, side-by-side toggle affects layout', async () => {
    const user = userEvent.setup();
    const st = usePrdStore.getState();
    await act(async () => {
      st.formData = { ...st.formData, title: 'One' } as any;
      st.addSnapshot({ formData: st.formData, sections: st.sections, templateId: st.templateId, note: 'first' });
      st.formData = { ...st.formData, title: 'Two' } as any;
      st.addSnapshot({ formData: st.formData, sections: st.sections, templateId: st.templateId, note: 'second' });
    });

    render(<SnapshotHistory />);

    // Locate the snapshot row summary
  const changeRow = await screen.findByText(/1 change\(s\): Title/i);
  // Click the expandable header div (parent with aria-controls)
  const headerDiv = changeRow.closest('div.flex');
  expect(headerDiv).not.toBeNull();
  if (headerDiv) await user.click(headerDiv);

  // Diff header appears
  // Look for change summary that includes 'Title'
  const changeSummary = await screen.findByText(/change\(s\): Title/);
  expect(changeSummary).toBeTruthy();

    const sxs = screen.getByLabelText(/Side-by-side/i) as HTMLInputElement;
    expect(sxs.checked).toBe(false);
    await user.click(sxs);
    expect(sxs.checked).toBe(true);

    // Re-expand if needed
  if (!screen.queryByText('Title') && headerDiv) await user.click(headerDiv);
  // Assert side-by-side container appears (two bg-gray-900 blocks)
  const codePanels = document.querySelectorAll('.bg-gray-900');
  expect(codePanels.length).toBeGreaterThanOrEqual(2);
  });

  it('persists compare previous toggle across remount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<SnapshotHistory />);
    const prevCb = screen.getByLabelText(/Prev baseline/i) as HTMLInputElement;
    expect(prevCb.checked).toBe(false);
    await user.click(prevCb);
    expect(prevCb.checked).toBe(true);
    unmount();
    render(<SnapshotHistory />);
    const prevCb2 = screen.getByLabelText(/Prev baseline/i) as HTMLInputElement;
    expect(prevCb2.checked).toBe(true);
  });

  it('uses virtualization when many snapshots (renders subset of <li>)', () => {
    const st = usePrdStore.getState();
    act(() => {
      for (let i = 0; i < 90; i++) {
        st.formData = { ...st.formData, title: `Title ${i}` } as any;
        st.addSnapshot({ formData: st.formData, sections: st.sections, templateId: st.templateId, note: `n${i}` });
      }
    });
    render(<SnapshotHistory />);
    const liCount = document.querySelectorAll('li').length;
    expect(liCount).toBeLessThan(90); // virtualized subset
  });
});
