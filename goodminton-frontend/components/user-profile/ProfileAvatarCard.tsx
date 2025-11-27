import React, { memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";

/**
 * Displays the user's avatar with a change-photo action.
 */
interface ProfileAvatarCardProps {
  displayName: string;
  avatarUri?: string;
  onEditPress: () => void;
  isUploading?: boolean;
}

const ProfileAvatarCard = ({
  displayName,
  avatarUri,
  onEditPress,
  isUploading = false,
}: ProfileAvatarCardProps) => {
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.avatarWrapper}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
        )}
      </View>
      <Pressable
        style={styles.editButton}
        onPress={onEditPress}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
        disabled={isUploading}
      >
        {isUploading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.editButtonText}>Change Photo</Text>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 16,
  },
  avatarWrapper: {
    marginBottom: 12,
    borderRadius: 80,
    padding: 4,
    backgroundColor: "#E3F5EC",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#0E5B37",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: 40,
    fontFamily: "DMSans_700Bold",
    color: "white",
  },
  editButton: {
    backgroundColor: "#0E5B37",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    minWidth: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonText: {
    color: "white",
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
  },
});

export default memo(ProfileAvatarCard);
