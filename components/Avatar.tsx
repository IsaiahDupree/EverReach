import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { getAvatarInitials, getAvatarColor } from '@/lib/imageUpload';

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  photoUrl?: string; // New: prioritize user-uploaded photos
  size?: number;
  fontSize?: number;
  warmthColor?: string;
  borderWidth?: number;
}

export default function Avatar({ name, avatarUrl, photoUrl, size = 40, fontSize, warmthColor, borderWidth = 3 }: AvatarProps) {
  // Prioritize photoUrl (new uploads) over avatarUrl (legacy)
  const imageUrl = photoUrl || avatarUrl;
  const calculatedFontSize = fontSize || Math.floor(size * 0.4);
  const hasBorder = !!warmthColor;
  const innerSize = hasBorder ? size - (borderWidth * 2) : size;
  const bgColor = getAvatarColor(name);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    // Reset failure state when URL changes
    setFailed(false);
  }, [imageUrl]);

  const normalizeUrl = (value?: string): string | undefined => {
    if (!value) return undefined;
    const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
    const SUPABASE_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || 'attachments';

    const toPublic = (p: string) => {
      const clean = p.replace(/^\/+/, '');
      return SUPABASE_URL
        ? `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${clean}`
        : `https://utasetfxiqcrnwyfforx.supabase.co/storage/v1/object/public/${SUPABASE_BUCKET}/${clean}`;
    };

    try {
      if (/^https?:\/\//i.test(value)) {
        // Fix old presigned upload URLs
        if (value.includes('/upload/sign/')) {
          const m = value.match(/\/upload\/sign\/(.+?)(\?|$)/);
          if (m && m[1]) return toPublic(m[1].replace(/^attachments\//, ''));
        }
        // Normalize cross-project host mismatch
        const u = new URL(value);
        if (u.hostname.endsWith('supabase.co') && SUPABASE_URL && !u.origin.startsWith(SUPABASE_URL)) {
          return `${SUPABASE_URL}${u.pathname}`;
        }
        return value;
      }
      // Treat as storage path
      return toPublic(value);
    } catch {
      return value;
    }
  };

  const resolvedUrl = normalizeUrl(imageUrl);

  const getContrastingTextColor = (hex: string): string => {
    const toRgb = (h: string) => {
      const c = h.replace('#', '');
      const bigint = parseInt(c, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return [r, g, b];
    };
    const toL = (v: number) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const [r, g, b] = toRgb(hex);
    const L = 0.2126 * toL(r) + 0.7152 * toL(g) + 0.0722 * toL(b);
    const contrastWhite = (1.0 + 0.05) / (L + 0.05);
    const contrastBlack = (L + 0.05) / 0.05;
    return contrastWhite >= contrastBlack ? '#FFFFFF' : '#111827';
  };
  const textColor = '#FFFFFF';

  const avatarContent = resolvedUrl && !failed ? (
    <Image
      source={{ uri: resolvedUrl }}
      style={[
        styles.avatar,
        {
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
        },
      ]}
      onError={() => setFailed(true)}
    />
  ) : (
    <View
      style={[
        styles.avatarPlaceholder,
        {
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: bgColor,
        },
      ]}
    >
      <Text style={[styles.avatarInitials, { fontSize: calculatedFontSize, color: '#FFFFFF' }]}>
        {getAvatarInitials(name)}
      </Text>
    </View>
  );

  if (hasBorder) {
    return (
      <View
        style={[
          styles.borderContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: borderWidth,
            borderColor: warmthColor,
          },
        ]}
      >
        {avatarContent}
      </View>
    );
  }

  return avatarContent;
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: '#E5E5E5',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  borderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});
