import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
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
import PostCard from "../../components/PostCard";
import CreatePostModal from "../../components/CreatePostModal";
import { postsAPI } from "../../services/api";

interface Post {
  _id: string;
  title: string;
  description: string;
  location?: string;
  author: {
    _id: string;
    profile: {
      displayName: string;
      avatar?: string;
    };
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function Community() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("community");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await postsAPI.getAllPosts();
      if (response.success && response.posts) {
        setPosts(response.posts);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const handleSettingsPress = () => {
    router.push("/tabs/settings");
  };

  const handleMessagePress = () => {
    router.push("/chat/messages");
  };

  const handleNotificationPress = () => {
    console.log("Notifications pressed");
  };

  const handleCreatePostPress = () => {
    setModalVisible(true);
  };

  /**
   * Handles post creation - refetches all posts
   */
  const handlePostCreated = () => {
    fetchPosts();
  };

  /**
   * Handles post deletion - refetches all posts
   */
  const handlePostDeleted = () => {
    fetchPosts();
  };

  /**
   * Handles post update - refetches all posts
   */
  const handlePostUpdated = () => {
    fetchPosts();
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

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No posts yet</Text>
      <Text style={styles.emptySubtext}>
        Be the first to share something with the community!
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ProfileHeader
        username={user?.profile?.displayName || user?.email || "JSONderulo"}
        onSettingsPress={handleSettingsPress}
        onNotificationPress={handleNotificationPress}
        onMessagePress={handleMessagePress}
      />

      <View style={styles.headerRow}>
        <Text style={styles.title}>Community</Text>
        <Pressable style={styles.addButton} onPress={handleCreatePostPress}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0E5B37" />
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPostDeleted={handlePostDeleted}
              onPostUpdated={handlePostUpdated}
            />
          )}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#0E5B37"
            />
          }
        />
      )}

      <CreatePostModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onPostCreated={handlePostCreated}
      />

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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#A8DADB",
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0E5B37",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontSize: 28,
    fontFamily: "DMSans_400Regular",
    color: "#FFFFFF",
    marginTop: -2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#666",
    textAlign: "center",
  },
});
