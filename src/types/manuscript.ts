import type { Snapshot } from '@/services/snapshotService';

// Database-aligned manuscript types
export interface ManuscriptDB {
  id: string;
  title: string;
  owner_id: string;
  status: 'in_progress' | 'reviewed' | 'archived';
  ball_in_court: 'editor' | 'author' | 'production';

  // Content
  content_text: string | null;
  content_html: string | null;
  source_markdown: string | null;

  // DOCX support (required - DOCX-first model)
  docx_file_path: string;
  original_filename: string;
  file_size: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error: string | null;

  // Embedded JSON data
  style_rules: string[];
  suggestions: SuggestionData[];
  comments: CommentData[];
  snapshots: Snapshot[] | null;  // Array of Snapshot objects (defined in snapshotService)
  
  // Metadata
  excerpt: string | null;
  word_count: number;
  character_count: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Frontend-facing manuscript type (backward compatible)
export interface Manuscript {
  id: string;
  title: string;
  owner: string;
  round: number;
  status: "In Review" | "Reviewed" | "Tool Pending" | "With Author";
  ballInCourt: "Editor" | "Author" | "Tool" | "None";
  updatedAt: string;
  excerpt: string;
  contentText: string;
  contentHtml?: string;
  sourceMarkdown?: string;
  styleRules?: string[];
  
  // DOCX processing (required - DOCX-first model)
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  docxFilePath: string;
  originalFilename: string;
  fileSize: number;

  // Metadata
  wordCount: number;
  characterCount: number;

  // Derived data
  changes?: ChangeData[];
  comments?: CommentData[];
  checks?: CheckData[];
  newContent?: NewContentData[];
  snapshots?: Snapshot[] | null;  // Array of Snapshot objects (defined in snapshotService)
}

// Supporting data types
export interface SuggestionData {
  id: string;
  actor: "Tool" | "Editor" | "Author";
  type: "insert" | "delete" | "replace";
  summary: string;
  location: string;
  status?: 'pending' | 'accepted' | 'rejected';
  before?: string;
  after?: string;
  pmFrom?: number;
  pmTo?: number;
}

export interface ChangeData {
  id: string;
  actor: "Tool" | "Editor" | "Author";
  type: "insert" | "delete" | "replace";
  summary: string;
  location: string;
  status?: 'pending' | 'accepted' | 'rejected';
}

export interface CommentData {
  id: string;
  author: string;
  location: string;
  text: string;
  replies?: Array<{ id: string; author: string; text: string }>;
}

export interface CheckData {
  id: string;
  severity: "info" | "warn";
  text: string;
}

export interface NewContentData {
  id: string;
  location: string;
  snippet: string;
}

// Manuscript creation/update types
export interface ManuscriptCreateInput {
  title: string;
  docx_file_path: string;
  original_filename: string;
  file_size: number;
  content_text?: string;
  content_html?: string;
  source_markdown?: string;
  style_rules?: string[];
  excerpt?: string;
}

export interface ManuscriptUpdateInput {
  title?: string;
  status?: 'in_progress' | 'reviewed' | 'archived';
  ball_in_court?: 'editor' | 'author' | 'production';
  content_text?: string;
  content_html?: string;
  source_markdown?: string;
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error?: string;
  style_rules?: string[];
  suggestions?: SuggestionData[];
  comments?: CommentData[];
  snapshots?: Snapshot[] | null;  // Array of Snapshot objects (defined in snapshotService)
  excerpt?: string;
  word_count?: number;
  character_count?: number;
}

// Type converters
export function dbToFrontend(dbManuscript: ManuscriptDB): Manuscript {
  return {
    id: dbManuscript.id,
    title: dbManuscript.title,
    owner: "Editor", // Simplified for MVP
    round: 1, // Simplified for MVP
    status: mapDbStatusToFrontend(dbManuscript.status),
    ballInCourt: mapDbBallInCourtToFrontend(dbManuscript.ball_in_court),
    updatedAt: dbManuscript.updated_at,
    excerpt: dbManuscript.excerpt || "",
    contentText: dbManuscript.content_text || "",
    contentHtml: dbManuscript.content_html || undefined,
    sourceMarkdown: dbManuscript.source_markdown || undefined,
    styleRules: dbManuscript.style_rules,
    
    // DOCX fields (guaranteed to exist in DOCX-first model)
    processingStatus: dbManuscript.processing_status,
    processingError: dbManuscript.processing_error || undefined,
    docxFilePath: dbManuscript.docx_file_path,
    originalFilename: dbManuscript.original_filename,
    fileSize: dbManuscript.file_size,

    // Metadata
    wordCount: dbManuscript.word_count,
    characterCount: dbManuscript.character_count,

    // Convert suggestions to changes for backward compatibility
    changes: dbManuscript.suggestions.map(s => ({
      id: s.id,
      actor: s.actor,
      type: s.type,
      summary: s.summary,
      location: s.location,
      status: s.status
    })),
    comments: dbManuscript.comments,
    snapshots: dbManuscript.snapshots,
    checks: [], // Simplified for MVP
    newContent: [] // Simplified for MVP
  };
}

function mapDbStatusToFrontend(dbStatus: string): "In Review" | "Reviewed" | "Tool Pending" | "With Author" {
  switch (dbStatus) {
    case 'in_progress': return "In Review";
    case 'reviewed': return "Reviewed";
    case 'archived': return "Reviewed";
    default: return "In Review";
  }
}

function mapDbBallInCourtToFrontend(dbBall: string): "Editor" | "Author" | "Tool" | "None" {
  switch (dbBall) {
    case 'editor': return "Editor";
    case 'author': return "Author";
    case 'production': return "Tool";
    default: return "Editor";
  }
}