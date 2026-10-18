/**
 * Abstract Import Provider Interface
 * 
 * All third-party contact import providers must implement this interface.
 */

import { OAuthConfig, OAuthTokens, NormalizedContact, ImportProvider } from './types';

/**
 * Abstract base class for import providers
 */
export abstract class ContactImportProvider {
  abstract readonly name: ImportProvider;
  abstract readonly displayName: string;
  
  /**
   * Get OAuth configuration for this provider
   */
  abstract getOAuthConfig(): OAuthConfig;
  
  /**
   * Generate OAuth authorization URL
   * @param state - State parameter for CSRF protection
   * @returns Authorization URL to redirect user to
   */
  abstract getAuthorizationUrl(state: string): string;
  
  /**
   * Exchange authorization code for access tokens
   * @param code - Authorization code from OAuth callback
   * @returns OAuth tokens
   */
  abstract exchangeCodeForTokens(code: string): Promise<OAuthTokens>;
  
  /**
   * Refresh access token if expired
   * @param refreshToken - Refresh token
   * @returns New OAuth tokens
   */
  abstract refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;
  
  /**
   * Get user's account info from provider
   * @param accessToken - OAuth access token
   * @returns Account ID and name
   */
  abstract getAccountInfo(accessToken: string): Promise<{
    id: string;
    name: string;
  }>;
  
  /**
   * Fetch all contacts from provider
   * @param accessToken - OAuth access token
   * @param pageToken - Optional pagination token
   * @returns Normalized contacts and next page token
   */
  abstract fetchContacts(
    accessToken: string,
    pageToken?: string
  ): Promise<{
    contacts: NormalizedContact[];
    nextPageToken?: string;
    totalContacts?: number;
  }>;
  
  /**
   * Normalize provider-specific contact to common format
   * @param rawContact - Raw contact from provider API
   * @returns Normalized contact
   */
  abstract normalizeContact(rawContact: any): NormalizedContact;
}

/**
 * Provider registry - maps provider name to implementation
 */
export const PROVIDERS: Record<ImportProvider, () => ContactImportProvider> = {
  google: () => new GoogleContactsProvider(),
  microsoft: () => new MicrosoftContactsProvider(),
  apple: () => {
    throw new Error('Apple Contacts provider not yet implemented');
  },
  csv: () => {
    throw new Error('CSV import provider not yet implemented');
  },
  manual: () => {
    throw new Error('Manual import is handled separately');
  },
};

/**
 * Get provider instance by name
 */
export function getProvider(name: ImportProvider): ContactImportProvider {
  const providerFactory = PROVIDERS[name];
  if (!providerFactory) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return providerFactory();
}

/**
 * Google Contacts Provider Implementation
 */
class GoogleContactsProvider extends ContactImportProvider {
  readonly name: ImportProvider = 'google';
  readonly displayName = 'Google Contacts';

  getOAuthConfig(): OAuthConfig {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ever-reach-be.vercel.app';

    if (!clientId || !clientSecret) {
      throw new Error(
        'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables. ' +
        'See https://console.cloud.google.com/ to create OAuth credentials.'
      );
    }

    return {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${baseUrl}/api/v1/contacts/import/google/callback`,
      scopes: [
        'https://www.googleapis.com/auth/contacts.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      auth_url: 'https://accounts.google.com/o/oauth2/v2/auth',
      token_url: 'https://oauth2.googleapis.com/token',
    };
  }

  getAuthorizationUrl(state: string): string {
    const config = this.getOAuthConfig();
    const params = new URLSearchParams({
      client_id: config.client_id,
      redirect_uri: config.redirect_uri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `${config.auth_url}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const config = this.getOAuthConfig();
    const response = await fetch(config.token_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.client_id,
        client_secret: config.client_secret,
        redirect_uri: config.redirect_uri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${await response.text()}`);
    }

    return await response.json();
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const config = this.getOAuthConfig();
    const response = await fetch(config.token_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: config.client_id,
        client_secret: config.client_secret,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${await response.text()}`);
    }

    return await response.json();
  }

  async getAccountInfo(accessToken: string): Promise<{ id: string; name: string }> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to get account info: ${await response.text()}`);
    }

    const data = await response.json();
    return {
      id: data.email,
      name: data.name || data.email,
    };
  }

  async fetchContacts(
    accessToken: string,
    pageToken?: string
  ): Promise<{
    contacts: NormalizedContact[];
    nextPageToken?: string;
    totalContacts?: number;
  }> {
    const params = new URLSearchParams({
      personFields: 'names,emailAddresses,phoneNumbers,organizations,birthdays,photos,biographies',
      pageSize: '100',
    });

    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const response = await fetch(
      `https://people.googleapis.com/v1/people/me/connections?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch contacts: ${await response.text()}`);
    }

    const data = await response.json();
    const contacts = (data.connections || []).map((c: any) => this.normalizeContact(c));

    return {
      contacts,
      nextPageToken: data.nextPageToken,
      totalContacts: data.totalPeople,
    };
  }

  normalizeContact(rawContact: any): NormalizedContact {
    const names = rawContact.names?.[0] || {};
    const emails = (rawContact.emailAddresses || []).map((e: any) => e.value);
    const phones = (rawContact.phoneNumbers || []).map((p: any) => p.value);
    const org = rawContact.organizations?.[0] || {};
    const photo = rawContact.photos?.[0]?.url;
    const bio = rawContact.biographies?.[0]?.value;

    return {
      provider_contact_id: rawContact.resourceName,
      provider_etag: rawContact.etag,
      display_name: names.displayName || emails[0] || 'Unknown',
      given_name: names.givenName,
      family_name: names.familyName,
      emails,
      phones,
      company: org.name,
      job_title: org.title,
      notes: bio,
      photo_url: photo,
      raw_data: rawContact,
    };
  }
}

/**
 * Microsoft Contacts Provider Implementation
 */
class MicrosoftContactsProvider extends ContactImportProvider {
  readonly name: ImportProvider = 'microsoft';
  readonly displayName = 'Microsoft Outlook';

  getOAuthConfig(): OAuthConfig {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ever-reach-be.vercel.app';

    if (!clientId || !clientSecret) {
      throw new Error(
        'Microsoft OAuth not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET environment variables. ' +
        'See https://portal.azure.com/ to create OAuth credentials.'
      );
    }

    return {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${baseUrl}/api/v1/contacts/import/microsoft/callback`,
      scopes: [
        'https://graph.microsoft.com/Contacts.Read',
        'https://graph.microsoft.com/User.Read',
      ],
      auth_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      token_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    };
  }

  getAuthorizationUrl(state: string): string {
    const config = this.getOAuthConfig();
    const params = new URLSearchParams({
      client_id: config.client_id,
      redirect_uri: config.redirect_uri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      response_mode: 'query',
      state,
    });
    return `${config.auth_url}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const config = this.getOAuthConfig();
    const response = await fetch(config.token_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.client_id,
        client_secret: config.client_secret,
        redirect_uri: config.redirect_uri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${await response.text()}`);
    }

    return await response.json();
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const config = this.getOAuthConfig();
    const response = await fetch(config.token_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: config.client_id,
        client_secret: config.client_secret,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${await response.text()}`);
    }

    return await response.json();
  }

  async getAccountInfo(accessToken: string): Promise<{ id: string; name: string }> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to get account info: ${await response.text()}`);
    }

    const data = await response.json();
    return {
      id: data.userPrincipalName || data.mail,
      name: data.displayName || data.userPrincipalName,
    };
  }

  async fetchContacts(
    accessToken: string,
    pageToken?: string
  ): Promise<{
    contacts: NormalizedContact[];
    nextPageToken?: string;
    totalContacts?: number;
  }> {
    const url = pageToken || 'https://graph.microsoft.com/v1.0/me/contacts?$top=100';

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch contacts: ${await response.text()}`);
    }

    const data = await response.json();
    const contacts = (data.value || []).map((c: any) => this.normalizeContact(c));

    return {
      contacts,
      nextPageToken: data['@odata.nextLink'],
    };
  }

  normalizeContact(rawContact: any): NormalizedContact {
    const emails = (rawContact.emailAddresses || []).map((e: any) => e.address);
    const phones = [
      rawContact.mobilePhone,
      rawContact.businessPhones?.[0],
      rawContact.homePhones?.[0],
    ].filter(Boolean);

    return {
      provider_contact_id: rawContact.id,
      display_name: rawContact.displayName || emails[0] || 'Unknown',
      given_name: rawContact.givenName,
      family_name: rawContact.surname,
      emails,
      phones,
      company: rawContact.companyName,
      job_title: rawContact.jobTitle,
      birthday: rawContact.birthday,
      notes: rawContact.personalNotes,
      raw_data: rawContact,
    };
  }
}
