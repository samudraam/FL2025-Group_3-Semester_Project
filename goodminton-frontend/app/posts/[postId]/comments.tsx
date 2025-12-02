import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import PostCard, {
  type Post as PostCardPost,
} from "../../../components/PostCard";
import CommentCard, { CommentItem } from "../../../components/CommentCard";
import { postsAPI } from "../../../services/api";

const CommentsScreen = () => {
  const { postId } = useLocalSearchParams<{ postId?: string | string[] }>();
  const postIdString = useMemo(() => {
    if (Array.isArray(postId)) {
      return postId[0];
    }
    return postId ?? "";
  }, [postId]);

  const [postDetail, setPostDetail] = useState<PostCardPost | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [composerValue, setComposerValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const listRef = useRef<FlatList<CommentItem>>(null);

  const fetchPostDetail = useCallback(async () => {
    if (!postIdString) {
      return;
    }
    setIsLoadingPost(true);
    try {
      const response = await postsAPI.getPostById(postIdString);
      if (response?.success) {
        setPostDetail(response.post);
        setPostError(null);
      } else {
        setPostError("Unable to load post details.");
        setPostDetail(null);
      }
    } catch (error) {
      console.error("Fetch post detail error:", error);
      setPostError("Unable to load post details.");
      setPostDetail(null);
    } finally {
      setIsLoadingPost(false);
    }
  }, [postIdString]);

  const fetchPostComments = useCallback(async () => {
    if (!postIdString) {
      return;
    }
    setIsLoadingComments(true);
    try {
      const response = await postsAPI.getComments(postIdString);
      if (response?.success) {
        setComments(response.comments);
        setCommentsError(null);
      } else {
        setComments([]);
        setCommentsError("Unable to load comments.");
      }
    } catch (error) {
      console.error("Fetch comments error:", error);
      setComments([]);
      setCommentsError("Unable to load comments.");
    } finally {
      setIsLoadingComments(false);
    }
  }, [postIdString]);

  useEffect(() => {
    if (!postIdString) {
      setPostError("Missing post information.");
      return;
    }
    fetchPostDetail();
    fetchPostComments();
  }, [postIdString, fetchPostDetail, fetchPostComments]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchPostDetail(), fetchPostComments()]);
    setIsRefreshing(false);
  }, [fetchPostDetail, fetchPostComments]);

  const handleBackPress = () => {
    router.back();
  };

  const handleSubmitComment = async () => {
    if (!composerValue.trim()) {
      return;
    }
    if (!postIdString) {
      Alert.alert("Missing post", "Unable to find this post.");
      return;
    }
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await postsAPI.addComment(
        postIdString,
        composerValue.trim()
      );
      if (response?.success) {
        setComments((prev) => [...prev, response.comment]);
        setComposerValue("");
        setTimeout(() => {
          listRef.current?.scrollToEnd({ animated: true });
        }, 150);
      } else {
        Alert.alert("Error", "Unable to post comment right now.");
      }
    } catch (error) {
      console.error("Add comment error:", error);
      Alert.alert("Error", "Unable to post comment right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderComment = useCallback(
    ({ item }: { item: CommentItem }) => (
      <CommentCard comment={item} postId={postIdString} />
    ),
    [postIdString]
  );

  const keyExtractor = useCallback((item: CommentItem) => item._id, []);

  if (!postIdString) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>No post selected.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={handleBackPress}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>
            <ArrowLeft color="#0E5B37" />
          </Text>
        </Pressable>
        <Text style={styles.headerTitle}>View Comments</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        ref={listRef}
        data={comments}
        renderItem={renderComment}
        keyExtractor={keyExtractor}
        ListHeaderComponent={
          <View style={styles.postContainer}>
            {isLoadingPost ? (
              <View style={styles.loaderRow}>
                <ActivityIndicator color="#0E5B37" />
              </View>
            ) : postDetail ? (
              <PostCard post={postDetail} />
            ) : (
              <Text style={styles.errorText}>
                {postError ?? "Unable to load post."}
              </Text>
            )}
            <View style={styles.threadLabelWrapper}>
              <Text style={styles.threadLabel}>Thread</Text>
              <Text style={styles.threadSubLabel}>
                Join the conversation below
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoadingComments ? (
            <View style={styles.loaderRow}>
              <ActivityIndicator color="#0E5B37" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No comments yet</Text>
              <Text style={styles.emptySubtitle}>
                {commentsError
                  ? commentsError
                  : "Be the first to start the discussion."}
              </Text>
            </View>
          )
        }
        contentContainerStyle={[
          styles.listContent,
          comments.length === 0 ? styles.flexGrow : undefined,
        ]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <View style={styles.commentBar}>
          <TextInput
            style={styles.input}
            placeholder="Type a comment"
            placeholderTextColor="#9E9E9E"
            value={composerValue}
            onChangeText={setComposerValue}
            multiline
            accessibilityLabel="Type a comment"
          />
          <Pressable
            style={[
              styles.postButton,
              !composerValue.trim() || isSubmitting
                ? styles.postButtonDisabled
                : undefined,
            ]}
            onPress={handleSubmitComment}
            disabled={!composerValue.trim() || isSubmitting}
            accessibilityRole="button"
            accessibilityState={{
              disabled: !composerValue.trim() || isSubmitting,
              busy: isSubmitting,
            }}
            accessibilityLabel="Post comment"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CommentsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: "rgba(14, 91, 55, 0.08)",
  },
  backIcon: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
  },
  headerSpacer: {
    width: 40,
  },
  postContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: "#F8F8F8",
  },
  loaderRow: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  threadLabelWrapper: {
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: "#C8F0F1",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#A8DADB",
  },
  threadLabel: {
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
  },
  threadSubLabel: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: "#7D7D7D",
  },
  listContent: {
    paddingBottom: 120,
  },
  flexGrow: {
    flexGrow: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#7D7D7D",
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: "#E63946",
    textAlign: "center",
  },
  commentBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E1E1E1",
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 90,
    borderWidth: 1,
    borderColor: "#DADADA",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    marginRight: 12,
    backgroundColor: "#F9F9F9",
  },
  postButton: {
    backgroundColor: "#0E5B37",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  postButtonDisabled: {
    backgroundColor: "#A5A5A5",
  },
  postButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
  },
});
