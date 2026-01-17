import 'server-only';

// Server-side guard to prevent client-side imports
if (typeof window !== 'undefined') {
  throw new Error('backend/trpc/server.ts was imported in a client bundle. This file should only be imported server-side.');
}

import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { FLAGS } from "@/constants/flags";

// Only import Supabase when not in local-only mode
let supabaseClient: any = null;
if (!FLAGS.LOCAL_ONLY) {
  try {
    const supabaseModule = require("../lib/supabase");
    supabaseClient = supabaseModule.supabaseClient;
  } catch (error) {
    console.warn('Supabase module not available:', error);
  }
}

// Context creation function
export const createContext = async (opts: FetchCreateContextFnOptions) => {
  // Extract auth token from headers
  const authHeader = opts.req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  let user = null;
  let orgId = null;
  
  if (FLAGS.LOCAL_ONLY) {
    // Local-only mode: Use mock user
    user = {
      id: 'local-user-id',
      email: 'local@user.com',
      user_metadata: { name: 'Local User' }
    };
    orgId = 'local-org-id';
    console.log('🏠 Local-only mode: Using mock user');
  } else if (token && supabaseClient) {
    try {
      const { data: { user: authUser }, error } = await supabaseClient.auth.getUser(token);
      if (!error && authUser) {
        user = authUser;
        // Get user's org - for now use a default org ID
        // In production, you'd query the user_orgs table
        orgId = 'default-org-id';
      }
    } catch (error) {
      console.warn('Auth error in context:', error);
    }
  }
  
  return {
    req: opts.req,
    user,
    orgId,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || !ctx.orgId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      orgId: ctx.orgId,
    },
  });
});