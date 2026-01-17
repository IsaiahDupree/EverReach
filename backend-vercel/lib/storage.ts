import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side storage helpers
 * - Uses service role to perform privileged storage actions (e.g., createSignedUploadUrl)
 * - Do NOT expose service role in client code
 */
export function getServiceStorageClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export function getDefaultBucketName(): string {
  // Default to 'attachments' which is created by supabase/05_storage.sql
  return process.env.SUPABASE_STORAGE_BUCKET || "attachments";
}
