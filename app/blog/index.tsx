import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { trpc } from "@/lib/trpc";

const LogoNoBg = require("@/assets/branding/logo-no-bg.png");

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function estimateReadTime(wordCount: number | null): string {
  if (!wordCount) return "3 min read";
  return `${Math.max(1, Math.ceil(wordCount / 250))} min read`;
}

export default function BlogIndexScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const blogQuery = trpc.blog.list.useQuery({ limit: 50, offset: 0 });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await blogQuery.refetch();
    setRefreshing(false);
  }, [blogQuery]);

  const posts = blogQuery.data?.posts ?? [];
  const featured = posts[0] ?? null;
  const rest = posts.slice(1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.logoContainer}
          onPress={() => {
            if (Platform.OS === "web" && typeof window !== "undefined") {
              window.location.href = "/";
            } else {
              router.push("/");
            }
          }}
        >
          <Image source={LogoNoBg} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.logoText}>EverReach</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <Text style={styles.headerNavActive}>Blog</Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => {
              if (Platform.OS === "web" && typeof window !== "undefined") {
                window.location.href = "/auth";
              } else {
                router.push("/auth");
              }
            }}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Page Title */}
      <View style={styles.titleSection}>
        <Text style={styles.pageTitle}>Blog</Text>
        <Text style={styles.pageSubtitle}>
          Relationship intelligence, networking strategies, and professional growth insights.
        </Text>
      </View>

      {/* Loading State */}
      {blogQuery.isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A855F7" />
          <Text style={styles.loadingText}>Loading articles...</Text>
        </View>
      )}

      {/* Error State */}
      {blogQuery.error && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Unable to load articles</Text>
          <TouchableOpacity onPress={() => blogQuery.refetch()}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty State */}
      {posts.length === 0 && !blogQuery.isLoading && !blogQuery.error && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No articles yet</Text>
          <Text style={styles.emptyText}>Check back soon for new content.</Text>
        </View>
      )}

      {/* Featured Article */}
      {featured && (
        <TouchableOpacity
          style={styles.featuredCard}
          onPress={() => {
            if (Platform.OS === "web" && typeof window !== "undefined") {
              window.location.href = `/blog/${featured.slug}`;
            } else {
              router.push(`/blog/${featured.slug}`);
            }
          }}
          activeOpacity={0.8}
        >
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>Featured</Text>
          </View>
          <Text style={styles.featuredTitle}>{featured.title}</Text>
          {featured.excerpt && (
            <Text style={styles.featuredExcerpt} numberOfLines={3}>
              {featured.excerpt}
            </Text>
          )}
          <View style={styles.featuredMeta}>
            {featured.author && (
              <Text style={styles.metaText}>{featured.author}</Text>
            )}
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{formatDate(featured.published_at)}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{estimateReadTime(featured.word_count)}</Text>
          </View>
          {featured.tags && featured.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {featured.tags.slice(0, 4).map((tag: string) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.readMore}>Read article →</Text>
        </TouchableOpacity>
      )}

      {/* Article Grid */}
      {rest.length > 0 && (
        <View style={styles.grid}>
          {rest.map((post: any) => (
            <TouchableOpacity
              key={post.id}
              style={styles.articleCard}
              onPress={() => {
              if (Platform.OS === "web" && typeof window !== "undefined") {
                window.location.href = `/blog/${post.slug}`;
              } else {
                router.push(`/blog/${post.slug}`);
              }
            }}
              activeOpacity={0.8}
            >
              <View style={styles.articleContent}>
                <View style={styles.articleMetaRow}>
                  <Text style={styles.articleDate}>{formatDate(post.published_at)}</Text>
                  <Text style={styles.articleReadTime}>
                    {estimateReadTime(post.word_count)}
                  </Text>
                </View>
                <Text style={styles.articleTitle} numberOfLines={2}>
                  {post.title}
                </Text>
                {post.excerpt && (
                  <Text style={styles.articleExcerpt} numberOfLines={2}>
                    {post.excerpt}
                  </Text>
                )}
                {post.tags && post.tags.length > 0 && (
                  <View style={styles.tagsRow}>
                    {post.tags.slice(0, 3).map((tag: string) => (
                      <View key={tag} style={styles.tagSmall}>
                        <Text style={styles.tagSmallText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerDivider} />
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS === "web" && typeof window !== "undefined") {
              window.location.href = "/";
            } else {
              router.push("/");
            }
          }}
        >
          <Text style={styles.footerLink}>← Back to EverReach</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0F",
  },
  content: {
    paddingBottom: 60,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerLogo: {
    width: 36,
    height: 36,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  headerNavActive: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A855F7",
  },
  signInButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  // Title Section
  titleSection: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  pageTitle: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.5)",
    marginTop: 8,
    lineHeight: 24,
  },

  // Loading / Empty
  loadingContainer: {
    alignItems: "center",
    padding: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
  },
  retryText: {
    fontSize: 14,
    color: "#A855F7",
    fontWeight: "600",
  },

  // Featured Card
  featuredCard: {
    marginHorizontal: 24,
    marginBottom: 40,
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.3)",
    backgroundColor: "rgba(168,85,247,0.05)",
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  featuredBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#A855F7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 16,
  },
  featuredBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 32,
    marginBottom: 12,
  },
  featuredExcerpt: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 24,
    marginBottom: 16,
  },
  featuredMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  metaText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
  },
  metaDot: {
    fontSize: 13,
    color: "rgba(255,255,255,0.2)",
  },
  readMore: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A855F7",
    marginTop: 4,
  },

  // Article Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 16,
    maxWidth: 832,
    alignSelf: "center",
    width: "100%",
  },
  articleCard: {
    flexBasis: "100%",
    maxWidth: "100%",
    ...(Platform.OS === "web"
      ? ({
          flexBasis: "calc(50% - 8px)" as any,
          maxWidth: "calc(50% - 8px)" as any,
        } as any)
      : {}),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    overflow: "hidden",
  },
  articleContent: {
    padding: 20,
  },
  articleMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  articleDate: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
  },
  articleReadTime: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    lineHeight: 22,
    marginBottom: 8,
  },
  articleExcerpt: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 20,
    marginBottom: 12,
  },

  // Tags
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  tag: {
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.3)",
    backgroundColor: "rgba(168,85,247,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 11,
    color: "#A855F7",
    fontWeight: "500",
  },
  tagSmall: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  tagSmallText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: "center",
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  footerDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    width: "100%",
    marginBottom: 24,
  },
  footerLink: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "500",
  },
});
