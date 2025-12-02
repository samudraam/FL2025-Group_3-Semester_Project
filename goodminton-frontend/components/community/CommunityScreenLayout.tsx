import React from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

interface CommunityScreenLayoutProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  backgroundColor?: string;
  contentStyle?: ViewStyle;
}

/**
 * Wraps community-related screens with a consistent SafeArea scaffold.
 */
const CommunityScreenLayoutComponent = ({
  children,
  footer,
  backgroundColor = "#F4F6F4",
  contentStyle,
}: CommunityScreenLayoutProps) => {
  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor }]}
      accessibilityRole="none"
    >
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      <View style={[styles.content, contentStyle]}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  footer: {
    width: "100%",
  },
});

const CommunityScreenLayout = React.memo(CommunityScreenLayoutComponent);

export default CommunityScreenLayout;
