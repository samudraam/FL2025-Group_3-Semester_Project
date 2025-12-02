import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CommunitySummary, communitiesAPI } from "../../services/api";

const CommunityPlaceholder = () => {
  const params = useLocalSearchParams<{ slug: string | string[] }>();
  const [community, setCommunity] = useState<CommunitySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const identifier = useMemo(() => {
    if (Array.isArray(params.slug)) {
      return params.slug[0];
    }
    return params.slug;
  }, [params.slug]);

  useEffect(() => {
    const loadCommunity = async () => {
      if (!identifier) {
        setError("Community not found.");
        setIsLoading(false);
        return;
      }
      try {
        const response = await communitiesAPI.getDetails(identifier);
        if (!response.success || !response.community) {
          throw new Error(response.error || "Community not found.");
        }
        setCommunity(response.community);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load community."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadCommunity();
  }, [identifier]);

  const handleBackPress = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {community?.name || identifier || "Community"}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color="#0E5B37" />
            <Text style={styles.stateText}>Loading community...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={styles.communityName}>{community?.name}</Text>
            <Text style={styles.communitySummary}>
              This page is under construction. Soon you will be able to explore
              posts, events, and members of {community?.name}.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default CommunityPlaceholder;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#E2EFE9",
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#0E5B37",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
  },
  content: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  communityName: {
    fontSize: 26,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
    marginBottom: 12,
  },
  communitySummary: {
    fontSize: 16,
    fontFamily: "DMSans_400Regular",
    color: "#4A4A4A",
    lineHeight: 22,
  },
  stateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  stateText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: "DMSans_500Medium",
    color: "#0E5B37",
    textAlign: "center",
  },
});
