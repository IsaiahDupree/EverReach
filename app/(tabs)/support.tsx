import React, { useCallback, useState } from "react";
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
import { BookOpen, Plus, ChevronRight, HelpCircle, MessageSquare } from "lucide-react-native";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/providers/AuthProviderV2";

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const blogQuery = trpc.blog.list.useQuery({ limit: 20, offset: 0 });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await blogQuery.refetch();
    setRefreshing(false);
  }, [blogQuery]);

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Support</Text>
        <TouchableOpacity
          style={styles.requestButton}
          onPress={() => router.push("/blog/request")}
        >
          <Plus size={18} color="#fff" />
          <Text style={styles.requestButtonText}>Request Article</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Blog Posts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BookOpen size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Latest Articles</Text>
          </View>

          {blogQuery.isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading articles...</Text>
            </View>
          )}

          {blogQuery.error && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Unable to load articles</Text>
              <TouchableOpacity onPress={() => blogQuery.refetch()}>
                <Text style={[styles.emptyText, { color: theme.colors.primary }]}>Tap to retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {blogQuery.data?.posts && blogQuery.data.posts.length === 0 && (
            <View style={styles.emptyContainer}>
              <BookOpen size={40} color={theme.colors.textSecondary} />
              <Text style={styles.emptyTitle}>No articles yet</Text>
              <Text style={styles.emptyText}>
                Request your first article to get started with expert content.
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
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <HelpCircle size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Help & Resources</Text>
          </View>

          <TouchableOpacity style={styles.helpCard}>
            <MessageSquare size={20} color={theme.colors.primary} />
            <View style={styles.helpCardContent}>
              <Text style={styles.helpCardTitle}>Contact Support</Text>
              <Text style={styles.helpCardDesc}>Get help with your account</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.helpCard}>
            <BookOpen size={20} color={theme.colors.primary} />
            <View style={styles.helpCardContent}>
              <Text style={styles.helpCardTitle}>Getting Started Guide</Text>
              <Text style={styles.helpCardDesc}>Learn how to use EverReach</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
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
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: theme.colors.text,
    },
    requestButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    requestButtonText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "600",
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    section: {
      paddingHorizontal: 20,
      paddingTop: 24,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
    },
    loadingContainer: {
      alignItems: "center",
      padding: 32,
      gap: 8,
    },
    loadingText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    emptyContainer: {
      alignItems: "center",
      padding: 32,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginTop: 8,
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
    helpCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 0.5,
      borderColor: theme.colors.border,
      gap: 12,
    },
    helpCardContent: {
      flex: 1,
    },
    helpCardTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.text,
    },
    helpCardDesc: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
  });
}
