import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, Image, Alert } from "react-native";
import { Heart } from "lucide-react-native";
import { router } from "expo-router";
import { useAuth } from "../services/authContext";
import { postsAPI } from "../services/api";
import LikeListModal, { LikeUser } from "./LikeListModal";

/**
 * Lightweight interface for comment data.
 */
export interface CommentItem {
  _id: string;
  post: string;
  content: string;
  likes?: string[];
  author: {
    _id: string;
    profile?: {
      displayName?: string;
      avatar?: string;
    };
    email?: string;
  };
  createdAt: string;
}

interface CommentCardProps {
  comment: CommentItem;
  postId: string;
}

const CommentCard = ({ comment, postId }: CommentCardProps) => {
  const { user } = useAuth();
  const currentUserId = user?.id ?? "";
  const [isLiked, setIsLiked] = useState(
    comment.likes?.some((likeId) => likeId === currentUserId) ?? false
  );
  const [likeCount, setLikeCount] = useState(comment.likes?.length ?? 0);
  const [isLiking, setIsLiking] = useState(false);
  const [isLikeModalVisible, setIsLikeModalVisible] = useState(false);
  const [likers, setLikers] = useState<LikeUser[]>([]);
  const [isFetchingLikes, setIsFetchingLikes] = useState(false);

  useEffect(() => {
    setIsLiked(
      comment.likes?.some((likeId) => likeId === currentUserId) ?? false
    );
    setLikeCount(comment.likes?.length ?? 0);
  }, [comment.likes, currentUserId]);

  const displayName = useMemo(() => {
    if (comment.author?.profile?.displayName) {
      return comment.author.profile.displayName;
    }
    if (comment.author?.email) {
      return comment.author.email.split("@")[0];
    }
    return "Goodminton user";
  }, [comment.author]);

  const avatarInitial = displayName.charAt(0).toUpperCase();


  const formattedTimestamp = useMemo(() => {
    const createdDate = new Date(comment.createdAt);
    return createdDate.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, [comment.createdAt]);

  const handleViewProfile = () => {
    if (!comment.author?._id) {
      return;
    }
    router.push({
      pathname: "/tabs/profile-viewer",
      params: { userId: comment.author._id },
    });
  };

  const handleToggleLike = async () => {
    if (!user?.id) {
      Alert.alert("Login required", "Please sign in to like comments.");
      return;
    }
    if (isLiking) {
      return;
    }
    setIsLiking(true);
    try {
      const response = await postsAPI.toggleCommentLike(postId, comment._id);
      if (response?.success) {
        setIsLiked(response.liked);
        setLikeCount(response.likeCount);
        if (isLikeModalVisible) {
          fetchCommentLikes();
        }
      }
    } catch (error) {
      Alert.alert("Error", "Unable to update like right now.");
      console.error("Toggle comment like error:", error);
    } finally {
      setIsLiking(false);
    }
  };

  const fetchCommentLikes = useCallback(async () => {
    if (isFetchingLikes) {
      return;
    }
    setIsFetchingLikes(true);
    try {
      const response = await postsAPI.getCommentLikes(postId, comment._id);
      if (response?.success) {
        setLikers(response.likes);
        return;
      }
      setLikers([]);
    } catch (error) {
      console.error("Fetch comment likes error:", error);
      Alert.alert("Error", "Unable to load likes right now.");
      setLikers([]);
    } finally {
      setIsFetchingLikes(false);
    }
  }, [comment._id, postId, isFetchingLikes]);

  const handleOpenLikesModal = () => {
    setIsLikeModalVisible(true);
    fetchCommentLikes();
  };

  const handleCloseLikesModal = () => {
    setIsLikeModalVisible(false);
  };

  const handleViewLikerProfile = (targetUserId: string) => {
    handleCloseLikesModal();
    router.push({
      pathname: "/tabs/profile-viewer",
      params: { userId: targetUserId },
    });
  };

  return (
    <>
      <View style={styles.container}>
        <Pressable style={styles.avatar} onPress={handleViewProfile}>
          {comment.author?.profile?.avatar ? (
            <Image
              source={{ uri: comment.author.profile.avatar }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          )}
        </Pressable>
        <View style={styles.contentWrapper}>
          <View style={styles.headerRow}>
            <Pressable onPress={handleViewProfile} style={styles.authorBlock}>
              <Text style={styles.authorName}>{displayName}</Text>
            </Pressable>
            <Text style={styles.timestamp}>{formattedTimestamp}</Text>
          </View>
          <Text style={styles.commentText}>{comment.content}</Text>
          <View style={styles.actionsRow}>
            <Pressable
              style={[
                styles.likeButton,
                isLiked ? styles.likeButtonActive : undefined,
              ]}
              onPress={handleOpenLikesModal}
              accessibilityRole="button"
              accessibilityLabel="View who liked this comment"
              accessibilityState={{
                busy: isFetchingLikes,
                expanded: isLikeModalVisible,
              }}
            >
              <Pressable
                style={styles.heartButton}
                onPress={handleToggleLike}
                disabled={isLiking}
                accessibilityRole="button"
                accessibilityState={{ disabled: isLiking, selected: isLiked }}
                accessibilityLabel={isLiked ? "Unlike comment" : "Like comment"}
              >
                <Heart
                  size={18}
                  color={isLiked ? "#E63946" : "#7D7D7D"}
                  fill={isLiked ? "#E63946" : "transparent"}
                />
              </Pressable>
              <Text style={styles.likeCount}>{likeCount}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <LikeListModal
        isVisible={isLikeModalVisible}
        onClose={handleCloseLikesModal}
        likes={likers}
        isLoading={isFetchingLikes}
        onViewProfile={handleViewLikerProfile}
      />
    </>
  );
};

export default CommentCard;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderBottomWidth: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    margin: "auto",
    width: "90%",
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F8C46B",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#0E5B37",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
  },
  contentWrapper: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  authorBlock: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
  },
  timestamp: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: "#9E9E9E",
    marginLeft: 8,
  },
  commentText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#212121",
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 18,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  likeButtonActive: {
    borderColor: "#E63946",
    backgroundColor: "rgba(230, 57, 70, 0.12)",
  },
  heartButton: {
    padding: 4,
    marginRight: 6,
  },
  likeCount: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    color: "#0E5B37",
  },
});
