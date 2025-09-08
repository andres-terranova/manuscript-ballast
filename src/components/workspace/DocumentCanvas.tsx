import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X, MessageSquare } from "lucide-react";

interface DocumentCanvasProps {
  manuscript: any;
}

export const DocumentCanvas = ({ manuscript }: DocumentCanvasProps) => {
  const [hoveredChange, setHoveredChange] = useState<string | null>(null);

  return (
    <ScrollArea className="h-full">
      <div className="flex justify-center p-8">
        <Card className="w-full max-w-4xl bg-document border border-card-border shadow-sm">
          <div className="p-12">
            <div className="manuscript-content">
              <h1 className="text-3xl font-bold mb-8 text-center">{manuscript.title}</h1>
              
              <div className="space-y-6 text-base leading-relaxed">
                {manuscript.contentText.split('\n\n').map((paragraph, index) => (
                  <p key={index}>
                    {index === 0 ? (
                      <>
                        In the beginning, there was only{" "}
                        <span 
                          className="insertion relative cursor-pointer"
                          onMouseEnter={() => setHoveredChange("change-1")}
                          onMouseLeave={() => setHoveredChange(null)}
                        >
                          silence
                          {hoveredChange === "change-1" && (
                            <div className="absolute -top-12 left-0 flex gap-1 bg-white border border-border rounded shadow-lg p-1 z-10">
                              <Button size="sm" className="h-6 text-xs px-2">
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm" className="h-6 text-xs px-2">
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </span>
                        {" "}and the profound weight of unwritten words. {paragraph.substring(paragraph.indexOf('.') + 1).trim()}
                      </>
                    ) : index === 1 ? (
                      <>
                        {paragraph.split('.')[0]}.{" "}
                        <span 
                          className="deletion relative cursor-pointer"
                          onMouseEnter={() => setHoveredChange("change-2")}
                          onMouseLeave={() => setHoveredChange(null)}
                        >
                          [deleted text]
                          {hoveredChange === "change-2" && (
                            <div className="absolute -top-12 left-0 flex gap-1 bg-white border border-border rounded shadow-lg p-1 z-10">
                              <Button size="sm" className="h-6 text-xs px-2">
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm" className="h-6 text-xs px-2">
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </span>
                        {" "}{paragraph.substring(paragraph.indexOf('.') + 1).trim()}
                      </>
                    ) : (
                      paragraph
                    )}
                  </p>
                ))}

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