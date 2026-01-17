#!/usr/bin/env node
/**
 * Populate showcase contacts with REAL photos
 * 
 * This script demonstrates real-world photo upload by:
 * 1. Downloading profile pictures from external sources (randomuser.me)
 * 2. Uploading them to Supabase Storage (attachments bucket)
 * 3. Creating contacts with the uploaded photo URLs
 * 4. Adding realistic interactions and warmth scores
 * 
 * Perfect for app screenshots and demos!
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODUwNzQzNCwiZXhwIjoyMDc0MDgzNDM0fQ.Dpm9YMA2FvCy2Ztxrm_ZTXksAX55sjvmgfiO0bwvgrY';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const BUCKET_NAME = 'attachments';

// Initialize Supabase clients
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Login credentials
const TEST_EMAIL = 'isaiahdupree33@gmail.com';
const TEST_PASSWORD = 'Frogger12';

/**
 * Download an image from a URL and return as buffer
 */
async function downloadImage(url) {
  console.log(`[Download] Fetching image from: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload image to Supabase Storage and return public URL
 */
async function uploadToStorage(imageBuffer, contactId, fileName = 'avatar.jpg') {
  console.log(`[Upload] Uploading to storage: contacts/${contactId}/${fileName}`);
  
  const storagePath = `contacts/${contactId}/${Date.now()}-${fileName}`;
  
  const { data, error } = await supabaseService.storage
    .from(BUCKET_NAME)
    .upload(storagePath, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    console.error('[Upload] Error:', error);
    throw error;
  }

  // Get public URL
  const { data: { publicUrl } } = supabaseService.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  console.log(`[Upload] ✅ Success: ${publicUrl}`);
  return publicUrl;
}

/**
 * Download a profile photo from randomuser.me and upload to storage
 */
async function getUploadedProfilePhoto(seed, contactId) {
  try {
    // Use randomuser.me API for realistic profile photos
    const photoUrl = `https://randomuser.me/api/portraits/${seed.gender}/${seed.number}.jpg`;
    
    // Download the image
    const imageBuffer = await downloadImage(photoUrl);
    
    // Upload to our storage
    const publicUrl = await uploadToStorage(imageBuffer, contactId, `profile-${seed.number}.jpg`);
    
    return publicUrl;
  } catch (error) {
    console.error(`[Photo] Failed to get/upload photo for ${contactId}:`, error.message);
    // Fallback to DiceBear if download fails
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed.number}`;
  }
}

// Showcase contacts with photo seeds
const SHOWCASE_CONTACTS = [
  {
    display_name: 'Sarah Chen',
    emails: ['sarah.chen@techcorp.io'],
    phones: ['+1 (555) 123-4567'],
    company: 'TechCorp Solutions',
    title: 'VP of Engineering',
    tags: ['client', 'tech', 'high-priority'],
    notes: 'Met at TechConf 2024. Interested in our enterprise solution.',
    warmth_target: 'hot',
    photo_seed: { gender: 'women', number: 44 }, // Professional woman
    interactions: [
      { kind: 'email', direction: 'inbound', content: 'Thanks for the quick response! This is exactly what we need.', days_ago: 0.5 },
      { kind: 'email', direction: 'outbound', content: 'Following up on our demo discussion', days_ago: 1 },
      { kind: 'call', direction: 'inbound', content: 'Urgent: Need to discuss implementation timeline', days_ago: 2 },
      { kind: 'email', direction: 'inbound', content: 'Our team loved the demo!', days_ago: 3 },
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
    warmth_target: 'warm',
    photo_seed: { gender: 'men', number: 32 }, // Professional man
    interactions: [
      { kind: 'email', direction: 'outbound', content: 'Sharing our AI integration case studies', days_ago: 1 },
      { kind: 'email', direction: 'inbound', content: 'Could you send more info about pricing?', days_ago: 4 },
    ]
  },
  {
    display_name: 'Emily Thompson',
    emails: ['emily.t@startupventures.co'],
    phones: ['+1 (555) 345-6789'],
    company: 'Startup Ventures',
    title: 'Founder & CEO',
    tags: ['client', 'startup', 'active', 'vip'],
    notes: 'Early adopter. Provides great feedback on new features.',
    warmth_target: 'hot',
    photo_seed: { gender: 'women', number: 67 }, // Young professional
    interactions: [
      { kind: 'email', direction: 'inbound', content: 'Love the new dashboard update!', days_ago: 0.3 },
      { kind: 'call', direction: 'inbound', content: 'Quick question about the new feature', days_ago: 2 },
      { kind: 'email', direction: 'inbound', content: 'Feature suggestion for your roadmap', days_ago: 10 },
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
    warmth_target: 'cold',
    photo_seed: { gender: 'men', number: 45 }, // Executive
    interactions: [
      { kind: 'email', direction: 'outbound', content: 'Following up on our proposal', days_ago: 5 },
      { kind: 'note', content: 'Waiting for board approval', days_ago: 12 },
    ]
  },
  {
    display_name: 'Jessica Williams',
    emails: ['jessica@creativeagency.io'],
    phones: ['+1 (555) 567-8901'],
    company: 'Creative Agency Co',
    title: 'Creative Director',
    tags: ['client', 'creative', 'monthly-retainer'],
    notes: 'Ongoing partnership. Monthly strategy calls.',
    warmth_target: 'warm',
    photo_seed: { gender: 'women', number: 89 }, // Creative professional
    interactions: [
      { kind: 'call', direction: 'outbound', content: 'Monthly strategy and planning call', days_ago: 1 },
      { kind: 'email', direction: 'inbound', content: 'Next month\'s campaign ideas', days_ago: 3 },
    ]
  },
  {
    display_name: 'James Anderson',
    emails: ['j.anderson@retailking.com'],
    phones: ['+1 (555) 678-9012'],
    company: 'Retail King',
    title: 'Head of Digital',
    tags: ['prospect', 'retail', 'following-up'],
    notes: 'Interested but waiting for budget approval.',
    warmth_target: 'cool',
    photo_seed: { gender: 'men', number: 52 }, // Business professional
    interactions: [
      { kind: 'email', direction: 'outbound', content: 'Retail industry case studies', days_ago: 7 },
      { kind: 'email', direction: 'inbound', content: 'Thanks, will review with team', days_ago: 15 },
    ]
  },
  {
    display_name: 'Nina Patel',
    emails: ['nina.patel@healthtech.io'],
    phones: ['+1 (555) 789-0123'],
    company: 'HealthTech Innovations',
    title: 'Chief Medical Officer',
    tags: ['prospect', 'healthcare', 'high-value'],
    notes: 'Healthcare compliance is priority. Needs HIPAA documentation.',
    warmth_target: 'warm',
    photo_seed: { gender: 'women', number: 23 }, // Medical professional
    interactions: [
      { kind: 'email', direction: 'outbound', content: 'HIPAA compliance documentation', days_ago: 2 },
      { kind: 'call', direction: 'inbound', content: 'Security and compliance questions', days_ago: 5 },
    ]
  },
  {
    display_name: 'Marcus Johnson',
    emails: ['marcus@consultpro.com'],
    phones: ['+1 (555) 890-1234'],
    company: 'ConsultPro Partners',
    title: 'Senior Consultant',
    tags: ['referral-partner', 'consultant', 'warm'],
    notes: 'Refers clients regularly. Great partnership.',
    warmth_target: 'hot',
    photo_seed: { gender: 'men', number: 76 }, // Business consultant
    interactions: [
      { kind: 'email', direction: 'inbound', content: 'Have 2 clients who might be a good fit', days_ago: 1 },
      { kind: 'email', direction: 'outbound', content: 'Thanks for the referrals!', days_ago: 1.5 },
      { kind: 'call', direction: 'outbound', content: 'Partner strategy discussion', days_ago: 7 },
    ]
  },
  {
    display_name: 'Rachel Green',
    emails: ['rachel.green@edutech.org'],
    phones: ['+1 (555) 901-2345'],
    company: 'EduTech Solutions',
    title: 'Head of Product',
    tags: ['client', 'education', 'expanding'],
    notes: 'Looking to expand to 3 more campuses.',
    warmth_target: 'hot',
    photo_seed: { gender: 'women', number: 12 }, // Education professional
    interactions: [
      { kind: 'email', direction: 'inbound', content: 'Can we discuss campus expansion pricing?', days_ago: 0.8 },
      { kind: 'call', direction: 'inbound', content: 'Expansion discussion and timeline', days_ago: 2 },
    ]
  },
  {
    display_name: 'Tom Anderson',
    emails: ['tom@designstudio.co'],
    phones: ['+1 (555) 012-3456'],
    company: 'Design Studio',
    title: 'Founder',
    tags: ['client', 'design', 'satisfied'],
    notes: 'Happy client. Occasional check-ins.',
    warmth_target: 'warm',
    photo_seed: { gender: 'men', number: 18 }, // Creative founder
    interactions: [
      { kind: 'email', direction: 'outbound', content: 'Quarterly check-in', days_ago: 5 },
      { kind: 'email', direction: 'inbound', content: 'All good here, thanks!', days_ago: 6 },
    ]
  },
];

/**
 * Calculate warmth score based on interactions
 */
function calculateWarmth(interactions, target) {
  const baseScores = {
    hot: 85,
    warm: 65,
    cool: 45,
    cold: 25,
  };
  
  const base = baseScores[target] || 50;
  const recentBonus = interactions.filter(i => i.days_ago < 7).length * 3;
  const inboundBonus = interactions.filter(i => i.direction === 'inbound').length * 2;
  
  return Math.min(100, base + recentBonus + inboundBonus);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting showcase data population with REAL photos...\n');

  try {
    // Step 1: Login to get auth token
    console.log('📧 Logging in...');
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (authError || !authData.session) {
      throw new Error(`Login failed: ${authError?.message || 'No session'}`);
    }

    const token = authData.session.access_token;
    const userId = authData.session.user.id;
    console.log(`✅ Logged in successfully - User ID: ${userId}\n`);

    // Step 2: Get user's org_id for RLS
    const { data: userOrgs } = await supabaseAnon
      .from('user_orgs')
      .select('org_id')
      .limit(1)
      .single();

    const orgId = userOrgs?.org_id;
    console.log(`📁 Org ID: ${orgId}\n`);

    // Step 3: Create contacts with uploaded photos
    console.log('👥 Creating showcase contacts with real photos...\n');
    
    let created = 0;
    let failed = 0;

    for (const contactData of SHOWCASE_CONTACTS) {
      try {
        console.log(`\n📝 Creating: ${contactData.display_name}`);

        // Step 3a: Create contact first (to get ID)
        const contactPayload = {
          user_id: userId, // Required field
          display_name: contactData.display_name,
          emails: contactData.emails,
          phones: contactData.phones,
          company: contactData.company,
          notes: contactData.notes,
          tags: contactData.tags,
          metadata: {
            title: contactData.title,
            showcase: true,
          },
        };

        if (orgId) contactPayload.org_id = orgId;

        const { data: contact, error: createError } = await supabaseService
          .from('contacts')
          .insert(contactPayload)
          .select('id, display_name')
          .single();

        if (createError) {
          console.error(`❌ Failed to create contact:`, createError.message);
          failed++;
          continue;
        }

        console.log(`✅ Contact created: ${contact.id}`);

        // Step 3b: Download and upload photo
        console.log(`📸 Downloading and uploading photo...`);
        const photoUrl = await getUploadedProfilePhoto(contactData.photo_seed, contact.id);

        // Step 3c: Calculate warmth
        const warmth = calculateWarmth(contactData.interactions, contactData.warmth_target);
        const warmth_band = contactData.warmth_target;

        // Step 3d: Update contact with photo and warmth
        const { error: updateError } = await supabaseService
          .from('contacts')
          .update({
            photo_url: photoUrl,
            warmth,
            warmth_band,
          })
          .eq('id', contact.id);

        if (updateError) {
          console.error(`⚠️  Failed to update photo/warmth:`, updateError.message);
        } else {
          console.log(`✅ Photo & warmth updated: ${warmth_band} (${warmth}/100)`);
        }

        // Step 3e: Add interactions
        console.log(`💬 Adding ${contactData.interactions.length} interactions...`);
        const interactions = contactData.interactions.map(int => {
          const timestamp = new Date();
          timestamp.setDate(timestamp.getDate() - Math.floor(int.days_ago));
          
          return {
            contact_id: contact.id,
            kind: int.kind,
            content: int.content,
            metadata: {
              direction: int.direction,
              showcase: true,
            },
            created_at: timestamp.toISOString(),
          };
        });

        const { error: intError } = await supabaseService
          .from('interactions')
          .insert(interactions);

        if (intError) {
          console.error(`⚠️  Failed to add interactions:`, intError.message);
        } else {
          console.log(`✅ Interactions added`);
        }

        created++;
        console.log(`✅ ${contactData.display_name} - COMPLETE\n`);

      } catch (error) {
        console.error(`❌ Error creating ${contactData.display_name}:`, error.message);
        failed++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully created: ${created} contacts`);
    console.log(`❌ Failed: ${failed} contacts`);
    console.log(`📸 Photos uploaded: ${created} (in attachments bucket)`);
    console.log(`🔥 Warmth scores: Hot (85+), Warm (65+), Cool (45+), Cold (25+)`);
    console.log('='.repeat(60));
    console.log('\n✨ Showcase data ready for screenshots!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main };
