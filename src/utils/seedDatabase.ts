import { ManuscriptService } from '@/services/manuscriptService';
import { DEFAULT_STYLE_RULES } from '@/lib/styleRuleConstants';
import { ManuscriptCreateInput } from '@/types/manuscript';

// Sample manuscript data for testing - now DOCX-first
const sampleManuscripts: ManuscriptCreateInput[] = [
  {
    title: "Neural Pathways",
    docx_file_path: "sample/neural-pathways.docx",
    original_filename: "neural-pathways.docx", 
    file_size: 15360,
    content_text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nSed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
    content_html: "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p><p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p><p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>",
    excerpt: "In this chapter...",
    style_rules: DEFAULT_STYLE_RULES
  },
  {
    title: "Field Notes",
    docx_file_path: "sample/field-notes.docx",
    original_filename: "field-notes.docx",
    file_size: 12800,
    content_text: "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.\n\nSed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur.\n\nQuis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur? At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti.",
    content_html: "<p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.</p><p>Sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur.</p><p>Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur? At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti.</p>",
    excerpt: "Field observations...",
    style_rules: DEFAULT_STYLE_RULES
  },
  {
    title: "Research Methodology Framework",
    docx_file_path: "sample/research-methodology.docx",
    original_filename: "research-methodology.docx", 
    file_size: 18432,
    content_text: "But I must explain to you how all this mistaken idea of denouncing pleasure and praising pain was born and I will give you a complete account of the system, and expound the actual teachings of the great explorer of the truth, the master-builder of human happiness.\n\nNo one rejects, dislikes, or avoids pleasure itself, because it is pleasure, but because those who do not know how to pursue pleasure rationally encounter consequences that are extremely painful. Nor again is there anyone who loves or pursues or desires to obtain pain of itself, because it is pain.\n\nBut because occasionally circumstances occur in which toil and pain can procure him some great pleasure. To take a trivial example, which of us ever undertakes laborious physical exercise, except to obtain some advantage from it?",
    content_html: "<p>But I must explain to you how all this mistaken idea of denouncing pleasure and praising pain was born and I will give you a complete account of the system, and expound the actual teachings of the great explorer of the truth, the master-builder of human happiness.</p><p>No one rejects, dislikes, or avoids pleasure itself, because it is pleasure, but because those who do not know how to pursue pleasure rationally encounter consequences that are extremely painful. Nor again is there anyone who loves or pursues or desires to obtain pain of itself, because it is pain.</p><p>But because occasionally circumstances occur in which toil and pain can procure him some great pleasure. To take a trivial example, which of us ever undertakes laborious physical exercise, except to obtain some advantage from it?</p>",
    excerpt: "This framework outlines...",
    style_rules: DEFAULT_STYLE_RULES
  }
];

export async function seedDatabase(): Promise<void> {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Check if manuscripts already exist
    const existingManuscripts = await ManuscriptService.getAllManuscripts();
    if (existingManuscripts.length > 0) {
      console.log('📝 Database already contains manuscripts, skipping seed.');
      return;
    }
    
    // Create sample manuscripts
    console.log('📝 Creating sample manuscripts...');
    for (const manuscriptData of sampleManuscripts) {
      await ManuscriptService.createManuscript(manuscriptData);
      console.log(`✅ Created manuscript: "${manuscriptData.title}"`);
    }
    
    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Helper function to clear all manuscripts (for testing)
export async function clearDatabase(): Promise<void> {
  try {
    console.log('🧹 Clearing database...');
    const manuscripts = await ManuscriptService.getAllManuscripts();
    
    for (const manuscript of manuscripts) {
      await ManuscriptService.deleteManuscript(manuscript.id);
      console.log(`🗑️ Deleted manuscript: "${manuscript.title}"`);
    }
    
    console.log('✨ Database cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  }
}

// Development helper - seed database if empty
export async function ensureSampleData(): Promise<void> {
  try {
    const manuscripts = await ManuscriptService.getAllManuscripts();
    if (manuscripts.length === 0) {
      await seedDatabase();
    }
  } catch (error) {
    console.warn('⚠️ Could not ensure sample data (user may not be authenticated):', error.message);
  }
}