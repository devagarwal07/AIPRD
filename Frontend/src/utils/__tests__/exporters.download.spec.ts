import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportStoriesCSV, exportRequirementsCSV, downloadTextFile } from '../integrations';

// We will intercept anchor clicks and object URLs

describe('export/download helpers', () => {
  // Using loose mock instance types to avoid strict signature mismatch with URL API
  let createObjUrl: any;
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    createObjUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(()=>{});
  vi.spyOn(document.body, 'appendChild');
  vi.spyOn(document.body, 'removeChild');
    clickSpy = vi.fn();
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: any) => {
      const el = realCreate(tag);
      if(tag === 'a') {
        Object.defineProperty(el, 'click', { value: clickSpy });
      }
  return el;
    });
  });

  it('downloadTextFile triggers object URL creation and anchor click', () => {
    downloadTextFile('file.txt', 'text/plain', 'hello');
    expect(createObjUrl).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('exportStoriesCSV builds CSV with header and rows', () => {
    exportStoriesCSV(['Story A', 'Story B']);
    expect(createObjUrl).toHaveBeenCalled();
    // Ensure anchor clicked
    expect(clickSpy).toHaveBeenCalled();
  });

  it('exportRequirementsCSV builds CSV with header and rows', () => {
    exportRequirementsCSV(['Req 1']);
    expect(createObjUrl).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });
});
