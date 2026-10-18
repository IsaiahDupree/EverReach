import { publicProcedure, router } from "../server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

function supa() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export const contactsRouter = router({
  list: publicProcedure.query(async () => {
    const { data, error } = await supa().from('contacts').select('*').limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  }),
  create: publicProcedure
    .input(z.object({ name: z.string().min(1), email: z.string().email().optional() }))
    .mutation(async ({ input }) => {
      const { data, error } = await supa().from('contacts').insert(input).select('*').single();
      if (error) throw new Error(error.message);
      return data;
    }),
});
