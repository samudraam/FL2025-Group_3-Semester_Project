import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Plus } from "lucide-react-native";

interface CommunityFeedHeaderProps {
  onPressCompose?: () => void;
  subtitle?: string;
  canCompose?: boolean;
  disabledMessage?: string;
}

/**
 * Header row for the community feed list with compose action.
 */
const CommunityFeedHeaderComponent = ({
  onPressCompose,
  subtitle = "Latest activity",
  canCompose = true,
  disabledMessage,
}: CommunityFeedHeaderProps) => {
  const handleComposePress = () => {
    if (!canCompose) {
      Alert.alert(
        "Membership required",
        disabledMessage || "Join this private community to share updates."
      );
      return;
    }
    onPressCompose?.();
  };

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>Feed</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <TouchableOpacity
        style={[
          styles.actionButton,
          !canCompose ? styles.actionButtonDisabled : undefined,
        ]}
        onPress={handleComposePress}
        accessibilityRole="button"
        accessibilityLabel="Create a new post"
        accessibilityState={{ disabled: !canCompose }}
        activeOpacity={canCompose ? 0.7 : 1}
      >
        <Plus color={canCompose ? "#0E5B37" : "#7F9488"} size={28} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: "#5F6A63",
    marginTop: 2,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#B7DFCB",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonDisabled: {
    backgroundColor: "#E2E8E3",
  },
});

const CommunityFeedHeader = React.memo(CommunityFeedHeaderComponent);

export default CommunityFeedHeader;
