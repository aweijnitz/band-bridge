import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next/navigation before importing component
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

import LoginFormComponent from '../../src/app/components/LoginFormComponent';

describe('LoginFormComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = { href: '', reload: jest.fn() };
  });

  it('renders nothing until session is checked', () => {
    global.fetch = jest.fn(() => new Promise(() => {}));
    const { container } = render(<LoginFormComponent />);
    expect(container.firstChild).toBeNull();
  });

  const baseMockResponse = {
    ok: false,
    status: 401,
    redirected: false,
    statusText: '',
    type: 'default' as ResponseType,
    url: '',
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    bytes: () => Promise.resolve(new Uint8Array()),
    headers: new Headers(),
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    clone: function () {
      return {
        ok: this.ok,
        status: this.status,
        redirected: this.redirected,
        statusText: this.statusText,
        type: this.type,
        url: this.url,
        body: this.body,
        bodyUsed: this.bodyUsed,
        arrayBuffer: this.arrayBuffer,
        blob: this.blob,
        formData: this.formData,
        bytes: this.bytes,
        headers: this.headers,
        json: this.json,
        text: this.text,
        clone: this.clone,
      };
    },
  };

  it('renders form after session check (not logged in)', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      ...((({ ok, status, json, text, ...rest }) => rest)(baseMockResponse)),
    }));
    render(<LoginFormComponent />);
    expect(await screen.findByText('Sign in')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('shows error message on failed login', async () => {
    // First fetch: session check, Second: login
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        ...((({ ok, status, json, text, ...rest }) => rest)(baseMockResponse)),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Invalid credentials' }),
        text: () => Promise.resolve(''),
        ...((({ ok, status, json, text, ...rest }) => rest)(baseMockResponse)),
      });
    render(<LoginFormComponent />);
    await screen.findByText('Sign in');
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'bob' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'badpass' } });
    fireEvent.click(screen.getByText('Sign In'));
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });

  it('calls login API and redirects on success', async () => {
    // First fetch: session check, Second: login
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        ...((({ ok, status, json, text, ...rest }) => rest)(baseMockResponse)),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        ...((({ ok, status, json, text, ...rest }) => rest)(baseMockResponse)),
      });
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    render(<LoginFormComponent redirect="/dashboard" />);
    await screen.findByText('Sign in');
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'goodpass' } });
    fireEvent.click(screen.getByText('Sign In'));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.any(Object));
      expect(dispatchSpy).toHaveBeenCalledWith(expect.any(Event));
      expect(window.location.href).toBe('/dashboard');
    });
  });

  it('disables button and shows loading text when submitting', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        ...((({ ok, status, json, text, ...rest }) => rest)(baseMockResponse)),
      })
      .mockResolvedValueOnce(new Promise(() => {})); // login never resolves
    render(<LoginFormComponent />);
    await screen.findByText('Sign in');
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'goodpass' } });
    fireEvent.click(screen.getByText('Sign In'));
    expect(screen.getByText('Signing in...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign/i })).toBeDisabled();
  });
}); 