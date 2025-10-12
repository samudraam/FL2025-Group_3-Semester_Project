import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../../services/authContext';
import { useSocket } from '../../services/socketContext';
import { router } from 'expo-router';
import BottomNavPill from '../../components/BottomNavPill';
import { HomeIcon, RankingsIcon, CommunityIcon, CourtsIcon } from '../../components/NavIcons';
import ProfileHeader from '../../components/ProfileHeader';
import WeeklyCalendar from '../../components/WeeklyCalendar';
import GameRequests from '../../components/GameRequests';
import FriendRequests from '../../components/FriendRequests';
import NotificationToast from '../../components/NotificationToast';

export default function Home() {
    const { user, logout } = useAuth();
    const { notifications, removeNotification } = useSocket();
    const [activeTab, setActiveTab] = useState('home');

    /**
     * Handle settings button press
     */
    const handleSettingsPress = () => {
        console.log('Settings pressed');
        // TODO: Navigate to settings screen
    };

    /**
     * Handle notification bell press
     */
    const handleNotificationPress = () => {
        console.log('Notifications pressed');
        // TODO: Navigate to notifications screen
    };

    /**
     * Handle navigation between tabs
     */
    const handleTabPress = (tabId: string) => {
        setActiveTab(tabId);
        
        // Navigate to the appropriate screen
        switch (tabId) {
            case 'home':
                router.replace('/tabs');
                break;
            case 'rankings':
                router.replace('/tabs/rankings');
                break;
            case 'community':
                router.replace('/tabs/community');
                break;
            case 'courts':
                router.replace('/tabs/courts');
                break;
        }
    };

    /**
     * Navigation items configuration
     */
    const navItems = [
        {
            id: 'home',
            label: 'home',
            icon: <HomeIcon />,
        },
        {
            id: 'rankings',
            label: 'rankings',
            icon: <RankingsIcon />,
        },
        {
            id: 'community',
            label: 'community',
            icon: <CommunityIcon />,
        },
        {
            id: 'courts',
            label: 'courts',
            icon: <CourtsIcon />,
        },
    ];

    return (
        <View style={styles.container}>
            {/* Fixed Profile Header */}
            <ProfileHeader 
                username={user?.profile?.displayName || user?.email || "JSONderulo"}
                onSettingsPress={handleSettingsPress}
                onNotificationPress={handleNotificationPress}
            />
            
            {/* Scrollable Content */}
            <ScrollView 
                style={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContentContainer}
            >
                <WeeklyCalendar />
                <FriendRequests />
                <GameRequests />
            </ScrollView>
            
            {/* Custom Bottom Navigation Pill */}
            <BottomNavPill 
                items={navItems}
                activeTab={activeTab}
                onTabPress={handleTabPress}
            />

            {/* Notification Toasts - Display the most recent notification */}
            {notifications.length > 0 && (
                <NotificationToast
                    notification={notifications[0]}
                    onDismiss={removeNotification}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingBottom: 120, // Space for bottom navigation
    },
});
