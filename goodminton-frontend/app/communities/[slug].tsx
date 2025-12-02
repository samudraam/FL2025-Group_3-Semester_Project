import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  CommunityMembershipSummary,
  CommunitySummary,
  CommunityEventSummary,
  communitiesAPI,
  communityEventsAPI,
  postsAPI,
  usersAPI,
} from "../../services/api";
import PostCard, { type Post } from "../../components/PostCard";
import CommunityEventCard from "../../components/CommunityEventCard";
import CommunityScreenLayout from "../../components/community/CommunityScreenLayout";
import CommunityScreenHeader from "../../components/community/CommunityScreenHeader";
import CommunityHeroCard from "../../components/community/CommunityHeroCard";
import CommunitySummaryCard from "../../components/community/CommunitySummaryCard";
import CommunityFeedHeader from "../../components/community/CommunityFeedHeader";
import CreatePostModal from "../../components/CreatePostModal";
import EditCommunityModal from "../../components/EditCommunityModal";
import EditEventModal from "../../components/EditEventModal";
import { useAuth } from "../../services/authContext";

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
  const [events, setEvents] = useState<CommunityEventSummary[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditCommunityVisible, setIsEditCommunityVisible] = useState(false);
  const [isEventLoading, setIsEventLoading] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);
  const [userEventRsvps, setUserEventRsvps] = useState<Set<string>>(new Set());
  const [rsvpLoadingId, setRsvpLoadingId] = useState<string | null>(null);
  const [eventBeingEdited, setEventBeingEdited] =
    useState<CommunityEventSummary | null>(null);
  const [isEditEventVisible, setIsEditEventVisible] = useState(false);
  const [eventDeleteId, setEventDeleteId] = useState<string | null>(null);
  const membershipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user: authUser } = useAuth();

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

  const loadEvents = useCallback(async () => {
    if (!identifier) {
      setEventError("Community not found.");
      setEvents([]);
      setIsEventLoading(false);
      return;
    }
    setEventError(null);
    setIsEventLoading(true);
    try {
      const response = await communityEventsAPI.list(identifier);
      if (!response?.success) {
        throw new Error(response?.error || "Unable to fetch events.");
      }
      setEvents(response.events ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load events.";
      setEvents([]);
      setEventError(message);
    } finally {
      setIsEventLoading(false);
    }
  }, [identifier]);

  const loadUserRsvps = useCallback(async () => {
    if (!authUser) {
      setUserEventRsvps(new Set());
      return;
    }
    try {
      const response = await usersAPI.getEventRsvps();
      if (response?.success && Array.isArray(response.rsvps)) {
        setUserEventRsvps(
          new Set(response.rsvps.map((entry) => entry.eventId))
        );
      }
    } catch (error) {
      console.warn("Load event RSVPs error:", error);
    }
  }, [authUser]);

  useEffect(() => {
    loadCommunity();
    loadFeed();
    loadEvents();
  }, [loadCommunity, loadFeed, loadEvents]);

  useEffect(() => {
    loadUserRsvps();
  }, [loadUserRsvps]);

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
    loadEvents();
    loadUserRsvps();
  }, [loadFeed, loadEvents, loadUserRsvps]);

  const handleMembershipToggle = useCallback(() => {
    if (!community || isActionLoading) {
      return;
    }
    if (membership?.role === "owner") {
      Alert.alert(
        "Owners cannot leave",
        "Transfer ownership before leaving this community."
      );
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
  }, [community, isActionLoading, membership?.role]);

  const handleOpenEditCommunity = useCallback(() => {
    if (!community) {
      return;
    }
    setIsEditCommunityVisible(true);
  }, [community]);

  const handleCloseEditCommunity = useCallback(() => {
    setIsEditCommunityVisible(false);
  }, []);

  const handleCommunityUpdated = useCallback(
    (updatedCommunity: CommunitySummary) => {
      setCommunity(updatedCommunity);
      loadCommunity();
    },
    [loadCommunity]
  );

  const handleCommunityDeleted = useCallback(() => {
    setIsEditCommunityVisible(false);
    setCommunity(null);
    setMembership(null);
    router.replace("/tabs/community");
  }, [router]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadCommunity(),
      loadFeed(),
      loadEvents(),
      loadUserRsvps(),
    ]);
    setRefreshing(false);
  }, [loadCommunity, loadFeed, loadEvents, loadUserRsvps]);

  const handlePostUpdated = useCallback(() => {
    loadFeed();
  }, [loadFeed]);

  const handleEventEditRequest = useCallback(
    (targetEventId: string) => {
      if (!identifier) {
        Alert.alert("Missing context", "Community could not be resolved.");
        return;
      }
      const target = events.find((entry) => entry.id === targetEventId) || null;
      if (!target) {
        Alert.alert("Event unavailable", "Unable to find that event.");
        return;
      }
      setEventBeingEdited(target);
      setIsEditEventVisible(true);
    },
    [events, identifier]
  );

  const handleCloseEditEventModal = useCallback(() => {
    setIsEditEventVisible(false);
    setEventBeingEdited(null);
  }, []);

  const handleEventEditSuccess = useCallback(() => {
    setIsEditEventVisible(false);
    setEventBeingEdited(null);
    loadEvents();
  }, [loadEvents]);

  const handleEventDeleteRequest = useCallback(
    (targetEventId: string) => {
      if (!identifier) {
        Alert.alert("Missing context", "Community could not be resolved.");
        return;
      }
      const target = events.find((entry) => entry.id === targetEventId);
      if (!target) {
        Alert.alert("Event unavailable", "Unable to find that event.");
        return;
      }
      Alert.alert(
        "Delete event",
        `Are you sure you want to delete "${target.title}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              setEventDeleteId(targetEventId);
              try {
                const response = await communityEventsAPI.delete(
                  identifier,
                  targetEventId
                );
                if (!response.success) {
                  throw new Error(
                    response.error || "Unable to delete the event."
                  );
                }
                setEvents((previous) =>
                  previous.filter((entry) => entry.id !== targetEventId)
                );
                setUserEventRsvps((previous) => {
                  if (!previous.has(targetEventId)) {
                    return previous;
                  }
                  const next = new Set(previous);
                  next.delete(targetEventId);
                  return next;
                });
                await loadEvents();
              } catch (error: any) {
                const message =
                  error?.response?.data?.error ||
                  error?.message ||
                  "Unable to delete the event.";
                Alert.alert("Delete event", message);
              } finally {
                setEventDeleteId(null);
              }
            },
          },
        ]
      );
    },
    [events, identifier, loadEvents]
  );

  type FeedItem =
    | { kind: "post"; data: Post }
    | { kind: "event"; data: CommunityEventSummary };

  const feedItems = useMemo<FeedItem[]>(() => {
    const mappedPosts: FeedItem[] = posts.map((post) => ({
      kind: "post",
      data: post,
    }));
    const mappedEvents: FeedItem[] = events.map((event) => ({
      kind: "event",
      data: event,
    }));
    return [...mappedEvents, ...mappedPosts].sort((a, b) => {
      const aTime =
        a.kind === "event"
          ? new Date(a.data.startAt || a.data.createdAt || 0).getTime()
          : new Date(a.data.createdAt || 0).getTime();
      const bTime =
        b.kind === "event"
          ? new Date(b.data.startAt || b.data.createdAt || 0).getTime()
          : new Date(b.data.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }, [events, posts]);

  const formatEventWindow = useCallback((start?: string, end?: string) => {
    if (!start) {
      return "Date to be announced";
    }
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;
    const formatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    const startLabel = formatter.format(startDate);
    if (!endDate || Number.isNaN(endDate.getTime())) {
      return startLabel;
    }
    const endLabel = formatter.format(endDate);
    return `${startLabel} - ${endLabel}`;
  }, []);

  const isEventInPast = useCallback((start?: string) => {
    if (!start) {
      return false;
    }
    const startDate = new Date(start);
    return startDate.getTime() < Date.now();
  }, []);

  const handleEventRsvpToggle = useCallback(
    async (event: CommunityEventSummary) => {
      if (!identifier) {
        return;
      }

      if (!authUser) {
        Alert.alert("Login required", "Please sign in to RSVP for events.");
        return;
      }

      if (isEventInPast(event.startAt)) {
        Alert.alert(
          "Event already started",
          "RSVPs are closed for this event."
        );
        return;
      }

      const alreadyRsvped = userEventRsvps.has(event.id);
      setRsvpLoadingId(event.id);

      try {
        if (alreadyRsvped) {
          await communityEventsAPI.cancelRsvp(identifier, event.id);
          setUserEventRsvps((previous) => {
            const next = new Set(previous);
            next.delete(event.id);
            return next;
          });
        } else {
          await communityEventsAPI.rsvp(identifier, event.id);
          setUserEventRsvps((previous) => {
            const next = new Set(previous);
            next.add(event.id);
            return next;
          });
        }
        await loadEvents();
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.error ||
          "Unable to update RSVP. Please try again.";
        Alert.alert("RSVP", errorMessage);
      } finally {
        setRsvpLoadingId(null);
      }
    },
    [authUser, identifier, isEventInPast, loadEvents, userEventRsvps]
  );

  const isMember = membership?.status === "active";
  const isPending = membership?.status === "pending";
  const canManageCommunity =
    membership?.role === "owner" || membership?.role === "admin";

  const renderFeedItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      if (item.kind === "event") {
        const event = item.data;
        const eventClosed = isEventInPast(event.startAt);
        const isRsvped = userEventRsvps.has(event.id);
        const isPending = rsvpLoadingId === event.id;
        const canModerateEvent =
          canManageCommunity || event.createdBy?.id === authUser?.id;
        return (
          <View style={styles.postCard}>
            <CommunityEventCard
              eventId={event.id}
              title={event.title}
              hostName={
                event.createdBy?.displayName ||
                event.createdBy?.id ||
                "Organizer"
              }
              communityName={community?.name || "Community"}
              description={event.description}
              locationLabel={event.location || "Location to be announced"}
              dateTimeLabel={formatEventWindow(event.startAt, event.endAt)}
              rsvpCount={event.attendeeCount ?? 0}
              isRsvpDisabled={eventClosed}
              isRsvped={isRsvped}
              isRsvpPending={isPending}
              canManage={!!canModerateEvent}
              isActionPending={eventDeleteId === event.id}
              onPressRSVP={() => handleEventRsvpToggle(event)}
              onEditEvent={canModerateEvent ? handleEventEditRequest : undefined}
              onDeleteEvent={
                canModerateEvent ? handleEventDeleteRequest : undefined
              }
            />
          </View>
        );
      }
      return (
        <View style={styles.postCard}>
          <PostCard
            post={item.data}
            onPostDeleted={loadFeed}
            onPostUpdated={handlePostUpdated}
            canModerateCommunity={canManageCommunity}
          />
        </View>
      );
    },
    [
      community?.name,
      formatEventWindow,
      handleEventRsvpToggle,
      isEventInPast,
      loadFeed,
      handlePostUpdated,
      rsvpLoadingId,
      userEventRsvps,
      canManageCommunity,
      authUser?.id,
      eventDeleteId,
      handleEventEditRequest,
      handleEventDeleteRequest,
    ]
  );

  const keyExtractor = useCallback((item: FeedItem) => {
    if (item.kind === "event") {
      return `event-${item.data.id}`;
    }
    return `post-${item.data._id}`;
  }, []);

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
          showManageIcon={canManageCommunity}
          onPressManage={handleOpenEditCommunity}
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
          membershipRole={membership?.role}
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
    canManageCommunity,
    handleOpenEditCommunity,
    membership?.role,
  ]);

  const listEmptyComponent = useMemo(() => {
    if (isFeedLoading || isEventLoading) {
      return <FeedSkeleton />;
    }
    if (feedError || eventError) {
      return (
        <FeedStateMessage
          title="Unable to load feed"
          subtitle={feedError || eventError || "Please try again later."}
        />
      );
    }
    return (
      <FeedStateMessage
        title="No updates yet"
        subtitle="Share the first post or event with this community."
      />
    );
  }, [feedError, eventError, isFeedLoading, isEventLoading]);

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
        data={feedItems}
        keyExtractor={keyExtractor}
        renderItem={renderFeedItem}
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
    feedItems,
    handleRefresh,
    isCommunityLoading,
    keyExtractor,
    listEmptyComponent,
    listHeader,
    refreshing,
    renderFeedItem,
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
      <EditEventModal
        visible={isEditEventVisible}
        communitySlug={identifier ?? null}
        event={eventBeingEdited}
        onClose={handleCloseEditEventModal}
        onEventUpdated={handleEventEditSuccess}
      />
      <EditCommunityModal
        visible={isEditCommunityVisible}
        onClose={handleCloseEditCommunity}
        community={community}
        membershipRole={membership?.role}
        onUpdated={handleCommunityUpdated}
        onDeleted={handleCommunityDeleted}
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
