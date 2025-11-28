import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { router } from "expo-router";
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

export default function Settings() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("home");

  const handleSettingsPress = () => {
    router.push("/tabs/settings");
  };

  const handleNotificationPress = () => {
    console.log("Notifications pressed");
  };

  const handleProfilePress = () => {
    router.push("/profile");
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.replace("/auth/login");
          } catch (error) {
            console.error("Sign out error:", error);
            Alert.alert("Error", "Failed to sign out. Please try again.");
          }
        },
      },
    ]);
  };

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

  return (
    <View style={styles.container}>
      <ProfileHeader
        username={user?.profile?.displayName || user?.email || "JSONderulo"}
        profileImageUri={user?.profile?.avatar}
        onSettingsPress={handleSettingsPress}
        onNotificationPress={handleNotificationPress}
        onProfilePress={handleProfilePress}
      />

      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
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
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
    marginBottom: 24,
  },
  signOutButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: "#e74c3c",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "white",
  },
});
