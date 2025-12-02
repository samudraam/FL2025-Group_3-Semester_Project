import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";

/**
 * Highlights ranking related stats for the current user.
 */
interface ProfileRankingCardProps {
  rankPosition: number;
  levelName: string;
  winRate: number;
  matchesPlayed: number;
  matchesWon: number;
}

const ProfileRankingCard = ({

  winRate,
  matchesPlayed,
  matchesWon,
}: ProfileRankingCardProps) => (
  <View style={styles.container}>
    <View style={styles.detailBlock}>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>Win Rate</Text>
        <Text style={styles.detailValue}>{winRate}%</Text>
      </View>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>Matches</Text>
        <Text style={styles.detailValue}>{matchesPlayed}</Text>
      </View>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>Wins</Text>
        <Text style={styles.detailValue}>{matchesWon}</Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0E5B37",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rankBlock: {
    flex: 1,
  },
  rankLabel: {
    color: "#B2E3CE",
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  rankValue: {
    color: "white",
    fontSize: 36,
    fontFamily: "DMSans_800ExtraBold",
    marginVertical: 4,
  },
  levelLabel: {
    color: "#E8FFF3",
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    textTransform: "capitalize",
  },
  divider: {
    width: 1,
    height: "70%",
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 20,
  },
  detailBlock: {
    flex: 1.2,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailItem: {
    alignItems: "center",
  },
  detailLabel: {
    color: "#B2E3CE",
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
  },
  detailValue: {
    color: "white",
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    marginTop: 4,
  },
});

export default memo(ProfileRankingCard);
