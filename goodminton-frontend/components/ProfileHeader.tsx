import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { SettingsIcon, BellIcon, MessageIcon } from "./NavIcons";

/**
 * ProfileHeader component displays user profile information at the top of the screen
 * Includes profile picture, username, current date, and action icons (settings, notifications)
 */
interface ProfileHeaderProps {
  username?: string;
  profileImageUri?: string;
  onSettingsPress?: () => void;
  onNotificationPress?: () => void;
  onMessagePress?: () => void;
}

export default function ProfileHeader({
  username = "JSONderulo",
  profileImageUri,
  onSettingsPress,
  onNotificationPress,
  onMessagePress,
}: ProfileHeaderProps) {
  /**
   * Get current date in the format "Wed, Oct 8 2025"
   */
  const getCurrentDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    return now.toLocaleDateString("en-US", options);
  };

  return (
    <View style={styles.container}>
      {/* Profile Picture */}
      <View style={styles.profileSection}>
        <View style={styles.profileImageContainer}>
          {profileImageUri ? (
            <Image
              source={{ uri: profileImageUri }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileInitial}>
                {username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.date}>{getCurrentDate()}</Text>
          <Text style={styles.username}>{username}</Text>
        </View>
      </View>

      {/* Action Icons */}
      <View style={styles.actionIcons}>
        <Pressable
          style={styles.iconButton}
          onPress={onSettingsPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <SettingsIcon size={25} color="#0E5B37" />
        </Pressable>

        <Pressable
          style={styles.iconButton}
          onPress={onNotificationPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <BellIcon size={25} color="#F5A623" />
        </Pressable>
        <Pressable
          style={styles.iconButton}
          onPress={onMessagePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MessageIcon size={25} color="#0E5B37" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60, // Account for status bar
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  profileImageContainer: {
    marginRight: 12,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e0e0e0",
  },
  profileImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0E5B37",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitial: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: "white",
  },
  userInfo: {
    flex: 1,
  },
  date: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: "#666",
    marginBottom: 2,
  },
  username: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
  },
  actionIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconButton: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
});
