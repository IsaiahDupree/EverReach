#!/usr/bin/env node
/**
 * Populate Realistic Recent Interactions for App Showcase
 * 
 * Creates authentic-looking interactions for demo/screenshots:
 * - Recent timestamps (last 7 days)
 * - Varied interaction types (email, call, text, meeting)
 * - Realistic content and patterns
 * - Different warmth levels
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const testEmail = process.env.TEST_EMAIL || 'isaiahdupree33@gmail.com';
const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Get auth token for API calls
async function getAuthToken() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    // Create a session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: process.env.TEST_PASSWORD || 'Frogger12',
    });
    if (signInError) throw signInError;
    return signInData.session?.access_token;
  }
  return session.access_token;
}

// Realistic interaction templates
const INTERACTION_TEMPLATES = {
  email_inbound_hot: [
    'Thanks for getting back to me so quickly! This looks perfect.',
    'Love the new features you mentioned. When can we get started?',
    'Just saw your email - exactly what we needed!',
    'Quick question about the proposal you sent...',
    'This is great! Let\'s schedule a call to discuss next steps.',
  ],
  email_outbound_hot: [
    'Following up on our conversation yesterday',
    'Here are the materials you requested',
    'Quick update on the project timeline',
    'Wanted to share this case study with you',
    'Checking in - how\'s everything going?',
  ],
  email_inbound_warm: [
    'Thanks for reaching out. Let me review and get back to you.',
    'Interesting proposal. Can you send more details?',
    'I\'ll need to discuss this with my team first.',
    'Could we schedule a call next week to talk about this?',
  ],
  email_outbound_warm: [
    'Following up on my previous email',
    'Wanted to check if you had a chance to review',
    'Sharing some additional information that might be helpful',
    'Hope you\'re doing well! Quick follow-up...',
  ],
  call_inbound: [
    'Quick call to discuss urgent timeline',
    'Follow-up on demo questions',
    'Pricing and contract discussion',
    'Feature request and feedback',
  ],
  call_outbound: [
    'Product demo walkthrough',
    'Monthly check-in call',
    'Implementation planning session',
    'Quick sync on progress',
  ],
  text_friendly: [
    'Thanks! See you at the coffee meeting tomorrow ☕',
    'Got your message. Let\'s catch up this week!',
    'Perfect timing! Was just thinking about this.',
    'Absolutely! Happy to help with that.',
  ],
  meeting: [
    'Product demo and Q&A session',
    'Strategic planning meeting',
    'Quarterly business review',
    'Coffee chat at Blue Bottle',
    'Lunch meeting downtown',
  ],
  note: [
    'Need to follow up next week about pricing',
    'Mentioned they\'re evaluating competitors',
    'Very interested in enterprise features',
    'Waiting for budget approval from CFO',
    'Great feedback on UI/UX improvements',
  ]
};

const REALISTIC_CONTACTS = [
  {
    display_name: 'Sarah Chen',
    company: 'TechCorp Solutions',
    title: 'VP of Engineering',
    email: 'sarah.chen@techcorp.io',
    phone: '+1 (555) 234-5678',
    warmth: 'hot',
    tags: ['client', 'tech', 'high-priority'],
    interactions: [
      { type: 'email', direction: 'inbound', template: 'email_inbound_hot', hours_ago: 2 },
      { type: 'email', direction: 'outbound', template: 'email_outbound_hot', hours_ago: 6 },
      { type: 'call', direction: 'inbound', template: 'call_inbound', hours_ago: 24 },
      { type: 'email', direction: 'inbound', template: 'email_inbound_hot', hours_ago: 48 },
      { type: 'meeting', template: 'meeting', hours_ago: 72 },
    ]
  },
  {
    display_name: 'Michael Rodriguez',
    company: 'Innovate AI',
    title: 'Product Manager',
    email: 'm.rodriguez@innovateai.com',
    phone: '+1 (555) 345-6789',
    warmth: 'warm',
    tags: ['prospect', 'ai'],
    interactions: [
      { type: 'email', direction: 'outbound', template: 'email_outbound_warm', hours_ago: 12 },
      { type: 'note', template: 'note', hours_ago: 48 },
      { type: 'email', direction: 'inbound', template: 'email_inbound_warm', hours_ago: 96 },
    ]
  },
  {
    display_name: 'Emily Thompson',
    company: 'Startup Ventures',
    title: 'Founder & CEO',
    email: 'emily.t@startupventures.co',
    phone: '+1 (555) 456-7890',
    warmth: 'hot',
    tags: ['client', 'startup', 'vip'],
    interactions: [
      { type: 'text', template: 'text_friendly', hours_ago: 1 },
      { type: 'email', direction: 'inbound', template: 'email_inbound_hot', hours_ago: 8 },
      { type: 'call', direction: 'outbound', template: 'call_outbound', hours_ago: 36 },
      { type: 'email', direction: 'outbound', template: 'email_outbound_hot', hours_ago: 60 },
      { type: 'meeting', template: 'meeting', hours_ago: 96 },
    ]
  },
  {
    display_name: 'David Park',
    company: 'Global Finance Corp',
    title: 'Director of Operations',
    email: 'dpark@globalfinance.com',
    phone: '+1 (555) 567-8901',
    warmth: 'cold',
    tags: ['enterprise', 'finance'],
    interactions: [
      { type: 'email', direction: 'outbound', template: 'email_outbound_warm', hours_ago: 120 },
      { type: 'note', template: 'note', hours_ago: 168 },
    ]
  },
  {
    display_name: 'Jessica Williams',
    company: 'Creative Agency Co',
    title: 'Creative Director',
    email: 'jessica@creativeagency.io',
    phone: '+1 (555) 678-9012',
    warmth: 'warm',
    tags: ['client', 'design'],
    interactions: [
      { type: 'email', direction: 'inbound', template: 'email_inbound_warm', hours_ago: 18 },
      { type: 'email', direction: 'outbound', template: 'email_outbound_warm', hours_ago: 42 },
      { type: 'call', direction: 'outbound', template: 'call_outbound', hours_ago: 84 },
    ]
  },
  {
    display_name: 'Alex Kumar',
    company: 'CloudScale Inc',
    title: 'CTO',
    email: 'alex@cloudscale.io',
    phone: '+1 (555) 789-0123',
    warmth: 'hot',
    tags: ['client', 'tech', 'executive'],
    interactions: [
      { type: 'meeting', template: 'meeting', hours_ago: 4 },
      { type: 'email', direction: 'inbound', template: 'email_inbound_hot', hours_ago: 20 },
      { type: 'text', template: 'text_friendly', hours_ago: 30 },
      { type: 'call', direction: 'inbound', template: 'call_inbound', hours_ago: 72 },
    ]
  },
  {
    display_name: 'Maria Garcia',
    company: 'Retail Dynamics',
    title: 'VP Marketing',
    email: 'maria.garcia@retaildynamics.com',
    phone: '+1 (555) 890-1234',
    warmth: 'warm',
    tags: ['prospect', 'marketing'],
    interactions: [
      { type: 'email', direction: 'outbound', template: 'email_outbound_warm', hours_ago: 24 },
      { type: 'note', template: 'note', hours_ago: 96 },
    ]
  },
  {
    display_name: 'James Wilson',
    company: 'Enterprise Solutions LLC',
    title: 'Senior Account Manager',
    email: 'j.wilson@enterprise-sol.com',
    phone: '+1 (555) 901-2345',
    warmth: 'hot',
    tags: ['partner', 'enterprise'],
    interactions: [
      { type: 'email', direction: 'inbound', template: 'email_inbound_hot', hours_ago: 6 },
      { type: 'email', direction: 'outbound', template: 'email_outbound_hot', hours_ago: 12 },
      { type: 'meeting', template: 'meeting', hours_ago: 48 },
      { type: 'call', direction: 'outbound', template: 'call_outbound', hours_ago: 96 },
    ]
  }
];

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getTimestamp(hoursAgo) {
  const now = new Date();
  now.setHours(now.getHours() - hoursAgo);
  return now.toISOString();
}

async function main() {
  console.log('\n🎬 Populating Realistic Interactions for App Showcase');
  console.log('=====================================================\n');

  console.log(`✅ Using service role for direct database access\n`);

  // Get user_id first
  const { data: users, error: userError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('email', testEmail)
    .limit(1);

  if (userError || !users || users.length === 0) {
    console.error('❌ User not found');
    process.exit(1);
  }

  const userId = users[0].user_id;
  console.log(`✅ Found user ID\n`);

  // Get existing contacts to populate
  const { data: existingContacts } = await supabase
    .from('contacts')
    .select('id, display_name')
    .is('deleted_at', null)
    .limit(10);

  if (!existingContacts || existingContacts.length === 0) {
    console.error('❌ No existing contacts found. Please create some contacts first.');
    console.log('💡 Run the app and create a few contacts, then run this script.');
    process.exit(1);
  }

  console.log(`✅ Found ${existingContacts.length} existing contacts\n`);

  let interactionsAdded = 0;

  for (let i = 0; i < Math.min(existingContacts.length, REALISTIC_CONTACTS.length); i++) {
    const person = existingContacts[i];
    const contactTemplate = REALISTIC_CONTACTS[i];
    
    console.log(`\n📋 Processing: ${person.display_name}`);
    console.log(`   📝 Adding ${contactTemplate.interactions.length} interactions...`);
    
    for (const interaction of contactTemplate.interactions) {
      const templateKey = interaction.template;
      const templates = INTERACTION_TEMPLATES[templateKey] || ['Interaction content'];
      const content = getRandomItem(templates);
      const timestamp = getTimestamp(interaction.hours_ago);

      const interactionData = {
        user_id: userId,
        contact_id: person.id,
        kind: interaction.type,
        direction: interaction.direction || null,
        content: content,
        summary: content.substring(0, 100),
        occurred_at: timestamp,
        created_at: timestamp,
      };

      const { error: intError } = await supabase
        .from('interactions')
        .insert(interactionData);

      if (intError) {
        console.error(`      ⚠️  Failed to create ${interaction.type}: ${intError.message}`);
      } else {
        const timeDesc = interaction.hours_ago < 24 
          ? `${interaction.hours_ago}h ago`
          : `${Math.round(interaction.hours_ago / 24)}d ago`;
        console.log(`      ✓ ${interaction.type} (${timeDesc}): ${content.substring(0, 50)}...`);
        interactionsAdded++;
      }
    }
  }

  console.log('\n');
  console.log('=====================================================');
  console.log('✨ Showcase Data Population Complete!');
  console.log('=====================================================');
  console.log(`📊 Contacts processed: ${existingContacts.length}`);
  console.log(`📝 Interactions added: ${interactionsAdded}`);
  console.log(`\n💡 Your app now has realistic recent interactions for:`);
  console.log(`   • Screenshots`);
  console.log(`   • Demos`);
  console.log(`   • App Store submission`);
  console.log(`\n🎯 Next steps:`);
  console.log(`   1. Open the app`);
  console.log(`   2. Navigate to Contacts`);
  console.log(`   3. Tap on a contact to see their interactions`);
  console.log(`   4. Take screenshots for App Store!`);
  console.log('\n');
}

main().catch(console.error);
