// Client-safe type definitions for tRPC
// This file should not import any server-side code
// Types based on backend-vercel AppRouter structure

// Health router types
type HealthRouter = {
  check: {
    input: void;
    output: {
      status: string;
      message: string;
      timestamp: string;
    };
  };
};

// Contacts router types
type ContactsRouter = {
  list: {
    input: void;
    output: {
      id: string;
      name: string;
      email?: string;
      created_at: string;
      updated_at: string;
    }[];
  };
  create: {
    input: {
      name: string;
      email?: string;
    };
    output: {
      id: string;
      name: string;
      email?: string;
      created_at: string;
      updated_at: string;
    };
  };
};

// Messages router types
type MessagesRouter = {
  craft: {
    input: {
      prompt: string;
      tone?: string;
    };
    output: {
      message: string;
    };
  };
};

// Main AppRouter type matching backend-vercel structure
export type AppRouter = {
  health: HealthRouter;
  contacts: ContactsRouter;
  messages: MessagesRouter;
};

// Input/Output helper types
export type RouterInputs = {
  [K in keyof AppRouter]: {
    [P in keyof AppRouter[K]]: AppRouter[K][P] extends { input: infer I } ? I : never;
  };
};

export type RouterOutputs = {
  [K in keyof AppRouter]: {
    [P in keyof AppRouter[K]]: AppRouter[K][P] extends { output: infer O } ? O : never;
  };
};

// Re-export common tRPC client types for convenience
export type { TRPCClientError } from '@trpc/client';