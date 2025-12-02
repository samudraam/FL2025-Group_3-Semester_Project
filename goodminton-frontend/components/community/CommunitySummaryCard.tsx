import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Globe, Lock, UsersRound } from "lucide-react-native";
import { CommunityJoinPolicy, CommunityVisibility } from "../../services/api";

interface CommunitySummaryCardProps {
  name?: string;
  description?: string;
  visibility?: CommunityVisibility;
  joinPolicy?: CommunityJoinPolicy;
  memberCount?: number;
  isMember: boolean;
  isPending: boolean;
  onPrimaryAction?: () => void;
  isActionLoading?: boolean;
  membershipRole?: "owner" | "admin" | "member";
}

/**
 * Presents the main metadata and membership CTA for a community.
 */
const CommunitySummaryCardComponent = ({
  name,
  description,
  visibility = "public",
  joinPolicy = "auto",
  memberCount = 0,
  isMember,
  isPending,
  onPrimaryAction,
  isActionLoading = false,
  membershipRole,
}: CommunitySummaryCardProps) => {
  const actionLabel = useMemo(() => {
    if (membershipRole === "owner") {
      return "Owner";
    }
    if (isMember) {
      return "Leave";
    }
    if (isPending) {
      return "Pending";
    }
    return joinPolicy === "approval" ? "Request to Join" : "Join";
  }, [isMember, isPending, joinPolicy, membershipRole]);

  const formattedMembers = useMemo(() => {
    return `${Intl.NumberFormat("en-US").format(memberCount)} members`;
  }, [memberCount]);

  const isActionDisabled =
    isPending || isActionLoading || membershipRole === "owner";
  const VisibilityIcon = visibility === "public" ? Globe : Lock;

  const handlePress = useCallback(() => {
    if (membershipRole === "owner" || isActionDisabled) {
      return;
    }
    onPrimaryAction?.();
  }, [isActionDisabled, membershipRole, onPrimaryAction]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{name || "Community"}</Text>
      <View style={styles.metaRow}>
        <View style={[styles.badge, styles.badgeOutlined]}>
          <VisibilityIcon
            size={16}
            color={visibility === "public" ? "#0E5B37" : "#4A4A4A"}
          />
          <Text style={styles.badgeText}>
            {visibility === "public" ? "Public" : "Private"}
          </Text>
        </View>
        <View style={[styles.badge, styles.badgeOutlined]}>
          <UsersRound size={16} color="#0E5B37" />
          <Text style={styles.badgeText}>{formattedMembers}</Text>
        </View>
      </View>

      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : (
        <Text style={styles.descriptionMuted}>
          No description has been added yet.
        </Text>
      )}

      <TouchableOpacity
        style={[styles.ctaButton, isMember ? styles.secondaryCta : undefined]}
        onPress={handlePress}
        disabled={isActionDisabled}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityState={{
          disabled: isActionDisabled,
          selected: isMember,
        }}
        accessibilityLabel={actionLabel}
      >
        {isActionLoading ? (
          <ActivityIndicator color={isMember ? "#0E5B37" : "#FFFFFF"} />
        ) : (
          <Text
            style={[
              styles.ctaLabel,
              isMember ? styles.ctaLabelSecondary : undefined,
            ]}
          >
            {actionLabel}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginBottom: 20,
    shadowColor: "#0B2E1C",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 26,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: "#F2F7F4",
  },
  badgeOutlined: {
    borderWidth: 1,
    borderColor: "#CFE2D8",
  },
  badgeText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#0E5B37",
    marginLeft: 6,
  },
  description: {
    fontSize: 16,
    fontFamily: "DMSans_400Regular",
    color: "#4A4A4A",
    lineHeight: 22,
    marginBottom: 20,
  },
  descriptionMuted: {
    fontSize: 16,
    fontFamily: "DMSans_400Regular",
    color: "#7A827D",
    lineHeight: 22,
    marginBottom: 20,
  },
  ctaButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0E5B37",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryCta: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#0E5B37",
  },
  ctaLabel: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "#FFFFFF",
  },
  ctaLabelSecondary: {
    color: "#0E5B37",
  },
});

const CommunitySummaryCard = React.memo(CommunitySummaryCardComponent);

export default CommunitySummaryCard;
