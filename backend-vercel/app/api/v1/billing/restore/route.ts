import { options, ok, serverError, badRequest } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { recomputeEntitlementsForUser } from "@/lib/entitlements";

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

// POST /api/v1/billing/restore
// Optional body: { recomputeOnly?: boolean }
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    const supabase = getServiceClient();
    
    // CRITICAL FIX: Query RevenueCat API directly to sync subscription status
    // This fixes the issue where webhooks can't reach localhost during development
    const revenueCatApiKey = process.env.REVENUECAT_API_KEY || process.env.REVENUECAT_V2_API_KEY;
    if (revenueCatApiKey) {
      try {
        console.log('[Restore] Fetching customer info from RevenueCat for user:', user.id);
        
        // Use V2 API endpoint (V1 is deprecated and incompatible with V2 API keys)
        const rcResponse = await fetch(`https://api.revenuecat.com/v2/projects/${process.env.REVENUECAT_PROJECT_ID || 'projf143188e'}/customers/${user.id}`, {
          headers: {
            'Authorization': `Bearer ${revenueCatApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (rcResponse.ok) {
          const rcData = await rcResponse.json();
          console.log('[Restore] RevenueCat customer info:', rcData);

          // V2 API structure: rcData.active_entitlements.items (array)
          const activeEntitlements = rcData.active_entitlements?.items || [];
          
          console.log('[Restore] Active entitlements count:', activeEntitlements.length);
          console.log('[Restore] Raw entitlements:', JSON.stringify(activeEntitlements, null, 2));

          // Find any active subscription from the items array
          let activeEntitlement = null;
          for (const ent of activeEntitlements) {
            console.log('[Restore] Checking entitlement expires_at:', ent.expires_at, 'vs now:', new Date().toISOString());
            if (ent.expires_at && new Date(ent.expires_at) > new Date()) {
              activeEntitlement = ent;
              console.log('[Restore] Found active entitlement:', ent);
              break;
            }
          }

          if (activeEntitlement) {
            console.log('[Restore] Syncing active entitlement to database');
            
            // Convert expires_at from Unix timestamp (milliseconds) to ISO string
            const expiresAtDate = new Date(activeEntitlement.expires_at);
            const expiresAtISO = expiresAtDate.toISOString();
            
            console.log('[Restore] Converted expires_at:', activeEntitlement.expires_at, '→', expiresAtISO);
            
            // Determine store/platform from RevenueCat data
            // RevenueCat V2 API: last_seen_platform can be 'iOS', 'ANDROID', etc.
            const platform = rcData.last_seen_platform || 'iOS';
            let store: 'app_store' | 'play' | 'stripe' = 'app_store'; // Default to app_store
            
            if (platform === 'ANDROID' || platform === 'android') {
              store = 'play';
            } else if (platform === 'STRIPE' || platform === 'stripe') {
              store = 'stripe';
            } else {
              store = 'app_store'; // iOS or default
            }
            
            console.log('[Restore] Determined store:', store, 'from platform:', platform);
            
            // Get the store account ID (RevenueCat customer ID / original app user ID)
            // This links the subscription to the App Store / Play Store account
            const storeAccountId = rcData.id || rcData.original_app_user_id || user.id;
            console.log('[Restore] Store account ID:', storeAccountId);
            
            // CRITICAL: Fetch actual subscriptions to get the real product_id
            // Active entitlements don't include product_id, so we need to query subscriptions
            let productId = 'com.everreach.core.monthly'; // Default fallback
            try {
              const subsResponse = await fetch(`https://api.revenuecat.com/v2/projects/${process.env.REVENUECAT_PROJECT_ID || 'projf143188e'}/customers/${user.id}/subscriptions`, {
                headers: {
                  'Authorization': `Bearer ${revenueCatApiKey}`,
                  'Content-Type': 'application/json',
                },
              });
              
              if (subsResponse.ok) {
                const subsData = await subsResponse.json();
                console.log('[Restore] 📋 Subscriptions data:', JSON.stringify(subsData, null, 2));
                
                // Find active subscription with matching expiry
                const subscriptions = subsData.items || [];
                
                for (const sub of subscriptions) {
                  // Match subscription by expiry time (within 1 second tolerance)
                  const subExpiresAt = sub.ends_at;
                  const entitlementExpiresAt = activeEntitlement.expires_at;
                  
                  if (subExpiresAt && Math.abs(subExpiresAt - entitlementExpiresAt) < 1000) {
                    // Found matching subscription - check for pending product change first
                    // If user switched to annual, pending_changes will have the annual product
                    if (sub.pending_changes?.product && sub.auto_renewal_status === 'will_change_product') {
                      const pendingProduct = sub.pending_changes.product;
                      console.log('[Restore] 🔄 Found pending product change:', {
                        current: sub.product_id,
                        pending: pendingProduct.id,
                        pending_store_identifier: pendingProduct.store_identifier,
                        pending_display_name: pendingProduct.display_name,
                        auto_renewal_status: sub.auto_renewal_status
                      });
                      
                      // Use the pending product (annual) instead of current (monthly)
                      // Get the store_identifier directly from pending_changes if available
                      if (pendingProduct.store_identifier) {
                        productId = pendingProduct.store_identifier;
                        console.log('[Restore] ✅ Using pending product store_identifier (annual):', productId);
                      } else {
                        productId = pendingProduct.id;
                        console.log('[Restore] ✅ Using pending product_id (annual):', productId);
                      }
                    } else if (sub.product_id) {
                      // No pending change, use current product
                      productId = sub.product_id;
                      console.log('[Restore] ✅ Found matching RevenueCat product_id:', productId);
                    }
                    break;
                  }
                }
                
                // If we found a product_id, try to get the App Store identifier
                // (Only if we didn't already get store_identifier from pending_changes)
                if (productId && productId !== 'com.everreach.core.monthly' && !productId.startsWith('com.everreach.core.')) {
                  try {
                    const productResponse = await fetch(`https://api.revenuecat.com/v2/projects/${process.env.REVENUECAT_PROJECT_ID || 'projf143188e'}/products/${productId}`, {
                      headers: {
                        'Authorization': `Bearer ${revenueCatApiKey}`,
                        'Content-Type': 'application/json',
                      },
                    });
                    
                    if (productResponse.ok) {
                      const productData = await productResponse.json();
                      console.log('[Restore] 📦 Product data:', JSON.stringify(productData, null, 2));
                      
                      // Get the App Store product identifier (store_identifier for iOS)
                      if (store === 'app_store' && productData.store_identifier) {
                        productId = productData.store_identifier;
                        console.log('[Restore] ✅ Found App Store product_id:', productId);
                      } else if (store === 'play' && productData.store_identifier) {
                        productId = productData.store_identifier;
                        console.log('[Restore] ✅ Found Play Store product_id:', productId);
                      }
                    }
                  } catch (productError) {
                    console.warn('[Restore] Could not fetch product details, using RevenueCat product_id:', productId);
                  }
                }
              }
            } catch (subsError) {
              console.warn('[Restore] Could not fetch subscriptions, using fallback product_id:', productId);
            }
            
            console.log('[Restore] Final product_id to use:', productId);
            
            // Try to find matching product in products table, or use a default
            const { data: product } = await supabase
              .from('products')
              .select('id')
              .eq('id', productId)
              .maybeSingle();
            
            // If product doesn't exist, try to find via product_skus
            if (!product) {
              const { data: sku } = await supabase
                .from('product_skus')
                .select('product_id')
                .eq('store', store)
                .eq('sku', productId)
                .maybeSingle();
              
              if (sku) {
                productId = sku.product_id;
                console.log('[Restore] Mapped product via SKU:', productId, '→', sku.product_id);
              } else {
                // Keep the productId we found from RevenueCat (it should be valid)
                console.log('[Restore] Using product_id from RevenueCat:', productId);
              }
            }
            
            // Check if subscription exists for this user and store
            const { data: existing } = await supabase
              .from('subscriptions')
              .select('id, user_id, store')
              .eq('user_id', user.id)
              .eq('store', store)
              .maybeSingle();
            
            console.log('[Restore] Existing subscription:', existing);
            
            if (existing) {
              // Update existing row
              const updateResult = await supabase
                .from('subscriptions')
                .update({
                  status: 'active',
                  product_id: productId,
                  store_account_id: storeAccountId, // Link to App Store / Play Store account
                  current_period_end: expiresAtISO,
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id)
                .eq('store', store);
              
              if (updateResult.error) {
                console.error('[Restore] Update error:', updateResult.error);
              } else {
                console.log('[Restore] ✅ Subscription updated successfully (store_account_id:', storeAccountId, ')');
              }
            } else {
              // Insert new row - include all required fields
              const insertResult = await supabase
                .from('subscriptions')
                .insert({
                  user_id: user.id,
                  status: 'active',
                  product_id: productId,
                  store: store, // REQUIRED: Must be 'app_store', 'play', or 'stripe'
                  store_account_id: storeAccountId, // Link to App Store / Play Store account
                  current_period_end: expiresAtISO,
                  started_at: new Date().toISOString(), // REQUIRED: Has default but explicit is better
                });
              
              if (insertResult.error) {
                console.error('[Restore] Insert error:', insertResult.error);
                console.error('[Restore] Insert error details:', JSON.stringify(insertResult.error, null, 2));
              } else {
                console.log('[Restore] ✅ Subscription inserted successfully (store_account_id:', storeAccountId, ')');
              }
            }

            console.log('[Restore] ✅ Subscription synced from RevenueCat');
          } else {
            console.log('[Restore] No active entitlements found in RevenueCat');
          }
        } else {
          console.warn('[Restore] RevenueCat API error:', rcResponse.status, await rcResponse.text());
        }
      } catch (rcError: any) {
        console.error('[Restore] Failed to query RevenueCat:', rcError.message);
        // Continue with local recompute as fallback
      }
    }

    // Recompute entitlements from database (now includes RevenueCat data if available)
    await recomputeEntitlementsForUser(supabase, user.id);

    const { data: ent } = await supabase
      .from('entitlements')
      .select('plan, valid_until, source, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    return ok({ recomputed: true, entitlements: ent || null }, req);
  } catch (e: any) {
    return serverError(e?.message || 'restore_failed', req);
  }
}
