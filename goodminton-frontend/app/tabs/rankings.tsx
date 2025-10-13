import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../../services/authContext';
import BottomNavPill from '../../components/BottomNavPill';
import { HomeIcon, RankingsIcon, CommunityIcon, CourtsIcon } from '../../components/NavIcons';
import ProfileHeader from '../../components/ProfileHeader';
import Leaderboard from '../../components/Leaderboard';
import { router } from 'expo-router';

/**
 * Rankings screen - displays player rankings and leaderboards
 */
export default function Rankings() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('rankings');

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

    const navItems = [
        { id: 'home', label: 'home', icon: <HomeIcon /> },
        { id: 'rankings', label: 'rankings', icon: <RankingsIcon /> },
        { id: 'community', label: 'community', icon: <CommunityIcon /> },
        { id: 'courts', label: 'courts', icon: <CourtsIcon /> },
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
                <View style={styles.headerSection}>
                    <Text style={styles.title}>Player Rankings</Text>
                    <Text style={styles.subtitle}>Your Freindliest Competitors</Text>
                </View>
                
                <Leaderboard />
            </ScrollView>
            
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
    scrollContent: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingBottom: 120, // Space for bottom navigation
    },
    headerSection: {
        paddingHorizontal: 20,
        backgroundColor: '#E0E0E0',
        paddingVertical: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontFamily: 'DMSans_700Bold',
        color: '#0E5B37',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'DMSans_400Regular',
        color: '#666',
        textAlign: 'center',
    },
});
