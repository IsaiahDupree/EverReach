import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supa() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// POST /api/webhooks/authority-os — receive blog posts from Authority OS
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("x-aos-webhook-secret") || req.headers.get("authorization");
  const expected = process.env.AOS_WEBHOOK_SECRET;
  if (expected && authHeader !== expected && authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const posts = Array.isArray(body) ? body : body.posts ? body.posts : [body];

  const results = [];
  for (const post of posts) {
    if (!post.title || !post.slug) {
      results.push({ slug: post.slug, status: "skipped", reason: "missing title or slug" });
      continue;
    }

    const row = {
      aos_post_id: post.id || post.aos_post_id || null,
      title: post.title,
      slug: post.slug,
      content_html: post.content_html || post.html || null,
      excerpt: post.excerpt || null,
      tags: post.tags || [],
      author: post.author || "Authority OS",
      published_at: post.published_at || new Date().toISOString(),
      seo_title: post.seo_title || null,
      seo_description: post.seo_description || null,
      word_count: post.word_count || null,
    };

    // Check if slug already exists, then insert or update
    const { data: existing } = await supa()
      .from("er_blog_posts")
      .select("id")
      .eq("slug", row.slug)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supa()
        .from("er_blog_posts")
        .update(row)
        .eq("id", existing.id));
    } else {
      ({ error } = await supa()
        .from("er_blog_posts")
        .insert(row));
    }

    results.push({
      slug: row.slug,
      status: error ? "error" : "ok",
      error: error?.message,
    });
  }

  return NextResponse.json({
    received: posts.length,
    results,
    timestamp: new Date().toISOString(),
  });
}
