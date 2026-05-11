import { useEffect } from "react";
import { useLocalSearchParams, router } from "expo-router";

// Legacy ID-based route — redirects to the support screen.
// All new links use /blog/[slug] via support.tsx.
export default function BlogPostByIdRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();

  useEffect(() => {
    // We no longer have a way to resolve an ID to a slug client-side without
    // an extra network round-trip, so send users back to the support list
    // where they can tap the correct article.
    router.replace("/(tabs)/support");
  }, [id]);

  return null;
}
