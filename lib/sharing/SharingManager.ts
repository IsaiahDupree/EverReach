import { Share, Platform } from 'react-native';
import { Linking } from 'react-native';

export interface ShareContent {
  title: string;
  message: string;
  url?: string;
  source?: {
    uri: string;
    width?: number;
    height?: number;
  };
}

export interface SocialShareOptions {
  platform: 'facebook' | 'twitter' | 'instagram' | 'whatsapp' | 'email' | 'sms';
  content: ShareContent;
  hashtagsPreferred?: boolean;
}

export class SharingManager {
  static async share(content: ShareContent): Promise<void> {
    try {
      const message = content.url
        ? `${content.message}\n\n${content.url}`
        : content.message;

      await Share.share(
        {
          message,
          title: content.title,
          url: content.source?.uri,
        },
        {
          dialogTitle: 'Share EverReach',
          excludedActivityTypes: ['com.apple.UIKit.activity.SaveToPasteboard'],
        }
      );
    } catch (error) {
      console.error('[SharingManager] Error sharing:', error);
      throw error;
    }
  }

  static async shareToSocial(options: SocialShareOptions): Promise<void> {
    const { platform, content, hashtagsPreferred } = options;

    try {
      let url = '';
      const text = encodeURIComponent(content.message);
      const urlParam = content.url ? encodeURIComponent(content.url) : '';

      switch (platform) {
        case 'facebook':
          url = `https://www.facebook.com/sharer/sharer.php?u=${urlParam}`;
          break;

        case 'twitter':
          const hashtags = hashtagsPreferred ? '&hashtags=%23EverReach%2C%23CRM' : '';
          url = `https://twitter.com/intent/tweet?text=${text}&url=${urlParam}${hashtags}`;
          break;

        case 'whatsapp':
          url = `whatsapp://send?text=${text}%20${urlParam}`;
          break;

        case 'email':
          url = `mailto:?subject=${encodeURIComponent(content.title)}&body=${text}`;
          break;

        case 'sms':
          url = `sms:?body=${text}`;
          break;

        case 'instagram':
          await this.share(content);
          return;
      }

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await this.share(content);
      }
    } catch (error) {
      console.error(`[SharingManager] Error sharing to ${platform}:`, error);
      throw error;
    }
  }

  static generateShareUrl(deeplink: string, params?: Record<string, string>): string {
    const baseUrl = 'https://everreach.app/share';
    const searchParams = new URLSearchParams({ deeplink, ...(params || {}) });
    return `${baseUrl}?${searchParams.toString()}`;
  }
}
