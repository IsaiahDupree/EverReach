/**
 * Photo Download and Optimization Utilities
 * 
 * Functions for downloading external contact photos and optimizing them for storage
 */

import sharp from 'sharp';

export interface PhotoOptions {
  size?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

export const DEFAULT_PHOTO_OPTIONS: PhotoOptions = {
  size: 400,
  quality: 80,
  format: 'webp',
};

/**
 * Download and optimize a photo from an external URL
 */
export async function downloadAndOptimizePhoto(
  url: string,
  options?: PhotoOptions
): Promise<Buffer> {
  const { size, quality, format } = { ...DEFAULT_PHOTO_OPTIONS, ...options };

  try {
    // Download image with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'EverReach/1.0 (Contact Photo Sync)',
        'Accept': 'image/*',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    // Get buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Optimize with sharp
    const optimized = await optimizeImageBuffer(buffer, { size, quality, format });

    return optimized;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Download timeout after 30 seconds');
    }
    throw error;
  }
}

/**
 * Optimize an image buffer
 */
export async function optimizeImageBuffer(
  buffer: Buffer,
  options?: PhotoOptions
): Promise<Buffer> {
  const { size, quality, format } = { ...DEFAULT_PHOTO_OPTIONS, ...options };

  try {
    let sharpInstance = sharp(buffer)
      .resize(size, size, {
        fit: 'cover',
        position: 'center',
      })
      .rotate(); // Auto-rotate based on EXIF

    // Convert to desired format
    switch (format) {
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality });
        break;
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ quality, mozjpeg: true });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ quality, compressionLevel: 9 });
        break;
    }

    return await sharpInstance.toBuffer();
  } catch (error: any) {
    throw new Error(`Image optimization failed: ${error.message}`);
  }
}

/**
 * Generate storage path for contact photo
 */
export function getContactPhotoStoragePath(
  contactId: string,
  format: 'webp' | 'jpeg' | 'png' = 'webp'
): string {
  return `contacts/${contactId}/avatar.${format}`;
}

/**
 * Get file extension from URL
 */
export function getFileExtension(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Validate if URL is a valid image URL
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Must be http or https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }

    // Check for common image extensions
    const ext = getFileExtension(url);
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    
    if (ext && validExtensions.includes(ext)) {
      return true;
    }

    // Some URLs don't have extensions (e.g., Google Photos)
    // So also check for known image hosting domains
    const imageHosts = [
      'googleusercontent.com',
      'graph.microsoft.com',
      'graph.facebook.com',
      'gravatar.com',
      'cloudinary.com',
    ];

    return imageHosts.some(host => urlObj.hostname.includes(host));
  } catch {
    return false;
  }
}

/**
 * Calculate estimated file size reduction
 */
export function estimateSizeReduction(
  originalSize: number,
  format: 'webp' | 'jpeg' | 'png' = 'webp'
): number {
  // Rough estimates based on typical compression ratios
  const reductionFactors = {
    webp: 0.3,  // WebP typically 70% smaller
    jpeg: 0.5,  // JPEG typically 50% smaller
    png: 0.7,   // PNG typically 30% smaller
  };

  return Math.floor(originalSize * reductionFactors[format]);
}
