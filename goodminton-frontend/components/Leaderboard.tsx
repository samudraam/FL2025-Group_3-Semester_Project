import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { usersAPI } from '../services/api';

/**
 * Leaderboard entry interface
 */
interface LeaderboardEntry {
    _id: string;
    email: string;
    profile: {
        displayName: string;
        points: number;
        fullName?: string;
        avatar?: string;
    };
}

/**
 * Leaderboard component displays a ranked list of players with their points
 * Shows rank, username, and points in a clean table format
 */
export default function Leaderboard() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    /**
     * Fetch leaderboard data from API
     */
    const fetchLeaderboard = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }

            const response = await usersAPI.getLeaderboard();
            if (response.success) {
                setLeaderboard(response.leaderboard || []);
            } else {
                console.error('Failed to fetch leaderboard:', response);
                setLeaderboard([]);
            }
        } catch (error: any) {
            console.error('Failed to fetch leaderboard:', error);
            setLeaderboard([]);
            Alert.alert('Error', error.response?.data?.error || 'Failed to load leaderboard');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    /**
     * Handle manual refresh triggered by pull-to-refresh gesture
     */
    const handleRefresh = () => {
        fetchLeaderboard(true);
    };

    /**
     * Fetch leaderboard on component mount
     */
    useEffect(() => {
        fetchLeaderboard();
    }, []);

    /**
     * Render profile image or placeholder
     */
    const ProfileImage = ({ displayName, avatarUri }: { displayName: string; avatarUri?: string }) => (
        <View style={styles.profileImageContainer}>
            {avatarUri ? (
                <Text style={styles.profileInitial}>{displayName.charAt(0).toUpperCase()}</Text>
            ) : (
                <Text style={styles.profileInitial}>{displayName.charAt(0).toUpperCase()}</Text>
            )}
        </View>
    );

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
                    <Text style={styles.headerText3}>POINTS</Text>
                </View>
                
                {/* Separator Line */}
                <View style={styles.separatorLine} />

                {/* Table Rows */}
                {leaderboard.map((entry, index) => {
                    const rank = index + 1;
                    const isTopThree = rank <= 3;
                    
                    return (
                        <View key={entry._id}>
                            <View style={styles.tableRow}>
                                {/* Rank Column */}
                                <View style={styles.rankColumn}>
                                    <Text style={[styles.rankText, isTopThree && styles.topThreeRank]}>
                                        {rank}
                                    </Text>
                                </View>

                                {/* User Column */}
                                <View style={styles.userColumn}>
                                    <ProfileImage 
                                        displayName={entry.profile.displayName}
                                        avatarUri={entry.profile.avatar}
                                    />
                                    <Text style={[styles.userName, isTopThree && styles.topThreeUser]}>
                                        {entry.profile.displayName}
                                    </Text>
                                </View>

                                {/* Points Column */}
                                <View style={styles.pointsColumn}>
                                    <Text style={[styles.pointsText, isTopThree && styles.topThreePoints]}>
                                        {entry.profile.points}
                                    </Text>
                                </View>
                            </View>
                            
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
        width: 60,
        alignItems: 'center',
    },
    rankText: {
        fontSize: 16,
        fontFamily: 'DMSans_700Bold',
        color: '#333',
    },
    topThreeRank: {
        color: '#0E5B37',
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
