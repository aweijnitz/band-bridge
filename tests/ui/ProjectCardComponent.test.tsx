import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectCardComponent from '../../src/app/dashboard/ProjectCardComponent';

describe('ProjectCardComponent', () => {
  const baseProject = {
    id: 1,
    name: 'Test Project',
    bandName: 'Test Band',
    owner: 'Alice',
    status: 'open',
    createdAt: new Date().toISOString(),
  };

  it('shows Edit button if not archived', () => {
    render(
      <ProjectCardComponent
        project={{ ...baseProject, status: 'open' }}
        onEdit={jest.fn()}
        onArchive={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByTitle('Edit')).toBeInTheDocument();
  });

  it('shows Delete button only if archived', () => {
    render(
      <ProjectCardComponent
        project={{ ...baseProject, status: 'archived' }}
        onEdit={jest.fn()}
        onArchive={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('does not show Delete button if not archived', () => {
    render(
      <ProjectCardComponent
        project={{ ...baseProject, status: 'open' }}
        onEdit={jest.fn()}
        onArchive={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('calls onEdit when Edit button is clicked', () => {
    const onEdit = jest.fn();
    render(
      <ProjectCardComponent
        project={{ ...baseProject, status: 'open' }}
        onEdit={onEdit}
        onArchive={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    fireEvent.click(screen.getByTitle('Edit'));
    expect(onEdit).toHaveBeenCalled();
  });

  it('calls onDelete when Delete button is clicked', () => {
    const onDelete = jest.fn();
    render(
      <ProjectCardComponent
        project={{ ...baseProject, status: 'archived' }}
        onEdit={jest.fn()}
        onArchive={jest.fn()}
        onDelete={onDelete}
      />
    );
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalled();
  });
}); 