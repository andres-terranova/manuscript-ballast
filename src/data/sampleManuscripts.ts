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

export const sampleManuscripts: Manuscript[] = [
  {
    id: "ms-001",
    title: "The Digital Renaissance",
    author: "Sarah Mitchell",
    wordCount: 4200,
    status: "in-review",
    lastModified: new Date("2024-03-15T10:30:00Z"),
    content: `# The Digital Renaissance: Transforming Creative Expression in the 21st Century

The advent of digital technology has ushered in what many scholars consider a new renaissance—a period of unprecedented creative flowering that rivals the cultural rebirth of 15th-century Europe. This digital renaissance, however, differs fundamentally from its historical predecessor in both scope and accessibility.

## The Democratization of Creative Tools

Unlike the original Renaissance, which was largely confined to wealthy patrons and educated elites, the digital renaissance has democratized creativity. Today, a teenager with a smartphone possesses more creative power than entire studios did just decades ago. Digital art software, once costing thousands of dollars, now exists as free applications. Writing platforms allow authors to publish directly to global audiences without traditional gatekeepers.

This shift has profound implications. We are witnessing an explosion of diverse voices and perspectives that were previously marginalized or excluded from mainstream creative discourse. Independent filmmakers can distribute their work globally through streaming platforms. Musicians can compose, record, and share their art without recording contracts. Visual artists can showcase their work to millions through social media galleries.

## The Evolution of Artistic Expression

Digital technology has not merely made existing art forms more accessible—it has created entirely new mediums of expression. Interactive installations respond to viewer movement and emotion. Virtual reality transports audiences into immersive narrative worlds. Algorithmic art generates beauty through mathematical precision. These new forms challenge traditional definitions of authorship, audience participation, and the very nature of creative work.

The boundaries between creator and consumer have become increasingly blurred. Social media platforms transform every user into a curator, editor, and publisher. Remix culture allows for collaborative creation across time and space. The concept of a finished work has evolved into something more fluid and participatory.

## Challenges and Opportunities Ahead

As we navigate this digital renaissance, we face both extraordinary opportunities and significant challenges. The same technologies that enable global creative collaboration also raise questions about intellectual property, authenticity, and the economic sustainability of creative work.

The future of creative expression lies not in choosing between digital and traditional methods, but in thoughtfully integrating them to serve human creativity and cultural enrichment.`,
    changes: [
      {
        id: "c-001",
        type: "modification",
        text: "profound implications",
        originalText: "significant implications",
        position: 1234,
        timestamp: new Date("2024-03-15T14:20:00Z"),
        status: "pending"
      },
      {
        id: "c-002",
        type: "insertion",
        text: "through streaming platforms",
        position: 1856,
        timestamp: new Date("2024-03-15T14:22:00Z"),
        status: "pending"
      },
      {
        id: "c-003",
        type: "deletion",
        text: "increasingly",
        position: 2340,
        timestamp: new Date("2024-03-15T14:25:00Z"),
        status: "pending"
      }
    ]
  },
  {
    id: "ms-002",
    title: "Sustainable Architecture in Urban Environments",
    author: "Dr. Robert Chen",
    wordCount: 3800,
    status: "draft",
    lastModified: new Date("2024-03-14T16:45:00Z"),
    content: `# Sustainable Architecture in Urban Environments: Building for Tomorrow's Cities

As urban populations continue to grow exponentially, the need for sustainable architectural solutions has become more critical than ever before. Cities now house over half of the world's population, and this figure is projected to reach 68% by 2050. This rapid urbanization presents both challenges and opportunities for architects, urban planners, and policymakers.

## The Environmental Imperative

Buildings are responsible for approximately 40% of global energy consumption and 36% of CO2 emissions. In dense urban environments, these figures can be even higher. The construction industry alone accounts for 50% of all raw materials extracted globally. These statistics underscore the urgent need for sustainable building practices that can reduce environmental impact while meeting the growing demand for urban housing and commercial space.

Green building technologies have evolved rapidly in recent years. Solar panels have become more efficient and affordable. Passive cooling systems reduce energy consumption. Recycled and sustainable materials offer alternatives to traditional construction methods. Smart building systems optimize energy usage through advanced sensors and automation.

## Innovative Design Solutions

Contemporary sustainable architecture embraces both high-tech solutions and time-tested traditional techniques. Vertical gardens purify air and provide insulation. Rainwater harvesting systems reduce strain on municipal water supplies. Modular construction methods minimize waste and allow for flexible building reconfiguration.

The integration of nature into urban architecture, known as biophilic design, has gained significant traction. Green roofs provide habitat for wildlife while reducing urban heat islands. Natural lighting and ventilation systems improve occupant health and reduce energy consumption. These approaches recognize that sustainable architecture must consider both environmental and human well-being.

## Economic and Social Considerations

Sustainable architecture is not merely an environmental concern—it represents a comprehensive approach to urban development that considers economic viability and social equity. Energy-efficient buildings reduce operating costs over time. Healthier indoor environments improve productivity and reduce healthcare costs. Community-centered design fosters social cohesion and neighborhood resilience.

The path forward requires collaboration between architects, engineers, policymakers, and communities to create built environments that are both sustainable and livable for all urban residents.`,
    changes: [
      {
        id: "c-004",
        type: "modification",
        text: "more critical than ever before",
        originalText: "increasingly important",
        position: 156,
        timestamp: new Date("2024-03-14T17:10:00Z"),
        status: "pending"
      }
    ]
  },
  {
    id: "ms-003",
    title: "The Future of Remote Work",
    author: "Lisa Rodriguez",
    wordCount: 2900,
    status: "reviewed",
    lastModified: new Date("2024-03-12T09:15:00Z"),
    content: `# The Future of Remote Work: Redefining Professional Collaboration

The global shift toward remote work, accelerated by the COVID-19 pandemic, has fundamentally altered how we conceive of professional collaboration and workplace culture. What began as a temporary necessity has evolved into a permanent transformation of the modern workplace.

## Technology as the Great Enabler

High-speed internet connectivity and cloud-based collaboration tools have made distributed work not just possible, but often preferable to traditional office arrangements. Video conferencing platforms have become sophisticated enough to support complex team interactions. Project management software enables seamless coordination across time zones. Document sharing and real-time editing have eliminated many of the barriers to remote collaboration.

The proliferation of digital collaboration tools has created new possibilities for productivity and creativity. Teams can now include the best talent regardless of geographic location. Asynchronous work allows for more flexible schedules and better work-life balance. Digital documentation and process automation have improved organizational knowledge management.

## Cultural and Organizational Shifts

Remote work has forced organizations to reconsider fundamental assumptions about productivity, management, and corporate culture. Results-oriented evaluation has replaced time-based metrics. Trust and autonomy have become essential management principles. Company culture must now be intentionally cultivated through digital channels and periodic in-person gatherings.

The benefits extend beyond individual organizations. Reduced commuting has environmental benefits. Rural and suburban communities can access urban job markets. The geographical concentration of certain industries has begun to disperse, potentially reducing regional economic inequality.

## Challenges and Adaptations

Despite its advantages, remote work presents unique challenges. Social isolation and communication barriers can impact team cohesion. The blurring of work-life boundaries requires new approaches to personal well-being. Cybersecurity concerns have become more complex with distributed workforces.

Organizations are developing hybrid models that combine the flexibility of remote work with the benefits of in-person collaboration. The future workplace will likely be characterized by intentional flexibility rather than one-size-fits-all solutions.`,
    changes: []
  }
];