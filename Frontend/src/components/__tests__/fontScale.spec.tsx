import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import App from '../../App';
import { I18nProvider } from '../../i18n';

// Minimal test: ensures selecting scale updates documentElement --font-scale
// NOTE: We do not simulate user event due to environment, we directly set localStorage and re-render to assert application.

describe('Font scale persistence', () => {
  const setLS = (key: string, val: string) => { try { localStorage.setItem(key, val); } catch {} };
  beforeEach(()=> {
    try { localStorage.clear(); } catch {}
    document.documentElement.style.removeProperty('--font-scale');
  });

  it('applies default medium scale (1)', () => {
    render(<I18nProvider><App /></I18nProvider>);
    const val = getComputedStyle(document.documentElement).getPropertyValue('--font-scale').trim();
    expect(val).toBe('1');
  });

  it('applies stored small scale (0.9)', () => {
    setLS('pmcopilot_font_scale','sm');
    render(<I18nProvider><App /></I18nProvider>);
    const val = getComputedStyle(document.documentElement).getPropertyValue('--font-scale').trim();
    expect(val).toBe('0.9');
  });

  it('applies stored large scale (1.15)', () => {
    setLS('pmcopilot_font_scale','lg');
    render(<I18nProvider><App /></I18nProvider>);
    const val = getComputedStyle(document.documentElement).getPropertyValue('--font-scale').trim();
    expect(val).toBe('1.15');
  });
});
