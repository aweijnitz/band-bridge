import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectPage from '../src/app/project/[id]/page';

jest.mock('next/link', () => ({ __esModule: true, default: ({ children }: any) => <div>{children}</div> }));

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (url?.toString().includes('/api/project/')) {
      if (url?.toString().endsWith('/song')) {
        return Promise.resolve({ json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ name: 'Test Project' }) });
    }
    return Promise.resolve({ json: () => Promise.resolve([]) });
  }) as any;
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('ProjectPage', () => {
  it('renders project name and empty song list', async () => {
    render(<ProjectPage params={Promise.resolve({ id: '1' })} />);
    expect(await screen.findByText('Test Project')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('No songs in this project yet.')).toBeInTheDocument();
    });
  });
}); 