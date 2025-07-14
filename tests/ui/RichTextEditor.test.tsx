import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Jodit Editor to avoid complex dependencies in tests
jest.mock('jodit-react', () => {
  return function MockJoditEditor({ value, onBlur, config }: any) {
    return (
      <textarea
        data-testid="jodit-editor"
        defaultValue={value}
        onBlur={(e) => onBlur && onBlur(e.target.value)}
        placeholder={config?.placeholder || 'Enter description...'}
        aria-label="Rich text editor"
        onChange={() => {}} // Add onChange to avoid React warning
      />
    );
  };
});

import RichTextEditor from '../../src/app/components/RichTextEditor';

describe('RichTextEditor', () => {
  it('renders with default props', async () => {
    render(
      <RichTextEditor
        value=""
        onChange={jest.fn()}
      />
    );

    expect(await screen.findByTestId('jodit-editor')).toBeInTheDocument();
    expect(screen.getByText('0/512')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(
      <RichTextEditor
        value=""
        onChange={jest.fn()}
        placeholder="Custom placeholder"
      />
    );
    
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('shows character count', () => {
    render(
      <RichTextEditor
        value="Hello world"
        onChange={jest.fn()}
        maxLength={100}
      />
    );
    
    expect(screen.getByText('11/100')).toBeInTheDocument();
  });

  it('shows error message when provided', () => {
    render(
      <RichTextEditor
        value=""
        onChange={jest.fn()}
        error="Test error message"
      />
    );
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('shows warning when over character limit', () => {
    const longText = 'a'.repeat(520);
    render(
      <RichTextEditor
        value={longText}
        onChange={jest.fn()}
        maxLength={512}
      />
    );
    
    expect(screen.getByText('520/512')).toBeInTheDocument();
    expect(screen.getByText(/exceeds the maximum length/)).toBeInTheDocument();
  });

  it('calls onChange when editor content changes', () => {
    const onChange = jest.fn();
    render(
      <RichTextEditor
        value=""
        onChange={onChange}
      />
    );
    
    const editor = screen.getByTestId('jodit-editor');
    fireEvent.blur(editor, { target: { value: 'New content' } });
    
    expect(onChange).toHaveBeenCalledWith('New content');
  });

  it('does not call onChange when content exceeds max length', () => {
    const onChange = jest.fn();
    const longText = 'a'.repeat(520);
    
    render(
      <RichTextEditor
        value=""
        onChange={onChange}
        maxLength={512}
      />
    );
    
    const editor = screen.getByTestId('jodit-editor');
    fireEvent.blur(editor, { target: { value: longText } });
    
    expect(onChange).not.toHaveBeenCalled();
  });

  it('accepts content exactly at max length', () => {
    const onChange = jest.fn();
    const exactText = 'a'.repeat(512);
    
    render(
      <RichTextEditor
        value=""
        onChange={onChange}
        maxLength={512}
      />
    );
    
    const editor = screen.getByTestId('jodit-editor');
    fireEvent.blur(editor, { target: { value: exactText } });
    
    expect(onChange).toHaveBeenCalledWith(exactText);
  });
});