import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock ProjectCardComponent to a simple test double
jest.mock('../../src/app/dashboard/ProjectCardComponent', () => ({
  __esModule: true,
  default: ({ project }: any) => <div data-testid="project-card">{project.name}</div>,
}));

import ProjectListComponent from '../../src/app/dashboard/ProjectListComponent';

describe('ProjectListComponent', () => {
  const baseProjects = [
    { id: 1, name: 'Open Project', bandName: 'Band A', owner: 'Alice', status: 'open' as const, createdAt: '2024-01-01T12:00:00Z' },
    { id: 2, name: 'Released Project', bandName: 'Band A', owner: 'Bob', status: 'released' as const, createdAt: '2024-01-02T12:00:00Z' },
    { id: 3, name: 'Archived Project', bandName: 'Band A', owner: 'Carol', status: 'archived' as const, createdAt: '2024-01-03T12:00:00Z' },
  ];
  const noop = () => {};
  const selectedBand = { id: 1, name: 'Band A' };

  it('renders nothing if no projects in the given state', () => {
    render(
      <ProjectListComponent
        projects={[]}
        state="open"
        onEdit={noop}
        onDelete={noop}
      />
    );
    expect(screen.queryByTestId('project-card')).not.toBeInTheDocument();
  });

  it('renders nothing if no projects match the state', () => {
    render(
      <ProjectListComponent
        projects={baseProjects.filter(p => p.status !== 'released')}
        state="released"
        onEdit={noop}
        onDelete={noop}
      />
    );
    expect(screen.queryByTestId('project-card')).not.toBeInTheDocument();
  });

  it('renders a grid of ProjectCardComponent for projects in the given state', () => {
    render(
      <ProjectListComponent
        projects={baseProjects}
        state="archived"
        onEdit={noop}
        onDelete={noop}
      />
    );
    expect(screen.getByTestId('project-card')).toHaveTextContent('Archived Project');
  });

}); 