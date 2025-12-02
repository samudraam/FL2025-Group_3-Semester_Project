import React, { memo, useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  Modal,
  Pressable,
} from "react-native";
import { Clock3, MapPin, MoreVertical } from "lucide-react-native";

export interface CommunityEventCardProps {
  eventId: string;
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
  canManage?: boolean;
  isActionPending?: boolean;
  containerStyle?: ViewStyle;
  onPressHost?: () => void;
  onPressCommunity?: () => void;
  onPressRSVP?: () => void;
  onEditEvent?: (eventId: string) => void;
  onDeleteEvent?: (eventId: string) => void;
}

/**
 * Displays a community event preview with host metadata, logistics, and RSVP CTA.
 */
const CommunityEventCardComponent: React.FC<CommunityEventCardProps> = ({
  eventId,
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
  canManage = false,
  isActionPending = false,
  containerStyle,
  onPressHost,
  onPressCommunity,
  onPressRSVP,
  onEditEvent,
  onDeleteEvent,
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

  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const handleOpenMenu = useCallback(() => {
    if (!canManage || isActionPending) {
      return;
    }
    setIsMenuVisible(true);
  }, [canManage, isActionPending]);

  const handleCloseMenu = useCallback(() => {
    setIsMenuVisible(false);
  }, []);

  const handleEditPress = useCallback(() => {
    onEditEvent?.(eventId);
    handleCloseMenu();
  }, [eventId, handleCloseMenu, onEditEvent]);

  const handleDeletePress = useCallback(() => {
    onDeleteEvent?.(eventId);
    handleCloseMenu();
  }, [eventId, handleCloseMenu, onDeleteEvent]);

  return (
    <View style={[styles.cardContainer, containerStyle]}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text
            style={styles.title}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {canManage ? (
            <TouchableOpacity
              onPress={handleOpenMenu}
              accessibilityRole="button"
              accessibilityLabel="Open event actions"
              accessibilityState={{ disabled: isActionPending }}
              disabled={isActionPending}
              style={styles.menuButton}
              activeOpacity={0.7}
            >
              <MoreVertical color="#FFFFFF" size={20} />
            </TouchableOpacity>
          ) : null}
        </View>
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

      <Modal
        transparent
        visible={isMenuVisible}
        animationType="fade"
        onRequestClose={handleCloseMenu}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseMenu}>
          <Pressable
            style={styles.menuDropdown}
            onPress={(event) => event.stopPropagation()}
            accessibilityRole="menu"
          >
            {onEditEvent ? (
              <>
                <Pressable
                  style={styles.menuOption}
                  onPress={handleEditPress}
                  accessibilityRole="menuitem"
                >
                  <Text style={styles.menuOptionText}>Edit event</Text>
                </Pressable>
                <View style={styles.menuDivider} />
              </>
            ) : null}
            {onDeleteEvent ? (
              <Pressable
                style={styles.menuOption}
                onPress={handleDeletePress}
                accessibilityRole="menuitem"
              >
                <Text style={[styles.menuOptionText, styles.deleteOptionText]}>
                  {isActionPending ? "Working..." : "Delete event"}
                </Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
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
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
  },
  menuButton: {
    padding: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  menuDropdown: {
    width: 220,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  menuOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuOptionText: {
    fontSize: 15,
    fontFamily: "DMSans_500Medium",
    color: "#1B1E1C",
  },
  deleteOptionText: {
    color: "#C62525",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 16,
  },
});

const CommunityEventCard = memo(CommunityEventCardComponent);

export default CommunityEventCard;
