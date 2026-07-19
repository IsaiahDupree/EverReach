import { publicProcedure, router } from "../server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

function supa() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export const blogRouter = router({
  list: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const { data, error, count } = await supa()
        .from("er_blog_posts")
        .select("id, title, slug, excerpt, tags, author, published_at", { count: "exact" })
        .order("published_at", { ascending: false, nullsFirst: false })
        .range(input.offset, input.offset + input.limit - 1);
      if (error) throw new Error(error.message);
      return { posts: data ?? [], total: count ?? 0 };
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      const { data, error } = await supa()
        .from("er_blog_posts")
        .select("*")
        .eq("slug", input.slug)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Post not found");
      return data;
    }),
});
