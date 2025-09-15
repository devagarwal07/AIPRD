import { describe, it, expect } from 'vitest';
import { usePrdStore } from '../prdStore';

// Access internal store by invoking set/get

describe('prdStore', () => {
  it('updates form field', () => {
    const before = usePrdStore.getState().formData.problem;
    usePrdStore.getState().updateForm('problem','New problem');
    expect(usePrdStore.getState().formData.problem).not.toBe(before);
  });

  it('adds and restores snapshot', () => {
    const s = usePrdStore.getState();
    const snap = s.addSnapshot({ formData: s.formData, sections: s.sections, templateId: s.templateId });
    s.updateForm('problem','Changed');
    s.restoreSnapshot(snap.id);
    expect(usePrdStore.getState().formData.problem).toBe(snap.formData.problem);
  });
});
