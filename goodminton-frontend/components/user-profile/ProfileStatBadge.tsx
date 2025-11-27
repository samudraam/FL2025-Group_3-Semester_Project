import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";

/**
 * Displays a single statistic with emphasis on the value.
 */
interface ProfileStatBadgeProps {
  label: string;
  value: string;
}

const ProfileStatBadge = ({ label, value }: ProfileStatBadgeProps) => (
  <View style={styles.container}>
    <Text style={styles.value}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F2FBF6",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#C2E3D2",
  },
  value: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: "#4C7D69",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});

export default memo(ProfileStatBadge);
