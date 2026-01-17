/**
 * Feature Request Embedding Processor
 * 
 * Generates embedding and assigns request to bucket via AI clustering
 * 
 * Endpoint:
 * - POST /api/v1/feature-requests/:id/process-embedding
 */

import { options } from "@/lib/cors";
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUser } from '@/lib/auth';
import { 
  generateEmbedding, 
  generateBucketTitle, 
  generateBucketSummary,
  calculateCentroid,
  formatVectorForPostgres,
  parseVectorFromPostgres,
} from '@/lib/embeddings';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SIMILARITY_THRESHOLD = 0.78;

/**
 * POST /api/v1/feature-requests/:id/process-embedding
 * Generate embedding and assign to bucket
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser(request);
    // Allow system calls without auth (for queue processing)
    
    const { id: featureId } = params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the feature request
    const { data: featureRequest, error: fetchError } = await supabase
      .from('feature_requests')
      .select('*')
      .eq('id', featureId)
      .single();

    if (fetchError || !featureRequest) {
      return NextResponse.json(
        { error: 'Feature request not found' },
        { status: 404 }
      );
    }

    // Generate text for embedding
    const text = `${featureRequest.title}\n\n${featureRequest.description || ''}`;
    
    console.log('[ProcessEmbedding] Generating embedding for:', featureId);
    
    // Generate embedding
    const embedding = await generateEmbedding(text);
    
    // Store embedding
    await supabase
      .from('feature_request_embeddings')
      .upsert({
        feature_id: featureId,
        embedding: formatVectorForPostgres(embedding),
        model: 'text-embedding-3-small',
      });

    console.log('[ProcessEmbedding] Embedding stored, finding nearest bucket...');

    // Find nearest bucket using pgvector similarity search
    const { data: nearestBuckets, error: searchError } = await supabase
      .rpc('find_nearest_bucket', {
        p_embedding: formatVectorForPostgres(embedding),
        p_org_id: featureRequest.org_id,
        p_similarity_threshold: SIMILARITY_THRESHOLD,
      });

    let bucketId: string | null = null;

    if (searchError) {
      console.error('[ProcessEmbedding] Similarity search error:', searchError);
      // Continue without bucketing
    } else if (nearestBuckets && nearestBuckets.length > 0) {
      // Found similar bucket
      const nearest = nearestBuckets[0];
      bucketId = nearest.bucket_id;
      console.log('[ProcessEmbedding] Found similar bucket:', bucketId, 'similarity:', nearest.similarity);
    }

    // If no similar bucket found, create new one
    if (!bucketId) {
      console.log('[ProcessEmbedding] No similar bucket found, creating new bucket...');
      
      // Generate bucket title and summary using AI
      const title = await generateBucketTitle([{
        title: featureRequest.title,
        description: featureRequest.description,
      }]);
      
      const summary = await generateBucketSummary([{
        title: featureRequest.title,
        description: featureRequest.description,
      }]);

      // Create new bucket
      const { data: newBucket, error: createError } = await supabase
        .from('feature_buckets')
        .insert({
          org_id: featureRequest.org_id,
          title,
          summary,
          status: 'backlog',
          centroid: formatVectorForPostgres(embedding), // Initial centroid is this request
          goal_votes: 100,
        })
        .select()
        .single();

      if (createError) {
        console.error('[ProcessEmbedding] Failed to create bucket:', createError);
        return NextResponse.json(
          { error: 'Failed to create bucket' },
          { status: 500 }
        );
      }

      bucketId = newBucket.id;
      
      // Log activity
      await supabase
        .from('feature_activity')
        .insert({
          bucket_id: bucketId,
          actor_user_id: featureRequest.user_id,
          type: 'bucket_created',
          payload: {
            initial_request_id: featureId,
            title: title,
          },
        });

      console.log('[ProcessEmbedding] Created new bucket:', bucketId);
    }

    // Assign request to bucket
    await supabase
      .from('feature_requests')
      .update({ bucket_id: bucketId })
      .eq('id', featureId);

    // Update bucket centroid (recalculate mean of all embeddings)
    if (bucketId) {
      console.log('[ProcessEmbedding] Updating bucket centroid...');
      await updateBucketCentroid(bucketId);
    }

    console.log('[ProcessEmbedding] Complete:', featureId, '→', bucketId);

    return NextResponse.json({
      success: true,
      data: {
        feature_id: featureId,
        bucket_id: bucketId,
        created_new_bucket: nearestBuckets?.length === 0,
      },
      message: 'Embedding processed and request assigned to bucket',
    });
  } catch (error: any) {
    console.error('[ProcessEmbedding] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * Helper: Update bucket centroid from all request embeddings
 */
async function updateBucketCentroid(bucketId: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get all feature request IDs in this bucket
  const { data: requests } = await supabase
    .from('feature_requests')
    .select('id')
    .eq('bucket_id', bucketId);
  
  const featureIds = (requests || []).map(r => r.id);
  if (featureIds.length === 0) {
    console.warn('[UpdateCentroid] No requests found for bucket:', bucketId);
    return;
  }

  // Get all embeddings for requests in this bucket
  const { data: embeddings, error } = await supabase
    .from('feature_request_embeddings')
    .select('embedding')
    .in('feature_id', featureIds);

  if (error || !embeddings || embeddings.length === 0) {
    console.warn('[UpdateCentroid] No embeddings found for bucket:', bucketId);
    return;
  }

  // Parse vectors
  const vectors = embeddings.map(e => 
    parseVectorFromPostgres(e.embedding)
  );

  // Calculate centroid
  const centroid = calculateCentroid(vectors);

  // Update bucket
  await supabase
    .from('feature_buckets')
    .update({ 
      centroid: formatVectorForPostgres(centroid),
    })
    .eq('id', bucketId);

  console.log('[UpdateCentroid] Updated centroid for bucket:', bucketId, 'from', vectors.length, 'vectors');
}
