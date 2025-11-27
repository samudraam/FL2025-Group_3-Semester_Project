import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import ProfileSectionCard from "../../components/user-profile/ProfileSectionCard";
import ProfileAvatarCard from "../../components/user-profile/ProfileAvatarCard";
import ProfileStatBadge from "../../components/user-profile/ProfileStatBadge";
import ProfileRankingCard from "../../components/user-profile/ProfileRankingCard";
import { useAuth } from "../../services/authContext";

/**
 * Personal profile screen with avatar controls and headline stats.
 */
export default function ProfileScreen() {
  const { user } = useAuth();
  const [avatarUri, setAvatarUri] = useState<string | undefined>(
    user?.profile?.avatar
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [followingCount, setFollowingCount] = useState<number | null>(null);

  const displayName = user?.profile?.displayName || user?.email || "Player";
  const levelName = user?.profile?.level || "recreational";
  const rankingPoints = Math.max(1, Math.round(user?.profile?.points || 1200));
  const matchesPlayed = Math.max(10, Math.round(rankingPoints / 5));
  const matchesWon = Math.round(matchesPlayed * 0.6);
  const winRate =
    matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;

  useEffect(() => {
    setAvatarUri(user?.profile?.avatar);
  }, [user?.profile?.avatar]);

  useEffect(() => {
    let isMounted = true;

    const loadFollowingCount = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        if (isMounted) {
          setFollowingCount(0);
        }
      } catch (error) {
        console.error("Failed to load following count:", error);
        if (isMounted) {
          setFollowingCount(0);
        }
      }
    };

    loadFollowingCount();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleImageSelection = useCallback(
    async (source: "camera" | "library") => {
      try {
        const permission =
          source === "camera"
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            "Permission needed",
            "Please allow Goodminton to access your camera and photos to update your profile picture."
          );
          return;
        }

        const pickerResult =
          source === "camera"
            ? await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                quality: 0.7,
              })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.7,
              });

        if (pickerResult.canceled || pickerResult.assets.length === 0) {
          return;
        }

        setIsUploadingAvatar(true);
        setAvatarUri(pickerResult.assets[0].uri);
        await new Promise((resolve) => setTimeout(resolve, 600));
      } catch (error) {
        console.error("Image picker error:", error);
        Alert.alert(
          "Something went wrong",
          "We couldn't update your profile photo. Please try again."
        );
      } finally {
        setIsUploadingAvatar(false);
      }
    },
    []
  );

  const handleChangePhoto = useCallback(() => {
    Alert.alert("Update photo", "Choose a source", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Camera",
        onPress: () => handleImageSelection("camera"),
      },
      {
        text: "Photo Library",
        onPress: () => handleImageSelection("library"),
      },
    ]);
  }, [handleImageSelection]);

  const handleBackPress = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            style={styles.backButton}
            onPress={handleBackPress}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>

        <ProfileSectionCard title="Profile summary">
          <ProfileAvatarCard
            displayName={displayName}
            avatarUri={avatarUri}
            onEditPress={handleChangePhoto}
            isUploading={isUploadingAvatar}
          />
          <View style={styles.identityBlock}>
            <Text style={styles.displayName}>{displayName}</Text>
            {user?.email ? (
              <Text style={styles.emailText}>{user.email}</Text>
            ) : null}
          </View>
          <View style={styles.statRow}>
            <ProfileStatBadge label="ranking" value={`#${rankingPoints}`} />
            <ProfileStatBadge label="level" value={levelName} />
            <ProfileStatBadge
              label="following"
              value={
                followingCount === null ? "..." : String(followingCount || 0)
              }
            />
          </View>
        </ProfileSectionCard>

        <ProfileSectionCard title="Performance overview">
          <ProfileRankingCard
            rankPosition={rankingPoints}
            levelName={levelName}
            winRate={winRate}
            matchesPlayed={matchesPlayed}
            matchesWon={matchesWon}
          />
        </ProfileSectionCard>

        <ProfileSectionCard title="Connections">
          <View style={styles.connectionRow}>
            <View style={styles.connectionItem}>
              <Text style={styles.connectionLabel}>Followers</Text>
              <Text style={styles.connectionValue}>—</Text>
            </View>
            <View style={styles.connectionItem}>
              <Text style={styles.connectionLabel}>Following</Text>
              <Text style={styles.connectionValue}>
                {followingCount === null ? "..." : String(followingCount || 0)}
              </Text>
            </View>
          </View>
          <Text style={styles.connectionHint}>
            We will sync live numbers as soon as the follow service goes online.
          </Text>
        </ProfileSectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginRight: 12,
  },
  backIcon: {
    fontSize: 20,
    color: "#0E5B37",
    fontFamily: "DMSans_700Bold",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
  },
  identityBlock: {
    alignItems: "center",
    marginBottom: 20,
  },
  displayName: {
    fontSize: 26,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
  },
  emailText: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: "#4C7D69",
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
  },
  connectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  connectionItem: {
    flex: 1,
    backgroundColor: "#F2FBF6",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#C2E3D2",
  },
  connectionLabel: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: "#4C7D69",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  connectionValue: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
    marginTop: 6,
  },
  connectionHint: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: "#6D7A72",
  },
});
