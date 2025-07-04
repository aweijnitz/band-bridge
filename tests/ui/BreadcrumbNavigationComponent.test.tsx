import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next/link to render a normal anchor for testing
jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a> }));

import BreadcrumbNavigationComponent from '../../src/app/components/BreadcrumbNavigationComponent';

describe('BreadcrumbNavigationComponent', () => {
  it('renders only Dashboard link if no projectId or songId', () => {
    render(<BreadcrumbNavigationComponent />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText(/Project/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Media/)).not.toBeInTheDocument();
  });

  it('renders Dashboard and project link if projectId is given', () => {
    render(<BreadcrumbNavigationComponent projectId="42" />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Project #42')).toBeInTheDocument();
    expect(screen.getByText('Project #42').closest('a')).toHaveAttribute('href', '/project/42');
    expect(screen.queryByText(/Media/)).not.toBeInTheDocument();
  });

  it('renders Dashboard, project, and media if both projectId and songId are given', () => {
    render(<BreadcrumbNavigationComponent projectId="42" songId="7" />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Project #42')).toBeInTheDocument();
    expect(screen.getByText('Media #7')).toBeInTheDocument();
  });

  it('uses projectName and songTitle if provided', () => {
    render(<BreadcrumbNavigationComponent projectId="42" projectName="My Project" songId="7" songTitle="My Song" />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('My Project')).toBeInTheDocument();
    expect(screen.getByText('My Project').closest('a')).toHaveAttribute('href', '/project/42');
    expect(screen.getByText('My Song')).toBeInTheDocument();
  });
}); 