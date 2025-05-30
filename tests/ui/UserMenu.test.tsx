import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next/navigation useRouter before importing UserMenu
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
}));

import UserMenu from '../../src/app/components/UserMenu';

// Helper to mock fetch responses
function mockFetchSequence(responses: any[]) {
  let call = 0;
  global.fetch = jest.fn(() => {
    let res = responses[call] || responses[responses.length - 1];
    call++;
    // Always provide a json method
    if (!('json' in res)) {
      res = { ...res, json: () => Promise.resolve({}) };
    }
    return Promise.resolve(res);
  }) as any;
}

describe('UserMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = { href: '' };
  });

  it('shows nothing when loading', () => {
    // fetch never resolves
    global.fetch = jest.fn(() => new Promise(() => {}));
    const { container } = render(<UserMenu />);
    expect(container.firstChild).toBeNull();
  });

  it('shows Sign in link when not authenticated', async () => {
    mockFetchSequence([
      { ok: false }, // /api/auth/session
    ]);
    render(<UserMenu />);
    const signIn = await screen.findByText('Sign in');
    expect(signIn).toBeInTheDocument();
    expect(signIn).toHaveAttribute('href', '/login');
  });

  it('shows user name and Sign out button when authenticated', async () => {
    mockFetchSequence([
      { ok: true }, // /api/auth/session
      { ok: true, json: () => Promise.resolve({ userId: 1, userName: 'alice' }) }, // /api/mine
    ]);
    render(<UserMenu />);
    const userName = await screen.findByText('alice');
    expect(userName).toBeInTheDocument();
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('calls logout and redirects on Sign out click', async () => {
    mockFetchSequence([
      { ok: true }, // /api/auth/session
      { ok: true, json: () => Promise.resolve({ userId: 1, userName: 'alice' }) }, // /api/mine
      { ok: true }, // /api/auth/logout
    ]);
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    render(<UserMenu />);
    const signOut = await screen.findByText('Sign out');
    fireEvent.click(signOut);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
      expect(dispatchSpy).toHaveBeenCalledWith(expect.any(Event));
      expect(window.location.href).toBe('/login');
    });
  });
}); 