import 'server-only';
import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

// Create tRPC context
export async function createContext() {
  return {
    // Add user, db, etc. later
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
