import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { chatAPI, Message } from "../../services/api";
import { useAuth } from "../../services/authContext";
import MessageBubble from "../../components/MessageBubble";

/**
 * Conversation screen displays the message history between the current user
 * and another user, with the ability to send new messages
 */
export default function Conversation() {
  const { conversationId, otherUserId, otherUserName } = useLocalSearchParams<{
    conversationId?: string;
    otherUserId: string;
    otherUserName: string;
  }>();

  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  /**
   * Load messages from the API
   */
  const loadMessages = async () => {
    try {
      if (!otherUserId) {
        console.error("No other user ID provided");
        return;
      }

      const response = await chatAPI.getMessages(otherUserId);
      if (response.success && response.messages) {
        setMessages(response.messages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
      Alert.alert("Error", "Failed to load messages. Please try again.");
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle pull-to-refresh to reload messages
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadMessages();
    setIsRefreshing(false);
  };

  /**
   * Navigate back to messages list
   */
  const handleBackPress = () => {
    router.back();
  };

  /**
   * Send a new message
   */
  const handleSendMessage = async () => {
    if (!inputText.trim() || isSending) {
      return;
    }

    const messageContent = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      if (!otherUserId) {
        throw new Error("No recipient ID");
      }

      const response = await chatAPI.sendMessage(otherUserId, messageContent);

      if (response.success && response.message) {
        // Add the new message to the list
        setMessages((prevMessages) => [...prevMessages, response.message]);

        // Scroll to bottom to show the new message
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
      // Restore the input text if sending failed
      setInputText(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Check if a message was sent by the current user
   */
  const isOwnMessage = (message: Message): boolean => {
    return user?.id === message.sender._id;
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0E5B37" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBackPress}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {otherUserName || "Conversation"}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Messages List */}
      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>
            Send a message to start the conversation!
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <MessageBubble message={item} isOwnMessage={isOwnMessage(item)} />
          )}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#0E5B37"
              colors={["#0E5B37"]}
            />
          }
          onContentSizeChange={() => {
            // Auto-scroll to bottom when new messages are added
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />
      )}

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={5000}
          editable={!isSending}
        />
        <Pressable
          style={[
            styles.sendButton,
            (!inputText.trim() || isSending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    paddingVertical: 10,
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
    flex: 1,
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
    textAlign: "center",
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 40,
  },
  messagesList: {
    paddingVertical: 8,
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  input: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    color: "#000",
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: "#0E5B37",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 70,
    height: 40,
  },
  sendButtonDisabled: {
    backgroundColor: "#cccccc",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
  },
});
