import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Conversation } from "../services/api";

interface ConversationListItemProps {
  conversation: Conversation;
  onPress: (conversation: Conversation) => void;
}

export default function ConversationListItem({
  conversation,
  onPress,
}: ConversationListItemProps) {
  const { otherUser, lastMessage } = conversation;
  const initial = (otherUser.displayName || otherUser.email)
    .charAt(0)
    .toUpperCase();
  const username = otherUser.email.split("@")[0];
  const lastMessageText = lastMessage?.content || "No messages yet";

  const handlePress = () => {
    onPress(conversation);
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.displayName}>
          {otherUser.displayName || otherUser.email}
        </Text>
        <Text style={styles.lastMessage} numberOfLines={1} ellipsizeMode="tail">
          {lastMessageText}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0E5B37",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
  },
  infoContainer: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#000",
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#999",
  },
  chevron: {
    fontSize: 28,
    color: "#999",
    marginLeft: 8,
  },
});
