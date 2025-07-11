import { validateDescription } from '../../src/lib/textValidation';

describe('Description Validation', () => {
  it('should accept null and undefined descriptions', () => {
    expect(validateDescription(null).isValid).toBe(true);
    expect(validateDescription(undefined).isValid).toBe(true);
    expect(validateDescription('').isValid).toBe(true);
  });

  it('should accept valid HTML with allowed tags', () => {
    const validDescriptions = [
      'Plain text description',
      '<b>Bold text</b>',
      '<strong>Strong text</strong>',
      '<i>Italic text</i>',
      '<em>Emphasized text</em>',
      '<a href="http://example.com">Link</a>',
      '<a href="/relative/path">Relative link</a>',
      '<a href="mailto:test@example.com">Email link</a>',
      '<b>Bold</b> with <i>italic</i> and <a href="http://example.com">link</a>',
      'Text with <ul><li>list item</li></ul>',
      'Text with <ol><li>numbered item</li></ol>',
    ];

    validDescriptions.forEach(desc => {
      const result = validateDescription(desc);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(desc);
    });
  });

  it('should reject descriptions over 512 characters', () => {
    const longDescription = 'a'.repeat(513);
    const result = validateDescription(longDescription);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('512 characters');
  });

  it('should reject disallowed HTML tags', () => {
    const invalidDescriptions = [
      '<script>alert("xss")</script>',
      '<div>Div tag</div>',
      '<span>Span tag</span>',
      '<p>Paragraph tag</p>',
      '<img src="test.jpg" alt="image">',
      '<video src="test.mp4"></video>',
      '<iframe src="http://example.com"></iframe>',
    ];

    invalidDescriptions.forEach(desc => {
      const result = validateDescription(desc);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not allowed');
    });
  });

  it('should reject anchor tags without href', () => {
    const result = validateDescription('<a>Link without href</a>');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('href attribute');
  });

  it('should reject anchor tags with invalid URLs', () => {
    const result = validateDescription('<a href="javascript:alert(1)">Bad link</a>');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid URL');
  });

  it('should accept exactly 512 characters', () => {
    const exactLength = 'a'.repeat(512);
    const result = validateDescription(exactLength);
    expect(result.isValid).toBe(true);
    expect(result.sanitized).toBe(exactLength);
  });

  it('should handle mixed valid and invalid content', () => {
    const mixedContent = '<b>Good</b> <script>bad</script> <i>good again</i>';
    const result = validateDescription(mixedContent);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('not allowed');
  });
});