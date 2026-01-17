/**
 * Deep Linking Utilities
 * Handles opening social media apps with fallback to web
 */

import { Linking, Platform } from 'react-native';
import { SocialPlatform, PLATFORM_DEEP_LINKS, SocialMediaChannel } from '@/types/socialChannels';

/**
 * Try to open a social media channel
 * Attempts deep link first, falls back to web URL if app not installed
 */
export async function openSocialChannel(channel: SocialMediaChannel): Promise<boolean> {
  const cleanHandle = channel.handle.replace(/^@/, '');
  
  // Get deep link for platform
  const deepLinkFn = PLATFORM_DEEP_LINKS[channel.platform];
  if (!deepLinkFn) {
    console.warn(`[deepLinking] No deep link handler for platform: ${channel.platform}`);
    return openUrl(channel.url);
  }
  
  const deepLink = deepLinkFn(cleanHandle);
  
  try {
    // Check if the app is installed (deep link can be opened)
    const canOpen = await Linking.canOpenURL(deepLink);
    
    if (canOpen) {
      console.log(`[deepLinking] Opening ${channel.platform} app:`, deepLink);
      await Linking.openURL(deepLink);
      return true;
    } else {
      console.log(`[deepLinking] ${channel.platform} app not installed, opening web:`, channel.url);
      return openUrl(channel.url);
    }
  } catch (error) {
    console.error(`[deepLinking] Error opening ${channel.platform}:`, error);
    // Fallback to web URL
    return openUrl(channel.url);
  }
}

/**
 * Open a URL (web fallback)
 */
async function openUrl(url: string): Promise<boolean> {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    } else {
      console.error('[deepLinking] Cannot open URL:', url);
      return false;
    }
  } catch (error) {
    console.error('[deepLinking] Error opening URL:', error);
    return false;
  }
}

/**
 * Open email client
 */
export async function openEmail(email: string, subject?: string, body?: string): Promise<boolean> {
  let url = `mailto:${email}`;
  
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  
  return openUrl(url);
}

/**
 * Open phone dialer
 */
export async function openPhone(phone: string): Promise<boolean> {
  // Remove non-numeric characters except + for international format
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // Use standard tel: scheme for all platforms
  // Note: telprompt: was deprecated and doesn't work reliably on iOS
  const url = `tel:${cleanPhone}`;
  
  return openUrl(url);
}

/**
 * Open SMS client
 */
export async function openSMS(phone: string, message?: string): Promise<boolean> {
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  let url = `sms:${cleanPhone}`;
  if (message && Platform.OS === 'ios') {
    url += `&body=${encodeURIComponent(message)}`;
  } else if (message) {
    url += `?body=${encodeURIComponent(message)}`;
  }
  
  return openUrl(url);
}

/**
 * Test if a deep link can be opened (for debugging)
 */
export async function canOpenDeepLink(platform: SocialPlatform, handle: string): Promise<boolean> {
  const cleanHandle = handle.replace(/^@/, '');
  const deepLinkFn = PLATFORM_DEEP_LINKS[platform];
  
  if (!deepLinkFn) return false;
  
  const deepLink = deepLinkFn(cleanHandle);
  
  try {
    return await Linking.canOpenURL(deepLink);
  } catch (error) {
    console.error(`[deepLinking] Error checking ${platform}:`, error);
    return false;
  }
}

/**
 * Get all available communication methods for testing
 */
export async function getAvailablePlatforms(channels: SocialMediaChannel[]): Promise<SocialPlatform[]> {
  const available: SocialPlatform[] = [];
  
  for (const channel of channels) {
    const canOpen = await canOpenDeepLink(channel.platform, channel.handle);
    if (canOpen) {
      available.push(channel.platform);
    }
  }
  
  return available;
}
