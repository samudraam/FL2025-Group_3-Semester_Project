import React, { memo, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  GestureResponderEvent,
  Image,
  ListRenderItemInfo,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { X, ArrowUpRight } from "lucide-react-native";

export interface LikeUser {
  _id: string;
  username?: string;
  profile?: {
    displayName?: string;
    avatar?: string | null;
  };
}

interface LikeListModalProps {
  isVisible: boolean;
  onClose: () => void;
  likes: LikeUser[];
  isLoading: boolean;
  onViewProfile: (userId: string) => void;
}

/**
 * Modal that displays a list of users who liked a piece of content.
 */
const LikeListModal = ({
  isVisible,
  onClose,
  likes,
  isLoading,
  onViewProfile,
}: LikeListModalProps) => {
  const handleOverlayPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onClose();
  };

  const handleCardPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
  };

  const renderLiker = useCallback(
    ({ item }: ListRenderItemInfo<LikeUser>) => (
      <LikerRow liker={item} onViewProfile={onViewProfile} />
    ),
    [onViewProfile]
  );

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={handleOverlayPress}>
        <Pressable style={styles.card} onPress={handleCardPress}>
          <View style={styles.header}>
            <Text style={styles.title}>Liked by</Text>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close liked by list"
            >
              <Text style={styles.closeButtonText}><X color="#0E5B37" /></Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#0E5B37" />
            </View>
          ) : (
            <FlatList
              data={likes}
              renderItem={renderLiker}
              keyExtractor={(item) => item._id}
              contentContainerStyle={
                likes.length === 0 ? styles.emptyListContent : undefined
              }
              ListEmptyComponent={
                <Text style={styles.emptyStateText}>
                  No likes yet. Be the first to react!
                </Text>
              }
              showsVerticalScrollIndicator={false}
              removeClippedSubviews
              maxToRenderPerBatch={15}
              windowSize={5}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

interface LikerRowProps {
  liker: LikeUser;
  onViewProfile: (userId: string) => void;
}

const LikerRow = memo(({ liker, onViewProfile }: LikerRowProps) => {
  const displayName =
    liker.profile?.displayName || liker.username || "Goodminton player";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const handleViewPress = () => {
    onViewProfile(liker._id);
  };

  return (
    <View style={styles.likerRow}>
      <View style={styles.avatarContainer}>
        {liker.profile?.avatar ? (
          <Image
            source={{ uri: liker.profile.avatar }}
            style={styles.avatarImage}
          />
        ) : (
          <Text style={styles.avatarInitial}>{avatarInitial}</Text>
        )}
      </View>
      <View style={styles.likerInfo}>
        <Text style={styles.displayName}>{displayName}</Text>
      </View>
      <Pressable
        style={styles.viewButton}
        onPress={handleViewPress}
        accessibilityRole="button"
        accessibilityLabel={`View ${displayName}'s profile`}
      >
        <Text style={styles.viewButtonText}><ArrowUpRight color="#0E5B37" size={16} /></Text>
      </Pressable>
    </View>
  );
});

export default memo(LikeListModal);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    maxHeight: "75%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#EBB04B",
  },
  closeButtonText: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: "#0E5B37",
    textTransform: "uppercase",
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyStateText: {
    textAlign: "center",
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: "#7D7D7D",
  },
  likerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0E5B37",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitial: {
    fontSize: 18,
    color: "#fff",
    fontFamily: "DMSans_700Bold",
  },
  likerInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "#212121",
  },
  viewButton: {
    borderWidth: 1,
    borderColor: "#0E5B37",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  viewButtonText: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: "#0E5B37",
  },
});
