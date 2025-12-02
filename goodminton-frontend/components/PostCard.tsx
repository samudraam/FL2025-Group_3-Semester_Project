import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Alert,
  Image,
  GestureResponderEvent,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../services/authContext";
import { postsAPI } from "../services/api";
import EditPostModal from "./EditPostModal";
import { Heart, Mail } from "lucide-react-native";
import LikeListModal, { LikeUser } from "./LikeListModal";

/**
 * Interface for Post data structure
 */
interface Post {
  _id: string;
  title: string;
  description: string;
  location?: string;
  likes?: string[];
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
  const currentUserId = user?.id ?? "";
  const [isLiked, setIsLiked] = useState(
    post.likes?.some((likeId) => likeId === currentUserId) ?? false
  );
  const [likeCount, setLikeCount] = useState(post.likes?.length ?? 0);
  const [isLiking, setIsLiking] = useState(false);
  const [isLikeModalVisible, setIsLikeModalVisible] = useState(false);
  const [likers, setLikers] = useState<LikeUser[]>([]);
  const [isFetchingLikes, setIsFetchingLikes] = useState(false);

  useEffect(() => {
    setIsLiked(post.likes?.some((likeId) => likeId === currentUserId) ?? false);
    setLikeCount(post.likes?.length ?? 0);
  }, [post.likes, currentUserId]);

  const authorName =
    post.author.profile?.displayName || post.author.email || "Unknown User";
  const authorInitial = authorName.charAt(0).toUpperCase();
  const authorHandle = post.author.email
    ? `@${post.author.email.split("@")[0]}`
    : "@user";
  const authorAvatar = post.author.profile?.avatar;

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

  const handleToggleLike = async () => {
    if (!user?.id) {
      Alert.alert("Login required", "Please sign in to like posts.");
      return;
    }
    if (isLiking) {
      return;
    }
    setIsLiking(true);
    try {
      const response = isLiked
        ? await postsAPI.unlikePost(post._id)
        : await postsAPI.toggleLike(post._id);

      if (response?.success) {
        setIsLiked(response.liked);
        setLikeCount(response.likeCount);
        if (isLikeModalVisible) {
          fetchPostLikes();
        }
      }
    } catch (error) {
      Alert.alert("Error", "Unable to update like right now.");
      console.error("Toggle like error:", error);
    } finally {
      setIsLiking(false);
    }
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

  const fetchPostLikes = async () => {
    if (isFetchingLikes) {
      return;
    }
    setIsFetchingLikes(true);
    try {
      const response = await postsAPI.getPostLikes(post._id);
      if (response?.success) {
        setLikers(response.likes);
        return;
      }
      setLikers([]);
    } catch (error) {
      console.error("Fetch post likes error:", error);
      Alert.alert("Error", "Unable to load likes right now.");
      setLikers([]);
    } finally {
      setIsFetchingLikes(false);
    }
  };

  const handleOpenLikesModal = () => {
    setIsLikeModalVisible(true);
    fetchPostLikes();
  };

  const handleCloseLikesModal = () => {
    setIsLikeModalVisible(false);
  };

  const handleViewLikerProfile = (targetUserId: string) => {
    handleCloseLikesModal();
    router.push({
      pathname: "/tabs/profile-viewer",
      params: {
        userId: targetUserId,
      },
    });
  };

  const handleHeartPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    handleToggleLike();
  };

  return (
    <>
      <View style={styles.card}>
        <View style={styles.header}>
          <Pressable style={styles.authorSection} onPress={handleAuthorPress}>
            <View style={styles.avatar}>
              {authorAvatar ? (
                <Image
                  source={{ uri: authorAvatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>{authorInitial}</Text>
              )}
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

        <View style={styles.footerRow}>
          <Pressable
            style={[
              styles.likeButton,
              isLiked ? styles.likeButtonActive : undefined,
            ]}
            onPress={handleOpenLikesModal}
            accessibilityRole="button"
            accessibilityLabel="View who liked this post"
            accessibilityState={{
              busy: isFetchingLikes,
              expanded: isLikeModalVisible,
            }}
          >
            <Pressable
              style={styles.heartIconButton}
              onPress={handleHeartPress}
              disabled={isLiking}
              accessibilityRole="button"
              accessibilityState={{ disabled: isLiking, selected: isLiked }}
              accessibilityLabel={isLiked ? "Unlike post" : "Like post"}
            >
              <Heart
                size={20}
                color={isLiked ? "#E63946" : "#666"}
                fill={isLiked ? "#E63946" : "transparent"}
              />
            </Pressable>
            <View style={styles.likeInfo}>
              <Text style={styles.likeCountText}>{likeCount}</Text>
            </View>
          </Pressable>
          <Pressable style={styles.replyButton} onPress={handleReplyPress}>
            <Text style={styles.replyButtonText}><Mail color="#0E5B37" size={20} /></Text>
          </Pressable>
        </View>
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
      <LikeListModal
        isVisible={isLikeModalVisible}
        onClose={handleCloseLikesModal}
        likes={likers}
        isLoading={isFetchingLikes}
        onViewProfile={handleViewLikerProfile}
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
    borderColor: "#025C24",
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
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
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
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
  },
  replyButtonText: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: "#0E5B37",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  likeButtonActive: {
    borderColor: "#E63946",
    backgroundColor: "rgba(230, 57, 70, 0.1)",
  },
  heartIconButton: {
    height: 30,
    width: 24,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  likeInfo: {
    paddingHorizontal: 3,
  },
  likeCountText: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: "#0E5B37",
    marginRight: 2,
  },
});
