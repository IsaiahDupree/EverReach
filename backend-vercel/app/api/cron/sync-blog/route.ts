/**
 * Cron Job: Sync blog posts from Authority OS Supabase
 * GET /api/cron/sync-blog
 *
 * Pulls new/updated posts from AOS Supabase (aos_blog_articles)
 * into EverReach's er_blog_posts table.
 *
 * Requires AOS_SUPABASE_URL and AOS_SUPABASE_SERVICE_ROLE_KEY env vars.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

function erSupa() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function aosSupa() {
  const url = process.env.AOS_SUPABASE_URL;
  const key = process.env.AOS_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && !req.headers.get("x-vercel-cron")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const aos = aosSupa();
  if (!aos) {
    return NextResponse.json({
      status: "skipped",
      reason: "AOS_SUPABASE_URL or AOS_SUPABASE_SERVICE_ROLE_KEY not configured",
    });
  }

  const er = erSupa();

  // Get the latest received_at from EverReach to only sync newer posts
  const { data: latest } = await er
    .from("er_blog_posts")
    .select("received_at")
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const since = latest?.received_at || "2020-01-01T00:00:00Z";

  // Try aos_blog_articles first, then aos_generated_content, then aos_blog_posts
  let sourcePosts: any[] = [];
  for (const table of ["aos_blog_articles", "aos_generated_content", "aos_blog_posts"]) {
    const { data, error } = await aos
      .from(table)
      .select("*")
      .gt("created_at", since)
      .order("created_at", { ascending: true })
      .limit(50);

    if (!error && data && data.length > 0) {
      sourcePosts = data;
      break;
    }
  }

  if (sourcePosts.length === 0) {
    return NextResponse.json({ status: "ok", synced: 0, message: "No new posts" });
  }

  let synced = 0;
  const errors: string[] = [];

  for (const post of sourcePosts) {
    const row = {
      aos_post_id: post.id,
      title: post.title,
      slug: post.slug || post.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      content_html: post.content_html || post.html || post.content_markdown || post.content || null,
      excerpt: post.excerpt || post.meta_description || null,
      tags: post.tags || [],
      author: post.author || "Authority OS",
      published_at: post.published_at || post.created_at,
      received_at: new Date().toISOString(),
      seo_title: post.seo_title || null,
      seo_description: post.seo_description || post.meta_description || null,
      word_count: post.word_count || null,
    };

    // Check if slug already exists, then insert or update
    const { data: existing } = await er
      .from("er_blog_posts")
      .select("id")
      .eq("slug", row.slug)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await er
        .from("er_blog_posts")
        .update(row)
        .eq("id", existing.id));
    } else {
      ({ error } = await er
        .from("er_blog_posts")
        .insert(row));
    }

    if (error) {
      errors.push(`${row.slug}: ${error.message}`);
    } else {
      synced++;
    }
  }

  return NextResponse.json({
    status: "ok",
    synced,
    errors: errors.length > 0 ? errors : undefined,
    since,
    timestamp: new Date().toISOString(),
  });
}
