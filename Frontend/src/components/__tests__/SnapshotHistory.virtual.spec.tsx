import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { SnapshotHistory } from '../prd/SnapshotHistory';
import { usePrdStore } from '../../store/prdStore';

function seedSnapshots(n:number){
  const st = usePrdStore.getState();
  for(let i=0;i<n;i++){
    st.formData = { ...st.formData, title: `Title ${i}` } as any;
    st.addSnapshot({ formData: st.formData, sections: st.sections, templateId: st.templateId, note: `n${i}` });
  }
}

describe('SnapshotHistory virtualization override', () => {
  beforeEach(()=> {
    usePrdStore.setState({
      formData: { title:'', problem:'', solution:'', objectives:[''], userStories:[''], requirements:[''] },
      sections: { problem:true, solution:true, objectives:true, userStories:true, requirements:true },
      snapshots: [],
      templateId: 'default'
    });
    localStorage.clear();
  });

  it('forces virtualization off and on via custom event', () => {
    seedSnapshots(60); // enough to trigger potential adaptive virtualization
    const { rerender } = render(<SnapshotHistory />);
    // Initially, auto mode may decide to virtualize or not; capture both possibilities.
    // Force-off override after mount
    act(()=> {
      window.dispatchEvent(new CustomEvent('pmc_virtual_override', { detail: { value: 'force-off' } }));
    });
    rerender(<SnapshotHistory />);
    const listAfterOff = document.querySelector('ul');
    expect(listAfterOff).not.toBeNull();
    // Force-on override
    act(()=> {
      window.dispatchEvent(new CustomEvent('pmc_virtual_override', { detail: { value: 'force-on' } }));
    });
    rerender(<SnapshotHistory />);
    const listNow = document.querySelector('ul');
    const virtualContainer = document.querySelector('.pmc-virtual-list');
    expect(virtualContainer).not.toBeNull();
    // In force-on state the plain list should be absent
    expect(listNow).toBeNull();
  });
});
