import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ArrowLeft } from "lucide-react-native";
interface CommunityScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
}

/**
 * Displays the back button and contextual title for community screens.
 */
const CommunityScreenHeaderComponent = ({
  title,
  subtitle,
  onBackPress,
}: CommunityScreenHeaderProps) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBackPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Navigate back"
      >
        <Text style={styles.backIcon}><ArrowLeft size={24} color="#0E5B37" /></Text>
      </TouchableOpacity>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E6F1EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  backIcon: {
    fontSize: 24,
    color: "#0E5B37",
    lineHeight: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: "#63706B",
    marginTop: 2,
  },
});

const CommunityScreenHeader = React.memo(CommunityScreenHeaderComponent);

export default CommunityScreenHeader;
