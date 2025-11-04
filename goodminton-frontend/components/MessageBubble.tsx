import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Message } from "../services/api";

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

/**
 * MessageBubble component displays individual chat messages with different styling
 * for sent (own) and received messages
 *
 * @param message - The message object containing content, sender, and timestamp
 * @param isOwnMessage - Boolean indicating if the message was sent by the current user
 */
export default function MessageBubble({
  message,
  isOwnMessage,
}: MessageBubbleProps) {
  /**
   * Format timestamp to display time in 12-hour format (e.g., "10:30 AM")
   */
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <View
      style={[
        styles.container,
        isOwnMessage
          ? styles.ownMessageContainer
          : styles.otherMessageContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
          ]}
        >
          {message.content}
        </Text>
      </View>
      <Text
        style={[
          styles.timestamp,
          isOwnMessage ? styles.ownTimestamp : styles.otherTimestamp,
        ]}
      >
        {formatTime(message.createdAt)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 16,
  },
  ownMessageContainer: {
    alignItems: "flex-end",
  },
  otherMessageContainer: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  ownMessageBubble: {
    backgroundColor: "#0E5B37",
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: "#FFCE7B",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    lineHeight: 20,
  },
  ownMessageText: {
    color: "#fff",
  },
  otherMessageText: {
    color: "#000",
  },
  timestamp: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: "#999",
    marginTop: 4,
  },
  ownTimestamp: {
    marginRight: 4,
  },
  otherTimestamp: {
    marginLeft: 4,
  },
});
