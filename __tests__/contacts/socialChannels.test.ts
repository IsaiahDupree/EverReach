/**
 * Social Channels Utility Tests
 * 
 * Tests buildProfileUrl, validateHandle, and formatHandleForDisplay
 * from types/socialChannels.ts
 */

import {
  buildProfileUrl,
  validateHandle,
  formatHandleForDisplay,
  PLATFORM_NAMES,
  PLATFORM_COLORS,
  PLATFORM_ICONS,
  SocialPlatform,
} from '@/types/socialChannels';

describe('buildProfileUrl', () => {
  test('builds Instagram URL', () => {
    expect(buildProfileUrl('instagram', 'johndoe')).toBe('https://instagram.com/johndoe');
  });

  test('strips @ prefix', () => {
    expect(buildProfileUrl('instagram', '@johndoe')).toBe('https://instagram.com/johndoe');
  });

  test('builds Twitter URL', () => {
    expect(buildProfileUrl('twitter', 'johndoe')).toBe('https://twitter.com/johndoe');
  });

  test('builds LinkedIn URL', () => {
    expect(buildProfileUrl('linkedin', 'john-doe')).toBe('https://linkedin.com/in/john-doe');
  });

  test('builds WhatsApp URL with phone', () => {
    expect(buildProfileUrl('whatsapp', '+1234567890')).toBe('https://wa.me/+1234567890');
  });

  test('builds TikTok URL with @', () => {
    expect(buildProfileUrl('tiktok', 'user123')).toBe('https://tiktok.com/@user123');
  });

  test('builds Telegram URL', () => {
    expect(buildProfileUrl('telegram', 'mybot')).toBe('https://t.me/mybot');
  });

  test('builds Snapchat URL', () => {
    expect(buildProfileUrl('snapchat', 'user123')).toBe('https://snapchat.com/add/user123');
  });

  test('handles custom platform as passthrough', () => {
    expect(buildProfileUrl('custom', 'https://example.com')).toBe('https://example.com');
  });

  test('handles discord as passthrough', () => {
    expect(buildProfileUrl('discord', 'user#1234')).toBe('user#1234');
  });
});

describe('validateHandle', () => {
  test('rejects empty handle', () => {
    const result = validateHandle('instagram', '');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('rejects whitespace-only handle', () => {
    const result = validateHandle('instagram', '   ');
    expect(result.valid).toBe(false);
  });

  test('accepts valid Instagram handle', () => {
    expect(validateHandle('instagram', 'john_doe.123').valid).toBe(true);
  });

  test('rejects Instagram handle with special chars', () => {
    expect(validateHandle('instagram', 'john doe!').valid).toBe(false);
  });

  test('accepts valid Twitter handle', () => {
    expect(validateHandle('twitter', 'johndoe').valid).toBe(true);
  });

  test('strips @ before validating', () => {
    expect(validateHandle('twitter', '@johndoe').valid).toBe(true);
  });

  test('accepts valid WhatsApp phone', () => {
    expect(validateHandle('whatsapp', '+1234567890').valid).toBe(true);
  });

  test('rejects invalid WhatsApp phone', () => {
    expect(validateHandle('whatsapp', 'not-a-phone').valid).toBe(false);
  });

  test('accepts valid LinkedIn handle', () => {
    expect(validateHandle('linkedin', 'john-doe-123').valid).toBe(true);
  });

  test('accepts valid custom URL', () => {
    expect(validateHandle('custom', 'https://example.com/profile').valid).toBe(true);
  });

  test('rejects invalid custom URL', () => {
    expect(validateHandle('custom', 'not a url').valid).toBe(false);
  });

  test('accepts valid Discord handle', () => {
    expect(validateHandle('discord', 'user#1234').valid).toBe(true);
  });

  test('rejects overly long Discord handle', () => {
    const longHandle = 'a'.repeat(101);
    expect(validateHandle('discord', longHandle).valid).toBe(false);
  });

  test('accepts valid YouTube handle', () => {
    expect(validateHandle('youtube', 'my-channel').valid).toBe(true);
  });
});

describe('formatHandleForDisplay', () => {
  test('adds @ for Instagram', () => {
    expect(formatHandleForDisplay('instagram', 'johndoe')).toBe('@johndoe');
  });

  test('does not double @', () => {
    expect(formatHandleForDisplay('instagram', '@johndoe')).toBe('@johndoe');
  });

  test('adds @ for Twitter', () => {
    expect(formatHandleForDisplay('twitter', 'johndoe')).toBe('@johndoe');
  });

  test('adds @ for TikTok', () => {
    expect(formatHandleForDisplay('tiktok', 'user123')).toBe('@user123');
  });

  test('no @ for LinkedIn', () => {
    expect(formatHandleForDisplay('linkedin', 'john-doe')).toBe('john-doe');
  });

  test('no @ for WhatsApp', () => {
    expect(formatHandleForDisplay('whatsapp', '+1234567890')).toBe('+1234567890');
  });

  test('passthrough for custom', () => {
    expect(formatHandleForDisplay('custom', 'https://example.com')).toBe('https://example.com');
  });

  test('passthrough for discord', () => {
    expect(formatHandleForDisplay('discord', 'user#1234')).toBe('user#1234');
  });
});

describe('Platform constants', () => {
  const allPlatforms: SocialPlatform[] = [
    'instagram', 'twitter', 'linkedin', 'facebook', 'whatsapp',
    'telegram', 'tiktok', 'snapchat', 'youtube', 'threads',
    'pinterest', 'twitch', 'discord', 'custom',
  ];

  test('PLATFORM_NAMES has all platforms', () => {
    for (const p of allPlatforms) {
      expect(PLATFORM_NAMES[p]).toBeDefined();
      expect(typeof PLATFORM_NAMES[p]).toBe('string');
    }
  });

  test('PLATFORM_COLORS has all platforms', () => {
    for (const p of allPlatforms) {
      expect(PLATFORM_COLORS[p]).toBeDefined();
      expect(PLATFORM_COLORS[p]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  test('PLATFORM_ICONS has all platforms', () => {
    for (const p of allPlatforms) {
      expect(PLATFORM_ICONS[p]).toBeDefined();
      expect(typeof PLATFORM_ICONS[p]).toBe('string');
    }
  });
});
