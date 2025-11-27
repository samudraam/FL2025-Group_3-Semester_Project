import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useAuth } from "../../services/authContext";
import BottomNavPill from "../../components/BottomNavPill";
import {
  HomeIcon,
  RankingsIcon,
  CommunityIcon,
  CourtsIcon,
  PlayIcon,
} from "../../components/NavIcons";
import ProfileHeader from "../../components/ProfileHeader";
import Leaderboard from "../../components/Leaderboard";
import { router } from "expo-router";

/**
 * Rankings screen - displays player rankings and leaderboards
 */
export default function Rankings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("rankings");

  const handleSettingsPress = () => {
    router.push("/tabs/settings");
  };

  /**
   * Handle notification bell press
   */
  const handleNotificationPress = () => {
    console.log("Notifications pressed");
    // TODO: Navigate to notifications screen
  };

  const handleProfilePress = () => {
    router.push("/profile");
  };

  /**
   * Handle navigation between tabs
   */
  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);

    switch (tabId) {
      case "rankings":
        router.replace("/tabs/rankings");
        break;
      case "community":
        router.replace("/tabs/community");
        break;
      case "home":
        router.replace("/tabs");
        break;
      case "courts":
        router.replace("/tabs/courts");
        break;
      case "play":
        router.replace("/tabs/play");
        break;
    }
  };

  const navItems = [
    { id: "community", label: "community", icon: <CommunityIcon /> },
    { id: "rankings", label: "rankings", icon: <RankingsIcon /> },
    { id: "home", label: "home", icon: <HomeIcon /> },
    { id: "play", label: "play", icon: <PlayIcon /> },
    { id: "courts", label: "courts", icon: <CourtsIcon /> },
  ];

  const handleMessagePress = () => {
    router.push("/chat/messages");
  };

  return (
    <View style={styles.container}>
      <ProfileHeader
        username={user?.profile?.displayName || user?.email}
        onSettingsPress={handleSettingsPress}
        onNotificationPress={handleNotificationPress}
        onMessagePress={handleMessagePress}
        onProfilePress={handleProfilePress}
      />

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <View style={styles.headerSection}>
          <Text style={styles.title}>Player Rankings</Text>
        </View>

        <Leaderboard discipline="singles" />
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
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 120, // Space for bottom navigation
  },
  headerSection: {
    paddingHorizontal: 20,
    backgroundColor: "#A8DADB",
    paddingVertical: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
    textAlign: "center",
  },
});
