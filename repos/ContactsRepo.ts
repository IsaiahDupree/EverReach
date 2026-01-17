import { apiFetch } from '@/lib/api';

export type ContactBundle = {
  contact: any | null;
  interactions: any[];
  notes: Array<{ 
    id: string; 
    content: string; 
    created_at?: string; 
    createdAt?: number; 
    person_id?: string;
    metadata?: any; // Include metadata for screenshot file_url and other note metadata
  }>;
  files: any[];
};

export const ContactsRepo = {
  async getBundle(contactId: string): Promise<ContactBundle> {
    const base = `/api/v1/contacts/${contactId}`;

    const [contactRes, interactionsRes, notesRes, filesRes] = await Promise.all([
      apiFetch(base, { requireAuth: true }).catch(() => null),
      apiFetch(`/api/v1/interactions?contact_id=${contactId}&limit=50&sort=created_at:desc`, { requireAuth: true }).catch(() => null),
      apiFetch(`${base}/notes?limit=50&sort=created_at:desc`, { requireAuth: true }).catch(() => null),
      apiFetch(`${base}/files?limit=100`, { requireAuth: true }).catch(() => null),
    ]);

    const contactJson = contactRes && contactRes.ok ? await contactRes.json().catch(() => null) : null;
    const interactionsJson = interactionsRes && interactionsRes.ok ? await interactionsRes.json().catch(() => ({})) : {};
    const notesJson = notesRes && notesRes.ok ? await notesRes.json().catch(() => ({})) : {};
    const filesJson = filesRes && filesRes.ok ? await filesRes.json().catch(() => ({})) : {};

    const contact = contactJson?.contact || contactJson || null;
    const interactions = interactionsJson?.items || interactionsJson?.interactions || [];
    const notes = (notesJson?.items || notesJson?.notes || []).map((n: any) => ({
      id: n.id,
      content: n.content,
      created_at: n.created_at,
      createdAt: n.createdAt,
      person_id: n.person_id,
      metadata: n.metadata, // Preserve metadata including screenshot file URLs
    }));
    const files = filesJson?.files || filesJson?.items || [];

    return { contact, interactions, notes, files };
  },
};
