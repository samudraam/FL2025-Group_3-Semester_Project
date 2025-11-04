import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { usersAPI } from '../services/api';
import { fetchWithRetry } from '../services/apiHelpers';
import { apiCache } from '../services/apiCache';

/**
 * Leaderboard entry interface
 * Updated to match new ratings-based API response
 */
interface LeaderboardEntry {
    _id: string;
    displayName: string;
    ratings?: {
        singles: number;
        doubles: number;
        mixed: number;
    };
    gender: string;
}

/**
 * Leaderboard props interface
 */
interface LeaderboardProps {
    discipline?: 'singles' | 'doubles' | 'mixed';
}

/**
 * Leaderboard component displays a ranked list of players with their ratings
 * Shows rank, username, and rating for the selected discipline
 */
export default function Leaderboard({ discipline = 'singles' }: LeaderboardProps) {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    /**
     * Fetch leaderboard data from API with retry logic
     */
    const fetchLeaderboard = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }

            const response = await fetchWithRetry(
                () => usersAPI.getLeaderboard(discipline),
                {
                    cacheKey: `leaderboard-${discipline}`,
                    cacheTTL: 60000, // Cache for 1 minute
                    maxRetries: 3,
                    skipCache: isRefresh
                }
            );
            
            if (response.success) {
                console.log('Leaderboard API response:', JSON.stringify(response, null, 2));
                // Validate and normalize the leaderboard data
                const validatedLeaderboard = (response.leaderboard || []).map((entry: any) => ({
                    _id: entry._id,
                    displayName: entry.displayName || entry.profile?.displayName || 'Unknown User',
                    ratings: entry.ratings || { singles: 1000, doubles: 1000, mixed: 1000 },
                    gender: entry.gender || 'unknown'
                }));
                setLeaderboard(validatedLeaderboard);
            } else {
                console.error('Failed to fetch leaderboard:', response);
                setLeaderboard([]);
            }
        } catch (error: any) {
            console.error('Failed to fetch leaderboard:', error);
            setLeaderboard([]);
            
            const status = error?.response?.status;
            if (status === 429) {
                Alert.alert('Too Many Requests', 'Please wait a moment before refreshing.');
            } else if (!isRefresh) {
                Alert.alert('Error', error.response?.data?.error || 'Failed to load leaderboard');
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
        apiCache.invalidate(`leaderboard-${discipline}`);
        fetchLeaderboard(true);
    };

    /**
     * Handle row press to navigate to user profile
     */
    const handleRowPress = (entry: LeaderboardEntry) => {
        router.push({
            pathname: '/tabs/profile-viewer',
            params: { 
                userId: entry._id
            }
        });
    };

    /**
     * Fetch leaderboard on component mount and when discipline changes
     * Includes delay to prevent rate limiting
     */
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLeaderboard();
        }, 2000); // 2 second delay to prevent rate limiting
        
        return () => clearTimeout(timer);
    }, [discipline]);

    /**
     * Render profile image or placeholder
     */
    const ProfileImage = ({ displayName }: { displayName?: string }) => {
        const initial = displayName && displayName.length > 0 
            ? displayName.charAt(0).toUpperCase() 
            : '?';
        
        return (
            <View style={styles.profileImageContainer}>
                <Text style={styles.profileInitial}>{initial}</Text>
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0E5B37" />
                    <Text style={styles.loadingText}>Loading leaderboard...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
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
                {/* Table Header */}
                <View style={styles.tableHeader}>
                    <Text style={styles.headerText1}>RANK</Text>
                    <Text style={styles.headerText2}>USER</Text>
                    <Text style={styles.headerText3}>RATING</Text>
                </View>
                
                {/* Separator Line */}
                <View style={styles.separatorLine} />

                {/* Table Rows */}
                {leaderboard.map((entry, index) => {
                    const rank = index + 1;
                    const isTopThree = rank <= 3;
                    
                    return (
                        <View key={entry._id}>
                            <Pressable 
                                style={styles.tableRow}
                                onPress={() => handleRowPress(entry)}
                                android_ripple={{ color: '#E8F5E8' }}
                            >
                                {/* Rank Column */}
                                <View style={styles.rankColumn}>
                                    <Text style={[styles.rankText, isTopThree && styles.topThreeRank]}>
                                        {rank}
                                    </Text>
                                </View>

                                {/* User Column */}
                                <View style={styles.userColumn}>
                                    <ProfileImage 
                                        displayName={entry.displayName}
                                    />
                                    <Text style={[styles.userName, isTopThree && styles.topThreeUser]}>
                                        {entry.displayName || 'Unknown User'}
                                    </Text>
                                </View>

                                {/* Rating Column */}
                                <View style={styles.pointsColumn}>
                                    <Text style={[styles.pointsText, isTopThree && styles.topThreePoints]}>
                                        {entry.ratings?.[discipline]}
                                    </Text>
                                </View>
                            </Pressable>
                            
                            {/* Row Separator (except for last row) */}
                            {index < leaderboard.length - 1 && (
                                <View style={styles.rowSeparator} />
                            )}
                        </View>
                    );
                })}

                {/* Empty state if no leaderboard data */}
                {leaderboard.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No leaderboard data available</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    scrollView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        fontSize: 16,
        fontFamily: 'DMSans_400Regular',
        color: '#666',
        marginTop: 12,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 12,
        backgroundColor: 'white',
        borderRadius: 8,
        marginBottom: 0,
    },
    headerText1: {
        fontSize: 14,
        marginLeft: 5,
        marginRight: 20,
        fontFamily: 'DMSans_600SemiBold',
        color: '#999',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    headerText2: {
        fontSize: 14,
        marginRight: 170,
        fontFamily: 'DMSans_600SemiBold',
        color: '#999',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    headerText3: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        color: '#999',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    separatorLine: {
        height: 1,
        backgroundColor: '#0E5B37',
        marginHorizontal: 12,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        backgroundColor: 'white',
        minHeight: 60,
    },
    rankColumn: {
        width: 30,
        alignItems: 'center',
    },
    rankText: {
        fontSize: 15,
        fontFamily: 'DMSans_400Regular',
        color: '#333',
    },
    topThreeRank: {
        color: '#0E5B37',
        fontFamily: 'DMSans_700Bold',
        fontSize: 18,
    },
    userColumn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 12,
    },
    profileImageContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#0E5B37',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    profileInitial: {
        fontSize: 14,
        fontFamily: 'DMSans_700Bold',
        color: 'white',
    },
    userName: {
        fontSize: 16,
        fontFamily: 'DMSans_700Bold',
        color: '#333',
        flex: 1,
    },
    topThreeUser: {
        color: '#0E5B37',
        fontSize: 17,
    },
    pointsColumn: {
        width: 80,
        alignItems: 'flex-end',
    },
    pointsText: {
        fontSize: 16,
        fontFamily: 'DMSans_400Regular',
        color: '#666',
        fontStyle: 'italic',
    },
    topThreePoints: {
        color: '#0E5B37',
        fontFamily: 'DMSans_600SemiBold',
    },
    rowSeparator: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginLeft: 12,
        marginRight: 12,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyStateText: {
        fontSize: 16,
        fontFamily: 'DMSans_400Regular',
        color: '#666',
    },
});
