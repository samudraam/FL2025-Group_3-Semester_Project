import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Alert, Image } from 'react-native';
import { usersAPI } from '../services/api';
import { router } from 'expo-router';

interface FoundUser {
  _id: string;
  id?: string;
  email: string;
  profile: {
    displayName: string;
    fullName?: string;
  };
}

type SearchResponseUser = FoundUser;

/**
 * AddFriend allows sending a friend request by email or phone.
 * After submission, it shows the target user's name and enables navigating to their profile.
 */
export default function AddFriend() {
  const [query, setQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [found, setFound] = useState<SearchResponseUser | null>(null);

  /**
   * Search for a user by email/phone without sending a request.
   */
  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      Alert.alert('Enter email/phone/username');
      return;
    }

    setIsSubmitting(true);
    setFound(null);
    try {
      const response = await usersAPI.search(trimmed);
      const user: SearchResponseUser | null =
        response?.user || (Array.isArray(response?.users) && response.users.length > 0 ? response.users[0] : null);
      if (response?.success && user) setFound(user);
      else Alert.alert('Not found', 'Could not find user');
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Search failed';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Navigate to the profile viewer for the found user.
   */
  const handleViewProfile = () => {
    if (!found) return;
    const user = found;
    const userId = user.id || user._id;
    router.push(`/tabs/profile-viewer?userId=${encodeURIComponent(userId)}&emailOrPhone=${encodeURIComponent(user.email)}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="search by email/phone/username"
          placeholderTextColor="#949494"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <Pressable style={styles.searchButton} onPress={handleSearch} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Image source={require('../assets/search.png')} style={styles.searchIcon} />
          )}
        </Pressable>
      </View>

      {found && (
        <Pressable style={styles.card} onPress={handleViewProfile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>
              {found.profile.displayName?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.nameBlock}>
            <Text style={styles.nameText}>{found.profile.displayName || found.email}</Text>
          </View>
          <View style={styles.viewBlock}>
            <Text style={styles.viewArrow}>↗</Text>
            <Text style={styles.viewText}>view</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingTop: 10,
    alignSelf: 'stretch',
    width: '100%',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6E6E6',
    borderRadius: 16,
    padding: 8,
    marginBottom: 12,
    width: '100%',
  },
  input: {
    flex: 1,
    height: 52,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    letterSpacing: 1,
    color: '#333333',
  },
  searchButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    marginLeft: 8,
    backgroundColor: '#D79AD9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    width: 18,
    height: 18,
    tintColor: 'white',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0E5B37',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'DMSans_700Bold',
  },
  nameBlock: {
    flex: 1,
  },
  nameText: {
    fontSize: 16,
    color: '#333333',
    fontFamily: 'DMSans_700Bold',
  },
  viewBlock: {
    alignItems: 'center',
  },
  viewArrow: {
    fontSize: 16,
    color: '#0E5B37',
    fontFamily: 'DMSans_700Bold',
  },
  viewText: {
    fontSize: 10,
    color: '#666666',
    fontFamily: 'DMSans_400Regular',
  },
});


