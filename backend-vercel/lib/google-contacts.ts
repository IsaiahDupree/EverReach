/**
 * Google Contacts Import Service
 * Handles OAuth and contact fetching from Google People API
 */

export interface GoogleContact {
  resourceName: string;
  etag: string;
  name: string | null;
  givenName?: string;
  familyName?: string;
  emails: string[];
  phones: string[];
  addresses: string[];
  organization?: string | null;
  title?: string | null;
  photoUrl?: string | null;
  birthday?: string | null;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthorizationUrl(state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    throw new Error('Google OAuth not configured');
  }

  const scope = 'https://www.googleapis.com/auth/contacts.readonly';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scope,
    access_type: 'offline',
    prompt: 'consent',
    state: state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  return await response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Fetch all contacts from Google People API with pagination
 */
export async function fetchGoogleContacts(accessToken: string): Promise<GoogleContact[]> {
  let contacts: GoogleContact[] = [];
  let pageToken: string | null = null;
  let pageNum = 1;

  do {
    console.log(`[GoogleContacts] Fetching page ${pageNum}...`);
    
    const url = new URL('https://people.googleapis.com/v1/people/me/connections');
    url.searchParams.append('personFields', 'names,emailAddresses,phoneNumbers,addresses,photos,organizations,birthdays');
    url.searchParams.append('pageSize', '1000'); // Max allowed
    if (pageToken) {
      url.searchParams.append('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${error}`);
    }

    const data = await response.json();
    
    if (data.connections) {
      const pageContacts = data.connections.map(parseGoogleContact);
      contacts = contacts.concat(pageContacts);
      console.log(`[GoogleContacts] Page ${pageNum}: ${pageContacts.length} contacts`);
    }

    pageToken = data.nextPageToken || null;
    pageNum++;
  } while (pageToken);

  console.log(`[GoogleContacts] Total fetched: ${contacts.length} contacts`);
  return contacts;
}

/**
 * Parse Google People API contact into our format
 */
function parseGoogleContact(person: any): GoogleContact {
  const contact: GoogleContact = {
    resourceName: person.resourceName || '',
    etag: person.etag || '',
    name: null,
    emails: [],
    phones: [],
    addresses: [],
  };

  // Name
  if (person.names && person.names.length > 0) {
    const name = person.names[0];
    contact.name = name.displayName || null;
    contact.givenName = name.givenName;
    contact.familyName = name.familyName;
  }

  // Emails
  if (person.emailAddresses) {
    contact.emails = person.emailAddresses
      .map((e: any) => e.value)
      .filter(Boolean);
  }

  // Phone numbers
  if (person.phoneNumbers) {
    contact.phones = person.phoneNumbers
      .map((p: any) => p.value)
      .filter(Boolean);
  }

  // Addresses
  if (person.addresses) {
    contact.addresses = person.addresses
      .map((a: any) => a.formattedValue)
      .filter(Boolean);
  }

  // Organization
  if (person.organizations && person.organizations.length > 0) {
    const org = person.organizations[0];
    contact.organization = org.name || null;
    contact.title = org.title || null;
  }

  // Photo
  if (person.photos && person.photos.length > 0) {
    contact.photoUrl = person.photos[0].url || null;
  }

  // Birthday
  if (person.birthdays && person.birthdays.length > 0) {
    const bd = person.birthdays[0].date;
    if (bd) {
      contact.birthday = `${bd.year || '0000'}-${String(bd.month || 1).padStart(2, '0')}-${String(bd.day || 1).padStart(2, '0')}`;
    }
  }

  return contact;
}

/**
 * Check if Google OAuth is configured
 */
export function isGoogleConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI
  );
}
