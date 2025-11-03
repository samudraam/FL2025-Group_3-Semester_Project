import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { friendRequestsAPI } from '../services/api';
import { useSocket } from '../services/socketContext';
import { fetchWithRetry } from '../services/apiHelpers';
import { apiCache } from '../services/apiCache';

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
  const isFetchingRef = useRef(false);
  const { notifications } = useSocket();
  const latestRequestSeq = useRef(0);
  const isMountedRef = useRef(true);

  /**
   * Fetch friend requests from API with retry logic
   * @param mode - 'initial' shows loading spinner, 'refresh' shows pull-to-refresh indicator, 'silent' updates in background
   */
  type FetchMode = 'initial' | 'refresh' | 'silent';

  const fetchFriendRequests = useCallback(async (mode: FetchMode = 'silent') => {
    if (isFetchingRef.current) {
      return;
    }

    try {
      const mySeq = ++latestRequestSeq.current;
      isFetchingRef.current = true;

      if (mode === 'initial') {
        setIsLoading(true);
      } else if (mode === 'refresh') {
        setIsRefreshing(true);
      }

      const response = await fetchWithRetry(
        () => friendRequestsAPI.getPending(),
        {
          maxRetries: 3,
          skipCache: true,
        }
      );

      const pendingFromKnownShapes =
        (response as any)?.pendingRequests ??
        (response as any)?.data?.pendingRequests ??
        (Array.isArray(response) ? response : undefined);

      if (mySeq === latestRequestSeq.current && isMountedRef.current) {
        const normalized = Array.isArray(pendingFromKnownShapes)
          ? pendingFromKnownShapes
          : (response as any)?.pendingRequests || [];

        setFriendRequests(normalized);
        apiCache.set('friend-requests', normalized);
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch friend requests:', error);
      const status = error?.response?.status;

      if (status === 429) {
        Alert.alert('Too Many Requests', 'Please wait a moment before refreshing.');
      } else if (mode === 'initial') {
        Alert.alert('Error', error?.response?.data?.error || 'Failed to load friend requests');
      }
    } finally {
      isFetchingRef.current = false;
      if (isMountedRef.current) {
        if (mode === 'initial') {
          setIsLoading(false);
        } else if (mode === 'refresh') {
          setIsRefreshing(false);
        }
      }
    }
  }, []);

  /**
   * Hydrate from cache and fetch fresh data on mount
   */
  useEffect(() => {
    isMountedRef.current = true;
    const cached = apiCache.get<FriendRequest[]>('friend-requests');
    if (cached) {
      setFriendRequests(cached);
      setIsLoading(false);
    }
    fetchFriendRequests(cached ? 'silent' : 'initial');

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchFriendRequests]);

  /**
   * Refresh when new friend request notifications arrive (debounced)
   */
  useEffect(() => {
    const friendRequestNotifications = notifications.filter(
      (n) => n.type === 'friend_request'
    );
    
    if (friendRequestNotifications.length > lastNotificationCount) {
      setLastNotificationCount(friendRequestNotifications.length);
      
      const timeoutId = setTimeout(() => {
        apiCache.invalidate('friend-requests');
        fetchFriendRequests('silent');
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [notifications, lastNotificationCount, fetchFriendRequests]);

  /**
   * Respond to external refresh trigger
   */
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      apiCache.invalidate('friend-requests');
      fetchFriendRequests('refresh');
    }
  }, [refreshTrigger, fetchFriendRequests]);

  /**
   * Handle manual pull-to-refresh
   */
  const handleRefresh = () => {
    apiCache.invalidate('friend-requests');
    fetchFriendRequests('refresh');
  };

  /**
   * Handle accepting a friend request
   * Removes request from list and updates cache on success
   */
  const handleAcceptRequest = async (requestId: string) => {
    try {
      setProcessingIds((prev) => new Set(prev).add(requestId));
      const response = await friendRequestsAPI.accept(requestId);
      
      if (response.success) {
        setFriendRequests((prev) => {
          const newList = prev.filter((req) => req._id !== requestId);
          apiCache.set('friend-requests', newList);
          return newList;
        });
        Alert.alert('Success', response.message || 'Friend request accepted!');
      }
    } catch (error: any) {
      console.error('Failed to accept friend request:', error);
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
   * Removes request from list and updates cache on success
   */
  const handleRejectRequest = async (requestId: string) => {
    try {
      setProcessingIds((prev) => new Set(prev).add(requestId));
      const response = await friendRequestsAPI.reject(requestId);
      
      if (response.success) {
        setFriendRequests((prev) => {
          const newList = prev.filter((req) => req._id !== requestId);
          apiCache.set('friend-requests', newList);
          return newList;
        });
        Alert.alert('Success', response.message || 'Friend request rejected');
      }
    } catch (error: any) {
      console.error('Failed to reject friend request:', error);
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
        {friendRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No pending friend requests</Text>
            <Text style={styles.emptyStateSubtext}>
              When someone sends you a friend request, it will appear here.
            </Text>
          </View>
        ) : (
          friendRequests.map((request) => {
            const isProcessing = processingIds.has(request._id);
            
            return (
              <View key={request._id} style={styles.requestItem}>
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
          })
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
