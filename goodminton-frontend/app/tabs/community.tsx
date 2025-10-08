import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomNavPill from '../../components/BottomNavPill';
import { HomeIcon, RankingsIcon, CommunityIcon, CourtsIcon } from '../../components/NavIcons';
import { router } from 'expo-router';


export default function Community() {
    const [activeTab, setActiveTab] = useState('community');

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
            <View style={styles.content}>
                <Text style={styles.title}>Community</Text>
                <Text style={styles.subtitle}>Coming soon - Connect with other players</Text>
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
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 100,
    },
    title: {
        fontSize: 24,
        fontFamily: 'DMSans_700Bold',
        color: '#0E5B37',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'DMSans_400Regular',
        color: '#666',
    },
});
