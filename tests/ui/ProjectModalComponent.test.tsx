import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectModalComponent from '../../src/app/dashboard/ProjectModalComponent';
import { act } from "react";

describe('ProjectModalComponent', () => {
  const baseForm = {
    name: '',
    bandName: '',
    owner: '',
    status: 'open',
    bandId: 1,
    description: '',
  } as const;

  it('does not render when open is false', async () => {
    await act(() => render(
      <ProjectModalComponent
        open={false}
        form={{ name: baseForm.name, status: baseForm.status, bandId: baseForm.bandId, description: baseForm.description }}
        bandName=""
        onFormChange={jest.fn()}
        onClose={jest.fn()}
        onCreate={jest.fn()}
      />
    ));
    expect(screen.queryByText('Create Project')).not.toBeInTheDocument();
  });

  it('renders when open is true', async () => {
    await act(() => render(
      <ProjectModalComponent
        open={true}
        form={{ name: baseForm.name, status: baseForm.status, bandId: baseForm.bandId, description: baseForm.description }}
        bandName=""
        onFormChange={jest.fn()}
        onClose={jest.fn()}
        onCreate={jest.fn()}
      />
    ));
    expect(screen.getByText('Create Project')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Project Name')).toBeInTheDocument();
  });

  it('focuses the name input when opened', async() => {
    await act(() => render(
      <ProjectModalComponent
        open={true}
        form={{ name: baseForm.name, status: baseForm.status, bandId: baseForm.bandId, description: baseForm.description }}
        bandName=""
        onFormChange={jest.fn()}
        onClose={jest.fn()}
        onCreate={jest.fn()}
      />
    ));
    expect(screen.getByPlaceholderText('Project Name')).toHaveFocus();
  });

  it('calls onFormChange when typing in inputs', () => {
    const onFormChange = jest.fn();
    render(
      <ProjectModalComponent
        open={true}
        form={{ name: baseForm.name, status: baseForm.status, bandId: baseForm.bandId, description: baseForm.description }}
        bandName=""
        onFormChange={onFormChange}
        onClose={jest.fn()}
        onCreate={jest.fn()}
      />
    );
    fireEvent.change(screen.getByPlaceholderText('Project Name'), { target: { value: 'New Project' } });
    expect(onFormChange).toHaveBeenCalledWith({ name: 'New Project', status: baseForm.status, bandId: baseForm.bandId, description: baseForm.description });
    fireEvent.change(screen.getByDisplayValue('open'), { target: { value: 'archived' } });
    expect(onFormChange).toHaveBeenCalledWith({ name: baseForm.name, status: 'archived', bandId: baseForm.bandId, description: baseForm.description });
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    render(
      <ProjectModalComponent
        open={true}
        form={{ name: baseForm.name, status: baseForm.status, bandId: baseForm.bandId, description: baseForm.description }}
        bandName=""
        onFormChange={jest.fn()}
        onClose={onClose}
        onCreate={jest.fn()}
      />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onCreate when Create is clicked', () => {
    const onCreate = jest.fn();
    render(
      <ProjectModalComponent
        open={true}
        form={{ name: baseForm.name, status: baseForm.status, bandId: baseForm.bandId, description: baseForm.description }}
        bandName=""
        onFormChange={jest.fn()}
        onClose={jest.fn()}
        onCreate={onCreate}
      />
    );
    fireEvent.click(screen.getByText('Create'));
    expect(onCreate).toHaveBeenCalled();
  });

  it('shows error message if error prop is set', () => {
    render(
      <ProjectModalComponent
        open={true}
        form={{ name: baseForm.name, status: baseForm.status, bandId: baseForm.bandId, description: baseForm.description }}
        bandName=""
        onFormChange={jest.fn()}
        onClose={jest.fn()}
        onCreate={jest.fn()}
        error="Something went wrong"
      />
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
}); 