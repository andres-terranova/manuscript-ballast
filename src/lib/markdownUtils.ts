import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

// Sanitization schema - allow safe HTML elements only
const sanitizationSchema = {
  tagNames: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br',
    'strong', 'em', 'u', 's',
    'ul', 'ol', 'li',
    'blockquote',
    'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'a', 'img'
  ],
  attributes: {
    '*': [],
    'a': ['href', 'title'],
    'img': ['src', 'alt', 'title']
  },
  protocols: {
    'href': ['http', 'https', 'mailto'],
    'src': ['http', 'https']
  }
};

/**
 * Convert Markdown to sanitized HTML
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  try {
    const result = await unified()
      .use(remarkParse)
      .use(remarkGfm) // GitHub Flavored Markdown (tables, strikethrough, etc.)
      .use(remarkRehype, { allowDangerousHtml: false })
      .use(rehypeSanitize, sanitizationSchema)
      .use(rehypeStringify)
      .process(markdown);

    return String(result);
  } catch (error) {
    console.error('Error converting markdown to HTML:', error);
    throw new Error('Failed to parse markdown content');
  }
}

/**
 * Convert HTML to plain text (for search/excerpts)
 */
export function htmlToPlainText(html: string): string {
  // Create a temporary DOM element to strip HTML tags
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Get text content and normalize whitespace
  const text = temp.textContent || temp.innerText || '';
  
  // Collapse multiple whitespace characters into single spaces
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Validate markdown file
 */
export function validateMarkdownFile(file: File): { valid: boolean; error?: string } {
  // Check file extension
  if (!file.name.toLowerCase().endsWith('.md')) {
    return { valid: false, error: 'Only .md files are supported' };
  }
  
  // Check file size (1MB = 1024 * 1024 bytes)
  const maxSize = 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 1MB' };
  }
  
  return { valid: true };
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}