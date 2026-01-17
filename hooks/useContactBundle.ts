import { useQuery } from '@tanstack/react-query';
import { ContactsRepo, type ContactBundle } from '@/repos/ContactsRepo';

export function useContactBundle(contactId: string) {
  return useQuery<ContactBundle>({
    queryKey: ['contact-bundle', contactId],
    queryFn: () => ContactsRepo.getBundle(contactId),
    enabled: !!contactId,
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
