import type { Editor } from '@tiptap/core';
import { exportDocx } from '@tiptap-pro/extension-export-docx';

export interface DocxExportOptions {
  filename?: string;
  includeMetadata?: boolean;
}

export interface DocxExportResult {
  success: boolean;
  error?: string;
  blob?: Blob;
}

/**
 * Export TipTap editor content to DOCX format
 *
 * This creates a clean DOCX export of the current document state.
 * AI suggestions are NOT included - only the accepted text is exported.
 *
 * @param editor - The TipTap editor instance
 * @param options - Export options (filename, metadata)
 * @returns Promise with export result
 */
export async function exportEditorToDocx(
  editor: Editor,
  options: DocxExportOptions = {}
): Promise<DocxExportResult> {
  try {
    const {
      filename = 'document.docx',
      includeMetadata = false
    } = options;

    // Get the current document content
    const documentContent = editor.getJSON();

    console.log('📄 Exporting document to DOCX...', {
      filename,
      includeMetadata,
      contentLength: JSON.stringify(documentContent).length
    });

    // Export using TipTap Pro extension
    const docxBlob = await exportDocx({
      document: documentContent,
      exportType: 'blob'
    });

    console.log('✅ DOCX export successful', {
      blobSize: docxBlob.size,
      blobType: docxBlob.type
    });

    // Trigger download
    const url = URL.createObjectURL(docxBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
    link.click();

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);

    return {
      success: true,
      blob: docxBlob
    };

  } catch (error) {
    console.error('❌ DOCX export failed:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown export error'
    };
  }
}

/**
 * Calculate approximate export size before exporting
 * Useful for warning users about large document exports
 */
export function estimateExportSize(editor: Editor): number {
  const content = editor.getJSON();
  const jsonSize = JSON.stringify(content).length;

  // DOCX files are typically 30-50% smaller than JSON due to compression
  // but include XML overhead, so estimate 60% of JSON size
  return Math.round(jsonSize * 0.6);
}

/**
 * Check if document is safe to export (size limits)
 */
export function canSafelyExport(editor: Editor): { safe: boolean; warning?: string } {
  const estimatedSize = estimateExportSize(editor);
  const maxSafeSize = 25 * 1024 * 1024; // 25MB

  if (estimatedSize > maxSafeSize) {
    return {
      safe: false,
      warning: `Document is very large (${Math.round(estimatedSize / 1024 / 1024)}MB estimated). Export may be slow or fail.`
    };
  }

  const wordCount = editor.getText().split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount > 100000) {
    return {
      safe: true,
      warning: `Large document (${Math.round(wordCount / 1000)}K words). Export may take 30-60 seconds.`
    };
  }

  return { safe: true };
}
