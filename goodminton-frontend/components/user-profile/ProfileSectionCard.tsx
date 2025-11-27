import React, { ReactNode, memo } from "react";
import { View, Text, StyleSheet } from "react-native";

/**
 * Card wrapper for user profile sections.
 */
interface ProfileSectionCardProps {
  title?: string;
  children: ReactNode;
}

const ProfileSectionCard = ({ title, children }: ProfileSectionCardProps) => (
  <View style={styles.card}>
    {title ? <Text style={styles.title}>{title}</Text> : null}
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E1F1EA",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
    marginBottom: 12,
  },
});

export default memo(ProfileSectionCard);
