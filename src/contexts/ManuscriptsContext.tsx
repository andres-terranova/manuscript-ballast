import React, { createContext, useContext, useState } from 'react';

export type Manuscript = {
  id: string;
  title: string;
  owner: string;
  round: number;
  status: "In Review" | "Reviewed" | "Tool Pending" | "With Author";
  ballInCourt: "Editor" | "Author" | "Tool" | "None";
  updatedAt: string; // ISO
  excerpt: string;
  contentText: string;
  contentHtml?: string; // canonical editor content (HTML)
  // Derived for editor screen (mocked for placeholders):
  changes?: Array<{
    id: string;
    actor: "Tool" | "Editor" | "Author";
    type: "insert" | "delete" | "replace";
    summary: string;
    location: string; // e.g., "§2, line 14"
  }>;
  comments?: Array<{
    id: string;
    author: string;
    location: string;
    text: string;
    replies?: Array<{ id: string; author: string; text: string }>;
  }>;
  checks?: Array<{ id: string; severity: "info" | "warn"; text: string }>;
  newContent?: Array<{ id: string; location: string; snippet: string }>;
};

const seedManuscripts: Manuscript[] = [
  {
    id: "m1",
    title: "Neural Pathways",
    owner: "A. Editor",
    round: 1,
    status: "In Review",
    ballInCourt: "Editor",
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    excerpt: "In this chapter...",
    contentText: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nSed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
    changes: [
      {
        id: "c1",
        actor: "Tool",
        type: "insert",
        summary: "Added clarifying phrase",
        location: "§1, line 3"
      },
      {
        id: "c2", 
        actor: "Editor",
        type: "delete",
        summary: "Removed redundant text",
        location: "§2, line 8"
      },
      {
        id: "c3",
        actor: "Tool",
        type: "replace", 
        summary: "Grammar correction",
        location: "§3, line 12"
      }
    ],
    comments: [
      {
        id: "cm1",
        author: "Editor",
        location: "§1, line 5",
        text: "This section needs clarification about neural network architecture.",
        replies: [
          { id: "r1", author: "Author", text: "I'll expand on this in the next revision." }
        ]
      },
      {
        id: "cm2",
        author: "Tool",
        location: "§2, line 10", 
        text: "Consider adding more specific examples here."
      }
    ],
    checks: [
      {
        id: "ch1",
        severity: "warn",
        text: "Line 8: Consider revising for clarity"
      },
      {
        id: "ch2",
        severity: "info",
        text: "Line 15: Potential repetition detected"
      }
    ],
    newContent: [
      {
        id: "nc1",
        location: "After §1",
        snippet: "New introductory paragraph about methodology"
      }
    ]
  },
  {
    id: "m2", 
    title: "Field Notes",
    owner: "A. Editor",
    round: 1,
    status: "Reviewed",
    ballInCourt: "None",
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    excerpt: "Field observations...",
    contentText: "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.\n\nSed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur.\n\nQuis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur? At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti.",
    changes: [
      {
        id: "c4",
        actor: "Author",
        type: "insert",
        summary: "Added field observation details",
        location: "§1, line 2"
      }
    ],
    comments: [
      {
        id: "cm3",
        author: "Editor", 
        location: "§3, line 1",
        text: "Excellent observation methodology."
      }
    ],
    checks: [
      {
        id: "ch3",
        severity: "info",
        text: "Line 5: All checks passed"
      }
    ],
    newContent: []
  },
  {
    id: "m3",
    title: "Research Methodology Framework", 
    owner: "A. Editor",
    round: 2,
    status: "With Author",
    ballInCourt: "Author",
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    excerpt: "This framework outlines...",
    contentText: "But I must explain to you how all this mistaken idea of denouncing pleasure and praising pain was born and I will give you a complete account of the system, and expound the actual teachings of the great explorer of the truth, the master-builder of human happiness.\n\nNo one rejects, dislikes, or avoids pleasure itself, because it is pleasure, but because those who do not know how to pursue pleasure rationally encounter consequences that are extremely painful. Nor again is there anyone who loves or pursues or desires to obtain pain of itself, because it is pain.\n\nBut because occasionally circumstances occur in which toil and pain can procure him some great pleasure. To take a trivial example, which of us ever undertakes laborious physical exercise, except to obtain some advantage from it?",
    changes: [
      {
        id: "c5",
        actor: "Tool",
        type: "replace",
        summary: "Improved sentence structure",
        location: "§1, line 1"
      },
      {
        id: "c6",
        actor: "Editor", 
        type: "delete",
        summary: "Removed unclear phrase",
        location: "§2, line 6"
      }
    ],
    comments: [
      {
        id: "cm4",
        author: "Author",
        location: "§1, line 3",
        text: "Need to expand on this philosophical point."
      }
    ],
    checks: [
      {
        id: "ch4",
        severity: "warn",
        text: "Line 12: Complex sentence structure detected"
      },
      {
        id: "ch5",
        severity: "info", 
        text: "Line 18: Consider shorter paragraphs"
      }
    ],
    newContent: [
      {
        id: "nc2",
        location: "After §2",
        snippet: "Additional methodology section"
      },
      {
        id: "nc3", 
        location: "After §3",
        snippet: "Conclusion paragraph"
      }
    ]
  }
];

interface ManuscriptsContextType {
  manuscripts: Manuscript[];
  getManuscriptById: (id: string) => Manuscript | undefined;
  updateManuscript: (id: string, updates: Partial<Manuscript>) => void;
}

const ManuscriptsContext = createContext<ManuscriptsContextType | undefined>(undefined);

export const ManuscriptsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [manuscripts, setManuscripts] = useState<Manuscript[]>(seedManuscripts);

  const getManuscriptById = (id: string) => {
    return manuscripts.find(m => m.id === id);
  };

  const updateManuscript = (id: string, updates: Partial<Manuscript>) => {
    setManuscripts(prev => prev.map(m => 
      m.id === id ? { ...m, ...updates } : m
    ));
  };

  return (
    <ManuscriptsContext.Provider value={{ manuscripts, getManuscriptById, updateManuscript }}>
      {children}
    </ManuscriptsContext.Provider>
  );
};

export const useManuscripts = () => {
  const context = useContext(ManuscriptsContext);
  if (context === undefined) {
    throw new Error('useManuscripts must be used within a ManuscriptsProvider');
  }
  return context;
};