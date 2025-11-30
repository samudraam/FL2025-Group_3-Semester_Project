import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ListRenderItem,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { UserCommunitySummary, communitiesAPI } from "../../services/api";
import { Globe, GlobeLock } from "lucide-react-native";
type MyCommunitiesProps = {
  onCreatePress?: () => void;
};

type CommunityCardProps = {
  community: UserCommunitySummary;
  onNavigate: (slug: string) => void;
};

/**
 * Displays a community tile matching the provided mock design.
 */
const CommunityCard = React.memo(
  ({ community, onNavigate }: CommunityCardProps) => {
    const { slug, name, coverImageUrl, memberCount, visibility, membership } =
      community;

    const roleLabel = membership?.role ?? "member";
    const visibilityLabel = visibility === "private" ? "Private" : "Public";

    const handlePress = useCallback(() => {
      if (!slug) {
        return;
      }
      onNavigate(slug);
    }, [onNavigate, slug]);

    return (
      <Pressable
        style={styles.card}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`Open ${name} community`}
      >
        <Image
          source={
            coverImageUrl
              ? { uri: coverImageUrl }
              : require("../../assets/court.png")
          }
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{name}</Text>
            <View style={styles.visibilityPill}>
              {visibility === "public" ? <Globe size={16} color="#0E5B37" /> : <GlobeLock size={16} color="#0E5B37" />}
              <Text style={styles.visibilityText}>{visibilityLabel}</Text>
            </View>
          </View>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, styles.roleBadge]}>
              <Text style={styles.badgeText}>{roleLabel}</Text>
            </View>
            <View style={[styles.badge, styles.membersBadge]}>
              <Text style={styles.badgeText}>{memberCount} Members</Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }
);

CommunityCard.displayName = "CommunityCard";

/**
 * Lists the authenticated user's communities with navigation shortcuts.
 */
const MyCommunitiesComponent = ({ onCreatePress }: MyCommunitiesProps) => {
  const [communities, setCommunities] = useState<UserCommunitySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Fetches the communities for the current user.
   */
  const fetchCommunities = useCallback(async () => {
    try {
      setError(null);
      const response = await communitiesAPI.getMine();
      if (!response.success) {
        throw new Error(response.error || "Failed to load communities.");
      }
      setCommunities(response.communities || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load communities."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  const handleNavigate = useCallback((slug: string) => {
    router.push(`/communities/${slug}`);
  }, []);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    fetchCommunities();
  }, [fetchCommunities]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCommunities();
    setRefreshing(false);
  }, [fetchCommunities]);

  const renderItem = useCallback<ListRenderItem<UserCommunitySummary>>(
    ({ item }) => (
      <CommunityCard community={item} onNavigate={handleNavigate} />
    ),
    [handleNavigate]
  );

  const keyExtractor = useCallback(
    (item: UserCommunitySummary) => item.id || item.slug,
    []
  );

  const listContentStyle = useMemo(
    () => ({ paddingHorizontal: 20, paddingBottom: 16 }),
    []
  );

  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator color="#0E5B37" size="large" />
        <Text style={styles.stateText}>Loading your communities...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateText}>{error}</Text>
        <Pressable
          style={styles.secondaryButton}
          onPress={handleRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry loading communities"
        >
          <Text style={styles.secondaryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (!communities.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>My Communities</Text>
        <Text style={styles.emptySubtitle}>
          You have not joined any communities yet. Start one or accept an invite
          to see it here.
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={onCreatePress}
          accessibilityRole="button"
          accessibilityLabel="Create a new community"
        >
          <Text style={styles.primaryButtonText}>Create Community</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>My Communities</Text>
        <Pressable
          style={styles.secondaryButton}
          onPress={onCreatePress}
          accessibilityRole="button"
          accessibilityLabel="Create a new community"
        >
          <Text style={styles.secondaryButtonText}>Create</Text>
        </Pressable>
      </View>
      <FlatList
        data={communities}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={listContentStyle}
        scrollEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const MyCommunities = React.memo(MyCommunitiesComponent);
MyCommunities.displayName = "MyCommunities";

export default MyCommunities;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: "100%",
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginBottom: 16,
    overflow: "hidden",
    borderColor: "#E3F2FD",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 3,
  },
  cardImage: {
    width: "100%",
    height: 160,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
    flex: 1,
    marginRight: 12,
  },
  visibilityPill: {
    gap: 4,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  visibilityText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    color: "#0E5B37",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  badgeRow: {
    flexDirection: "row",
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 10,
  },
  roleBadge: {
    backgroundColor: "#D4F5E9",
  },
  membersBadge: {
    backgroundColor: "#FFF2D6",
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    color: "#0E5B37",
  },
  stateContainer: {
    padding: 32,
    alignItems: "center",
  },
  stateText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: "DMSans_500Medium",
    color: "#0E5B37",
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: "#0E5B37",
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    textAlign: "center",
  },
  secondaryButton: {
    borderColor: "#0E5B37",
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#0E5B37",
  },
  emptyContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 12,
    padding: 24,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: "DMSans_400Regular",
    color: "#4A4A4A",
    marginBottom: 16,
    lineHeight: 22,
  },
});
