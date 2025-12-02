import React from "react";
import { Image, StyleSheet, View } from "react-native";

interface CommunityHeroCardProps {
  coverImageUrl?: string | null;
}

/**
 * Visual hero card that displays a community cover image.
 */
const CommunityHeroCardComponent = ({
  coverImageUrl,
}: CommunityHeroCardProps) => {
  const heroSource = coverImageUrl ? { uri: coverImageUrl } : undefined;

  return (
    <View style={styles.card}>
      {heroSource ? (
        <Image source={heroSource} style={styles.image} />
      ) : (
        <View style={styles.coverPlaceholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    height: 164,
    overflow: "hidden",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: "#DAE8E0",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  coverPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#D8E5DD",
  },
});

const CommunityHeroCard = React.memo(CommunityHeroCardComponent);

export default CommunityHeroCard;
