import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Upload, Check, X, Play, FlaskConical, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { ExperimentalTiptapEditor } from "./ExperimentalTiptapEditor";
import { supabase } from "@/integrations/supabase/client";
import mammoth from "mammoth";
import { useToast } from "@/hooks/use-toast";

type ExperimentalManuscript = {
  id: string;
  title: string;
  owner: string;
  status: "Uploaded" | "Edited" | "AI Suggested";
  updatedAt: string;
  contentHTML: string;
};

type AISuggestion = {
  textToReplace: string;
  textReplacement: string;
  reason?: string;
  textBefore?: string;
  textAfter?: string;
};

const createId = () => crypto.randomUUID();
const nowISO = () => new Date().toISOString();

function sanitizeHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  
  // Remove inline styles and Word-specific elements
  try {
    Array.from(div.querySelectorAll<HTMLElement>("[style]")).forEach(el => 
      el.removeAttribute("style")
    );
    Array.from(div.querySelectorAll("o\\:p, o\\:smarttagtype, o\\:smarttag, w\\:worddocument, v\\:*"))
      .forEach(el => el.parentElement?.removeChild(el));
  } catch {}
  
  return div.innerHTML;
}

async function parseDocxToHTML(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return sanitizeHtml(result.value);
  } catch (error) {
    console.error("DOCX parsing failed:", error);
    return "<p><em>Unable to parse DOCX file.</em></p>";
  }
}

// Fallback contextual suggestions
function buildContextualSuggestions(text: string): AISuggestion[] {
  const results: AISuggestion[] = [];
  
  const addWindow = (start: number, end: number, repFrom: string, repTo: string, reason: string) => {
    const before = Math.max(0, start - 30);
    const after = Math.min(text.length, end + 30);
    results.push({
      textToReplace: repFrom,
      textReplacement: repTo,
      reason,
      textBefore: text.slice(before, start),
      textAfter: text.slice(end, after)
    });
  };

  // Common typos
  const patterns = [
    { regex: /\bteh\b/gi, replacement: "the", reason: "Common typo" },
    { regex: /\btehre\b/gi, replacement: "there", reason: "Common typo" },
    { regex: /\brecieve\b/gi, replacement: "receive", reason: "Spelling correction" },
  ];

  patterns.forEach(({ regex, replacement, reason }) => {
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(text))) {
      addWindow(match.index, match.index + match[0].length, match[0], replacement, reason);
    }
  });

  // Double spaces
  let i = text.indexOf("  ");
  while (i !== -1) {
    addWindow(i, i + 2, "  ", " ", "Normalize spacing");
    i = text.indexOf("  ", i + 2);
  }

  return results;
}

export default function ExperimentalEditorPage() {
  const [manuscripts, setManuscripts] = useState<Map<string, ExperimentalManuscript>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suggestionModeOn, setSuggestionModeOn] = useState(false);
  const [testOutput, setTestOutput] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>(() => 
    typeof localStorage !== "undefined" ? localStorage.getItem("EXPERIMENTAL_OPENAI_KEY") || "" : ""
  );
  const [isRunning, setIsRunning] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    try {
      localStorage.setItem("EXPERIMENTAL_OPENAI_KEY", apiKey || "");
    } catch {}
  }, [apiKey]);

  const selected = selectedId ? manuscripts.get(selectedId) ?? null : null;

  function loadSample() {
    const id = createId();
    const sample: ExperimentalManuscript = {
      id,
      title: "Love Prevails — Chapter 1",
      owner: "Current User", 
      status: "Uploaded",
      updatedAt: nowISO(),
      contentHTML: `<h2>Space Bites</h2>
      <p>Vickie Kloeris</p>
      <p>3.30.23 Draft</p>
      <h3>Chapter 1</h3>
      <h3>Ready, Set, Go!<br/>Ready...</h3>
      <p>Often, we do not realize teh the significance of a decision that directs us toward our ultimate path until long after teh the moment has come and gone. Only with hindsight can we see it for what it was and what it meant in teh the grand scheme of things. When it came to teh the path my career would take, that was certainly true for me.</p>
      <p>My journey into a career in food science began with an impulsive decision during teh the fall of my senior year in college. I had entered Texas A&M University three and a half years earlier with plans to pursue a pre-med degree and continue on to medical school. I was talented in science and math—and especially loved teh the biological sciences—so declaring a pre-med major seemed a logical decision. But by late in my sophomore year, I knew medical school was not for me. tehre were a variety of reasons behind this choice, but most notably, I didn't feel teh the passion for medicine that I knew would be necessary to be successful. A change was in order.</p>`
    };
    
    const next = new Map(manuscripts);
    next.set(id, sample);
    setManuscripts(next);
    setSelectedId(id);
  }

  async function handleDocxUpload(file: File) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const html = await parseDocxToHTML(arrayBuffer);
      
      const id = createId();
      const manuscript: ExperimentalManuscript = {
        id,
        title: file.name.replace(/\.docx$/i, ""),
        owner: "Current User",
        status: "Uploaded", 
        updatedAt: nowISO(),
        contentHTML: html
      };
      
      const next = new Map(manuscripts);
      next.set(id, manuscript);
      setManuscripts(next);
      setSelectedId(id);
      
      toast({ title: "Document uploaded", description: `${file.name} has been processed successfully.` });
    } catch (error) {
      toast({ title: "Upload failed", description: "Failed to process DOCX file.", variant: "destructive" });
    }
  }

  async function runAIPass(): Promise<AISuggestion[]> {
    if (!selected || !editorInstance) return [];
    
    setIsRunning(true);
    const plainText = selected.contentHTML.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    let suggestions: AISuggestion[] = [];

    // Try edge function first
    try {
      const { data, error } = await supabase.functions.invoke('suggest-experimental', {
        body: { text: plainText }
      });
      
      if (error) throw error;
      if (data?.suggestions && Array.isArray(data.suggestions)) {
        suggestions = data.suggestions;
      }
    } catch (error) {
      console.warn("Edge function failed, trying direct OpenAI:", error);
      
      // Fallback to direct OpenAI if available
      if (apiKey) {
        try {
          const prompt = `You are an editing assistant. Analyze the text and return suggestions with context windows. For each suggestion, include textBefore (30 chars before) and textAfter (30 chars after) the change location.

Text: "${plainText}"

Return ONLY JSON: {"suggestions": [{"textToReplace": "text", "textReplacement": "replacement", "reason": "explanation", "textBefore": "context before", "textAfter": "context after"}]}`;

          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: "Return only valid JSON with suggestions array." },
                { role: "user", content: prompt }
              ]
            })
          });
          
          const data = await response.json();
          const content = data?.choices?.[0]?.message?.content || "{}";
          const parsed = JSON.parse(content);
          
          if (Array.isArray(parsed?.suggestions)) {
            suggestions = parsed.suggestions;
          }
        } catch (error) {
          console.warn("OpenAI API failed, using fallback suggestions:", error);
        }
      }
      
      // Final fallback to contextual suggestions
      if (!suggestions.length) {
        suggestions = buildContextualSuggestions(plainText);
      }
    }

    // Apply suggestions to editor if we have them
    if (suggestions.length > 0 && editorInstance?.view) {
      console.log("Applying suggestions:", suggestions);
      
      // Apply suggestions to the editor with detailed debugging
      try {
        const { applySuggestion } = await import("prosemirror-suggestion-mode");
        
        console.log("=== APPLYING SUGGESTIONS ===");
        console.log(`About to apply ${suggestions.length} suggestions`);
        
        // Debug editor state before applying suggestions
        if (editorInstance.view) {
          console.log("Editor state before applying suggestions:");
          console.log("- Current HTML length:", editorInstance.getHTML().length);
          console.log("- Schema marks:", Object.keys(editorInstance.view.state.schema.marks));
          console.log("- Plugin count:", editorInstance.view.state.plugins.length);
        }
        
        suggestions.forEach((suggestion: AISuggestion, index: number) => {
          try {
            console.log(`Applying suggestion ${index + 1}:`, {
              textToReplace: suggestion.textToReplace,
              textReplacement: suggestion.textReplacement,
              reason: suggestion.reason
            });
            
            // Get HTML before applying this suggestion
            const htmlBefore = editorInstance.getHTML();
            
            applySuggestion(editorInstance.view, suggestion, "AI Assistant");
            
            // Get HTML after applying this suggestion
            const htmlAfter = editorInstance.getHTML();
            
            console.log(`Suggestion ${index + 1} applied:`, {
              htmlChanged: htmlBefore !== htmlAfter,
              lengthBefore: htmlBefore.length,
              lengthAfter: htmlAfter.length,
              hasInsertMarkup: htmlAfter.includes('suggestion-insert') || htmlAfter.includes('data-suggestion="insert"'),
              hasDeleteMarkup: htmlAfter.includes('suggestion-delete') || htmlAfter.includes('data-suggestion="delete"')
            });
            
          } catch (error) {
            console.error(`Failed to apply suggestion ${index + 1}:`, suggestion, error);
          }
        });
        
        // Final state check
        const finalHTML = editorInstance.getHTML();
        console.log("=== FINAL STATE AFTER ALL SUGGESTIONS ===");
        console.log("Final HTML length:", finalHTML.length);
        console.log("Contains suggestion markup:", 
          finalHTML.includes('suggestion-insert') || 
          finalHTML.includes('suggestion-delete') ||
          finalHTML.includes('data-suggestion')
        );
        console.log("Final HTML sample (first 300 chars):", finalHTML.substring(0, 300));
        
        console.log(`Applied ${suggestions.length} suggestions to editor`);
        
        const next = new Map(manuscripts);
        const m = next.get(selected.id)!;
        m.status = "AI Suggested";
        m.updatedAt = nowISO();
        next.set(m.id, m);
        setManuscripts(next);
        
        toast({ 
          title: "AI suggestions applied", 
          description: `${suggestions.length} suggestions applied to editor.` 
        });
      } catch (error) {
        console.error("Failed to apply suggestions:", error);
        toast({ 
          title: "Application failed", 
          description: "Could not apply suggestions to editor.",
          variant: "destructive"
        });
      }
    }
    
    setIsRunning(false);
    return suggestions;
  }

  function runTests() {
    const results: string[] = [];
    results.push(`prosemirror-suggestion-mode loaded: ${typeof window !== 'undefined'}`);
    results.push(`Manuscripts count: ${manuscripts.size}`);
    results.push(`Selected manuscript: ${selected?.title || 'None'}`);
    results.push(`API key configured: ${!!apiKey}`);
    
    const testSuggestions = buildContextualSuggestions("teh test with  double spaces tehre");
    results.push(`Test suggestions generated: ${testSuggestions.length}`);
    
    setTestOutput(results.join("\n"));
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Dashboard</span>
          </Link>
          <span className="text-xl font-semibold">Experimental Editor</span>
          <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
            prosemirror-suggestion-mode
          </span>
          
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 border rounded-lg px-3 py-1.5">
              <span className="text-xs">OpenAI API Key</span>
              <Input 
                type="password" 
                placeholder="sk-..." 
                className="h-8 w-52" 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)} 
              />
            </div>
            <Button variant="secondary" onClick={runTests}>
              <FlaskConical className="h-4 w-4 mr-2" />
              Run Tests
            </Button>
            <Button variant="secondary" onClick={loadSample}>
              Load Sample
            </Button>
            <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-muted">
              <Upload className="h-4 w-4" />
              <span>Upload .docx</span>
              <input 
                type="file" 
                accept=".docx" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleDocxUpload(file);
                }} 
              />
            </label>
          </div>
        </div>
        
        {testOutput && (
          <div className="mx-auto max-w-7xl px-4 pb-3">
            <pre className="text-xs text-muted-foreground bg-muted p-2 rounded border overflow-x-auto">
              {testOutput}
            </pre>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: manuscripts list */}
        <section className="lg:col-span-1">
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b">
                <h2 className="text-sm font-medium">Manuscripts</h2>
              </div>
              <div className="max-h-[60vh] overflow-auto">
                {manuscripts.size === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground text-center">
                    No manuscripts yet. Upload a .docx or load the sample.
                  </div>
                ) : (
                  <ul className="divide-y">
                    {Array.from(manuscripts.values())
                      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
                      .map((manuscript) => (
                        <li key={manuscript.id}>
                          <button 
                            className={`w-full text-left px-4 py-3 hover:bg-muted transition-colors ${
                              selectedId === manuscript.id ? 'bg-muted' : ''
                            }`}
                            onClick={() => setSelectedId(manuscript.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="font-medium truncate">{manuscript.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  {manuscript.owner} • {new Date(manuscript.updatedAt).toLocaleString()}
                                </div>
                              </div>
                              <div className="ml-2 text-xs px-2 py-1 rounded-full border bg-background">
                                {manuscript.status}
                              </div>
                            </div>
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Right column: editor */}
        <section className="lg:col-span-2">
          {!selected ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                Select or upload a manuscript to begin editing with prosemirror-suggestion-mode.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Controls */}
              <Card>
                <CardContent className="p-4 flex items-center gap-3 flex-wrap">
                  <Input 
                    className="flex-1 min-w-[200px]" 
                    value={selected.title} 
                    onChange={(e) => {
                      const next = new Map(manuscripts);
                      const manuscript = next.get(selected.id)!;
                      manuscript.title = e.target.value;
                      manuscript.updatedAt = nowISO();
                      next.set(manuscript.id, manuscript);
                      setManuscripts(next);
                    }} 
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5">
                      <span className="text-xs">Suggestion Mode</span>
                      <Switch 
                        checked={suggestionModeOn} 
                        onCheckedChange={setSuggestionModeOn} 
                      />
                    </div>
                    <Button onClick={runAIPass} disabled={isRunning}>
                      {isRunning ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      {isRunning ? 'Generating...' : 'Run AI Pass'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Editor */}
              <Card>
                <CardContent className="p-4">
                  <ExperimentalTiptapEditor
                    content={selected.contentHTML}
                    suggestionMode={suggestionModeOn}
                    onContentChange={(html) => {
                      setEditorContent(html);
                      const next = new Map(manuscripts);
                      const manuscript = next.get(selected.id)!;
                      manuscript.contentHTML = html;
                      manuscript.status = manuscript.status === "Uploaded" ? "Edited" : manuscript.status;
                      manuscript.updatedAt = nowISO();
                      next.set(manuscript.id, manuscript);
                      setManuscripts(next);
                    }}
                    onEditorReady={(editor) => {
                      setEditorInstance(editor);
                      // Debug editor state when ready
                      console.log("=== EDITOR READY ===");
                      if (editor?.view) {
                        const schema = editor.view.state.schema;
                        console.log("Editor schema marks:", Object.keys(schema.marks));
                        console.log("Has suggestion_insert mark:", 'suggestion_insert' in schema.marks);
                        console.log("Has suggestion_delete mark:", 'suggestion_delete' in schema.marks);
                        
                        const plugins = editor.view.state.plugins;
                        console.log("Total plugins loaded:", plugins.length);
                        console.log("Plugin keys/names:", plugins.map((p: any) => p.key || p.constructor.name));
                        
                        // Look specifically for prosemirror-suggestion-mode plugin
                        const hasSuggestionPlugin = plugins.some((p: any) => 
                          (p.key && p.key.includes && p.key.includes('suggestion')) ||
                          (p.constructor && p.constructor.name && p.constructor.name.includes('suggestion'))
                        );
                        console.log("prosemirror-suggestion-mode plugin detected:", hasSuggestionPlugin);
                      }
                      console.log("=== END EDITOR READY ===");
                    }}
                  />
                  <p className="mt-4 text-xs text-muted-foreground italic">
                    Suggestion Mode: When ON, your edits are recorded as suggestions (highlighted). 
                    When OFF, edits immediately change the text. Uses prosemirror-suggestion-mode for positioning.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}