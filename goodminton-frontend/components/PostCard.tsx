import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, Alert } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../services/authContext";
import { postsAPI } from "../services/api";
import EditPostModal from "./EditPostModal";

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
  onPostDeleted?: () => void;
  onPostUpdated?: () => void;
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
export default function PostCard({
  post,
  onPostDeleted,
  onPostUpdated,
}: PostCardProps) {
  const { user } = useAuth();
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuButtonRef = React.useRef<View>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    right: 0,
  });

  const authorName =
    post.author.profile?.displayName || post.author.email || "Unknown User";
  const authorInitial = authorName.charAt(0).toUpperCase();
  const authorHandle = post.author.email
    ? `@${post.author.email.split("@")[0]}`
    : "@user";

  const isOwner =
    user && "id" in user && "id" in post.author
      ? user.id === post.author.id
      : false;

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
    if (menuButtonRef.current) {
      menuButtonRef.current.measureInWindow((x, y, width, height) => {
        setDropdownPosition({
          top: y + height + 4,
          right:
            typeof window !== "undefined" ? window.innerWidth - x - width : 20,
        });
        setMenuModalVisible(true);
      });
    } else {
      setMenuModalVisible(true);
    }
  };

  const handleCloseMenu = () => {
    setMenuModalVisible(false);
  };

  /**
   * Handles opening the edit modal
   */
  const handleEditPress = () => {
    handleCloseMenu();
    setEditModalVisible(true);
  };

  /**
   * Handles closing the edit modal
   */
  const handleCloseEditModal = () => {
    setEditModalVisible(false);
  };

  /**
   * Handles successful post update
   */
  const handlePostUpdated = () => {
    onPostUpdated?.();
    setEditModalVisible(false);
  };

  const handleDeletePress = async () => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      {
        text: "Cancel",
        onPress: () => {},
        style: "cancel",
      },
      {
        text: "Delete",
        onPress: async () => {
          setIsDeleting(true);
          try {
            await postsAPI.deletePost(post._id);
            onPostDeleted?.();
            handleCloseMenu();
          } catch (error) {
            Alert.alert("Error", "Failed to delete post.");
            console.error(error);
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <>
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

          <View ref={menuButtonRef} style={styles.menuButtonContainer}>
            <Pressable style={styles.menuButton} onPress={handleMenuPress}>
              <Text style={styles.menuIcon}>⋮</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.locationTimeRow}>
          {post.location && (
            <Text style={styles.location}>{post.location} - </Text>
          )}
          <Text style={styles.timestamp}>
            {formatTimestamp(post.createdAt)}
          </Text>
        </View>

        <Text style={styles.title}>{post.title}</Text>
        <Text style={styles.description}>{post.description}</Text>

        <Pressable style={styles.replyButton} onPress={handleReplyPress}>
          <Text style={styles.replyButtonText}>Reply</Text>
        </Pressable>
      </View>

      {/* Overlay to close menu when clicking outside */}
      {menuModalVisible && (
        <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseMenu} />
      )}

      {/* Modal with dropdown menu */}
      <Modal
        visible={menuModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseMenu}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseMenu}>
          <Pressable
            style={[
              styles.menuDropdown,
              {
                top: dropdownPosition.top,
                right: dropdownPosition.right,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {isOwner ? (
              <>
                <Pressable
                  style={styles.menuOption}
                  onPress={() => {
                    handleEditPress();
                  }}
                  disabled={isDeleting}
                >
                  <Text style={styles.menuOptionText}>Edit</Text>
                </Pressable>
                <View style={styles.menuDivider} />
                <Pressable
                  style={styles.menuOption}
                  onPress={() => {
                    handleDeletePress();
                  }}
                  disabled={isDeleting}
                >
                  <Text
                    style={[styles.menuOptionText, styles.deleteOptionText]}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable style={styles.menuOption} onPress={handleCloseMenu}>
                <Text style={styles.menuOptionText}>Report</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Post Modal */}
      <EditPostModal
        visible={editModalVisible}
        onClose={handleCloseEditModal}
        onPostUpdated={handlePostUpdated}
        post={post}
      />
    </>
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
  menuButtonContainer: {
    position: "relative",
    zIndex: 1000, // Increase this
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
  menuDropdown: {
    position: "absolute",
    top: 36,
    left: 230,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1001,
  },
  menuOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 120,
  },
  menuOptionText: {
    fontSize: 15,
    fontFamily: "DMSans_500Medium",
    color: "#000",
  },
  deleteOptionText: {
    color: "#FF3B30",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
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
