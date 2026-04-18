import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppSettings } from "@/providers/AppSettingsProvider";
import { router } from "expo-router";
import { BookOpen, ChevronRight, ArrowLeft } from "lucide-react-native";
import { trpc } from "@/lib/trpc";
import { Platform } from "react-native";

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function BlogListScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();
  const [refreshing, setRefreshing] = useState(false);

  const blogQuery = trpc.blog.list.useQuery({ limit: 20, offset: 0 });

  // SEO meta tags for blog listing
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.title = 'Blog | EverReach';
    const setMeta = (name: string, content: string, isProperty?: boolean) => {
      const attr = isProperty ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.content = content;
    };
    setMeta('description', 'Expert articles on relationships, personal growth, and staying connected with the people who matter most.');
    setMeta('og:title', 'Blog | EverReach', true);
    setMeta('og:description', 'Expert articles on relationships, personal growth, and staying connected.', true);
    setMeta('og:url', 'https://www.everreach.app/blog', true);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await blogQuery.refetch();
    setRefreshing(false);
  }, [blogQuery]);

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blog</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {blogQuery.isLoading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading articles...</Text>
          </View>
        )}

        {blogQuery.error && (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>Unable to load articles</Text>
            <TouchableOpacity onPress={() => blogQuery.refetch()}>
              <Text style={[styles.emptyText, { color: theme.colors.primary, marginTop: 8 }]}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {blogQuery.data?.posts && blogQuery.data.posts.length === 0 && (
          <View style={styles.centerContainer}>
            <BookOpen size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>No articles yet</Text>
            <Text style={styles.emptyText}>
              Request your first article to get expert content delivered to your app.
            </Text>
          </View>
        )}

        {blogQuery.data?.posts?.map((post: any) => (
          <TouchableOpacity
            key={post.id}
            style={styles.blogCard}
            onPress={() => router.push(`/blog/${post.id}`)}
          >
            <View style={styles.blogCardContent}>
              <Text style={styles.blogTitle} numberOfLines={2}>
                {post.title}
              </Text>
              {post.excerpt && (
                <Text style={styles.blogExcerpt} numberOfLines={2}>
                  {post.excerpt}
                </Text>
              )}
              <View style={styles.blogMeta}>
                {post.tags?.slice(0, 3).map((tag: string) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
                <Text style={styles.blogDate}>{formatDate(post.published_at)}</Text>
              </View>
            </View>
            <ChevronRight size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ))}
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
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.text,
    },
    requestButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    requestButtonText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "600",
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    centerContainer: {
      alignItems: "center",
      padding: 40,
      gap: 8,
    },
    loadingText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginTop: 12,
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    blogCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 0.5,
      borderColor: theme.colors.border,
    },
    blogCardContent: {
      flex: 1,
      marginRight: 8,
    },
    blogTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 4,
    },
    blogExcerpt: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: 8,
    },
    blogMeta: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 6,
    },
    tag: {
      backgroundColor: theme.colors.primary + "15",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    tagText: {
      fontSize: 11,
      color: theme.colors.primary,
      fontWeight: "500",
    },
    blogDate: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginLeft: 4,
    },
  });
}
