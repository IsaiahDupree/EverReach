import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppSettings } from "@/providers/AppSettingsProvider";
import { router } from "expo-router";
import { ArrowLeft, Send } from "lucide-react-native";
import { trpc } from "@/lib/trpc";

export default function BlogRequestScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const requestMutation = trpc.blog.request.useMutation({
    onSuccess: (data) => {
      const msg = `Your article request has been submitted! Expected delivery: ${new Date(data.estimated_delivery).toLocaleDateString()}`;
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        Alert.alert("Request Submitted", msg);
      }
      router.back();
    },
    onError: (error) => {
      const msg = error.message || "Failed to submit request";
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        Alert.alert("Error", msg);
      }
      setSubmitting(false);
    },
  });

  const handleSubmit = () => {
    if (!topic.trim()) {
      const msg = "Please enter a topic for your article request.";
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        Alert.alert("Topic Required", msg);
      }
      return;
    }

    setSubmitting(true);
    requestMutation.mutate({
      topic: topic.trim(),
      keywords: keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    });
  };

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Article</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.description}>
          Request expert content on any topic. Our team will create a comprehensive article
          tailored to your needs.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Topic *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., AI visibility optimization strategies"
            placeholderTextColor={theme.colors.textSecondary}
            value={topic}
            onChangeText={setTopic}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Keywords (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., SEO, GEO, answer engine (comma separated)"
            placeholderTextColor={theme.colors.textSecondary}
            value={keywords}
            onChangeText={setKeywords}
          />
          <Text style={styles.hint}>Separate keywords with commas</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Send size={18} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Request</Text>
            </>
          )}
        </TouchableOpacity>
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
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 60,
    },
    description: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      lineHeight: 22,
      marginBottom: 24,
    },
    field: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      padding: 14,
      fontSize: 15,
      color: theme.colors.text,
      minHeight: 48,
      textAlignVertical: "top",
    },
    hint: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    submitButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      borderRadius: 10,
      marginTop: 12,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
  });
}
