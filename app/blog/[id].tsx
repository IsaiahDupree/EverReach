import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppSettings } from "@/providers/AppSettingsProvider";
import { useLocalSearchParams, router } from "expo-router";
import { ArrowLeft, Calendar, User } from "lucide-react-native";
import { trpc } from "@/lib/trpc";

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function BlogPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();
  const { width } = useWindowDimensions();

  const postQuery = trpc.blog.getById.useQuery({ id: id! }, { enabled: !!id });

  // Inject SEO meta tags on web for Google indexing
  useEffect(() => {
    if (Platform.OS !== 'web' || !postQuery.data) return;
    const post = postQuery.data;
    document.title = `${post.title} | EverReach Blog`;

    const setMeta = (name: string, content: string, isProperty?: boolean) => {
      const attr = isProperty ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    const description = post.excerpt || (post.content_html?.replace(/<[^>]*>/g, '').slice(0, 160) + '...');
    setMeta('description', description);
    setMeta('og:title', post.title, true);
    setMeta('og:description', description, true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', `https://www.everreach.app/blog/${id}`, true);
    setMeta('twitter:card', 'summary');
    setMeta('twitter:title', post.title);
    setMeta('twitter:description', description);

    // JSON-LD structured data for Google
    let ldScript = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement | null;
    if (!ldScript) {
      ldScript = document.createElement('script');
      ldScript.type = 'application/ld+json';
      document.head.appendChild(ldScript);
    }
    ldScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description,
      author: post.author ? { '@type': 'Person', name: post.author } : undefined,
      datePublished: post.published_at,
      url: `https://www.everreach.app/blog/${id}`,
      publisher: { '@type': 'Organization', name: 'EverReach' },
    });
  }, [postQuery.data, id]);

  const styles = createStyles(theme);

  if (postQuery.isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (postQuery.error || !postQuery.data) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Article not found</Text>
        </View>
      </View>
    );
  }

  const post = postQuery.data;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Article
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{post.title}</Text>

        <View style={styles.metaRow}>
          {post.author && (
            <View style={styles.metaItem}>
              <User size={14} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}>{post.author}</Text>
            </View>
          )}
          {post.published_at && (
            <View style={styles.metaItem}>
              <Calendar size={14} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}>{formatDate(post.published_at)}</Text>
            </View>
          )}
        </View>

        {post.tags && post.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {post.tags.map((tag: string) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {post.content_html && Platform.OS === 'web' ? (
          <div
            style={{ color: theme.colors.text, fontSize: 16, lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: post.content_html }}
          />
        ) : (
          <Text style={styles.bodyText}>
            {post.excerpt || post.content_html?.replace(/<[^>]*>/g, '') || "No content available."}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: theme.colors.text,
      flex: 1,
      textAlign: "center",
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 60,
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: theme.colors.text,
      lineHeight: 34,
      marginBottom: 12,
    },
    metaRow: {
      flexDirection: "row",
      gap: 16,
      marginBottom: 12,
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    metaText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    tagsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 20,
    },
    tag: {
      backgroundColor: theme.colors.primary + "15",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    tagText: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: "500",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    errorText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    bodyText: {
      fontSize: 16,
      color: theme.colors.text,
      lineHeight: 26,
    },
  });
}
