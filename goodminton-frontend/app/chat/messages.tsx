import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { chatAPI, Conversation } from "../../services/api";
import ConversationListItem from "../../components/ConversationListItem";

export default function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await chatAPI.getConversations();
      if (response.success && response.conversations) {
        setConversations(response.conversations);
        console.log("Conversations loaded:", response.conversations);
      } else {
        setConversations([]);
      }
    } catch (error: any) {
      console.error("Failed to load conversations:", error);

      // Handle rate limit errors specifically
      if (error.response?.status === 429) {
        console.warn("Rate limit exceeded. Please wait before refreshing.");
        // You could show a toast notification here
      }

      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadConversations();
    setIsRefreshing(false);
  };

  const handleConversationPress = (conversation: Conversation) => {
    router.push({
      pathname: "/chat/conversation",
      params: {
        conversationId: conversation._id,
        otherUserId: conversation.otherUser._id,
        otherUserName:
          conversation.otherUser.displayName || conversation.otherUser.email,
      },
    });
  };

  const handleBackPress = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0E5B37" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBackPress}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!conversations || conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>
            Start chatting with your friends!
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <ConversationListItem
              conversation={item}
              onPress={handleConversationPress}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#0E5B37"
              colors={["#0E5B37"]}
            />
          }
          showsVerticalScrollIndicator={false}
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    width: 40,
    alignItems: "flex-start",
  },
  backIcon: {
    fontSize: 40,
    color: "#0E5B37",
    fontWeight: "300",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
  },
  headerSpacer: {
    width: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#666",
    textAlign: "center",
  },
});
