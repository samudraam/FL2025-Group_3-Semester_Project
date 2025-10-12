import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';

/**
 * Game request interface for type safety
 */
interface GameRequest {
    id: string;
    username: string;
    avatarUri?: string;
    date: string;
    time: string;
}

/**
 * GameRequests component displays a scrollable list of pending game requests
 * Each request shows player info and accept/decline buttons
 */
export default function GameRequests() {
    /**
     * Mock game requests data
     */
    const gameRequests: GameRequest[] = [
        {
            id: '1',
            username: 'amber-markdown',
            avatarUri: undefined,
            date: 'Sat, Oct 12',
            time: '12:30PM',
        },
        {
            id: '2', 
            username: 'ryan-C-RUST',
            avatarUri: undefined,
            date: 'Sat, Oct 12',
            time: '02:00PM',
        },
        {
            id: '3',
            username: 'tayl0r_Swift',
            avatarUri: undefined,
            date: 'Sun, Oct 13',
            time: '10:00AM',
        },
    ];

    /**
     * Handle accepting a game request
     */
    const handleAcceptRequest = (requestId: string) => {
        console.log('Accepting request:', requestId);
        // TODO: Implement accept logic
    };

    /**
     * Handle declining a game request
     */
    const handleDeclineRequest = (requestId: string) => {
        console.log('Declining request:', requestId);
        // TODO: Implement decline logic
    };

    /**
     * Render accept button with checkmark icon
     */
    const AcceptButton = ({ onPress }: { onPress: () => void }) => (
        <Pressable style={styles.acceptButton} onPress={onPress}>
            <Text style={styles.checkmark}>✓</Text>
        </Pressable>
    );

    /**
     * Render decline button with X icon
     */
    const DeclineButton = ({ onPress }: { onPress: () => void }) => (
        <Pressable style={styles.declineButton} onPress={onPress}>
            <Text style={styles.xMark}>✕</Text>
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

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Game Requests</Text>
            
            <ScrollView 
                style={styles.requestsList}
                showsVerticalScrollIndicator={false}
            >
                {gameRequests.map((request) => (
                    <View key={request.id} style={styles.requestItem}>
                        <ProfileImage 
                            username={request.username} 
                            avatarUri={request.avatarUri} 
                        />
                        
                        <View style={styles.requestInfo}>
                            <Text style={styles.username}>{request.username}</Text>
                            <Text style={styles.requestText}>
                                Requests Match on {request.date} @ {request.time}
                            </Text>
                        </View>
                        
                        <View style={styles.actionButtons}>
                            <DeclineButton 
                                onPress={() => handleDeclineRequest(request.id)} 
                            />
                            <AcceptButton 
                                onPress={() => handleAcceptRequest(request.id)} 
                            />
                        </View>
                    </View>
                ))}
                
                {/* Empty state if no requests */}
                {gameRequests.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No pending game requests</Text>
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
    requestsList: {
        flex: 1,
    },
    requestItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E0E0E0',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
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
    requestInfo: {
        flex: 1,
        marginRight: 12,
    },
    username: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        color: '#333',
        marginBottom: 2,
    },
    requestText: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        color: '#666',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    acceptButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#4CAF50',
        alignItems: 'center',
        justifyContent: 'center',
    },
    declineButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmark: {
        fontSize: 16,
        fontFamily: 'DMSans_700Bold',
        color: 'white',
    },
    xMark: {
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
});
