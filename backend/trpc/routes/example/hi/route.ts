// Server-side guard to prevent client-side imports
if (typeof window !== 'undefined') {
  throw new Error('backend/trpc/routes/example/hi/route.ts was imported in a client bundle. This file should only be imported server-side.');
}

import { z } from "zod";
import { publicProcedure } from "../../../server";

export default publicProcedure
  .input(z.object({ name: z.string() }))
  .mutation(({ input }: { input: { name: string } }) => {
    return {
      hello: input.name,
      date: new Date(),
    };
  });