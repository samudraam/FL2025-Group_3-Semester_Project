import React, { memo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Clock3, MapPin } from "lucide-react-native";

export interface CommunityEventCardProps {
  title: string;
  hostName: string;
  communityName: string;
  description: string;
  locationLabel: string;
  dateTimeLabel: string;
  rsvpCount?: number;
  isRsvpDisabled?: boolean;
  isRsvped?: boolean;
  isRsvpPending?: boolean;
  containerStyle?: ViewStyle;
  onPressHost?: () => void;
  onPressCommunity?: () => void;
  onPressRSVP?: () => void;
}

/**
 * Displays a community event preview with host metadata, logistics, and RSVP CTA.
 */
const CommunityEventCardComponent: React.FC<CommunityEventCardProps> = ({
  title,
  hostName,
  communityName,
  description,
  locationLabel,
  dateTimeLabel,
  rsvpCount = 0,
  isRsvpDisabled = false,
  isRsvped = false,
  isRsvpPending = false,
  containerStyle,
  onPressHost,
  onPressCommunity,
  onPressRSVP,
}) => {
  const buttonDisabled = isRsvpDisabled || isRsvpPending;
  const rsvpLabel = isRsvpDisabled
    ? "RSVP Closed"
    : isRsvpPending
    ? "Updating..."
    : isRsvped
    ? "Cancel RSVP"
    : "RSVP";

  const handleHostPress = useCallback(() => {
    if (!onPressHost) {
      return;
    }
    onPressHost();
  }, [onPressHost]);

  const handleCommunityPress = useCallback(() => {
    if (!onPressCommunity) {
      return;
    }
    onPressCommunity();
  }, [onPressCommunity]);

  const handleRsvpPress = useCallback(() => {
    if (buttonDisabled) {
      return;
    }
    onPressRSVP?.();
  }, [buttonDisabled, onPressRSVP]);

  return (
    <View style={[styles.cardContainer, containerStyle]}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        <View style={styles.metaRow}>
          <TouchableOpacity
            onPress={handleHostPress}
            disabled={!onPressHost}
            accessibilityRole="button"
            accessibilityLabel={`View ${hostName} profile`}
            accessibilityState={{ disabled: !onPressHost }}
            activeOpacity={onPressHost ? 0.7 : 1}
          >
            <Text style={styles.metaLink} numberOfLines={1}>
              Hosted by {hostName}
            </Text>
          </TouchableOpacity>
          <Text style={styles.metaDivider}>|</Text>
          <TouchableOpacity
            onPress={handleCommunityPress}
            disabled={!onPressCommunity}
            accessibilityRole="button"
            accessibilityLabel={`Open ${communityName} community`}
            accessibilityState={{ disabled: !onPressCommunity }}
            activeOpacity={onPressCommunity ? 0.7 : 1}
          >
            <Text style={styles.metaLink} numberOfLines={1}>
              {communityName}
            </Text>
          </TouchableOpacity>
          <Text style={styles.metaDivider}>|</Text>
          <Text style={styles.metaStat}>{`${rsvpCount} RSVP'd`}</Text>
        </View>
      </View>

      <Text style={styles.description}>{description}</Text>

      <View style={styles.infoPill} accessibilityRole="text">
        <MapPin color="#0E5B37" size={20} />
        <Text style={styles.infoText}>{locationLabel}</Text>
      </View>

      <View style={styles.infoPill} accessibilityRole="text">
        <Clock3 color="#0E5B37" size={20} />
        <Text style={styles.infoText}>{dateTimeLabel}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.rsvpButton,
          buttonDisabled ? styles.rsvpButtonDisabled : undefined,
        ]}
        onPress={handleRsvpPress}
        disabled={buttonDisabled}
        accessibilityRole="button"
        accessibilityLabel={
          isRsvped ? "Cancel event RSVP" : "RSVP to this event"
        }
        accessibilityState={{ disabled: buttonDisabled }}
        activeOpacity={buttonDisabled ? 1 : 0.85}
      >
        <Text style={styles.rsvpLabel}>{rsvpLabel}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0E5B37",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    gap: 12,
  },
  header: {
    backgroundColor: "#0E5B37",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 8,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 20,
    rowGap: 4,
  },
  metaLink: {
    color: "#E0F2E9",
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
  },
  metaDivider: {
    color: "#A5CFC0",
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
  },
  metaStat: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
  },
  description: {
    color: "#1B1E1C",
    margin: 4,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    lineHeight: 20,
  },
  infoPill: {
    marginLeft: 10,
    marginRight: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#D5E6DD",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  infoText: {
    flexShrink: 1,
    color: "#0E5B37",
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
  },
  rsvpButton: {
    marginTop: 4,
    marginLeft: 70,
    marginRight: 70,
    marginBottom: 20,
    borderRadius: 999,
    backgroundColor: "#EBB04B",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rsvpButtonDisabled: {
    backgroundColor: "#A6BFB5",
  },
  rsvpLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
  },
});

const CommunityEventCard = memo(CommunityEventCardComponent);

export default CommunityEventCard;
