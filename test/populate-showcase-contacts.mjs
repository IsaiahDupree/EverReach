#!/usr/bin/env node
/**
 * Populate account with realistic test contacts for app showcase
 * 
 * Creates diverse, realistic contacts with:
 * - Professional names and details
 * - Email interactions
 * - Tags and categories
 * - Warmth scores
 * - Recent activity
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04';
const BASE_URL = 'http://localhost:3000/api';

// Realistic test contacts for showcase
const SHOWCASE_CONTACTS = [
  {
    display_name: 'Sarah Chen',
    emails: ['sarah.chen@techcorp.io'],
    phones: ['+1 (555) 123-4567'],
    company: 'TechCorp Solutions',
    title: 'VP of Engineering',
    tags: ['client', 'tech', 'high-priority'],
    notes: 'Met at TechConf 2024. Interested in our enterprise solution.',
    interactions: [
      { kind: 'email', direction: 'outbound', content: 'Following up on our demo discussion', days_ago: 2 },
      { kind: 'email', direction: 'inbound', content: 'Thanks for the demo! Our team loved it', days_ago: 5 },
      { kind: 'call', direction: 'outbound', content: 'Product demo and Q&A session', days_ago: 7 },
    ]
  },
  {
    display_name: 'Michael Rodriguez',
    emails: ['m.rodriguez@innovateai.com'],
    phones: ['+1 (555) 234-5678'],
    company: 'Innovate AI',
    title: 'Product Manager',
    tags: ['prospect', 'ai', 'warm'],
    notes: 'Connected via LinkedIn. Exploring AI integration options.',
    interactions: [
      { kind: 'email', direction: 'outbound', content: 'Sharing our AI integration case studies', days_ago: 1 },
      { kind: 'note', content: 'Scheduled follow-up call for next week', days_ago: 3 },
      { kind: 'email', direction: 'inbound', content: 'Could you send more info about pricing?', days_ago: 4 },
    ]
  },
  {
    display_name: 'Emily Thompson',
    emails: ['emily.t@startupventures.co'],
    phones: ['+1 (555) 345-6789'],
    company: 'Startup Ventures',
    title: 'Founder & CEO',
    tags: ['client', 'startup', 'active'],
    notes: 'Early adopter. Provides great feedback on new features.',
    interactions: [
      { kind: 'email', direction: 'inbound', content: 'Love the new dashboard update!', days_ago: 1 },
      { kind: 'email', direction: 'outbound', content: 'Beta access to upcoming features', days_ago: 3 },
      { kind: 'call', direction: 'outbound', content: 'Monthly check-in and feedback session', days_ago: 8 },
    ]
  },
  {
    display_name: 'David Park',
    emails: ['dpark@globalfinance.com'],
    phones: ['+1 (555) 456-7890'],
    company: 'Global Finance Corp',
    title: 'Director of Operations',
    tags: ['enterprise', 'finance', 'decision-maker'],
    notes: 'Long sales cycle. Needs C-suite buy-in.',
    interactions: [
      { kind: 'email', direction: 'outbound', content: 'ROI analysis and implementation timeline', days_ago: 5 },
      { kind: 'note', content: 'Presenting to board next month', days_ago: 7 },
      { kind: 'call', direction: 'outbound', content: 'Security and compliance discussion', days_ago: 12 },
    ]
  },
  {
    display_name: 'Jessica Williams',
    emails: ['jessica@creativeagency.io'],
    phones: ['+1 (555) 567-8901'],
    company: 'Creative Agency Co',
    title: 'Marketing Director',
    tags: ['client', 'marketing', 'creative'],
    notes: 'Uses our platform for client relationship management.',
    interactions: [
      { kind: 'email', direction: 'inbound', content: 'Quick question about team collaboration features', days_ago: 2 },
      { kind: 'email', direction: 'outbound', content: 'Here\'s the guide you requested', days_ago: 2 },
      { kind: 'call', direction: 'inbound', content: 'Support call - resolved import issue', days_ago: 10 },
    ]
  },
  {
    display_name: 'Robert Kim',
    emails: ['robert.kim@healthtech.io'],
    phones: ['+1 (555) 678-9012'],
    company: 'HealthTech Innovations',
    title: 'Chief Technology Officer',
    tags: ['prospect', 'healthcare', 'technical'],
    notes: 'Technical evaluation in progress. HIPAA compliance is key.',
    interactions: [
      { kind: 'email', direction: 'outbound', content: 'HIPAA compliance documentation', days_ago: 3 },
      { kind: 'note', content: 'Technical team reviewing our security whitepaper', days_ago: 6 },
      { kind: 'email', direction: 'inbound', content: 'Can we schedule a technical deep dive?', days_ago: 9 },
    ]
  },
  {
    display_name: 'Amanda Foster',
    emails: ['afoster@edutech.edu'],
    phones: ['+1 (555) 789-0123'],
    company: 'EduTech Solutions',
    title: 'Head of Digital Transformation',
    tags: ['education', 'warm', 'referral'],
    notes: 'Referred by Sarah Chen. Interested in education sector features.',
    interactions: [
      { kind: 'email', direction: 'outbound', content: 'Education sector case studies', days_ago: 4 },
      { kind: 'email', direction: 'inbound', content: 'This looks promising for our needs', days_ago: 6 },
    ]
  },
  {
    display_name: 'Chris Martinez',
    emails: ['chris.m@retailpro.com'],
    phones: ['+1 (555) 890-1234'],
    company: 'RetailPro Systems',
    title: 'Sales Manager',
    tags: ['client', 'retail', 'active'],
    notes: 'Power user. Often shares tips with other clients.',
    interactions: [
      { kind: 'email', direction: 'inbound', content: 'Feature request: bulk tagging', days_ago: 1 },
      { kind: 'email', direction: 'outbound', content: 'Good news - that feature is coming soon!', days_ago: 1 },
      { kind: 'call', direction: 'outbound', content: 'Monthly success check-in', days_ago: 15 },
    ]
  },
  {
    display_name: 'Lisa Zhang',
    emails: ['l.zhang@consulting.pro'],
    phones: ['+1 (555) 901-2345'],
    company: 'ProConsulting Group',
    title: 'Managing Partner',
    tags: ['client', 'consulting', 'vip'],
    notes: 'Manages 50+ client relationships. Great testimonial source.',
    interactions: [
      { kind: 'email', direction: 'inbound', content: 'Would love to be featured in your case study', days_ago: 3 },
      { kind: 'email', direction: 'outbound', content: 'Absolutely! Let\'s schedule a call', days_ago: 3 },
      { kind: 'note', content: 'Case study interview scheduled for next week', days_ago: 3 },
    ]
  },
  {
    display_name: 'James Cooper',
    emails: ['jcooper@saasbuilders.io'],
    phones: ['+1 (555) 012-3456'],
    company: 'SaaS Builders Inc',
    title: 'Co-founder',
    tags: ['prospect', 'saas', 'founder'],
    notes: 'Building their own SaaS. Needs CRM for customer success team.',
    interactions: [
      { kind: 'email', direction: 'outbound', content: 'Founder-to-founder: How we scaled customer success', days_ago: 5 },
      { kind: 'email', direction: 'inbound', content: 'Love this personal touch!', days_ago: 6 },
    ]
  },
  {
    display_name: 'Rachel Green',
    emails: ['rachel.green@fashionforward.com'],
    phones: ['+1 (555) 123-7890'],
    company: 'Fashion Forward',
    title: 'Brand Manager',
    tags: ['client', 'fashion', 'creative'],
    notes: 'Uses platform for influencer relationship management.',
    interactions: [
      { kind: 'email', direction: 'inbound', content: 'Can we integrate with Instagram?', days_ago: 7 },
      { kind: 'email', direction: 'outbound', content: 'Yes! Here\'s how to set it up', days_ago: 7 },
    ]
  },
  {
    display_name: 'Marcus Johnson',
    emails: ['marcus@proptech.ventures'],
    phones: ['+1 (555) 234-8901'],
    company: 'PropTech Ventures',
    title: 'Investment Director',
    tags: ['investor', 'proptech', 'warm'],
    notes: 'Potential investor. Also interested in using product.',
    interactions: [
      { kind: 'note', content: 'Coffee meeting scheduled - discuss investment', days_ago: 2 },
      { kind: 'email', direction: 'outbound', content: 'Pitch deck and metrics', days_ago: 10 },
    ]
  },
  {
    display_name: 'Nina Patel',
    emails: ['npatel@foodtechco.com'],
    phones: ['+1 (555) 345-9012'],
    company: 'FoodTech Co',
    title: 'Operations Lead',
    tags: ['prospect', 'food', 'warm'],
    notes: 'Evaluating CRM solutions for supplier relationships.',
    interactions: [
      { kind: 'email', direction: 'outbound', content: 'Demo scheduled for tomorrow', days_ago: 1 },
      { kind: 'email', direction: 'inbound', content: 'Looking forward to seeing the platform', days_ago: 2 },
    ]
  },
  {
    display_name: 'Tom Anderson',
    emails: ['tom.a@mediagroup.tv'],
    phones: ['+1 (555) 456-0123'],
    company: 'Media Group TV',
    title: 'Content Director',
    tags: ['client', 'media', 'active'],
    notes: 'Manages relationships with content creators.',
    interactions: [
      { kind: 'call', direction: 'outbound', content: 'Quarterly business review', days_ago: 20 },
      { kind: 'email', direction: 'inbound', content: 'Feature request: video note attachments', days_ago: 25 },
    ]
  },
  {
    display_name: 'Sophia Lee',
    emails: ['sophia@greentech.earth'],
    phones: ['+1 (555) 567-1234'],
    company: 'GreenTech Solutions',
    title: 'Sustainability Officer',
    tags: ['prospect', 'green', 'mission-driven'],
    notes: 'Aligned values. Looking for ethical tech partners.',
    interactions: [
      { kind: 'email', direction: 'outbound', content: 'Our commitment to sustainability', days_ago: 8 },
      { kind: 'email', direction: 'inbound', content: 'This resonates with our values', days_ago: 9 },
    ]
  },
];

async function main() {
  console.log('🎨 Populating Account with Showcase Contacts\n');
  
  // Authenticate
  console.log('🔐 Authenticating...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'isaiahdupree33@gmail.com',
    password: 'Frogger12',
  });
  
  if (error) {
    throw new Error(`Auth failed: ${error.message}`);
  }
  
  const token = data.session.access_token;
  const userId = data.user.id;
  console.log('✅ Authenticated\n');

  let createdCount = 0;
  let interactionCount = 0;

  // Create contacts with interactions
  for (const contactData of SHOWCASE_CONTACTS) {
    console.log(`\n📇 Creating: ${contactData.display_name}`);
    
    // Create contact
    const contactResponse = await fetch(`${BASE_URL}/v1/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Origin': 'https://everreach.app',
      },
      body: JSON.stringify({
        display_name: contactData.display_name,
        emails: contactData.emails,
        phones: contactData.phones,
        company: contactData.company,
        title: contactData.title,
        tags: contactData.tags,
        notes: contactData.notes,
      }),
    });

    if (!contactResponse.ok) {
      const errorText = await contactResponse.text();
      console.log(`   ❌ Failed to create contact: ${errorText}`);
      continue;
    }

    const contactJson = await contactResponse.json();
    const contactId = contactJson.contact?.id;
    
    if (!contactId) {
      console.log('   ❌ No contact ID returned');
      continue;
    }

    console.log(`   ✅ Created contact: ${contactId}`);
    console.log(`   📧 ${contactData.emails[0]}`);
    console.log(`   🏢 ${contactData.company} - ${contactData.title}`);
    console.log(`   🏷️  Tags: ${contactData.tags.join(', ')}`);
    createdCount++;

    // Create interactions
    if (contactData.interactions && contactData.interactions.length > 0) {
      console.log(`   📝 Adding ${contactData.interactions.length} interactions...`);
      
      for (const interaction of contactData.interactions) {
        const occurredAt = new Date();
        occurredAt.setDate(occurredAt.getDate() - interaction.days_ago);
        
        const interactionResponse = await fetch(`${BASE_URL}/v1/interactions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Origin': 'https://everreach.app',
          },
          body: JSON.stringify({
            contact_id: contactId,
            kind: interaction.kind,
            direction: interaction.direction || 'outbound',
            content: interaction.content,
            occurred_at: occurredAt.toISOString(),
          }),
        });

        if (interactionResponse.ok) {
          interactionCount++;
          console.log(`      ✅ ${interaction.kind} (${interaction.days_ago}d ago)`);
        } else {
          console.log(`      ❌ Failed: ${interaction.kind}`);
        }
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n✅ Showcase Data Population Complete!\n');
  console.log(`📊 Summary:`);
  console.log(`   👥 Contacts Created: ${createdCount}/${SHOWCASE_CONTACTS.length}`);
  console.log(`   💬 Interactions Added: ${interactionCount}`);
  console.log(`\n🎨 Your account is now ready for showcase and screenshots!`);
  console.log('\n' + '═'.repeat(70) + '\n');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
