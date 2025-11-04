import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";

/**
 * Interface for Post data structure
 */
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

interface PostCardProps {
  post: Post;
}

/**
 * Formats timestamp to display "Today at HH:MM AM/PM" or "Mon, Oct 14 at HH:MM AM/PM"
 */
const formatTimestamp = (dateString: string): string => {
  const postDate = new Date(dateString);
  const today = new Date();

  const isToday =
    postDate.getDate() === today.getDate() &&
    postDate.getMonth() === today.getMonth() &&
    postDate.getFullYear() === today.getFullYear();

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  const timeString = postDate.toLocaleTimeString("en-US", timeOptions);

  if (isToday) {
    return `Today at ${timeString}`;
  }

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  };
  const formattedDate = postDate.toLocaleDateString("en-US", dateOptions);
  return `${formattedDate} at ${timeString}`;
};

/**
 * PostCard component displays a single community post
 */
export default function PostCard({ post }: PostCardProps) {
  const authorName =
    post.author.profile?.displayName || post.author.email || "Unknown User";
  const authorInitial = authorName.charAt(0).toUpperCase();
  const authorHandle = post.author.email
    ? `@${post.author.email.split("@")[0]}`
    : "@user";

  const handleAuthorPress = () => {
    router.push({
      pathname: "/tabs/profile-viewer",
      params: {
        userId: post.author._id,
      },
    });
  };

  const handleReplyPress = () => {
    router.push({
      pathname: "/chat/conversation",
      params: {
        otherUserId: post.author._id,
        otherUserName:
          post.author.profile?.displayName || post.author.email || "User",
      },
    });
  };

  const handleMenuPress = () => {
    // TODO: Implement menu options (edit, delete, report, etc.)
    console.log("Menu options coming soon");
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable style={styles.authorSection} onPress={handleAuthorPress}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{authorInitial}</Text>
          </View>
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{authorName}</Text>
            <Text style={styles.authorHandle}>{authorHandle}</Text>
          </View>
        </Pressable>

        <Pressable style={styles.menuButton} onPress={handleMenuPress}>
          <Text style={styles.menuIcon}>⋮</Text>
        </Pressable>
      </View>

      <View style={styles.locationTimeRow}>
        {post.location && (
          <Text style={styles.location}>{post.location} - </Text>
        )}
        <Text style={styles.timestamp}>{formatTimestamp(post.createdAt)}</Text>
      </View>

      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.description}>{post.description}</Text>

      <Pressable style={styles.replyButton} onPress={handleReplyPress}>
        <Text style={styles.replyButtonText}>Reply</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E3F2FD",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  authorSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0E5B37",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
    marginBottom: 2,
  },
  authorHandle: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: "#666",
  },
  menuButton: {
    padding: 4,
    paddingHorizontal: 8,
  },
  menuIcon: {
    fontSize: 25,
    color: "#666",
    fontWeight: "bold",
  },
  locationTimeRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  location: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: "#666",
  },
  timestamp: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: "#666",
    textAlign: "right",
  },
  title: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#000",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#333",
    lineHeight: 20,
    marginBottom: 16,
  },
  replyButton: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
  },
  replyButtonText: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: "#0E5B37",
  },
});
