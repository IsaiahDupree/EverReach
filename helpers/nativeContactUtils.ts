import * as Contacts from 'expo-contacts';
import { normalizeEmail, normalizePhone } from '@/helpers/contactsImport';
import { Person } from '@/storage/types';
import { logInfo, logWarn, logError } from './diagnosticLogger';

export function buildExistingLookups(people: Person[]) {
  const emails = new Set<string>();
  const phones = new Set<string>();
  const names = new Set<string>();
  for (const p of people) {
    (p.emails ?? []).forEach(e => e && emails.add(normalizeEmail(e)));
    (p.phones ?? []).forEach(ph => ph && phones.add(normalizePhone(ph)));
    if (p.fullName) names.add(p.fullName.trim().toLowerCase());
  }
  return { emails, phones, names };
}

export function mapContactToPerson(c: Contacts.Contact): Person | null {
  try {
    // Log the raw contact object to see what expo-contacts gives us
    console.log('[mapContactToPerson] RAW CONTACT OBJECT:', JSON.stringify(c, null, 2));
    console.log('[mapContactToPerson] Contact keys:', Object.keys(c));
    console.log('[mapContactToPerson] Contact.name:', c.name);
    console.log('[mapContactToPerson] Contact.firstName:', (c as any).firstName);
    console.log('[mapContactToPerson] Contact.lastName:', (c as any).lastName);
    console.log('[mapContactToPerson] Contact.emails:', (c as any).emails);
    console.log('[mapContactToPerson] Contact.phoneNumbers:', (c as any).phoneNumbers);
    
    // Try multiple ways to get the name
    let fullName = '';
    
    // expo-contacts might return name directly or as firstName/lastName
    if (c.name && typeof c.name === 'string' && c.name.trim()) {
      fullName = c.name.trim();
    } else {
      // Try firstName and lastName fields
      const firstName = (c as any).firstName;
      const lastName = (c as any).lastName;
      
      // Handle if they're strings
      const firstStr = (typeof firstName === 'string' ? firstName : '').trim();
      const lastStr = (typeof lastName === 'string' ? lastName : '').trim();
      
      if (firstStr || lastStr) {
        fullName = `${firstStr} ${lastStr}`.trim();
      }
    }
    
    logInfo('Extracted contact name', { 
      fullName, 
      rawName: c.name, 
      rawFirstName: (c as any).firstName, 
      rawLastName: (c as any).lastName 
    });

    // Extract emails
    const rawEmails = (c as any).emails ?? [];
    logInfo('Raw emails from contact', { rawEmails, count: rawEmails.length });
    
    const emails = rawEmails
      .map((e: any) => (typeof e === 'string' ? e : e?.email))
      .filter(Boolean)
      .map((e: string) => normalizeEmail(e));
    
    logInfo('Processed emails', { emails, count: emails.length });

    // Extract phone numbers
    const rawPhones = (c as any).phoneNumbers ?? [];
    logInfo('Raw phones from contact', { rawPhones, count: rawPhones.length });
    
    const phones = rawPhones
      .map((p: any) => (typeof p === 'string' ? p : p?.number))
      .filter(Boolean)
      .map((p: string) => normalizePhone(p));
    
    logInfo('Processed phones', { phones, count: phones.length });

    // Must have at least a name, email, or phone
    if (!fullName && !emails.length && !phones.length) {
      console.error('[mapContactToPerson] ❌ REJECTED: Contact has no name, email, or phone');
      console.error('[mapContactToPerson] Rejection details:', {
        hasName: !!fullName,
        hasEmail: emails.length > 0,
        hasPhone: phones.length > 0,
        rawContact: c
      });
      return null;
    }
    
    // Warn if contact has no email or phone (backend requires at least one)
    if (!emails.length && !phones.length) {
      logWarn('Contact has name but no email or phone', { 
        fullName,
        warning: 'Backend requires at least one email or phone number'
      });
      logError('Contact validation will fail', { 
        reason: 'missing_phone_or_email',
        fullName 
      });
      return null; // Don't send to backend if it will fail validation
    }

    // Use fullName as both name and fullName, fallback to email/phone
    const displayName = fullName || (emails[0] ?? phones[0] ?? 'Unknown');

    const person: Person = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: displayName,
      fullName: fullName || displayName,
      createdAt: Date.now(),
      tags: ['imported'],
      // Explicitly set warmth to undefined so PeopleProvider.addPerson 
      // will use settings.defaultWarmthForNewLeads (default: 50)
      warmth: undefined,
    };

    // Only add optional fields if they have values
    if (emails.length > 0) person.emails = emails;
    if (phones.length > 0) person.phones = phones;
    if (typeof (c as any).company === 'string' && (c as any).company) {
      person.company = (c as any).company;
    }

    logInfo('Person object created', {
      name: person.name,
      fullName: person.fullName,
      hasEmails: !!person.emails,
      emailCount: person.emails?.length ?? 0,
      emails: person.emails,
      hasPhones: !!person.phones,
      phoneCount: person.phones?.length ?? 0,
      phones: person.phones,
      company: person.company
    });

    return person;
  } catch (error) {
    console.error('[mapContactToPerson] Error mapping contact:', error, c);
    return null;
  }
}

export function isDuplicate(p: Person, lookups: ReturnType<typeof buildExistingLookups>) {
  const emailDup = (p.emails ?? []).some(e => lookups.emails.has(normalizeEmail(e)));
  const phoneDup = (p.phones ?? []).some(ph => lookups.phones.has(normalizePhone(ph)));
  const nameDup = !p.emails?.length && !p.phones?.length &&
                  p.fullName && lookups.names.has(p.fullName.toLowerCase());
  return emailDup || phoneDup || nameDup;
}

export function updateLookups(p: Person, lookups: ReturnType<typeof buildExistingLookups>) {
  (p.emails ?? []).forEach(e => e && lookups.emails.add(normalizeEmail(e)));
  (p.phones ?? []).forEach(ph => ph && lookups.phones.add(normalizePhone(ph)));
  if (p.fullName) lookups.names.add(p.fullName.toLowerCase());
}