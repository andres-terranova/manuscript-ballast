import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X, MessageSquare } from "lucide-react";

type SuggestionType = "insert" | "delete" | "replace";
type SuggestionActor = "Tool" | "Editor" | "Author";
type Suggestion = {
  id: string;
  type: SuggestionType;
  actor: SuggestionActor;
  start: number;
  end: number;
  before: string;
  after: string;
  summary: string;
  location: string;
};

interface DocumentCanvasProps {
  manuscript: any;
  suggestions?: Suggestion[];
}

export const DocumentCanvas = ({ manuscript, suggestions = [] }: DocumentCanvasProps) => {
  const [hoveredChange, setHoveredChange] = useState<string | null>(null);
  const [hoveredSuggestion, setHoveredSuggestion] = useState<string | null>(null);

  // Function to render the entire manuscript content with suggestions
  const renderManuscriptWithSuggestions = () => {
    const contentText = manuscript.contentText;
    
    if (suggestions.length === 0) {
      return contentText.split('\n\n').map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ));
    }

    // Sort suggestions by start position
    const sortedSuggestions = [...suggestions].sort((a, b) => a.start - b.start);
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;

    sortedSuggestions.forEach((suggestion) => {
      // Add text before this suggestion
      if (suggestion.start > lastIndex) {
        parts.push(contentText.slice(lastIndex, suggestion.start));
      }

      // Create suggestion element based on type
      let suggestionElement: JSX.Element;
      const target = contentText.slice(suggestion.start, suggestion.end);
      
      if (suggestion.type === "insert") {
        suggestionElement = (
          <span
            key={suggestion.id}
            id={`suggestion-span-${suggestion.id}`}
            data-suggestion-id={suggestion.id}
            data-suggestion-type={suggestion.type}
            data-testid={`suggestion-span-${suggestion.id}`}
            className="relative cursor-pointer border-b-2 border-dotted border-green-500"
            onMouseEnter={() => setHoveredSuggestion(suggestion.id)}
            onMouseLeave={() => setHoveredSuggestion(null)}
            title={`Insert: "${suggestion.after}"`}
          >
            <span className="text-green-600 text-xs">^</span>
            {hoveredSuggestion === suggestion.id && (
              <span className="absolute -top-8 left-0 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                Insert: "{suggestion.after}"
              </span>
            )}
          </span>
        );
      } else if (suggestion.type === "delete") {
        suggestionElement = (
          <span
            key={suggestion.id}
            id={`suggestion-span-${suggestion.id}`}
            data-suggestion-id={suggestion.id}
            data-suggestion-type={suggestion.type}
            data-testid={`suggestion-span-${suggestion.id}`}
            className="relative cursor-pointer line-through bg-red-50 text-red-600"
            onMouseEnter={() => setHoveredSuggestion(suggestion.id)}
            onMouseLeave={() => setHoveredSuggestion(null)}
            title={suggestion.summary}
          >
            {target}
            {hoveredSuggestion === suggestion.id && (
              <span className="absolute -top-8 left-0 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                {suggestion.summary}
              </span>
            )}
          </span>
        );
      } else { // replace
        suggestionElement = (
          <span
            key={suggestion.id}
            id={`suggestion-span-${suggestion.id}`}
            data-suggestion-id={suggestion.id}
            data-suggestion-type={suggestion.type}
            data-testid={`suggestion-span-${suggestion.id}`}
            className="relative cursor-pointer line-through bg-yellow-50 text-amber-700"
            onMouseEnter={() => setHoveredSuggestion(suggestion.id)}
            onMouseLeave={() => setHoveredSuggestion(null)}
            title={`${suggestion.summary}: "${suggestion.before}" → "${suggestion.after}"`}
          >
            {target}
            <span className="no-underline text-green-700 font-medium ml-1">
              {suggestion.after}
            </span>
            {hoveredSuggestion === suggestion.id && (
              <span className="absolute -top-8 left-0 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                {suggestion.summary}: "{suggestion.before}" → "{suggestion.after}"
              </span>
            )}
          </span>
        );
      }

      parts.push(suggestionElement);
      lastIndex = suggestion.end;
    });

    // Add remaining text
    if (lastIndex < contentText.length) {
      parts.push(contentText.slice(lastIndex));
    }

    // Convert parts to paragraphs
    const content = parts.map((part, index) => 
      typeof part === 'string' ? part : `{{ELEMENT_${index}}}`
    ).join('');

    const paragraphs = content.split('\n\n');
    
    return paragraphs.map((paragraph, pIndex) => {
      const paragraphParts: (string | JSX.Element)[] = [];
      let workingText = paragraph;
      
      // Find element placeholders and replace with actual elements
      parts.forEach((part, partIndex) => {
        if (typeof part !== 'string') {
          const placeholder = `{{ELEMENT_${partIndex}}}`;
          if (workingText.includes(placeholder)) {
            const splitText = workingText.split(placeholder);
            paragraphParts.push(splitText[0]);
            paragraphParts.push(part);
            workingText = splitText.slice(1).join(placeholder);
          }
        }
      });
      
      if (workingText) {
        paragraphParts.push(workingText);
      }
      
      return (
        <p key={pIndex}>
          {paragraphParts.length > 0 ? paragraphParts : paragraph}
        </p>
      );
    });
  };

  return (
    <ScrollArea className="h-full">
      <div className="flex justify-center p-8">
        <Card className="w-full max-w-4xl bg-document border border-card-border shadow-sm">
          <div className="p-12">
            <div className="manuscript-content">
              <h1 className="text-3xl font-bold mb-8 text-center">{manuscript.title}</h1>
              
              <div className="space-y-6 text-base leading-relaxed">
                {renderManuscriptWithSuggestions()}

                {/* Comment indicator - keep as static placeholder */}
                <div className="relative inline-block">
                  <span className="bg-yellow-100 px-1 rounded">
                    The conclusion would need to tie these themes together
                  </span>
                  <button className="absolute -right-2 -top-2 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                    <MessageSquare className="h-2 w-2 text-white" />
                  </button>
                </div>
                {" "}in a way that felt both inevitable and surprising, leaving readers with a sense of 
                completion while opening new questions for contemplation.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </ScrollArea>
  );
};