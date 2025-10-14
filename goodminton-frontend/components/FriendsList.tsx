import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ActivityIndicator, Alert, ScrollView, TextInput } from 'react-native';
import { authAPI, gamesAPI } from '../services/api';
import { fetchWithRetry } from '../services/apiHelpers';
import { useAuth } from '../services/authContext';

/**
 * Interface for friend data structure
 */
interface Friend {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  level?: string;
  points?: number;
  profile?: {
    displayName?: string;
    firstName?: string;
    lastName?: string;
    level?: string;
    points?: number;
  };
}

/**
 * Interface for user data with friends
 */
interface UserWithFriends {
  id: string;
  email: string;
  profile: {
    displayName: string;
    firstName: string;
    lastName?: string;
    avatar?: string;
    level: string;
    points: number;
  };
  friends?: Friend[];
}

/**
 * Props for FriendsList component
 */
interface FriendsListProps {
  onRefresh?: () => void;
}

/**
 * Component that displays a list of user's friends with Create Game buttons
 * Fetches friends data from the /auth/me endpoint and displays them in a scrollable list
 */
export default function FriendsList({ onRefresh }: FriendsListProps) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [scores, setScores] = useState({
    set1: { player: '', opponent: '' },
    set2: { player: '', opponent: '' },
    set3: { player: '', opponent: '' }
  });
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);

  /**
   * Fetches user data including friends from the API
   * Uses caching and retry logic for better performance
   */
  const fetchFriends = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const userData = await fetchWithRetry(
        () => authAPI.getCurrentUser(),
        { 
          cacheKey: 'user-friends', 
          cacheTTL: 30000, // Cache for 30 seconds
          maxRetries: 2 
        }
      );

      if (userData.success && userData.user) {
        const userWithFriends = userData.user as UserWithFriends;
        
        // Ensure friends is an array and filter out any invalid entries
        const friendsArray = Array.isArray(userWithFriends.friends) 
          ? userWithFriends.friends.filter(friend => friend && friend.id)
          : [];
        
        setFriends(friendsArray);
      } else {
        setError('Failed to load friends data');
      }
    } catch (err: any) {
      console.error('Error fetching friends:', err);
      setError('Unable to load friends. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles Create Game button press
   * Opens the Create Game modal for the selected friend
   */
  const handleCreateGame = (friend: Friend) => {
    setSelectedFriend(friend);
    setIsModalVisible(true);
  };

  /**
   * Closes the Create Game modal and resets scores
   */
  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedFriend(null);
    setScores({
      set1: { player: '', opponent: '' },
      set2: { player: '', opponent: '' },
      set3: { player: '', opponent: '' }
    });
    setWinner(null);
  };

  /**
   * Handles score input changes for each set
   */
  const handleScoreChange = (set: 'set1' | 'set2' | 'set3', player: 'player' | 'opponent', value: string) => {
    setScores(prev => ({
      ...prev,
      [set]: {
        ...prev[set],
        [player]: value
      }
    }));
  };

  /**
   * Handles Create Game modal submission
   * Validates form data and submits to the games API
   */
  const handleCreateGameSubmit = async () => {
    try {
      // Validate that at least Set 1 has scores
      if (!scores.set1.player || !scores.set1.opponent) {
        Alert.alert('Invalid Input', 'Please enter scores for Set 1');
        return;
      }

      // Validate that winner is selected
      if (!winner) {
        Alert.alert('Invalid Input', 'Please select who won the game');
        return;
      }

      // Validate that selected friend exists
      if (!selectedFriend?.id) {
        Alert.alert('Error', 'Invalid opponent selected');
        return;
      }

      // Build scores array - only include sets that have both scores
      const scoresArray: number[][] = [];
      
      if (scores.set1.player && scores.set1.opponent) {
        const playerScore = parseInt(scores.set1.player);
        const opponentScore = parseInt(scores.set1.opponent);
        
        if (isNaN(playerScore) || isNaN(opponentScore)) {
          Alert.alert('Invalid Input', 'Please enter valid numbers for Set 1 scores');
          return;
        }
        
        scoresArray.push([playerScore, opponentScore]);
      }
      
      if (scores.set2.player && scores.set2.opponent) {
        const playerScore = parseInt(scores.set2.player);
        const opponentScore = parseInt(scores.set2.opponent);
        
        if (isNaN(playerScore) || isNaN(opponentScore)) {
          Alert.alert('Invalid Input', 'Please enter valid numbers for Set 2 scores');
          return;
        }
        
        scoresArray.push([playerScore, opponentScore]);
      }
      
      if (scores.set3.player && scores.set3.opponent) {
        const playerScore = parseInt(scores.set3.player);
        const opponentScore = parseInt(scores.set3.opponent);
        
        if (isNaN(playerScore) || isNaN(opponentScore)) {
          Alert.alert('Invalid Input', 'Please enter valid numbers for Set 3 scores');
          return;
        }
        
        scoresArray.push([playerScore, opponentScore]);
      }

      // Determine winner ID
      const winnerId = winner === 'player' 
        ? user?.id || 'current_user_id' // Use actual current user ID
        : selectedFriend.id;

      // Prepare game data
      const gameData = {
        opponentId: selectedFriend.id,
        scores: scoresArray,
        winnerId: winnerId
      };

      console.log('🎮 Submitting game data:', gameData);

      // Submit to API
      const response = await fetchWithRetry(
        () => gamesAPI.submitGame(gameData),
        { 
          cacheKey: `game-${Date.now()}`, // Unique cache key
          skipCache: true // Don't cache game submissions
        }
      );

      if (response.success) {
        Alert.alert(
          'Game Created!', 
          `Game with ${selectedFriend?.profile?.displayName || selectedFriend?.displayName || 'opponent'} has been submitted successfully!`,
          [{ text: 'OK', onPress: closeModal }]
        );
      } else {
        throw new Error(response.message || 'Failed to create game');
      }

    } catch (error: any) {
      console.error('Error creating game:', error);
      Alert.alert(
        'Error', 
        `Failed to create game: ${error.message || 'Please try again'}`,
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Refreshes the friends list
   */
  const handleRefresh = () => {
    fetchFriends();
    onRefresh?.();
  };

  // Fetch friends on component mount
  useEffect(() => {
    fetchFriends();
  }, []);

  /**
   * Renders a loading indicator
   */
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0E5B37" />
        <Text style={styles.loadingText}>Loading friends...</Text>
      </View>
    );
  }

  /**
   * Renders error state
   */
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  /**
   * Renders empty state when no friends
   */
  if (friends.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No friends yet</Text>
        <Text style={styles.emptySubtext}>Add friends to start creating games!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <Pressable style={styles.refreshButton} onPress={handleRefresh}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </Pressable>
      </View>
      
      <ScrollView style={styles.friendsList} showsVerticalScrollIndicator={false}>
        {friends.filter(friend => friend && friend.id).map((friend) => (
          <View key={friend.id} style={styles.friendItem}>
            <View style={styles.friendInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(friend.profile?.displayName || friend.displayName || friend.firstName || friend.email || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.friendDetails}>
                <Text style={styles.friendName}>
                  {friend.profile?.displayName || friend.displayName || friend.firstName || friend.email || 'Unknown User'}
                </Text>
              </View>
            </View>
            <Pressable 
              style={styles.createGameButton}
              onPress={() => handleCreateGame(friend)}
            >
              <Text style={styles.createGameButtonText}>Create Game</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      {/* Create Game Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                Create Game with {selectedFriend?.profile?.displayName || selectedFriend?.displayName || selectedFriend?.firstName || selectedFriend?.email || 'Unknown User'}
              </Text>
              <Text style={styles.modalSubtitle}>
                Enter the scores for each set played
              </Text>
              
              {/* Set 1 */}
              <View style={styles.setContainer}>
                <Text style={styles.setTitle}>Set 1</Text>
                <View style={styles.scoreInputContainer}>
                  <View style={styles.scoreInputWrapper}>
                    <Text style={styles.scoreLabel}>You</Text>
                    <TextInput
                      style={styles.scoreInput}
                      value={scores.set1.player}
                      onChangeText={(value) => handleScoreChange('set1', 'player', value)}
                      placeholder="0"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                  <Text style={styles.scoreSeparator}>-</Text>
                  <View style={styles.scoreInputWrapper}>
                    <Text style={styles.scoreLabel}>Opponent</Text>
                    <TextInput
                      style={styles.scoreInput}
                      value={scores.set1.opponent}
                      onChangeText={(value) => handleScoreChange('set1', 'opponent', value)}
                      placeholder="0"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                </View>
              </View>

              {/* Set 2 */}
              <View style={styles.setContainer}>
                <Text style={styles.setTitle}>Set 2</Text>
                <View style={styles.scoreInputContainer}>
                  <View style={styles.scoreInputWrapper}>
                    <Text style={styles.scoreLabel}>You</Text>
                    <TextInput
                      style={styles.scoreInput}
                      value={scores.set2.player}
                      onChangeText={(value) => handleScoreChange('set2', 'player', value)}
                      placeholder="0"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                  <Text style={styles.scoreSeparator}>-</Text>
                  <View style={styles.scoreInputWrapper}>
                    <Text style={styles.scoreLabel}>Opponent</Text>
                    <TextInput
                      style={styles.scoreInput}
                      value={scores.set2.opponent}
                      onChangeText={(value) => handleScoreChange('set2', 'opponent', value)}
                      placeholder="0"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                </View>
              </View>

              {/* Set 3 */}
              <View style={styles.setContainer}>
                <Text style={styles.setTitle}>Set 3 </Text>
                <View style={styles.scoreInputContainer}>
                  <View style={styles.scoreInputWrapper}>
                    <Text style={styles.scoreLabel}>You</Text>
                    <TextInput
                      style={styles.scoreInput}
                      value={scores.set3.player}
                      onChangeText={(value) => handleScoreChange('set3', 'player', value)}
                      placeholder="0"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                  <Text style={styles.scoreSeparator}>-</Text>
                  <View style={styles.scoreInputWrapper}>
                    <Text style={styles.scoreLabel}>Opponent</Text>
                    <TextInput
                      style={styles.scoreInput}
                      value={scores.set3.opponent}
                      onChangeText={(value) => handleScoreChange('set3', 'opponent', value)}
                      placeholder="0"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                </View>
              </View>

              {/* Winner Selection */}
              <View style={styles.winnerContainer}>
                <Text style={styles.winnerTitle}>Who won?</Text>
                <View style={styles.winnerButtons}>
                  <Pressable 
                    style={[
                      styles.winnerButton, 
                      winner === 'player' && styles.winnerButtonSelected
                    ]}
                    onPress={() => setWinner('player')}
                  >
                    <Text style={[
                      styles.winnerButtonText,
                      winner === 'player' && styles.winnerButtonTextSelected
                    ]}>
                      Me
                    </Text>
                  </Pressable>
                  <Pressable 
                    style={[
                      styles.winnerButton, 
                      winner === 'opponent' && styles.winnerButtonSelected
                    ]}
                    onPress={() => setWinner('opponent')}
                  >
                    <Text style={[
                      styles.winnerButtonText,
                      winner === 'opponent' && styles.winnerButtonTextSelected
                    ]}>
                      Opponent
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.submitButton} onPress={handleCreateGameSubmit}>
                <Text style={styles.submitButtonText}>Create Game</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontFamily: 'DMSans_700Bold',
    color: '#0E5B37',
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0E5B37',
    borderRadius: 6,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
  },
  friendsList: {
    flex: 1,
    padding: 20,
    paddingBottom: 20,
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0E5B37',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  friendLevel: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#666',
    textTransform: 'capitalize',
  },
  createGameButton: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createGameButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#0E5B37',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'DMSans_600SemiBold',
    color: '#333',
    marginBottom: 8, 
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    minWidth: 350,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  setContainer: {
    marginBottom: 20,
  },
  setTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: '#333',
    marginBottom: 10,
  },
  scoreInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreInputWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: '#666',
    marginBottom: 6,
  },
  scoreInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  scoreSeparator: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: '#666',
    marginHorizontal: 15,
  },
  winnerContainer: {
    marginTop: 20,
    marginBottom: 10,
  },
  winnerTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  winnerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  winnerButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  winnerButtonSelected: {
    borderColor: '#0E5B37',
    backgroundColor: '#0E5B37',
  },
  winnerButtonText: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: '#666',
  },
  winnerButtonTextSelected: {
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#0E5B37',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
});
