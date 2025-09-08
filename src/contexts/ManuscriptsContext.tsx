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
    contentText: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nSed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo."
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
    contentText: "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.\n\nSed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur.\n\nQuis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur? At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti."
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
    contentText: "But I must explain to you how all this mistaken idea of denouncing pleasure and praising pain was born and I will give you a complete account of the system, and expound the actual teachings of the great explorer of the truth, the master-builder of human happiness.\n\nNo one rejects, dislikes, or avoids pleasure itself, because it is pleasure, but because those who do not know how to pursue pleasure rationally encounter consequences that are extremely painful. Nor again is there anyone who loves or pursues or desires to obtain pain of itself, because it is pain.\n\nBut because occasionally circumstances occur in which toil and pain can procure him some great pleasure. To take a trivial example, which of us ever undertakes laborious physical exercise, except to obtain some advantage from it?"
  }
];

interface ManuscriptsContextType {
  manuscripts: Manuscript[];
  getManuscriptById: (id: string) => Manuscript | undefined;
}

const ManuscriptsContext = createContext<ManuscriptsContextType | undefined>(undefined);

export const ManuscriptsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [manuscripts] = useState<Manuscript[]>(seedManuscripts);

  const getManuscriptById = (id: string) => {
    return manuscripts.find(m => m.id === id);
  };

  return (
    <ManuscriptsContext.Provider value={{ manuscripts, getManuscriptById }}>
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