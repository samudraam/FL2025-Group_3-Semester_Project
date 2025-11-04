import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../services/authContext';
import BottomNavPill from '../../components/BottomNavPill';
import { HomeIcon, RankingsIcon, CommunityIcon, CourtsIcon, PlayIcon } from '../../components/NavIcons';
import { router } from 'expo-router';
import ProfileHeader from '../../components/ProfileHeader';
import AddFriend from '../../components/AddFriend';
import FriendsList from '../../components/FriendsList';


export default function Play() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('play');

    /**
     * Handles navigation between tabs in the bottom navigation pill
     * Updates the active tab state and navigates to the appropriate route
     */
    const handleTabPress = (tabId: string) => {
        setActiveTab(tabId);

        switch (tabId) {
            case 'rankings':
                router.replace('/tabs/rankings');
                break;
            case 'community':
                router.replace('/tabs/community');
                break;
            case 'home':
                router.replace('/tabs');
                break;
            case 'courts':
                router.replace('/tabs/courts');
                break;
            case 'play':
                router.replace('/tabs/play');
                break;
        }
    };

    /**
     * Handles settings icon press
     * Future implementation: Navigate to settings screen
     */
    const handleSettingsPress = () => {
        console.log('Settings pressed');
    };

    /**
     * Handles notification icon press
     * Future implementation: Navigate to notifications screen
     */
    const handleNotificationPress = () => {
        console.log('Notifications pressed');
    };

    const navItems = [
        { id: 'community', label: 'community', icon: <CommunityIcon /> },
        { id: 'rankings', label: 'rankings', icon: <RankingsIcon /> },
        { id: 'home', label: 'home', icon: <HomeIcon /> },
        { id: 'play', label: 'play', icon: <PlayIcon /> },
        { id: 'courts', label: 'courts', icon: <CourtsIcon /> },
    ];

    return (
        <View style={styles.container}>
            <ProfileHeader
                username={user?.profile?.displayName || user?.email || "JSONderulo"}
                onSettingsPress={handleSettingsPress}
                onNotificationPress={handleNotificationPress}
            />

            <View style={styles.content}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>Play</Text>
                </View>
                <AddFriend />
                <FriendsList />
            </View>

            <BottomNavPill
                items={navItems}
                activeTab={activeTab}
                onTabPress={handleTabPress}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        flex: 1,
        paddingTop: 0,
        paddingBottom: 100,
    },
    titleContainer: {
        backgroundColor: '#A8DADB',
        padding: 20,
        width: '100%',
        marginBottom: 10,
    },
    title: {
        fontSize: 24,
        fontFamily: 'DMSans_700Bold',
        color: '#0E5B37',
        textAlign: 'center',
    },
});