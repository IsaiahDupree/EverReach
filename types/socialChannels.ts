/**
 * Social Media Channel Types
 * Used for storing and managing social media handles for contacts
 */

export type SocialPlatform = 
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'facebook'
  | 'whatsapp'
  | 'telegram'
  | 'tiktok'
  | 'snapchat'
  | 'youtube'
  | 'threads'
  | 'pinterest'
  | 'twitch'
  | 'discord'
  | 'custom';

export interface SocialMediaChannel {
  platform: SocialPlatform;
  handle: string; // e.g., "@johndoe" or "johndoe"
  url: string; // Full profile URL
}

/**
 * Platform display names
 */
export const PLATFORM_NAMES: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  tiktok: 'TikTok',
  snapchat: 'Snapchat',
  youtube: 'YouTube',
  threads: 'Threads',
  pinterest: 'Pinterest',
  twitch: 'Twitch',
  discord: 'Discord',
  custom: 'Custom URL',
};

/**
 * Platform brand colors
 */
export const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  instagram: '#E4405F',
  twitter: '#1DA1F2',
  linkedin: '#0077B5',
  facebook: '#1877F2',
  whatsapp: '#25D366',
  telegram: '#0088CC',
  tiktok: '#000000',
  snapchat: '#FFFC00',
  youtube: '#FF0000',
  threads: '#000000',
  pinterest: '#E60023',
  twitch: '#9146FF',
  discord: '#5865F2',
  custom: '#6B7280',
};

/**
 * Ionicons icon names for each platform
 */
export const PLATFORM_ICONS: Record<SocialPlatform, string> = {
  instagram: 'logo-instagram',
  twitter: 'logo-twitter',
  linkedin: 'logo-linkedin',
  facebook: 'logo-facebook',
  whatsapp: 'logo-whatsapp',
  telegram: 'paper-plane',
  tiktok: 'logo-tiktok',
  snapchat: 'logo-snapchat',
  youtube: 'logo-youtube',
  threads: 'at-outline',
  pinterest: 'logo-pinterest',
  twitch: 'logo-twitch',
  discord: 'logo-discord',
  custom: 'link-outline',
};

/**
 * Deep link URL schemes for each platform
 */
export const PLATFORM_DEEP_LINKS: Record<SocialPlatform, (handle: string) => string> = {
  instagram: (handle: string) => `instagram://user?username=${handle}`,
  twitter: (handle: string) => `twitter://user?screen_name=${handle}`,
  linkedin: (handle: string) => `linkedin://profile/${handle}`,
  facebook: (handle: string) => `fb://profile/${handle}`,
  whatsapp: (phone: string) => `whatsapp://send?phone=${phone}`,
  telegram: (handle: string) => `tg://resolve?domain=${handle}`,
  tiktok: (handle: string) => `tiktok://user?username=${handle}`,
  snapchat: (handle: string) => `snapchat://add/${handle}`,
  youtube: (handle: string) => `youtube://user/${handle}`,
  threads: (handle: string) => `threads://user/${handle}`,
  pinterest: (handle: string) => `pinterest://user/${handle}`,
  twitch: (handle: string) => `twitch://stream/${handle}`,
  discord: (handle: string) => `discord://users/${handle}`,
  custom: (url: string) => url,
};

/**
 * Build profile URL from platform and handle
 */
export function buildProfileUrl(platform: SocialPlatform, handle: string): string {
  const cleanHandle = handle.replace(/^@/, ''); // Remove @ prefix if present
  
  const urlTemplates: Record<SocialPlatform, string> = {
    instagram: `https://instagram.com/${cleanHandle}`,
    twitter: `https://twitter.com/${cleanHandle}`,
    linkedin: `https://linkedin.com/in/${cleanHandle}`,
    facebook: `https://facebook.com/${cleanHandle}`,
    whatsapp: `https://wa.me/${cleanHandle}`,
    telegram: `https://t.me/${cleanHandle}`,
    tiktok: `https://tiktok.com/@${cleanHandle}`,
    snapchat: `https://snapchat.com/add/${cleanHandle}`,
    youtube: `https://youtube.com/@${cleanHandle}`,
    threads: `https://threads.net/@${cleanHandle}`,
    pinterest: `https://pinterest.com/${cleanHandle}`,
    twitch: `https://twitch.tv/${cleanHandle}`,
    discord: cleanHandle,
    custom: cleanHandle,
  };
  
  return urlTemplates[platform] || '';
}

/**
 * Validate social media handle format
 */
export function validateHandle(platform: SocialPlatform, handle: string): { valid: boolean; error?: string } {
  if (!handle || handle.trim().length === 0) {
    return { valid: false, error: 'Handle cannot be empty' };
  }
  
  const cleanHandle = handle.replace(/^@/, '');
  
  // Platform-specific validation
  switch (platform) {
    case 'custom':
      // For custom URLs, validate it's a proper URL
      try {
        new URL(handle);
        return { valid: true };
      } catch {
        return { valid: false, error: 'Please enter a valid URL (e.g., https://example.com/profile)' };
      }
    
    case 'discord':
      // Discord uses username#discriminator or just username format
      if (cleanHandle.length > 100) {
        return { valid: false, error: 'Discord username is too long' };
      }
      return { valid: true };
    
    case 'whatsapp':
      // WhatsApp needs phone number format
      if (!/^\+?[1-9]\d{1,14}$/.test(cleanHandle)) {
        return { valid: false, error: 'WhatsApp requires a valid phone number (e.g., +1234567890)' };
      }
      break;
    
    case 'instagram':
    case 'twitter':
    case 'tiktok':
    case 'threads':
      // These platforms have specific username rules
      if (!/^[a-zA-Z0-9._]{1,30}$/.test(cleanHandle)) {
        return { valid: false, error: 'Username can only contain letters, numbers, dots, and underscores' };
      }
      break;
    
    case 'youtube':
      // YouTube channel handles
      if (!/^[a-zA-Z0-9._-]{3,30}$/.test(cleanHandle)) {
        return { valid: false, error: 'YouTube handle can only contain letters, numbers, dots, underscores, and hyphens' };
      }
      break;
    
    case 'twitch':
    case 'pinterest':
      // Twitch and Pinterest usernames
      if (!/^[a-zA-Z0-9_]{3,25}$/.test(cleanHandle)) {
        return { valid: false, error: 'Username can only contain letters, numbers, and underscores (3-25 characters)' };
      }
      break;
    
    case 'linkedin':
      // LinkedIn uses different URL formats
      if (!/^[a-zA-Z0-9-]{3,100}$/.test(cleanHandle)) {
        return { valid: false, error: 'LinkedIn username can only contain letters, numbers, and hyphens' };
      }
      break;
    
    default:
      // Generic validation for other platforms
      if (cleanHandle.length > 100) {
        return { valid: false, error: 'Handle is too long' };
      }
  }
  
  return { valid: true };
}

/**
 * Format handle for display (ensures @ prefix where appropriate)
 */
export function formatHandleForDisplay(platform: SocialPlatform, handle: string): string {
  // For custom URLs and Discord, return as-is
  if (platform === 'custom' || platform === 'discord') {
    return handle;
  }
  
  const cleanHandle = handle.replace(/^@/, '');
  
  // Platforms that use @ prefix
  const useAtPrefix = ['instagram', 'twitter', 'tiktok', 'threads', 'youtube'];
  
  if (useAtPrefix.includes(platform)) {
    return `@${cleanHandle}`;
  }
  
  return cleanHandle;
}
