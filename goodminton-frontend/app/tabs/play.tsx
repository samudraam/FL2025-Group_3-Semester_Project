import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useAuth } from "../../services/authContext";
import BottomNavPill from "../../components/BottomNavPill";
import {
  HomeIcon,
  RankingsIcon,
  CommunityIcon,
  CourtsIcon,
  PlayIcon,
} from "../../components/NavIcons";
import { router } from "expo-router";
import ProfileHeader from "../../components/ProfileHeader";
import AddFriend from "../../components/AddFriend";
import FriendsList from "../../components/FriendsList";

type CommunitiesSectionProps = {
  onCreatePress: () => void;
};

/**
 * Renders the placeholder communities UI inside the Play tab until backend
 * endpoints are available.
 */
const CommunitiesSection = ({ onCreatePress }: CommunitiesSectionProps) => {
  return (
    <View>
      <View style={styles.communityHeaderContainer}>
        <Text style={styles.communityHeaderTitle}>Build a Community</Text>
      </View>
      <View style={styles.communitiesContainer}>
        <Text style={styles.communitiesDescription}>
          Discover, join, and build badminton communities. We're preparing the
          experience now.
        </Text>
        <TouchableOpacity
          style={styles.createCommunityButton}
          onPress={onCreatePress}
          accessibilityRole="button"
          accessibilityLabel="Create a new community"
          activeOpacity={0.85}
        >
          <Text style={styles.createCommunityButtonText}>Create Community</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function Play() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("play");
  const [activeSection, setActiveSection] = useState<"friends" | "communities">(
    "friends"
  );

  /**
   * Handles navigation between tabs in the bottom navigation pill
   * Updates the active tab state and navigates to the appropriate route
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

  const handleSettingsPress = () => {
    router.push("/tabs/settings");
  };

  /**
   * Handles notification icon press
   * Future implementation: Navigate to notifications screen
   */
  const handleNotificationPress = () => {
    console.log("Notifications pressed");
  };

  const handleProfilePress = () => {
    router.push("/profile");
  };

  /**
   * Displays the friends-focused tooling in the Play tab.
   */
  const handleFriendsSectionPress = () => {
    setActiveSection("friends");
  };

  /**
   * Displays the community management tooling in the Play tab.
   */
  const handleCommunitiesSectionPress = () => {
    setActiveSection("communities");
  };

  /**
   * Placeholder action until community creation is available via backend support.
   */
  const handleCreateCommunityPress = () => {
    Alert.alert("Coming Soon", "Community creation is on the way!");
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
        username={user?.profile?.displayName || user?.email || "JSONderulo"}
        profileImageUri={user?.profile?.avatar}
        onSettingsPress={handleSettingsPress}
        onNotificationPress={handleNotificationPress}
        onMessagePress={handleMessagePress}
        onProfilePress={handleProfilePress}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Play</Text>
        </View>
        <View style={styles.sectionToggleContainer}>
          <TouchableOpacity
            style={[
              styles.sectionButton,
              activeSection === "friends" && styles.sectionButtonActive,
            ]}
            onPress={handleFriendsSectionPress}
            accessibilityRole="button"
            accessibilityLabel="Show play tools for friends"
            accessibilityState={{ selected: activeSection === "friends" }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.sectionButtonText,
                activeSection === "friends" && styles.sectionButtonTextActive,
              ]}
            >
              Friends
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sectionButton,
              activeSection === "communities" && styles.sectionButtonActive,
            ]}
            onPress={handleCommunitiesSectionPress}
            accessibilityRole="button"
            accessibilityLabel="Show play tools for communities"
            accessibilityState={{ selected: activeSection === "communities" }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.sectionButtonText,
                activeSection === "communities" &&
                  styles.sectionButtonTextActive,
              ]}
            >
              Communities
            </Text>
          </TouchableOpacity>
        </View>
        {activeSection === "friends" ? (
          <>
            <AddFriend />
            <FriendsList />
          </>
        ) : (
          <CommunitiesSection onCreatePress={handleCreateCommunityPress} />
        )}
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 150,
    paddingTop: 0,
  },
  titleContainer: {
    backgroundColor: "#A8DADB",
    padding: 20,
    width: "100%",
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
    textAlign: "center",
  },
  sectionToggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
  },
  sectionButtonActive: {
    backgroundColor: "#0E5B37",
    borderColor: "#0E5B37",
  },
  sectionButtonText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionButtonTextActive: {
    color: "white",
  },
  communitiesContainer: {
    backgroundColor: "white",
    padding: 20,
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  communitiesDescription: {
    fontSize: 16,
    fontFamily: "DMSans_400Regular",
    color: "#333",
    marginBottom: 20,
    lineHeight: 22,
  },
  createCommunityButton: {
    height: 50,
    backgroundColor: "#FF8C00",
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  createCommunityButtonText: {
    color: "white",
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
  },
  communityHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  communityHeaderTitle: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
  },
});
