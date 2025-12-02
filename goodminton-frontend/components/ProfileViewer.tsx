import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { usersAPI } from "../services/api";

/**
 * User profile data interface
 * Updated to match new backend schema with ratings system
 */
interface UserProfile {
  _id: string;
  email: string;
  profile: {
    displayName: string;
    fullName?: string;
    avatar?: string;
    level?: string;
    gamesPlayed?: number;
    gamesWon?: number;
    gamesLost?: number;
    winRate?: number;
  };
  ratings: {
    singles: number;
    doubles: number;
    mixed: number;
  };
}

/**
 * Friendship status enum
 */
type FriendshipStatus = "friends" | "not_friends" | "pending" | "loading";

/**
 * ProfileViewer component displays detailed user information
 * Shows user stats, profile picture, and friendship status with action buttons
 */
export default function ProfileViewer() {
  const { userId, emailOrPhone } = useLocalSearchParams<{
    userId: string;
    emailOrPhone?: string;
  }>();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [friendshipStatus, setFriendshipStatus] =
    useState<FriendshipStatus>("loading");
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  /**
   * Check friendship status with the user
   */
  const checkFriendshipStatus = async () => {
    if (!userId) return;

    try {
      const response = await usersAPI.checkFriendshipStatus(userId);
      if (response.success) {
        // Handle the actual API response structure
        if (response.isFriends) {
          setFriendshipStatus("friends");
        } else if (response.pendingRequest) {
          setFriendshipStatus("pending");
        } else {
          setFriendshipStatus("not_friends");
        }
      } else {
        setFriendshipStatus("not_friends");
      }
    } catch (error: any) {
      console.error("Failed to check friendship status:", error);
      setFriendshipStatus("not_friends");
    }
  };

  /**
   * Fetch user profile data from API
   */
  const fetchProfile = async (isRefresh = false) => {
    if (!userId) return;

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // Fetch profile and friendship status in parallel
      const [profileResponse, friendshipResponse] = await Promise.all([
        usersAPI.getUserProfile(userId),
        usersAPI.checkFriendshipStatus(userId),
      ]);

      if (profileResponse.success) {
        // Transform the API response to match our expected structure
        const userData = profileResponse.user;
        const transformedProfile = {
          _id: userData._id,
          email: userData.email,
          profile: {
            displayName: userData.profile?.displayName || "Unknown",
            fullName: userData.profile?.fullName,
            level: userData.profile?.level,
            avatar: userData.profile?.avatar,
            gamesPlayed: userData.stats?.gamesPlayed || 0,
            gamesWon: userData.stats?.gamesWon || 0,
            gamesLost:
              (userData.stats?.gamesPlayed || 0) -
              (userData.stats?.gamesWon || 0),
            winRate: userData.stats?.winRate || 0,
          },
          ratings: {
            singles: userData.ratings?.singles || 1000,
            doubles: userData.ratings?.doubles || 1000,
            mixed: userData.ratings?.mixed || 1000,
          },
        };
        setProfile(transformedProfile);
      } else {
        console.error("Failed to fetch profile:", profileResponse);
        Alert.alert("Error", "Failed to load user profile");
      }

      if (friendshipResponse.success) {
        // Handle the actual API response structure
        if (friendshipResponse.isFriends) {
          setFriendshipStatus("friends");
        } else if (friendshipResponse.pendingRequest) {
          setFriendshipStatus("pending");
        } else {
          setFriendshipStatus("not_friends");
        }
      } else {
        setFriendshipStatus("not_friends");
      }
    } catch (error: any) {
      console.error("Failed to fetch profile:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to load user profile"
      );
      setFriendshipStatus("not_friends");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  /**
   * Handle manual refresh triggered by pull-to-refresh gesture
   */
  const handleRefresh = () => {
    fetchProfile(true);
  };

  /**
   * Send friend request to the user
   */
  const handleSendFriendRequest = async () => {
    if (!emailOrPhone || isSendingRequest) return;

    setIsSendingRequest(true);
    try {
      const response = await usersAPI.sendFriendRequest(
        emailOrPhone,
        "Hi! I'd like to connect with you on Goodminton."
      );

      if (response.success) {
        setFriendshipStatus("pending");
        Alert.alert("Success", "Friend request sent successfully!");
      } else {
        Alert.alert("Error", "Failed to send friend request");
      }
    } catch (error: any) {
      console.error("Failed to send friend request:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to send friend request"
      );
    } finally {
      setIsSendingRequest(false);
    }
  };

  /**
   * Navigate back to previous screen
   */
  const handleGoBack = () => {
    router.back();
  };

  /**
   * Fetch profile data on component mount
   */
  useEffect(() => {
    fetchProfile();
  }, [userId]);

  /**
   * Render profile image or placeholder
   */
  const ProfileImage = ({
    displayName,
    avatarUri,
  }: {
    displayName: string;
    avatarUri?: string;
  }) => (
    <View style={styles.profileImageContainer}>
      {avatarUri ? (
        <Image source={{ uri: avatarUri }} style={styles.profileImage} />
      ) : (
        <Text style={styles.profileInitial}>
          {displayName.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );

  /**
   * Render friendship status button
   */
  const FriendshipButton = () => {
    switch (friendshipStatus) {
      case "friends":
        return (
          <Pressable style={styles.friendsButton}>
            <Text style={styles.friendsButtonText}>friended</Text>
          </Pressable>
        );
      case "pending":
        return (
          <Pressable style={styles.pendingButton}>
            <Text style={styles.pendingButtonText}>request sent</Text>
          </Pressable>
        );
      case "not_friends":
        return (
          <Pressable
            style={styles.addFriendButton}
            onPress={handleSendFriendRequest}
            disabled={isSendingRequest}
          >
            {isSendingRequest ? (
              <ActivityIndicator size="small" color="#0E5B37" />
            ) : (
              <Text style={styles.addFriendButtonText}>add friend</Text>
            )}
          </Pressable>
        );
      default:
        return (
          <Pressable style={styles.loadingButton}>
            <ActivityIndicator size="small" color="#0E5B37" />
          </Pressable>
        );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0E5B37" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Profile not found</Text>
          <Pressable style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const winRate = profile.profile.winRate || 0;
  const gamesPlayed = profile.profile.gamesPlayed || 0;
  const gamesWon = profile.profile.gamesWon || 0;
  const gamesLost = profile.profile.gamesLost || 0;

  const headerPaddingTop = Math.min((insets.top || 0), 24);
  
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: headerPaddingTop, paddingBottom: 10},
        ]}
      >
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{profile.profile.displayName}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#0E5B37"
            colors={["#0E5B37"]}
          />
        }
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <ProfileImage
            displayName={profile.profile.displayName}
            avatarUri={profile.profile.avatar}
          />
          <Text style={styles.fullName}>
            {profile.profile.fullName || profile.profile.displayName}
          </Text>
          {profile.profile.level && (
            <Text style={styles.level}>{profile.profile.level}</Text>
          )}
          <FriendshipButton />
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{Math.round(winRate)}%</Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
        </View>

        {/* Ratings Section */}
        <View style={styles.ratingsSection}>
          <Text style={styles.sectionTitle}>Ratings</Text>
          <View style={styles.ratingsContainer}>
            <View style={styles.ratingCard}>
              <Text style={styles.ratingValue}>{profile.ratings.singles}</Text>
              <Text style={styles.ratingLabel}>Singles</Text>
            </View>
            <View style={styles.ratingCard}>
              <Text style={styles.ratingValue}>{profile.ratings.doubles}</Text>
              <Text style={styles.ratingLabel}>Doubles</Text>
            </View>
            <View style={styles.ratingCard}>
              <Text style={styles.ratingValue}>{profile.ratings.mixed}</Text>
              <Text style={styles.ratingLabel}>Mixed</Text>
            </View>
          </View>
        </View>

        {/* Game Breakdown */}
        <View style={styles.gameBreakdownSection}>
          <Text style={styles.sectionTitle}>Game Breakdown</Text>
          <View style={styles.gameBreakdownCard}>
            <View style={styles.gameStatRow}>
              <Text style={styles.gameStatNumber}>{gamesPlayed}</Text>
              <Text style={styles.gameStatLabel}>games played</Text>
            </View>

            <View style={styles.gameStatRow}>
              <Text style={styles.gameStatNumber}>{gamesWon}</Text>
              <Text style={styles.gameStatLabel}>won</Text>
              <Text style={styles.upArrow}>↑</Text>
            </View>

            <View style={styles.gameStatRow}>
              <Text style={styles.gameStatNumber}>{gamesLost}</Text>
              <Text style={styles.gameStatLabel}>lost</Text>
            </View>

            {/* Progress Bar */}
            {gamesPlayed > 0 && (
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${(gamesWon / gamesPlayed) * 100}%` },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: 0,
  },
  header: {
    backgroundColor: "#0E5B37",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
  },
  backButton: {
    marginRight: 16,
  },
  backIcon: {
    fontSize: 24,
    color: "white",
    fontFamily: "DMSans_700Bold",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: "white",
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "DMSans_400Regular",
    color: "#666",
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    fontFamily: "DMSans_600SemiBold",
    color: "#666",
    marginBottom: 20,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 30,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#0E5B37",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 5,
    borderColor: "#339933",
    marginBottom: 16,
    overflow: "hidden",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
  },
  profileInitial: {
    fontSize: 36,
    fontFamily: "DMSans_700Bold",
    color: "white",
  },
  fullName: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: "#333",
    marginBottom: 4,
  },
  level: {
    fontSize: 16,
    fontFamily: "DMSans_400Regular",
    color: "#666",
    marginBottom: 20,
    textTransform: "capitalize",
  },
  friendsButton: {
    backgroundColor: "#EBB04B",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  friendsButtonText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "black",
  },
  pendingButton: {
    backgroundColor: "#FFA500",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  pendingButtonText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "white",
  },
  addFriendButton: {
    backgroundColor: "#0E5B37",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addFriendButtonText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "white",
  },
  loadingButton: {
    backgroundColor: "#E0E0E0",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  statsContainer: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 16,
    justifyContent: "center",
  },
  statCard: {
    flex: 1,
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8F5E8",
    alignItems: "center",
    maxWidth: 150,
  },
  statValue: {
    fontSize: 28,
    fontFamily: "DMSans_700Bold",
    color: "#333",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#0E5B37",
  },
  ratingsSection: {
    marginBottom: 30,
  },
  ratingsContainer: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  ratingCard: {
    flex: 1,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8F5E8",
    alignItems: "center",
  },
  ratingValue: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
    marginBottom: 4,
  },
  ratingLabel: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    color: "#666",
    textTransform: "capitalize",
  },
  gameBreakdownSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: "#333",
    marginBottom: 16,
  },
  gameBreakdownCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8F5E8",
  },
  gameStatRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  gameStatNumber: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: "#333",
    marginRight: 8,
  },
  gameStatLabel: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "#0E5B37",
    flex: 1,
  },
  upArrow: {
    fontSize: 16,
    color: "#0E5B37",
    fontFamily: "DMSans_600SemiBold",
  },
  progressBarContainer: {
    marginTop: 14,
  },
  progressBar: {
    height: 14,
    backgroundColor: "#FB7676",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#3CBF6D",
    borderRadius: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "#0E5B37",
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#0E5B37",
  },
});
