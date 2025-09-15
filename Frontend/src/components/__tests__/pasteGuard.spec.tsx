import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import App from '../../App';
import { BrowserRouter } from 'react-router-dom';

// Minimal mock for Clerk since tests may not have provider key
vi.mock('@clerk/clerk-react', () => ({
  SignedIn: (p: any) => <div>{p.children}</div>,
  SignedOut: (p: any) => <div>{p.children}</div>,
  SignInButton: (p: any) => <button {...p} />,
  SignUpButton: (p: any) => <button {...p} />,
  UserButton: () => <div>User</div>,
  ClerkProvider: (p: any) => <div>{p.children}</div>,
}));

describe('secret paste guard', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    // Flag no clerk to hit fallback path faster
    (window as any).__HAS_CLERK__ = false;
  });

  it('shows toast when pasting a suspected secret', async () => {
    render(<BrowserRouter><App /></BrowserRouter>);
    const secret = 'ghp_ABCDEF1234567890ABCDEF1234567890';
    const evt: any = new Event('paste', { bubbles: true, cancelable: true });
    evt.clipboardData = { getData: () => secret };
    document.dispatchEvent(evt);
    const container = document.getElementById('pmcopilot_toast_container');
    // Allow microtask + timeout flush
    await new Promise(r => setTimeout(r, 10));
    expect(container?.textContent || '').toMatch(/Potential secret detected/i);
  });
});
