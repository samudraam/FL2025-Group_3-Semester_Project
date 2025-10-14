import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { friendRequestsAPI } from '../services/api';
import { useSocket } from '../services/socketContext';
import { fetchWithRetry } from '../services/apiHelpers';
// Cache disabled for friend requests to ensure realtime correctness

/**
 * Friend request data structure from API
 */
interface FriendRequest {
  _id: string;
  from: {
    _id: string;
    profile: {
      displayName: string;
      avatar?: string;
    };
    email: string;
  };
  message?: string;
  createdAt: string;
}

/**
 * FriendRequests component displays pending friend requests
 * Users can accept or reject requests, and the list updates in real-time via socket
 */
interface FriendRequestsProps {
  refreshTrigger?: number;
}

export default function FriendRequests({ refreshTrigger }: FriendRequestsProps) {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [lastNotificationCount, setLastNotificationCount] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const { notifications } = useSocket();
  // Race guards
  const latestRequestSeq = useRef(0);
  const isMountedRef = useRef(true);
  
  // Debug logging
  console.log('🔍 FriendRequests render - friendRequests.length:', friendRequests.length, 'isLoading:', isLoading, 'isFetching:', isFetching, 'refreshTrigger:', refreshTrigger);

  /**
   * Fetch pending friend requests on mount with slight delay to stagger API calls
   */
  useEffect(() => {
    console.log('🚀 FriendRequests mount effect triggered');
    const timer = setTimeout(() => {
      console.log('⏰ FriendRequests initial fetch timer fired');
      // Bypass cache on first load to avoid stale empty results
      fetchFriendRequests(true);
    }, 1000); // 1 second delay to prevent rate limiting
    
    return () => {
      console.log('🧹 FriendRequests cleanup - clearing timer and setting isMounted to false');
      clearTimeout(timer);
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Refresh list when new friend request notification arrives
   * Only triggers when a new friend_request notification is added
   * Clears cache to ensure fresh data is fetched
   * Debounced to prevent rapid successive fetches
   */
  useEffect(() => {
    console.log('🔔 FriendRequests notification effect - notifications.length:', notifications.length, 'lastNotificationCount:', lastNotificationCount);
    const friendRequestNotifications = notifications.filter(
      (n) => n.type === 'friend_request'
    );
    
    console.log('🔔 Friend request notifications:', friendRequestNotifications.length);
    
    // Only fetch if we have new notifications (count increased)
    if (friendRequestNotifications.length > lastNotificationCount) {
      console.log(`📈 Friend request notification count increased from ${lastNotificationCount} to ${friendRequestNotifications.length}`);
      setLastNotificationCount(friendRequestNotifications.length);
      
      // Debounce the fetch to prevent rapid successive calls
      const timeoutId = setTimeout(() => {
        console.log('⏳ Debounced friend request fetch triggered');
        fetchFriendRequests(true);
      }, 500); // 500ms debounce
      
      return () => {
        console.log('🧹 FriendRequests notification cleanup - clearing debounce timer');
        clearTimeout(timeoutId);
      };
    }
  }, [notifications]);

  /**
   * Respond to external refresh trigger without remounting
   */
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('🔄 External refresh trigger received:', refreshTrigger);
      fetchFriendRequests(true);
    }
  }, [refreshTrigger]);

  /**
   * Fetch friend requests from API with retry logic
   * Always ensures we show empty state even on API failures
   */
  const fetchFriendRequests = async (isRefresh = false) => {
    console.log('🔄 fetchFriendRequests called - isRefresh:', isRefresh, 'isFetching:', isFetching, 'current friendRequests.length:', friendRequests.length);
    
    // Prevent multiple simultaneous fetches
    if (isFetching) {
      console.log('⚠️ Friend requests fetch already in progress, skipping');
      return;
    }
    
    try {
      const mySeq = ++latestRequestSeq.current;
      console.log('🔢 Starting fetch with sequence:', mySeq, 'latestRequestSeq:', latestRequestSeq.current);
      setIsFetching(true);
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      console.log('🌐 Fetching friend requests from API...');
      const response = await fetchWithRetry(
        () => friendRequestsAPI.getPending(),
        {
          // Disable cache entirely for friend requests
          maxRetries: 3,
          skipCache: true
        }
      );
      
      console.log('📥 Friend requests response received:', response);
      
      // Be tolerant of different API shapes. Some backends may not include a
      // `success` flag but still return the pending requests payload.
      const pendingFromKnownShapes =
        // preferred: { success, pendingRequests }
        (response as any)?.pendingRequests ??
        // axios-style: { data: { pendingRequests } }
        (response as any)?.data?.pendingRequests ??
        // raw array
        (Array.isArray(response) ? response : undefined);

      console.log('🔍 Processing response - mySeq:', mySeq, 'latestRequestSeq:', latestRequestSeq.current, 'isMounted:', isMountedRef.current);
      console.log('🔍 pendingFromKnownShapes:', pendingFromKnownShapes);
      
      if (mySeq === latestRequestSeq.current && isMountedRef.current) {
        console.log('✅ Response is latest and component is mounted, updating state');
        if (Array.isArray(pendingFromKnownShapes)) {
          console.log('📝 Setting friendRequests from pendingFromKnownShapes:', pendingFromKnownShapes.length, 'items');
          setFriendRequests(pendingFromKnownShapes);
        } else if ((response as any)?.success) {
          console.log('📝 Setting friendRequests from response.pendingRequests:', (response as any)?.pendingRequests?.length || 0, 'items');
          setFriendRequests((response as any)?.pendingRequests || []);
        } else {
          // Preserve current list if response shape is unexpected
          console.log('⚠️ No pending requests found in response; preserving current list');
        }
      } else {
        console.log('❌ Stale friend request response ignored - mySeq:', mySeq, 'latest:', latestRequestSeq.current, 'isMounted:', isMountedRef.current);
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch friend requests:', error);
      console.log('❌ Error details - status:', error?.response?.status, 'isRefresh:', isRefresh);
      // Preserve current list on error to avoid flicker
      
      const status = error?.response?.status;
      if (status === 429) {
        console.log('⚠️ Rate limited (429) - showing alert');
        Alert.alert('Too Many Requests', 'Please wait a moment before refreshing.');
      } else if (!isRefresh) {
        console.log('⚠️ Non-429 error on initial load - showing alert');
        // Only show error alert on initial load, not on refresh
        Alert.alert('Error', error.response?.data?.error || 'Failed to load friend requests');
      }
    } finally {
      console.log('🏁 fetchFriendRequests finally block - isMounted:', isMountedRef.current);
      if (isMountedRef.current) {
        console.log('✅ Updating loading states');
        setIsFetching(false);
        setIsLoading(false);
        setIsRefreshing(false);
      } else {
        console.log('⚠️ Component unmounted, skipping state updates');
      }
    }
  };

  /**
   * Handle manual refresh triggered by pull-to-refresh gesture
   * Clears the cache to ensure fresh data is fetched from the API
   */
  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    fetchFriendRequests(true);
  };

  /**
   * Handle accepting a friend request
   */
  const handleAcceptRequest = async (requestId: string) => {
    console.log('✅ Accepting friend request:', requestId);
    try {
      setProcessingIds((prev) => new Set(prev).add(requestId));
      const response = await friendRequestsAPI.accept(requestId);
      
      if (response.success) {
        console.log('✅ Friend request accepted, removing from list');
        // Remove from list after successful accept
        setFriendRequests((prev) => {
          const newList = prev.filter((req) => req._id !== requestId);
          console.log('📝 Updated friendRequests after accept:', newList.length, 'items');
          return newList;
        });
        Alert.alert('Success', response.message || 'Friend request accepted!');
      }
    } catch (error: any) {
      console.error('❌ Failed to accept friend request:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to accept friend request');
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  /**
   * Handle rejecting a friend request
   */
  const handleRejectRequest = async (requestId: string) => {
    console.log('❌ Rejecting friend request:', requestId);
    try {
      setProcessingIds((prev) => new Set(prev).add(requestId));
      const response = await friendRequestsAPI.reject(requestId);
      
      if (response.success) {
        console.log('✅ Friend request rejected, removing from list');
        // Remove from list after successful reject
        setFriendRequests((prev) => {
          const newList = prev.filter((req) => req._id !== requestId);
          console.log('📝 Updated friendRequests after reject:', newList.length, 'items');
          return newList;
        });
        Alert.alert('Success', response.message || 'Friend request rejected');
      }
    } catch (error: any) {
      console.error('❌ Failed to reject friend request:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to reject friend request');
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  /**
   * Render profile image or placeholder
   */
  const ProfileImage = ({ displayName, avatar }: { displayName: string; avatar?: string }) => (
    <View style={styles.profileImageContainer}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.profileImage} />
      ) : (
        <View style={styles.profileImagePlaceholder}>
          <Text style={styles.profileInitial}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );

  /**
   * Render accept button
   */
  const AcceptButton = ({ onPress, disabled }: { onPress: () => void; disabled: boolean }) => (
    <Pressable 
      style={[styles.acceptButton, disabled && styles.buttonDisabled]} 
      onPress={onPress}
      disabled={disabled}
    >
      {disabled ? (
        <ActivityIndicator color="white" size="small" />
      ) : (
        <Text style={styles.acceptButtonText}>Accept</Text>
      )}
    </Pressable>
  );

  /**
   * Render reject button
   */
  const RejectButton = ({ onPress, disabled }: { onPress: () => void; disabled: boolean }) => (
    <Pressable 
      style={[styles.rejectButton, disabled && styles.buttonDisabled]} 
      onPress={onPress}
      disabled={disabled}
    >
      {disabled ? (
        <ActivityIndicator color="white" size="small" />
      ) : (
        <Text style={styles.rejectButtonText}>Reject</Text>
      )}
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Friend Requests</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0E5B37" />
          <Text style={styles.loadingText}>Loading friend requests...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Friend Requests</Text>
      
      <ScrollView 
        style={styles.requestsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#0E5B37"
            colors={['#0E5B37']}
          />
        }
      >
        {friendRequests.map((request) => {
          const isProcessing = processingIds.has(request._id);
          
          return (
            <View key={request._id} style={styles.requestItem}>
              {/* Profile and Info Section */}
              <View style={styles.headerSection}>
                <ProfileImage 
                  displayName={request.from.profile.displayName} 
                  avatar={request.from.profile.avatar} 
                />
                <View style={styles.headerInfo}>
                  <Text style={styles.displayName}>
                    {request.from.profile.displayName}
                  </Text>
                  <Text style={styles.email}>{request.from.email}</Text>
                  {request.message && (
                    <Text style={styles.message} numberOfLines={2}>
                      "{request.message}"
                    </Text>
                  )}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <RejectButton 
                  onPress={() => handleRejectRequest(request._id)}
                  disabled={isProcessing}
                />
                <AcceptButton 
                  onPress={() => handleAcceptRequest(request._id)}
                  disabled={isProcessing}
                />
              </View>
            </View>
          );
        })}
        
        {/* Empty state if no friend requests */}
        {(!friendRequests || friendRequests.length === 0) && !isLoading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No pending friend requests</Text>
            <Text style={styles.emptyStateSubtext}>When someone sends you a friend request, it will appear here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: '#0E5B37',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  requestsList: {
    flex: 1,
  },
  requestItem: {
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    padding: 16,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  displayName: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: '#333',
    marginBottom: 2,
  },
  email: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: '#666',
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#555',
    fontStyle: 'italic',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E0E0E0',
    padding: 16,
  },
  acceptButton: {
    width: 150,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 150,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
    color: 'white',
  },
  rejectButtonText: {
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
    color: 'white',
  },
  profileImageContainer: {
    marginRight: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
  },
  profileImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 25,
    backgroundColor: '#0E5B37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
    color: 'white',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#666',
  },
  emptyStateSubtext: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#666',
  },
});

