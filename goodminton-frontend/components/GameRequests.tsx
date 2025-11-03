import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { gamesAPI } from '../services/api';
import { useSocket } from '../services/socketContext';
import { fetchWithRetry } from '../services/apiHelpers';
import { apiCache } from '../services/apiCache';

/**
 * Individual game score interface
 */
interface GameScore {
    player1Score: number;
    player2Score: number;
}

/**
 * Game confirmation interface for type safety
 * Matches the structure from the backend API
 */
interface GamePlayer {
    _id: string;
    profile?: {
        displayName?: string;
        avatar?: string;
    };
}

interface GameConfirmation {
    _id: string;
    gameType: 'singles' | 'doubles';
    teamA: GamePlayer[];
    teamB: GamePlayer[];
    scores: number[][];
    winnerTeam: 'teamA' | 'teamB';
    createdAt: string;
    status?: string;
}

/**
 * GameConfirmation component displays a scrollable list of completed matches awaiting confirmation
 * Each item shows match results with individual game scores and confirm/dispute buttons
 */
interface GameConfirmationProps {
  refreshTrigger?: number;
}

export default function GameConfirmation({ refreshTrigger }: GameConfirmationProps) {
    const [gameConfirmations, setGameConfirmations] = useState<GameConfirmation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
    const [lastNotificationCount, setLastNotificationCount] = useState(0);
    const { notifications } = useSocket();

    /**
     * Fetch pending game confirmations on mount with delay to stagger API calls
     */
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchGameConfirmations();
        }, 1500); // 1.5 second delay to prevent rate limiting
        
        return () => clearTimeout(timer);
    }, []);

    /**
     * Refresh list when new game confirmation notification arrives
     * Only triggers when a new game_confirmation notification is added
     * Uses a counter to track processed notifications and prevent duplicate fetches
     * Clears cache to ensure fresh data is fetched
     */
    useEffect(() => {
        const gameConfirmationNotifications = notifications.filter(
            (n) => n.type === 'game_confirmation'
        );
        
        // Only fetch if we have new notifications (count increased)
        if (gameConfirmationNotifications.length > lastNotificationCount) {
            setLastNotificationCount(gameConfirmationNotifications.length);
            apiCache.invalidate('game-confirmations');
            fetchGameConfirmations();
        }
    }, [notifications]);

    /**
     * Respond to external refresh trigger without remounting
     */
    useEffect(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            console.log('🔄 GameRequests external refresh trigger received:', refreshTrigger);
            fetchGameConfirmations(true);
        }
    }, [refreshTrigger]);

    /**
     * Fetch game confirmations from API with retry logic
     * This function retrieves all pending game confirmations that need the user's approval
     */
    const fetchGameConfirmations = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }
            
            const response = await fetchWithRetry(
                () => gamesAPI.getPending(),
                {
                    cacheKey: 'game-confirmations',
                    cacheTTL: 30000, // Cache for 30 seconds
                    maxRetries: 3,
                    skipCache: isRefresh
                }
            );
            
            if (response.success) {
                const games = response.pendingGames || [];
                setGameConfirmations(games);
            }
        } catch (error: any) {
            console.error('Failed to fetch game confirmations:', error);
            const status = error?.response?.status;
            
            if (status === 429) {
                Alert.alert('Too Many Requests', 'Please wait a moment before refreshing.');
            } else if (status !== 404 && !isRefresh) {
                Alert.alert('Error', error.response?.data?.error || 'Failed to load game confirmations');
            }
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    /**
     * Handle manual refresh triggered by pull-to-refresh gesture
     * Clears the cache to ensure fresh data is fetched from the API
     */
    const handleRefresh = () => {
        apiCache.invalidate('game-confirmations');
        fetchGameConfirmations(true);
    };

    /**
     * Handle confirming match results
     */
    const handleConfirmMatch = async (matchId: string) => {
        try {
            setProcessingIds((prev) => new Set(prev).add(matchId));
            const response = await gamesAPI.confirm(matchId);
            
            if (response.success) {
                // Remove from list after successful confirmation
                setGameConfirmations((prev) => prev.filter((game) => game._id !== matchId));
                Alert.alert('Success', response.message || 'Game confirmed!');
            }
        } catch (error: any) {
            console.error('Failed to confirm game:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to confirm game');
        } finally {
            setProcessingIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(matchId);
                return newSet;
            });
        }
    };

    /**
     * Handle disputing match results
     */
    const handleDisputeMatch = (matchId: string) => {
        Alert.alert(
            'Dispute Game',
            'This feature will allow you to dispute game results. Coming soon!',
            [{ text: 'OK' }]
        );
    };

    /**
     * Render confirm button with checkmark icon
     */
    const ConfirmButton = ({ onPress, disabled }: { onPress: () => void; disabled: boolean }) => (
        <Pressable 
            style={[styles.confirmButton, disabled && styles.buttonDisabled]} 
            onPress={onPress}
            disabled={disabled}
        >
            {disabled ? (
                <ActivityIndicator color="white" size="small" />
            ) : (
                <Text style={styles.confirmButtonText}>confirm</Text>
            )}
        </Pressable>
    );

    /**
     * Render dispute button with X icon
     */
    const DisputeButton = ({ onPress, disabled }: { onPress: () => void; disabled: boolean }) => (
        <Pressable 
            style={[styles.disputeButton, disabled && styles.buttonDisabled]} 
            onPress={onPress}
            disabled={disabled}
        >
            {disabled ? (
                <ActivityIndicator color="white" size="small" />
            ) : (
                <Text style={styles.rejectButtonText}>reject</Text>
            )}
        </Pressable>
    );

    /**
     * Render profile image or placeholder
     */
    const ProfileImage = ({ username, avatarUri }: { username: string; avatarUri?: string }) => (
        <View style={styles.profileImageContainer}>
            {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.profileImage} />
            ) : (
                <View style={styles.profileImagePlaceholder}>
                    <Text style={styles.profileInitial}>
                        {username.charAt(0).toUpperCase()}
                    </Text>
                </View>
            )}
        </View>
    );

    /**
     * Render individual game score with progress bars
     */
    const GameScoreRow = ({ gameNumber, player1Score, player2Score }: { 
        gameNumber: number; 
        player1Score: number; 
        player2Score: number; 
    }) => {
        const maxScore = 21;
        const player1Percentage = (player1Score / maxScore) * 100;
        const player2Percentage = (player2Score / maxScore) * 100;

        return (
            <View style={styles.gameRow}>
                <Text style={styles.gameLabel}>S {gameNumber}</Text>
                
                <View style={styles.scoreBarsContainer}>
                    <View style={styles.scoreBarContainer}>
                        <View style={[styles.scoreBar, styles.player1Bar, { width: `${player1Percentage}%` }]} />
                        <Text style={styles.maxScoreText}>{player1Score}</Text>
                    </View>
                    
                    <View style={styles.scoreBarContainer}>
                        <View style={[styles.scoreBar, styles.player2Bar, { width: `${player2Percentage}%` }]} />
                        <Text style={styles.maxScoreText}>{player2Score}</Text>
                    </View>
                </View>
                
                <Text style={styles.scoreText}>{player1Score} / {player2Score}</Text>
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <Text style={styles.sectionTitle}>Game Results Confirmation</Text>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0E5B37" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Game Results Confirmation</Text>
            
            <ScrollView 
                style={styles.confirmationsList}
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
                {gameConfirmations.map((confirmation) => {
                    const isProcessing = processingIds.has(confirmation._id);
                    const teamAPlayers = confirmation.teamA ?? [];
                    const teamBPlayers = confirmation.teamB ?? [];
                    const primaryPlayerA = teamAPlayers[0];
                    const primaryPlayerB = teamBPlayers[0];

                    if (!primaryPlayerA || !primaryPlayerB) {
                        console.warn('Game confirmation skipped due to missing player data:', confirmation._id);
                        return null;
                    }

                    const getTeamDisplayName = (team: GamePlayer[]) => {
                        const names = team
                            .map((player) => player.profile?.displayName)
                            .filter((name): name is string => Boolean(name));
                        return names.length > 0 ? names.join(' & ') : 'Unknown players';
                    };

                    const teamADisplayName = getTeamDisplayName(teamAPlayers);
                    const teamBDisplayName = getTeamDisplayName(teamBPlayers);
                    const primaryDisplayNameA = primaryPlayerA.profile?.displayName || 'Player A';

                    // Calculate wins for each team
                    const teamAWins = confirmation.scores.filter(score => score[0] > score[1]).length;
                    const teamBWins = confirmation.scores.filter(score => score[1] > score[0]).length;
                    
                    // Format date
                    const date = new Date(confirmation.createdAt);
                    const formattedDate = date.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                    });
                    
                    return (
                    <View key={confirmation._id} style={styles.confirmationItem}>
                        {/* Header Section */}
                        <View style={styles.headerSection}>
                            <ProfileImage 
                                username={primaryDisplayNameA} 
                                avatarUri={primaryPlayerA.profile?.avatar} 
                            />
                            <View style={styles.headerInfo}>
                                <Text style={styles.playerName}>{teamADisplayName}</Text>
                                <Text style={styles.matchTime}>
                                    {formattedDate}
                                </Text>
                            </View>
                        </View>

                        {/* Game Summary Section */}
                        <View style={styles.gameSummarySection}>
                            {/* Player 1 Score */}
                            <View style={styles.playerScoreSection}>
                                <Text style={styles.playerName}>{teamADisplayName}</Text>
                                <Text style={styles.totalScore}>{teamAWins}</Text>
                            </View>

                            {/* Player 2 Score */}
                            <View style={styles.playerScoreSection}>
                                <Text style={styles.playerName}>{teamBDisplayName}</Text>
                                <Text style={styles.totalScore}>{teamBWins}</Text>
                            </View>
                        </View>

                        {/* Individual Game Details */}
                        <View style={styles.gamesSection}>
                            {confirmation.scores.map((score, index) => (
                                <GameScoreRow
                                    key={index}
                                    gameNumber={index + 1}
                                    player1Score={score[0]}
                                    player2Score={score[1]}
                                />
                            ))}
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <DisputeButton 
                                onPress={() => handleDisputeMatch(confirmation._id)} 
                                disabled={isProcessing}
                            />
                            <ConfirmButton 
                                onPress={() => handleConfirmMatch(confirmation._id)} 
                                disabled={isProcessing}
                            />
                        </View>
                    </View>
                    );
                })}
                
                {/* Empty state if no confirmations */}
                {gameConfirmations.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No matches awaiting confirmation</Text>
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
    confirmationsList: {
        flex: 1,
    },
    confirmationItem: {
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
        marginLeft: 5,
    },
    playerName: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        color: '#333',
        marginBottom: 2,
    },
    matchTime: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        color: '#666',
    },
    gameSummarySection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'white',
        padding: 20,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
    },
    playerScoreSection: {
        alignItems: 'center',
        flex: 1,
    },
    totalScore: {
        fontSize: 32,
        fontFamily: 'DMSans_700Bold',
        color: '#0E5B37',
        marginTop: 4,
    },
    winnerSection: {
        alignItems: 'center',
        flex: 1,
    },
    trophyIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    congratsText: {
        fontSize: 12,
        fontFamily: 'DMSans_700Bold',
        color: '#333',
        marginBottom: 2,
    },
    winnerName: {
        fontSize: 14,
        fontFamily: 'DMSans_700Bold',
        color: '#333',
    },
    gamesSection: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        marginBottom: 8,
        marginTop: 8,
        borderRadius: 12,
        padding: 16,
    },
    gameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 12,
    },
    gameLabel: {
        fontSize: 12,
        fontFamily: 'DMSans_600SemiBold',
        color: '#333',
        width: 30,
    },
    scoreBarsContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    scoreBarContainer: {
        flex: 1,
        position: 'relative',
        height: 9,
        backgroundColor: '#f0f0f0',
        borderRadius: 4,
        marginHorizontal: 2,
    },
    scoreBar: {
        height: '100%',
        borderRadius: 4,
    },
    player1Bar: {
        backgroundColor: '#FF8C00',
    },
    player2Bar: {
        backgroundColor: '#87CEEB',
    },
    maxScoreText: {
        position: 'absolute',
        fontSize: 10,
        fontFamily: 'DMSans_400Regular',
        color: '#666',
        top: -16,
    },
    scoreText: {
        fontSize: 12,
        fontFamily: 'DMSans_600SemiBold',
        color: '#333',
        width: 50,
        textAlign: 'right',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#E0E0E0',
        padding: 16,
    },
    confirmButton: {
        width: 150,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#4CAF50',
        alignItems: 'center',
        justifyContent: 'center',
    },
    disputeButton: {
        width: 150,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButtonText: {
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
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e0e0e0',
    },
    profileImagePlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#0E5B37',
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileInitial: {
        fontSize: 14,
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
    buttonDisabled: {
        opacity: 0.6,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
});
