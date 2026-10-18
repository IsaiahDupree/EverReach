// Server-side guard to prevent client-side imports
if (typeof window !== 'undefined') {
  throw new Error('backend/trpc/routes/concierge/matching/route.ts was imported in a client bundle. This file should only be imported server-side.');
}

import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/server';
import { supabaseAdmin as supabase } from '@/backend/lib/supabase';
import { openai } from '@/backend/lib/openai';
import type { UserProfile, MatchCandidate } from '@/types/message';

// Find potential matches for a user
export const findMatchesProcedure = publicProcedure
  .input(z.object({
    userId: z.string(),
    limit: z.number().default(10),
    excludeIds: z.array(z.string()).optional()
  }))
  .query(async ({ input }) => {
    console.log('🔍 Finding matches for user:', input.userId);
    
    // Get the user's profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', input.userId)
      .single();
    
    if (profileError || !userProfile) {
      throw new Error('User profile not found');
    }
    
    // Get potential matches (users with complete onboarding and granted consent)
    const { data: candidates, error: candidatesError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('consent_status', 'granted')
      .eq('onboarding_stage', 'complete')
      .neq('user_id', input.userId)
      .not('user_id', 'in', `(${input.excludeIds?.join(',') || ''})`)
      .limit(input.limit * 3); // Get more candidates for filtering
    
    if (candidatesError) {
      throw new Error('Failed to fetch candidates');
    }
    
    if (!candidates || candidates.length === 0) {
      return [];
    }
    
    // Calculate match scores
    const matches: MatchCandidate[] = [];
    
    for (const candidate of candidates) {
      const score = calculateMatchScore(userProfile, candidate);
      const sharedInterests = findSharedInterests(userProfile.interests, candidate.interests);
      
      if (score > 0.3) { // Minimum threshold
        matches.push({
          userId: candidate.user_id,
          profile: transformDbProfile(candidate),
          score,
          reasoning: generateMatchReasoning(userProfile, candidate, sharedInterests),
          sharedInterests,
          locationDistance: calculateLocationDistance(userProfile.location, candidate.location)
        });
      }
    }
    
    // Sort by score and return top matches
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, input.limit);
  });

// Create an introduction between two users
export const createIntroProcedure = publicProcedure
  .input(z.object({
    requesterId: z.string(),
    targetAId: z.string(),
    targetBId: z.string(),
    customMessage: z.string().optional()
  }))
  .mutation(async ({ input }) => {
    console.log('🤝 Creating introduction:', input);
    
    // Check if intro already exists
    const { data: existingIntro } = await supabase
      .from('introductions')
      .select('id')
      .or(`and(target_a_id.eq.${input.targetAId},target_b_id.eq.${input.targetBId}),and(target_a_id.eq.${input.targetBId},target_b_id.eq.${input.targetAId})`)
      .single();
    
    if (existingIntro) {
      throw new Error('Introduction already exists between these users');
    }
    
    // Get profiles for context
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('*')
      .in('user_id', [input.targetAId, input.targetBId]);
    
    if (!profiles || profiles.length !== 2) {
      throw new Error('Could not find both user profiles');
    }
    
    const profileA = profiles.find(p => p.user_id === input.targetAId)!;
    const profileB = profiles.find(p => p.user_id === input.targetBId)!;
    
    // Generate match score and reasoning
    const matchScore = calculateMatchScore(profileA, profileB);
    const sharedInterests = findSharedInterests(profileA.interests, profileB.interests);
    const reasoning = generateMatchReasoning(profileA, profileB, sharedInterests);
    
    // Generate intro message using AI
    const introMessage = input.customMessage || await generateIntroMessage(profileA, profileB, sharedInterests);
    
    // Create the introduction
    const { data: intro, error } = await supabase
      .from('introductions')
      .insert({
        requester_id: input.requesterId,
        target_a_id: input.targetAId,
        target_b_id: input.targetBId,
        intro_message: introMessage,
        match_score: matchScore,
        match_reasoning: reasoning,
        status: 'pending',
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() // 72 hours
      })
      .select()
      .single();
    
    if (error) {
      throw new Error('Failed to create introduction');
    }
    
    // TODO: Send intro messages to both users via their preferred platforms
    // This would queue relay jobs for SMS/iMessage/etc.
    
    return intro;
  });

// Respond to an introduction
export const respondToIntroProcedure = publicProcedure
  .input(z.object({
    introId: z.string(),
    userId: z.string(),
    response: z.enum(['accept', 'decline']),
    message: z.string().optional()
  }))
  .mutation(async ({ input }) => {
    console.log('💬 Responding to intro:', input);
    
    // Get the introduction
    const { data: intro, error: introError } = await supabase
      .from('introductions')
      .select('*')
      .eq('id', input.introId)
      .single();
    
    if (introError || !intro) {
      throw new Error('Introduction not found');
    }
    
    // Check if user is involved in this intro
    if (intro.target_a_id !== input.userId && intro.target_b_id !== input.userId) {
      throw new Error('User not involved in this introduction');
    }
    
    // Update the appropriate response field
    const isUserA = intro.target_a_id === input.userId;
    const updateData: any = {
      [`${isUserA ? 'a' : 'b'}_response`]: input.response,
      [`${isUserA ? 'a' : 'b'}_responded_at`]: new Date().toISOString()
    };
    
    // If this is an acceptance and the other user already accepted, mark as both_accepted
    const otherResponse = isUserA ? intro.b_response : intro.a_response;
    if (input.response === 'accept' && otherResponse === 'accept') {
      updateData.status = 'both_accepted';
      // TODO: Create group chat thread
    } else if (input.response === 'decline') {
      updateData.status = 'declined';
    }
    
    const { data: updatedIntro, error: updateError } = await supabase
      .from('introductions')
      .update(updateData)
      .eq('id', input.introId)
      .select()
      .single();
    
    if (updateError) {
      throw new Error('Failed to update introduction');
    }
    
    // Record feedback
    await supabase
      .from('match_feedback')
      .insert({
        user_id: input.userId,
        intro_id: input.introId,
        event: input.response === 'accept' ? 'intro_accepted' : 'intro_declined',
        value: input.message,
        meta: { response_time_hours: Math.round((Date.now() - new Date(intro.created_at).getTime()) / (1000 * 60 * 60)) }
      });
    
    return updatedIntro;
  });

// Helper functions
function calculateMatchScore(profileA: any, profileB: any): number {
  let score = 0;
  
  // Interest overlap (40% weight)
  const sharedInterests = findSharedInterests(profileA.interests, profileB.interests);
  const interestScore = sharedInterests.length / Math.max(profileA.interests.length, profileB.interests.length, 1);
  score += interestScore * 0.4;
  
  // Location proximity (30% weight)
  const locationScore = calculateLocationScore(profileA.location, profileB.location);
  score += locationScore * 0.3;
  
  // Bio similarity (20% weight) - simplified for now
  const bioScore = calculateBioSimilarity(profileA.bio, profileB.bio);
  score += bioScore * 0.2;
  
  // Platform compatibility (10% weight)
  const platformScore = profileA.platform_pref === profileB.platform_pref ? 1 : 0.5;
  score += platformScore * 0.1;
  
  return Math.min(score, 1);
}

function findSharedInterests(interestsA: string[], interestsB: string[]): string[] {
  return interestsA.filter(interest => 
    interestsB.some(b => b.toLowerCase().includes(interest.toLowerCase()) || interest.toLowerCase().includes(b.toLowerCase()))
  );
}

function calculateLocationDistance(locA: any, locB: any): number | undefined {
  if (!locA?.lat || !locA?.lon || !locB?.lat || !locB?.lon) return undefined;
  
  // Haversine formula for distance between two points
  const R = 6371; // Earth's radius in km
  const dLat = (locB.lat - locA.lat) * Math.PI / 180;
  const dLon = (locB.lon - locA.lon) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(locA.lat * Math.PI / 180) * Math.cos(locB.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateLocationScore(locA: any, locB: any): number {
  if (!locA || !locB) return 0.5; // Neutral if no location data
  
  // Same city = 1.0, same region = 0.7, same country = 0.4, different = 0.1
  if (locA.city && locB.city && locA.city.toLowerCase() === locB.city.toLowerCase()) {
    return 1.0;
  }
  if (locA.region && locB.region && locA.region.toLowerCase() === locB.region.toLowerCase()) {
    return 0.7;
  }
  if (locA.country && locB.country && locA.country.toLowerCase() === locB.country.toLowerCase()) {
    return 0.4;
  }
  return 0.1;
}

function calculateBioSimilarity(bioA: string, bioB: string): number {
  if (!bioA || !bioB) return 0.5;
  
  // Simple keyword overlap - in production, use embeddings
  const wordsA = bioA.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const wordsB = bioB.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const overlap = wordsA.filter(word => wordsB.includes(word)).length;
  return overlap / Math.max(wordsA.length, wordsB.length, 1);
}

function generateMatchReasoning(profileA: any, profileB: any, sharedInterests: string[]): string {
  const reasons = [];
  
  if (sharedInterests.length > 0) {
    reasons.push(`Both interested in ${sharedInterests.slice(0, 2).join(' and ')}`);
  }
  
  if (profileA.location?.city && profileB.location?.city && 
      profileA.location.city.toLowerCase() === profileB.location.city.toLowerCase()) {
    reasons.push(`Both in ${profileA.location.city}`);
  }
  
  if (reasons.length === 0) {
    reasons.push('Complementary profiles and interests');
  }
  
  return reasons.join('. ');
}

async function generateIntroMessage(profileA: any, profileB: any, sharedInterests: string[]): Promise<string> {
  try {
    const prompt = `Write a warm, concise introduction message between two people:

Person A: ${profileA.bio || 'No bio'} (Interests: ${profileA.interests.join(', ')})
Person B: ${profileB.bio || 'No bio'} (Interests: ${profileB.interests.join(', ')})

Shared interests: ${sharedInterests.join(', ')}

Write a 2-3 sentence introduction that highlights their connection and suggests they might enjoy chatting. Be natural and friendly.`;
    
    const client = openai();
    const response = await client.responses.create({
      model: 'gpt-4o-mini',
      input: [{ role: 'user', content: prompt }],
      max_output_tokens: 150,
      temperature: 0.7
    });
    
    return (response as any).output_text || 'I think you two might enjoy connecting!';
  } catch (error) {
    console.error('Failed to generate intro message:', error);
    return 'I think you two might enjoy connecting!';
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