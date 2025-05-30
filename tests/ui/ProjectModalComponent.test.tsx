import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectModalComponent from '../../src/app/dashboard/ProjectModalComponent';

describe('ProjectModalComponent', () => {
  const baseForm = {
    name: '',
    bandName: '',
    owner: '',
    status: 'open',
    bandId: 1,
  } as const;

  it('does not render when open is false', () => {
    render(
      <ProjectModalComponent
        open={false}
        form={{ name: baseForm.name, status: baseForm.status, bandId: baseForm.bandId }}
        bandName=""
        onFormChange={jest.fn()}
        onClose={jest.fn()}
        onCreate={jest.fn()}
      />
    );
    expect(screen.queryByText('Create Project')).not.toBeInTheDocument();
  });

  it('renders when open is true', () => {
    render(
      <ProjectModalComponent
        open={true}
        form={{ name: baseForm.name, status: baseForm.status, bandId: baseForm.bandId }}
        bandName=""
        onFormChange={jest.fn()}
        onClose={jest.fn()}
        onCreate={jest.fn()}
      />
    );
    expect(screen.getByText('Create Project')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Project Name')).toBeInTheDocument();
  });

  it('focuses the name input when opened', () => {
    render(
      <ProjectModalComponent
        open={true}
        form={{ name: baseForm.name, status: baseForm.status, bandId: baseForm.bandId }}
        bandName=""
        onFormChange={jest.fn()}
        onClose={jest.fn()}
        onCreate={jest.fn()}
      />
    );
    expect(screen.getByPlaceholderText('Project Name')).toHaveFocus();
  });

  it('calls onFormChange when typing in inputs', () => {
    const onFormChange = jest.fn();
    render(
      <ProjectModalComponent
        open={true}
        form={{ name: baseForm.name, status: baseForm.status, bandId: baseForm.bandId }}
        bandName=""
        onFormChange={onFormChange}
        onClose={jest.fn()}
        onCreate={jest.fn()}
      />
    );
    fireEvent.change(screen.getByPlaceholderText('Project Name'), { target: { value: 'New Project' } });
    expect(onFormChange).toHaveBeenCalledWith({ name: 'New Project', status: baseForm.status, bandId: baseForm.bandId });
    fireEvent.change(screen.getByDisplayValue('open'), { target: { value: 'archived' } });
    expect(onFormChange).toHaveBeenCalledWith({ name: baseForm.name, status: 'archived', bandId: baseForm.bandId });
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    render(
      <ProjectModalComponent
        open={true}
        form={{ name: baseForm.name, status: baseForm.status, bandId: baseForm.bandId }}
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
        form={{ name: baseForm.name, status: baseForm.status, bandId: baseForm.bandId }}
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
        form={{ name: baseForm.name, status: baseForm.status, bandId: baseForm.bandId }}
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