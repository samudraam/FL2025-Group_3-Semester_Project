import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import GradientComponent from './GradientComponent';

/**
 * Game interface for type safety
 */
interface Game {
    id: string;
    time: string;
    duration: string;
    players: string[];
    scores: number[];
    result: 'win' | 'loss';
}

/**
 * WeeklyCalendar component displays a week view with game data and match details
 * Shows gradient banner, day selector, and game details for selected day
 */
export default function WeeklyCalendar() {
    const [selectedDay, setSelectedDay] = useState(6); // Start with Saturday (current day)

    /**
     * Mock game data for the week
     */
    const weeklyGames = {
        0: [
            {
                id: '1',
                time: '12:30PM - 01:45PM',
                duration: '1h 15m',
                players: ['JSONderulo', 'ryan-C-RUST', 'tayl0r_Swift', 'amber-markdown'],
                scores: [2, 1],
                result: 'win' as const,
            },
            {
                id: '2', 
                time: '01:50PM - 02:55PM',
                duration: '1h 5m',
                players: ['JSONderulo', 'ryan-C-RUST', 'tayl0r_Swift', 'amber-markdown'],
                scores: [2, 1],
                result: 'win' as const,
            },
            {
                id: '3',
                time: '03:00PM - 04:15PM', 
                duration: '1h 15m',
                players: ['JSONderulo', 'ryan-C-RUST', 'tayl0r_Swift', 'amber-markdown'],
                scores: [0, 2],
                result: 'loss' as const,
            }
        ], // Sunday
        1: [], // Monday  
        2: [], // Tuesday
        3: [
            {
                id: '1',
                time: '12:30PM - 01:45PM',
                duration: '1h 15m',
                players: ['JSONderulo', 'ryan-C-RUST', 'tayl0r_Swift', 'amber-markdown'],
                scores: [2, 1],
                result: 'win' as const,
            },
            {
                id: '2', 
                time: '01:50PM - 02:55PM',
                duration: '1h 5m',
                players: ['JSONderulo', 'ryan-C-RUST', 'tayl0r_Swift', 'amber-markdown'],
                scores: [2, 1],
                result: 'win' as const,
            },
            {
                id: '3',
                time: '03:00PM - 04:15PM', 
                duration: '1h 15m',
                players: ['JSONderulo', 'ryan-C-RUST', 'tayl0r_Swift', 'amber-markdown'],
                scores: [0, 2],
                result: 'loss' as const,
            }
        ], // Wednesday
        4: [], // Thursday
        5: [], // Friday
        6: [ // Saturday (current day)
            {
                id: '1',
                time: '12:30PM - 01:45PM',
                duration: '1h 15m',
                players: ['JSONderulo', 'ryan-C-RUST', 'tayl0r_Swift', 'amber-markdown'],
                scores: [2, 1],
                result: 'win' as const,
            },
            {
                id: '2', 
                time: '01:50PM - 02:55PM',
                duration: '1h 5m',
                players: ['JSONderulo', 'ryan-C-RUST', 'tayl0r_Swift', 'amber-markdown'],
                scores: [2, 1],
                result: 'win' as const,
            },
            {
                id: '3',
                time: '03:00PM - 04:15PM', 
                duration: '1h 15m',
                players: ['JSONderulo', 'ryan-C-RUST', 'tayl0r_Swift', 'amber-markdown'],
                scores: [0, 2],
                result: 'loss' as const,
            }
        ]
    };

    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const selectedGames = weeklyGames[selectedDay as keyof typeof weeklyGames] || [];
    const wins = selectedGames.filter(game => game.result === 'win').length;
    const totalMatches = selectedGames.length;

    /**
     * Check if a day is today
     */
    const isToday = (dayIndex: number) => {
    const today = new Date().getDay();
    return dayIndex === today;
    };

    /**
     * Get day color based on whether it has games and if it's today
     */
    const getDayColor = (dayIndex: number) => {
        const hasGames = weeklyGames[dayIndex as keyof typeof weeklyGames]?.length > 0;
        const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        if (today === dayIndex) {
            return '#4CAF50'; // Today gets green background
        } else if (hasGames) {
            return '#FFC4EB'; // Days with games pink
        } else {
            return '#EAEAEA'; // No games gray
        }
    };

    return (
        <View style={styles.container}>
            {/* Banner */}
            <View style={styles.banner}>
                <GradientComponent>
                    <Text style={styles.bannerTitle}>Your personal badminton journey recorded.</Text>
                    <Text style={styles.bannerSubtitle}>
                        Track your progress, see your wins, and view your upcoming games.
                    </Text>
                </GradientComponent>
            </View>

            {/* Week Header */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Games This Week</Text>
                
                {/* Day Selector */}
                <View style={styles.daySelector}>
                    {dayLabels.map((day, index) => (
                        <Pressable
                            key={index}
                            style={[
                                styles.dayButton,
                                { backgroundColor: getDayColor(index) },
                                selectedDay === index && styles.selectedBorder
                            ]}
                            onPress={() => setSelectedDay(index)}
                        >
                            <Text style={[
                                styles.dayLabel,
                                { color: isToday(index) ? 'white' : '#666' }
                            ]}>
                                {day}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {/* Game Details */}
                {selectedGames.length > 0 && (
                    <View style={styles.gameDetailsContainer}>
                        {/* Win/Loss Summary */}
                        <View style={styles.summaryHeader}>
                            <Text style={styles.summaryText}>
                                {wins}/{totalMatches} MATCHES WON
                            </Text>
                            <Text style={styles.expandIcon}>⌄</Text>
                        </View>

                        {/* Game List */}
                        <ScrollView style={styles.gameList} showsVerticalScrollIndicator={false}>
                            {selectedGames.map((game) => (
                                <View key={game.id} style={styles.gameItem}>
                                    <Text style={styles.gameTime}>{game.time}</Text>
                                    <View style={styles.gamePlayers}>
                                        <Text style={styles.playerNames}>
                                            {game.players.slice(0, 2).join(' | ')}
                                        </Text>
                                        <Text style={styles.vsText}>vs</Text>
                                        <Text style={styles.playerNames}>
                                            {game.players.slice(2, 4).join(' | ')}
                                        </Text>
                                    </View>
                                    <View style={styles.scoreContainer}>
                                        <Text style={[
                                            styles.score,
                                            game.result === 'win' ? styles.winScore : styles.lossScore
                                        ]}>
                                            {game.scores[0]}
                                        </Text>
                                        <Text style={styles.scoreSeparator}>-</Text>
                                        <Text style={[
                                            styles.score,
                                            game.result === 'loss' ? styles.winScore : styles.lossScore
                                        ]}>
                                            {game.scores[1]}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* No games message */}
                {selectedGames.length === 0 && (
                    <View style={styles.noGamesContainer}>
                        <Text style={styles.noGamesText}>No games played on this day</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f5f5f5',
    },
    banner: {
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 12,
        overflow: 'hidden',
    },
    bannerTitle: {
        fontSize: 20,
        fontFamily: 'DMSans_700Bold',
        color: 'white',
        marginBottom: 8,
    },
    bannerSubtitle: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: 'white',
        opacity: 0.9,
    },
    section: {
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'DMSans_700Bold',
        color: '#0E5B37',
        marginBottom: 16,
    },
    daySelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#F5A623',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    dayButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayLabel: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
    },
    gameDetailsContainer: {
        backgroundColor: '#E0E0E0',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        padding: 14,
    },
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    summaryText: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        color: '#666',
    },
    expandIcon: {
        fontSize: 16,
        color: '#666',
    },
    gameList: {
        maxHeight: 200,
    },
    gameItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    gameTime: {
        fontSize: 13,
        fontFamily: 'DMSans_600SemiBold',
        color: '#666',
        marginBottom: 6,
    },
    gamePlayers: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    playerNames: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: '#333',
        flex: 1,
    },
    vsText: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        color: '#666',
        marginHorizontal: 12,
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    score: {
        fontSize: 14,
        fontFamily: 'DMSans_700Bold',
        minWidth: 20,
        textAlign: 'center',
    },
    winScore: {
        color: '#4CAF50',
    },
    lossScore: {
        color: '#FF4444',
    },
    scoreSeparator: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: '#666',
        marginHorizontal: 4,
    },
    noGamesContainer: {
        backgroundColor: '#E0E0E0',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        padding: 20,
        alignItems: 'center',
    },
    noGamesText: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: '#666',
    },
    selectedBorder: {
        borderWidth: 3,
        borderColor: '#6CCCCE', // teal border selector
    },
});
