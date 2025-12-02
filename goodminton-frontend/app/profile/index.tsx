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
import { PieChart } from "react-native-gifted-charts";
import ProfileSectionCard from "../../components/user-profile/ProfileSectionCard";
import ProfileAvatarCard from "../../components/user-profile/ProfileAvatarCard";
import ProfileStatBadge from "../../components/user-profile/ProfileStatBadge";
import ProfileRankingCard from "../../components/user-profile/ProfileRankingCard";
import { usersAPI } from "../../services/api";
import { useAuth } from "../../services/authContext";

/**
 * Personal profile screen with avatar controls and headline stats.
 */
export default function ProfileScreen() {
  const { user, refreshUser } = useAuth();
  const [avatarUri, setAvatarUri] = useState<string | undefined>(
    user?.profile?.avatar
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const displayName = user?.profile?.displayName || user?.email || "Player";
  const firstName = user?.profile?.firstName || "";
  const lastName = user?.profile?.lastName || "";
  const levelName = user?.profile?.level || "recreational";
  const ratingFallback = { singles: 1000, doubles: 1000, mixed: 1000 };
  const personalRatings = user?.ratings || ratingFallback;
  const rankingPoints = Math.max(1, Math.round(personalRatings.singles));
  const stats = user?.stats;
  const matchesPlayed = Math.max(0, Math.round(stats?.gamesPlayed ?? 0));
  const matchesWon = Math.max(0, Math.round(stats?.gamesWon ?? 0));
  const computedWinRate =
    matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;
  const winRate = Math.min(
    100,
    Math.max(0, Math.round(stats?.winRate ?? computedWinRate))
  );
  const matchesLost = Math.max(0, matchesPlayed - matchesWon);
  const lossRate = Math.max(0, 100 - winRate);
  const ratingBadges = [
    { label: "singles rating", value: Math.round(personalRatings.singles) },
    { label: "doubles rating", value: Math.round(personalRatings.doubles) },
    { label: "mixed rating", value: Math.round(personalRatings.mixed) },
  ];
  const winLossChartData =
    matchesPlayed > 0
      ? [
          {
            value: matchesWon,
            color: "#3CBF6D",
          },
          {
            value: matchesLost,
            color: "#FB7676",
          },
        ]
      : [
          {
            value: 1,
            color: "#C2E3D2",
            text: "No matches yet",
          },
        ];

  useEffect(() => {
    setAvatarUri(user?.profile?.avatar);
  }, [user?.profile?.avatar]);

  const handleImageSelection = useCallback(
    async (source: "camera" | "library") => {
      const fallbackAvatarUri = user?.profile?.avatar || avatarUri;

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
                mediaTypes: "images",
                allowsEditing: true,
                quality: 0.7,
              });

        if (pickerResult.canceled || pickerResult.assets.length === 0) {
          return;
        }

        const selectedAsset = pickerResult.assets[0];

        setIsUploadingAvatar(true);
        setAvatarUri(selectedAsset.uri);

        const formData = new FormData();
        const defaultFileName =
          selectedAsset.fileName || `avatar-${Date.now()}.jpg`;
        const inferredMime =
          selectedAsset.mimeType ||
          (selectedAsset.uri.toLowerCase().endsWith(".png")
            ? "image/png"
            : "image/jpeg");

        formData.append("avatar", {
          uri: selectedAsset.uri,
          name: defaultFileName,
          type: inferredMime,
        } as any);

        const response = await usersAPI.updateAvatar(formData);
        const nextUri = response.avatarUrl || selectedAsset.uri;
        setAvatarUri(nextUri);
        await refreshUser();
        Alert.alert(
          "Profile updated",
          response.message || "Your profile photo has been refreshed."
        );
      } catch (error) {
        console.error("Image picker error:", error);
        setAvatarUri(fallbackAvatarUri);
        Alert.alert(
          "Something went wrong",
          "We couldn't update your profile photo. Please try again."
        );
      } finally {
        setIsUploadingAvatar(false);
      }
    },
    [avatarUri, refreshUser, user?.profile?.avatar]
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
            <Text style={styles.displayName}>
              {firstName} {lastName}
            </Text>
            {user?.email ? (
              <Text style={styles.emailText}>{user.email}</Text>
            ) : null}
          </View>
          <View style={styles.statRow}>
            <ProfileStatBadge label="level" value={levelName} />
          </View>
        </ProfileSectionCard>

        <ProfileSectionCard title="Performance overview">
          <View style={styles.performanceContent}>
            <View style={styles.pieChartBlock}>
              <PieChart
                data={winLossChartData}
                donut
                radius={80}
                innerRadius={55}
                showText
                textColor="#0E5B37"
                textSize={11}
                focusOnPress
                strokeWidth={2}
                strokeColor="#ffffff"
                centerLabelComponent={() => (
                  <View style={styles.centerLabel}>
                    <Text style={styles.centerLabelValue}>{winRate}%</Text>
                    <Text style={styles.centerLabelCaption}>Win rate</Text>
                  </View>
                )}
              />
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#3CBF6D" }]}
                  />
                  <Text style={styles.legendText}>Wins {matchesWon}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#FB7676" }]}
                  />
                  <Text style={styles.legendText}>Losses {matchesLost}</Text>
                </View>
              </View>
            </View>
            <View style={styles.rankingCardWrapper}>
              <ProfileRankingCard
                rankPosition={rankingPoints}
                levelName={levelName}
                winRate={winRate}
                matchesPlayed={matchesPlayed}
                matchesWon={matchesWon}
              />
            </View>
          </View>
        </ProfileSectionCard>

        <ProfileSectionCard title="Match ratings">
          <View style={styles.ratingsRow}>
            {ratingBadges.map((badge) => (
              <ProfileStatBadge
                key={badge.label}
                label={badge.label}
                value={String(badge.value)}
              />
            ))}
          </View>
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
  performanceContent: {
    flexDirection: "row",
    gap: 20,
    flexWrap: "wrap",
    alignItems: "center",
  },
  pieChartBlock: {
    flex: 1,
    minWidth: 220,
    alignItems: "center",
  },
  rankingCardWrapper: {
    flex: 1,
    minWidth: 260,
  },
  centerLabel: {
    alignItems: "center",
  },
  centerLabelValue: {
    fontSize: 22,
    fontFamily: "DMSans_800ExtraBold",
    color: "#0E5B37",
  },
  centerLabelCaption: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: "#4C7D69",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  legendRow: {
    marginTop: 12,
    width: "100%",
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: "#0E5B37",
  },
  ratingsRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
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
