import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  CommunityMembershipSummary,
  CommunitySummary,
  communitiesAPI,
  postsAPI,
} from "../../services/api";
import PostCard, { type Post } from "../../components/PostCard";
import CommunityScreenLayout from "../../components/community/CommunityScreenLayout";
import CommunityScreenHeader from "../../components/community/CommunityScreenHeader";
import CommunityHeroCard from "../../components/community/CommunityHeroCard";
import CommunitySummaryCard from "../../components/community/CommunitySummaryCard";
import CommunityFeedHeader from "../../components/community/CommunityFeedHeader";
import CreatePostModal from "../../components/CreatePostModal";

const CommunityScreen = () => {
  const params = useLocalSearchParams<{ slug: string | string[] }>();
  const [community, setCommunity] = useState<CommunitySummary | null>(null);
  const [membership, setMembership] =
    useState<CommunityMembershipSummary | null>(null);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [isCommunityLoading, setIsCommunityLoading] = useState(true);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const membershipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const identifier = useMemo(() => {
    if (Array.isArray(params.slug)) {
      return params.slug[0];
    }
    return params.slug;
  }, [params.slug]);

  const loadCommunity = useCallback(async () => {
    if (!identifier) {
      setCommunityError("Community not found.");
      setCommunity(null);
      setIsCommunityLoading(false);
      return;
    }
    setCommunityError(null);
    setIsCommunityLoading(true);
    try {
      const response = await communitiesAPI.getDetails(identifier);
      if (!response.success || !response.community) {
        throw new Error(response.error || "Community could not be loaded.");
      }
      setCommunity(response.community);
      setMembership(response.membership ?? null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load community.";
      setCommunity(null);
      setMembership(null);
      setCommunityError(message);
    } finally {
      setIsCommunityLoading(false);
    }
  }, [identifier]);

  const loadFeed = useCallback(async () => {
    if (!identifier) {
      setFeedError("Community not found.");
      setPosts([]);
      setIsFeedLoading(false);
      return;
    }
    setFeedError(null);
    setIsFeedLoading(true);
    try {
      const response = await postsAPI.getCommunityPosts(identifier);
      if (!response?.success) {
        throw new Error(response?.error || "Unable to fetch feed.");
      }
      setPosts(response.posts ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load feed.";
      setPosts([]);
      setFeedError(message);
    } finally {
      setIsFeedLoading(false);
    }
  }, [identifier]);

  useEffect(() => {
    loadCommunity();
    loadFeed();
  }, [loadCommunity, loadFeed]);

  useEffect(() => {
    return () => {
      if (membershipTimer.current) {
        clearTimeout(membershipTimer.current);
      }
    };
  }, []);

  const handleBackPress = useCallback(() => {
    router.back();
  }, []);

  const canPostToCommunity = useMemo(() => {
    if (!community?.visibility) {
      return false;
    }
    if (community.visibility === "public") {
      return true;
    }
    return membership?.status === "active";
  }, [community?.visibility, membership?.status]);

  const composeSubtitle = useMemo(() => {
    if (canPostToCommunity) {
      return "Share updates with your members";
    }
    if (community?.visibility === "private") {
      return "Only members can post in this private community.";
    }
    return "Posting is unavailable right now.";
  }, [canPostToCommunity, community?.visibility]);

  const composeBlockedMessage = useMemo(() => {
    if (canPostToCommunity) {
      return undefined;
    }
    return "Join this private community to share updates.";
  }, [canPostToCommunity]);

  const handleComposePress = useCallback(() => {
    setIsCreateModalVisible(true);
  }, []);

  const handleCloseComposeModal = useCallback(() => {
    setIsCreateModalVisible(false);
  }, []);

  const handlePostCreated = useCallback(() => {
    setIsCreateModalVisible(false);
    loadFeed();
  }, [loadFeed]);

  const handleMembershipToggle = useCallback(() => {
    if (!community || isActionLoading) {
      return;
    }
    setIsActionLoading(true);
    membershipTimer.current = setTimeout(() => {
      setMembership((previous) => {
        const wasMember = previous?.status === "active";
        setCommunity((current) => {
          if (!current) {
            return current;
          }
          const delta = wasMember ? -1 : 1;
          return {
            ...current,
            memberCount: Math.max(0, (current.memberCount ?? 0) + delta),
          };
        });
        if (wasMember) {
          return null;
        }
        return {
          ...(previous ?? {}),
          status: "active",
          role: previous?.role ?? "member",
          joinedAt: previous?.joinedAt ?? new Date().toISOString(),
        };
      });
      setIsActionLoading(false);
    }, 350);
  }, [community, isActionLoading]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadCommunity(), loadFeed()]);
    setRefreshing(false);
  }, [loadCommunity, loadFeed]);

  const handlePostUpdated = useCallback(() => {
    loadFeed();
  }, [loadFeed]);

  const renderPostItem = useCallback(
    ({ item }: { item: Post }) => (
      <View style={styles.postCard}>
        <PostCard
          post={item}
          onPostDeleted={loadFeed}
          onPostUpdated={handlePostUpdated}
        />
      </View>
    ),
    [loadFeed, handlePostUpdated]
  );

  const keyExtractor = useCallback((item: Post) => item._id, []);

  const isMember = membership?.status === "active";
  const isPending = membership?.status === "pending";

  const listHeader = useMemo(() => {
    return (
      <View style={styles.headerContainer}>
        <CommunityScreenHeader
          title={community?.name || identifier || "Community"}
          subtitle={
            community?.visibility === "private"
              ? "Private group"
              : "Public group"
          }
          onBackPress={handleBackPress}
        />
        <CommunityHeroCard coverImageUrl={community?.coverImageUrl} />
        <CommunitySummaryCard
          name={community?.name}
          description={community?.description}
          visibility={community?.visibility}
          joinPolicy={community?.joinPolicy}
          memberCount={community?.memberCount}
          isMember={!!isMember}
          isPending={!!isPending}
          onPrimaryAction={handleMembershipToggle}
          isActionLoading={isActionLoading}
        />
        <CommunityFeedHeader
          onPressCompose={handleComposePress}
          subtitle={composeSubtitle}
          canCompose={canPostToCommunity}
          disabledMessage={composeBlockedMessage}
        />
      </View>
    );
  }, [
    community,
    identifier,
    handleBackPress,
    handleMembershipToggle,
    composeBlockedMessage,
    composeSubtitle,
    handleComposePress,
    isMember,
    isPending,
    isActionLoading,
    canPostToCommunity,
  ]);

  const listEmptyComponent = useMemo(() => {
    if (isFeedLoading) {
      return <FeedSkeleton />;
    }
    if (feedError) {
      return (
        <FeedStateMessage title="Unable to load posts" subtitle={feedError} />
      );
    }
    return (
      <FeedStateMessage
        title="No posts yet"
        subtitle="Be the first to share an update with this community."
      />
    );
  }, [feedError, isFeedLoading]);

  const content = useMemo(() => {
    if (isCommunityLoading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#0E5B37" />
          <Text style={styles.stateText}>Loading community...</Text>
        </View>
      );
    }
    if (communityError) {
      return (
        <FeedStateMessage
          title="Something went wrong"
          subtitle={communityError}
        />
      );
    }
    if (!community) {
      return (
        <FeedStateMessage
          title="Community unavailable"
          subtitle="We could not fetch this group. Please try again later."
        />
      );
    }
    return (
      <FlatList
        data={posts}
        keyExtractor={keyExtractor}
        renderItem={renderPostItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmptyComponent}
        ListFooterComponent={<View style={styles.footerSpacer} />}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        windowSize={5}
        initialNumToRender={3}
        maxToRenderPerBatch={5}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
      />
    );
  }, [
    community,
    communityError,
    handleRefresh,
    isCommunityLoading,
    keyExtractor,
    listEmptyComponent,
    listHeader,
    posts,
    refreshing,
    renderPostItem,
  ]);

  return (
    <CommunityScreenLayout
      backgroundColor="#F0F2EF"
      contentStyle={styles.screenContainer}
      //footer={<CommunityBottomNav activeTab="play" />}
    >
      {content}
      <CreatePostModal
        visible={isCreateModalVisible}
        onClose={handleCloseComposeModal}
        onPostCreated={handlePostCreated}
        communitySlug={identifier ?? undefined}
      />
    </CommunityScreenLayout>
  );
};

const FeedSkeleton = () => {
  return (
    <View style={styles.skeletonWrapper}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View style={styles.skeletonCard} key={`skeleton-${index}`}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonBody}>
            <View style={styles.skeletonLineShort} />
            <View style={styles.skeletonLineLong} />
            <View style={styles.skeletonLineLonger} />
          </View>
        </View>
      ))}
    </View>
  );
};

interface FeedStateMessageProps {
  title: string;
  subtitle: string;
}

const FeedStateMessage = ({ title, subtitle }: FeedStateMessageProps) => (
  <View style={styles.stateContainer}>
    <Text style={styles.stateTitle}>{title}</Text>
    <Text style={styles.stateText}>{subtitle}</Text>
  </View>
);

export default CommunityScreen;

const styles = StyleSheet.create({
  screenContainer: {
    backgroundColor: "#F0F2EF",
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  listContent: {
    paddingBottom: 32,
  },
  postCard: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  footerSpacer: {
    height: 32,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  stateTitle: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
    marginBottom: 8,
    textAlign: "center",
  },
  stateText: {
    fontSize: 16,
    fontFamily: "DMSans_500Medium",
    color: "#4A4A4A",
    textAlign: "center",
  },
  skeletonWrapper: {
    paddingHorizontal: 20,
  },
  skeletonCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    opacity: 0.6,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#D7E3DB",
    marginRight: 12,
  },
  skeletonBody: {
    flex: 1,
  },
  skeletonLineShort: {
    width: "40%",
    height: 12,
    borderRadius: 8,
    backgroundColor: "#DDE6E0",
    marginBottom: 8,
  },
  skeletonLineLong: {
    width: "85%",
    height: 10,
    borderRadius: 8,
    backgroundColor: "#E2EBE4",
    marginBottom: 6,
  },
  skeletonLineLonger: {
    width: "70%",
    height: 10,
    borderRadius: 8,
    backgroundColor: "#E8F0EA",
  },
});
