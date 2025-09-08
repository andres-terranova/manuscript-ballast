export interface Change {
  id: string;
  type: 'insertion' | 'deletion' | 'modification';
  text: string;
  originalText?: string;
  position: number;
  timestamp: Date;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface Manuscript {
  id: string;
  title: string;
  author: string;
  wordCount: number;
  status: 'draft' | 'reviewed' | 'in-review';
  lastModified: Date;
  content: string;
  changes: Change[];
}

const now = new Date();
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

export const sampleManuscripts: Manuscript[] = [
  {
    id: "m1",
    title: "Neural Pathways",
    author: "Dr. Sarah Chen",
    wordCount: 1850,
    status: "in-review",
    lastModified: twoDaysAgo,
    content: `# Neural Pathways: Understanding Brain Connectivity

In this chapter, we explore the intricate networks that form the foundation of human cognition and behavior. The brain's neural pathways represent one of the most complex systems known to science, with billions of interconnected neurons creating vast networks of communication.

These pathways develop through a process called neuroplasticity, where repeated experiences strengthen certain connections while unused pathways may weaken over time. This remarkable adaptability allows the brain to reorganize itself throughout life, forming new connections in response to learning, injury, or environmental changes.

Recent advances in neuroimaging technology have revealed the dynamic nature of these networks. We can now observe how different regions of the brain communicate during various cognitive tasks, providing unprecedented insights into the mechanisms underlying memory, attention, and decision-making processes.`,
    changes: [
      {
        id: "c-001",
        type: "modification",
        text: "intricate networks",
        originalText: "complex systems",
        position: 156,
        timestamp: twoDaysAgo,
        status: "pending"
      },
      {
        id: "c-002",
        type: "insertion",
        text: "through neuroimaging technology",
        position: 542,
        timestamp: twoDaysAgo,
        status: "pending"
      }
    ]
  },
  {
    id: "m2",
    title: "Field Notes",
    author: "Dr. Marcus Rivera",
    wordCount: 2100,
    status: "reviewed",
    lastModified: fiveDaysAgo,
    content: `# Field Notes: Observational Studies in Natural Environments

Field observations collected during the summer research expedition have yielded fascinating insights into ecosystem dynamics and species interactions. The remote location provided an ideal natural laboratory, free from human interference and industrial pollution.

Over the course of twelve weeks, we documented behavioral patterns across multiple species, noting significant variations in feeding habits, territorial disputes, and mating rituals. The data suggests that climate variations have a more pronounced effect on wildlife behavior than previously understood, with temperature fluctuations directly correlating to changes in migration patterns.

Perhaps most intriguingly, we observed previously undocumented cooperative behaviors between traditionally competitive species. These interactions appear to be adaptive responses to resource scarcity, highlighting the remarkable flexibility of natural systems when faced with environmental pressures.`,
    changes: []
  }
];