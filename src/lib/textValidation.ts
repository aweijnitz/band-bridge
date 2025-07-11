/**
 * Validates rich text content for descriptions
 * Ensures content is under character limit and contains only allowed HTML tags
 */

const MAX_DESCRIPTION_LENGTH = 512;
const ALLOWED_TAGS = ['<b>', '</b>', '<strong>', '</strong>', '<i>', '</i>', '<em>', '</em>', '<a', '</a>', '<ul>', '</ul>', '<ol>', '</ol>', '<li>', '</li>'];

export function validateDescription(description: string | null | undefined): {
  isValid: boolean;
  error?: string;
  sanitized?: string | null;
} {
  // Allow null or undefined descriptions
  if (!description) {
    return { isValid: true, sanitized: null };
  }

  // Check character limit
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      isValid: false,
      error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`,
    };
  }

  // Basic HTML validation - check for only allowed tags
  const htmlTagRegex = /<[^>]*>/g;
  const foundTags = description.match(htmlTagRegex) || [];
  
  for (const tag of foundTags) {
    const isAllowed = ALLOWED_TAGS.some(allowedTag => {
      if (allowedTag.endsWith('>')) {
        return tag === allowedTag;
      } else {
        // For opening tags like <a, check if it starts with the allowed tag
        return tag.startsWith(allowedTag);
      }
    });

    if (!isAllowed) {
      return {
        isValid: false,
        error: `HTML tag "${tag}" is not allowed. Only bold, italic, and links are permitted.`,
      };
    }

    // Special validation for anchor tags
    if (tag.startsWith('<a')) {
      const hrefMatch = tag.match(/href=["']([^"']+)["']/);
      if (!hrefMatch) {
        return {
          isValid: false,
          error: 'Anchor tags must have a valid href attribute',
        };
      }
      
      // Basic URL validation
      const href = hrefMatch[1];
      
      // Reject dangerous protocols
      if (href.startsWith('javascript:') || href.startsWith('data:') || href.startsWith('vbscript:')) {
        return {
          isValid: false,
          error: 'Invalid URL in link',
        };
      }
      
      // Allow valid URLs, relative paths, mailto, and fragments
      if (!href.startsWith('http://') && !href.startsWith('https://') && 
          !href.startsWith('/') && !href.startsWith('mailto:') && !href.startsWith('#')) {
        return {
          isValid: false,
          error: 'Invalid URL in link',
        };
      }
    }
  }

  return { isValid: true, sanitized: description };
}