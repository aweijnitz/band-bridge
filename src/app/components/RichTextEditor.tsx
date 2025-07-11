"use client";
import React, { useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';

const JoditEditor = dynamic(() => import('jodit-react'), {
  ssr: false,
  loading: () => <div className="border border-gray-300 rounded-md p-4 h-36 bg-gray-50 animate-pulse">Loading editor...</div>
});

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  maxLength?: number;
  error?: string;
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Enter description...", 
  maxLength = 512,
  error 
}: RichTextEditorProps) {
  const editor = useRef(null);

  const config = useMemo(() => ({
    readonly: false,
    placeholder,
    height: 150,
    minHeight: 100,
    maxHeight: 200,
    toolbar: true,
    toolbarAdaptive: false,
    showCharsCounter: true,
    showWordsCounter: false,
    showXPathInStatusbar: false,
    limitChars: maxLength,
    buttons: [
      'bold', 'italic', 'link', '|',
      'ul', 'ol', '|',
      'undo', 'redo', '|',
      'source'
    ],
    buttonsMD: [
      'bold', 'italic', 'link', '|',
      'ul', 'ol', '|',
      'undo', 'redo'
    ],
    buttonsSM: [
      'bold', 'italic', '|',
      'undo', 'redo'
    ],
    buttonsXS: [
      'bold', 'italic'
    ],
    events: {},
    uploader: {
      insertImageAsBase64URI: false,
      url: '',
      isSuccess: false
    },
    removeButtons: [
      'image', 'video', 'file', 'font', 'fontsize', 'brush', 'paragraph',
      'classSpan', 'superscript', 'subscript', 'cut', 'copy', 'paste',
      'selectall', 'outdent', 'indent', 'align', 'table', 'hr'
    ],
    disablePlugins: [
      'image', 'video', 'file', 'drag-and-drop', 'drag-and-drop-element',
      'dtd', 'wrap-nodes', 'font', 'color', 'xpath', 'resize-cells',
      'resize-handler', 'table-keyboard-navigation', 'paste-from-word',
      'paste-storage'
    ],
    style: {
      font: 'inherit',
      fontSize: '14px'
    }
  }), [placeholder, maxLength]);

  const handleChange = (content: string) => {
    // Strip out any HTML tags that aren't allowed
    const allowedTagsRegex = /<(?!\/?(?:b|strong|i|em|a|ul|ol|li)\b)[^>]*>/gi;
    const sanitized = content.replace(allowedTagsRegex, '');
    
    // Check character limit
    if (sanitized.length <= maxLength) {
      onChange(sanitized);
    }
  };

  const characterCount = value ? value.length : 0;
  const isOverLimit = characterCount > maxLength;

  return (
    <div className="w-full">
      <div className="border border-gray-300 rounded-md overflow-hidden">
        <JoditEditor
          ref={editor}
          value={value}
          config={config}
          onBlur={handleChange}
          onChange={() => {}} // We use onBlur to avoid too frequent updates
        />
      </div>
      
      <div className="flex justify-between items-center mt-1 text-sm">
        <div>
          {error && <span className="text-red-600">{error}</span>}
        </div>
        <div className={`${isOverLimit ? 'text-red-600' : 'text-gray-500'}`}>
          {characterCount}/{maxLength}
        </div>
      </div>
      
      {isOverLimit && (
        <div className="text-red-600 text-sm mt-1">
          Description exceeds the maximum length of {maxLength} characters.
        </div>
      )}
    </div>
  );
}