import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useAuth } from "../../services/authContext";
import { useSocket } from "../../services/socketContext";
import { router } from "expo-router";
import BottomNavPill from "../../components/BottomNavPill";
import {
  HomeIcon,
  RankingsIcon,
  CommunityIcon,
  CourtsIcon,
  PlayIcon,
} from "../../components/NavIcons";
import ProfileHeader from "../../components/ProfileHeader";
import WeeklyCalendar from "../../components/WeeklyCalendar";
import GameRequests from "../../components/GameRequests";
import FriendRequests from "../../components/FriendRequests";
import NotificationToast from "../../components/NotificationToast";
import { apiCache } from "../../services/apiCache";

export default function Home() {
  const { user, logout } = useAuth();
  const { notifications, removeNotification } = useSocket();
  const [activeTab, setActiveTab] = useState("home");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSettingsPress = () => {
    router.push("/tabs/settings");
  };

  const handleNotificationPress = () => {
    console.log("Notifications pressed");
  };

  const handleMessagePress = () => {
    router.push("/chat/messages");
  };

  /**
   * Handle pull-to-refresh gesture
   * Clears caches and triggers component refreshes without remounting
   */
  const handleRefresh = async () => {
    console.log(
      "🔄 Home pull-to-refresh triggered - clearing caches and triggering refresh"
    );
    setIsRefreshing(true);

    try {
      // Clear all relevant caches to force fresh data
      apiCache.invalidate("friend-requests");
      apiCache.invalidate("game-confirmations");
      apiCache.invalidate("weekly-games-calendar");
      apiCache.invalidate("leaderboard");

      // Trigger refresh without remounting components
      setRefreshTrigger((prev) => prev + 1);

      // Add a small delay to show the refresh animation
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Handle navigation between tabs
   */
  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);

    // Navigate to the appropriate screen
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

  /**
   * Navigation items configuration
   */
  const navItems = [
    {
      id: "community",
      label: "community",
      icon: <CommunityIcon />,
    },
    {
      id: "rankings",
      label: "rankings",
      icon: <RankingsIcon />,
    },
    {
      id: "home",
      label: "home",
      icon: <HomeIcon />,
    },
    {
      id: "play",
      label: "play",
      icon: <PlayIcon />,
    },
    {
      id: "courts",
      label: "courts",
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
        onMessagePress={handleMessagePress}
      />

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#0E5B37"
            colors={["#0E5B37"]}
          />
        }
      >
        <View style={styles.componentContainer}>
          <WeeklyCalendar refreshTrigger={refreshTrigger} />
        </View>
        <View style={styles.componentContainer}>
          <FriendRequests refreshTrigger={refreshTrigger} />
        </View>
        <View style={styles.componentContainer}>
          <GameRequests refreshTrigger={refreshTrigger} />
        </View>
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
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 120, // Space for bottom navigation
  },
  componentContainer: {
    marginBottom: 10, // Small gap between components
  },
});
