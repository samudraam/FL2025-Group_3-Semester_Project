import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../services/authContext';
import BottomNavPill from '../../components/BottomNavPill';
import { HomeIcon, RankingsIcon, CommunityIcon, CourtsIcon, PlayIcon } from '../../components/NavIcons';
import ProfileHeader from '../../components/ProfileHeader';

export default function Community() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('community');

  const handleSettingsPress = () => {
    console.log('Settings pressed');
  };

  const handleNotificationPress = () => {
    console.log('Notifications pressed');
  };

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
        username={user?.profile?.displayName || user?.email || 'JSONderulo'}
        onSettingsPress={handleSettingsPress}
        onNotificationPress={handleNotificationPress}
      />

      <View style={styles.content}>
        <Text style={styles.title}>Community</Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Coming soon</Text>
        </View>
      </View>

      <BottomNavPill items={navItems} activeTab={activeTab} onTabPress={handleTabPress} />
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'DMSans_700Bold',
    color: '#0E5B37',
    marginBottom: 12,
  },
  placeholder: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 40,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  placeholderText: {
    fontSize: 18,
    fontFamily: 'DMSans_500Medium',
    color: '#666666',
  },
});
