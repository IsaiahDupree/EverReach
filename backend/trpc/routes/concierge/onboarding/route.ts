// Server-side guard to prevent client-side imports
if (typeof window !== 'undefined') {
  throw new Error('backend/trpc/routes/concierge/onboarding/route.ts was imported in a client bundle. This file should only be imported server-side.');
}

import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/server';
import { supabaseAdmin as supabase } from '@/backend/lib/supabase';
import { openai } from '@/backend/lib/openai';
import type { UserProfile } from '@/types/message';

// Start onboarding with phone number
export const startOnboardingProcedure = publicProcedure
  .input(z.object({
    phoneE164: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid E.164 phone number'),
    platformPref: z.enum(['imessage', 'sms', 'whatsapp', 'telegram', 'discord']).default('sms')
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('📱 Starting onboarding for:', input.phoneE164);
    
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('phone_e164', input.phoneE164)
      .single();
    
    if (existingProfile) {
      return { 
        profile: transformDbProfile(existingProfile),
        isExisting: true 
      };
    }
    
    // Create new user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: ctx.user?.id || 'anonymous', // In production, use proper auth
        phone_e164: input.phoneE164,
        platform_pref: input.platformPref,
        consent_status: 'pending',
        onboarding_stage: 'phone',
        interests: [],
        match_preferences: {
          frequency: 'weekly',
          max_per_week: 3
        }
      })
      .select()
      .single();
    
    if (error) {
      throw new Error('Failed to create user profile');
    }
    
    return { 
      profile: transformDbProfile(profile),
      isExisting: false 
    };
  });

// Update profile information
export const updateProfileProcedure = publicProcedure
  .input(z.object({
    userId: z.string(),
    bio: z.string().optional(),
    interests: z.array(z.string()).optional(),
    location: z.object({
      city: z.string(),
      region: z.string().optional(),
      country: z.string(),
      lat: z.number().optional(),
      lon: z.number().optional()
    }).optional(),
    timezone: z.string().optional(),
    photoUrl: z.string().url().optional(),
    onboardingStage: z.enum(['phone', 'profile', 'interests', 'complete']).optional()
  }))
  .mutation(async ({ input }) => {
    console.log('✏️ Updating profile for user:', input.userId);
    
    const updateData: any = {};
    
    if (input.bio !== undefined) updateData.bio = input.bio;
    if (input.interests !== undefined) updateData.interests = input.interests;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.timezone !== undefined) updateData.timezone = input.timezone;
    if (input.photoUrl !== undefined) updateData.photo_url = input.photoUrl;
    if (input.onboardingStage !== undefined) updateData.onboarding_stage = input.onboardingStage;
    
    // Generate embedding if bio or interests changed
    if (input.bio || input.interests) {
      const embedding = await generateProfileEmbedding(input.bio || '', input.interests || []);
      if (embedding) {
        updateData.embedding = embedding;
      }
    }
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', input.userId)
      .select()
      .single();
    
    if (error) {
      throw new Error('Failed to update profile');
    }
    
    return transformDbProfile(profile);
  });

// Grant consent and complete onboarding
export const grantConsentProcedure = publicProcedure
  .input(z.object({
    userId: z.string(),
    consentGranted: z.boolean(),
    matchPreferences: z.object({
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      maxPerWeek: z.number().min(1).max(10)
    }).optional()
  }))
  .mutation(async ({ input }) => {
    console.log('✅ Processing consent for user:', input.userId);
    
    const updateData: any = {
      consent_status: input.consentGranted ? 'granted' : 'revoked',
      onboarding_stage: input.consentGranted ? 'complete' : 'interests'
    };
    
    if (input.matchPreferences) {
      updateData.match_preferences = input.matchPreferences;
    }
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', input.userId)
      .select()
      .single();
    
    if (error) {
      throw new Error('Failed to update consent');
    }
    
    return transformDbProfile(profile);
  });

// Get user profile
export const getProfileProcedure = publicProcedure
  .input(z.object({
    userId: z.string().optional(),
    phoneE164: z.string().optional()
  }))
  .query(async ({ input }) => {
    if (!input.userId && !input.phoneE164) {
      throw new Error('Either userId or phoneE164 is required');
    }
    
    let query = supabase.from('user_profiles').select('*');
    
    if (input.userId) {
      query = query.eq('user_id', input.userId);
    } else if (input.phoneE164) {
      query = query.eq('phone_e164', input.phoneE164);
    }
    
    const { data: profile, error } = await query.single();
    
    if (error || !profile) {
      return null;
    }
    
    return transformDbProfile(profile);
  });

// Suggest interests based on bio
export const suggestInterestsProcedure = publicProcedure
  .input(z.object({
    bio: z.string(),
    existingInterests: z.array(z.string()).default([])
  }))
  .query(async ({ input }) => {
    console.log('💡 Suggesting interests for bio:', input.bio.substring(0, 50) + '...');
    
    try {
      const prompt = `Based on this bio, suggest 5-8 relevant interests/hobbies that this person might have:

Bio: "${input.bio}"

Existing interests: ${input.existingInterests.join(', ')}

Return only a JSON array of interest strings, no other text. Focus on specific, actionable interests rather than broad categories.`;
      
      const client = openai();
      const response = await client.responses.create({
        model: 'gpt-4o-mini',
        input: [{ role: 'user', content: prompt }],
        max_output_tokens: 200,
        temperature: 0.7
      });
      
      const content = (response as any).output_text ?? '';
      if (!content) return [];
      
      // Parse JSON response
      try {
        const suggestions = JSON.parse(content);
        return Array.isArray(suggestions) ? suggestions : [];
      } catch (parseError) {
        console.error('Failed to parse interest suggestions JSON:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Failed to suggest interests:', error);
      return [];
    }
  });

// Helper functions
async function generateProfileEmbedding(bio: string, interests: string[]): Promise<number[] | null> {
  try {
    const text = `${bio} ${interests.join(' ')}`.trim();
    if (!text) return null;
    
    const client = openai();
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536
    });
    
    return response.data[0]?.embedding || null;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    return null;
  }
}

function transformDbProfile(dbProfile: any): UserProfile {
  return {
    id: dbProfile.id,
    userId: dbProfile.user_id,
    phoneE164: dbProfile.phone_e164,
    platformPref: dbProfile.platform_pref,
    consentStatus: dbProfile.consent_status,
    onboardingStage: dbProfile.onboarding_stage,
    timezone: dbProfile.timezone,
    bio: dbProfile.bio,
    interests: dbProfile.interests || [],
    location: dbProfile.location,
    photoUrl: dbProfile.photo_url,
    embedding: dbProfile.embedding,
    matchPreferences: dbProfile.match_preferences || { frequency: 'weekly', maxPerWeek: 3 },
    createdAt: dbProfile.created_at,
    updatedAt: dbProfile.updated_at
  };
}