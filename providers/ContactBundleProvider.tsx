import React, { createContext, useContext, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useContactBundle } from '@/hooks/useContactBundle';
import type { ContactBundle } from '@/repos/ContactsRepo';

interface Ctx {
  contactId: string;
  bundle?: ContactBundle;
  isLoading: boolean;
  refetch: () => Promise<any>;
  updateLocal: (updater: (prev: ContactBundle) => ContactBundle) => void;
}

const ContactBundleContext = createContext<Ctx | undefined>(undefined);

export function ContactBundleProvider({ contactId, children }: { contactId: string; children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const query = useContactBundle(contactId);

  const value = useMemo<Ctx>(() => ({
    contactId,
    bundle: query.data,
    isLoading: query.isLoading,
    refetch: async () => {
      const r = await query.refetch();
      return r.data;
    },
    updateLocal: (updater) => {
      queryClient.setQueryData(['contact-bundle', contactId], (prev: ContactBundle | undefined) => {
        if (!prev) return prev as any;
        try { return updater(prev); } catch { return prev; }
      });
    },
  }), [contactId, query.data, query.isLoading, query.refetch, queryClient]);

  return (
    <ContactBundleContext.Provider value={value}>{children}</ContactBundleContext.Provider>
  );
}

export function useContactBundleContext() {
  const ctx = useContext(ContactBundleContext);
  if (!ctx) throw new Error('useContactBundleContext must be used within ContactBundleProvider');
  return ctx;
}
