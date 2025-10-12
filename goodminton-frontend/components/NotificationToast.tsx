import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, Dimensions } from 'react-native';
import { Notification, NotificationType } from '../services/socketContext';

const { width } = Dimensions.get('window');

interface NotificationToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
  onPress?: (notification: Notification) => void;
}

/**
 * NotificationToast displays a temporary notification at the top of the screen
 * It auto-dismisses after 4 seconds and can be manually dismissed by tapping
 * Different notification types have different background colors
 */
export default function NotificationToast({ notification, onDismiss, onPress }: NotificationToastProps) {
  const [slideAnim] = useState(new Animated.Value(-100));
  const [opacity] = useState(new Animated.Value(0));

  /**
   * Animate the toast in when it appears
   */
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 5 seconds (maybe change this later)
    const timer = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  /**
   * Animate the toast out and call onDismiss 
   */
  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(notification.id);
    });
  };

  /**
   * Handle tap on notification
   */
  const handlePress = () => {
    if (onPress) {
      onPress(notification);
    }
    handleDismiss();
  };

  /**
   * Get background color based on notification type
   */
  const getBackgroundColor = (type: NotificationType): string => {
    switch (type) {
      case 'friend_request':
        return '#4A90E2';
      case 'friend_accepted':
        return '#4CAF50';
      case 'friend_rejected':
        return '#FF6B6B';
      case 'game_confirmation':
        return '#FF8C00';
      case 'game_confirmed':
        return '#4CAF50';
      default:
        return '#333';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(notification.type),
          transform: [{ translateY: slideAnim }],
          opacity,
        },
      ]}
    >
      <Pressable style={styles.content} onPress={handlePress}>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>
        <Pressable style={styles.dismissButton} onPress={handleDismiss}>
          <Text style={styles.dismissText}>✕</Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: 'white',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: 'white',
    opacity: 0.95,
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
  },
});

