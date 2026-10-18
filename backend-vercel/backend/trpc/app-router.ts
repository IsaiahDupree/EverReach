import 'server-only';
import { router, publicProcedure } from './server';
import { z } from 'zod';
import { contactsRouter } from './routers/contacts';
import { messagesRouter } from './routers/messages';

// Simple health check procedure
const healthRouter = router({
  check: publicProcedure.query(() => {
    return {
      status: 'ok',
      message: 'tRPC is working',
      timestamp: new Date().toISOString(),
    };
  }),
});

// Main app router
export const appRouter = router({
  health: healthRouter,
  contacts: contactsRouter,
  messages: messagesRouter,
});

export type AppRouter = typeof appRouter;
