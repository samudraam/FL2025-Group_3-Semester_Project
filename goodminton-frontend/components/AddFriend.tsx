import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
} from "react-native";
import type { ListRenderItem } from "react-native";
import { usersAPI } from "../services/api";
import { router } from "expo-router";

interface FoundUser {
  _id: string;
  id?: string;
  email: string;
  phone?: string;
  profile: {
    displayName: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    avatar?: string;
  };
  isFriend?: boolean;
}

type SearchResponseUser = FoundUser;

interface ResultCardProps {
  user: SearchResponseUser;
  onPress: (user: SearchResponseUser) => void;
}

const ResultCard = React.memo(({ user, onPress }: ResultCardProps) => {
  const handlePress = useCallback(() => {
    onPress(user);
  }, [onPress, user]);

  const initials = useMemo(() => {
    const source =
      user.profile.displayName ||
      `${user.profile.firstName ?? ""}${user.profile.lastName ?? ""}` ||
      user.email;
    return source.charAt(0).toUpperCase() || "U";
  }, [user]);

  const primaryText =
    user.profile.displayName ||
    [user.profile.firstName, user.profile.lastName].filter(Boolean).join(" ") ||
    user.email;
  const secondaryText = user.phone || user.email;

  const avatarUri = user.profile.avatar;

  return (
    <Pressable
      style={styles.card}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`View ${primaryText} profile`}
      accessibilityHint="Opens the detailed profile screen"
      focusable
    >
      <View style={styles.avatar}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.cardAvatarImage} />
        ) : (
          <Text style={styles.avatarInitial}>{initials}</Text>
        )}
      </View>
      <View style={styles.nameBlock}>
        <Text style={styles.nameText}>{primaryText}</Text>
        <Text style={styles.metaText}>{secondaryText}</Text>
      </View>
      {user.isFriend && (
        <View style={styles.friendBadge}>
          <Text style={styles.friendBadgeText}>friend</Text>
        </View>
      )}
      <View style={styles.viewBlock}>
        <Text style={styles.viewArrow}>↗</Text>
        <Text style={styles.viewText}>view</Text>
      </View>
    </Pressable>
  );
});

/**
 * AddFriend allows sending a friend request by email or phone.
 * After submission, it shows the target user's name and enables navigating to their profile.
 */
const AddFriendComponent = () => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<SearchResponseUser[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const latestSearchTermRef = useRef("");

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
  }, []);

  const performSearch = useCallback(
    async (term: string, showFeedback: boolean) => {
      const sanitized = term.trim();
      if (!sanitized) {
        latestSearchTermRef.current = "";
        setResults([]);
        setHasSearched(false);
        setIsSubmitting(false);
        return;
      }

      if (sanitized.length < 2) {
        latestSearchTermRef.current = "";
        setResults([]);
        setHasSearched(false);
        if (showFeedback) {
          Alert.alert("Too short", "Type at least 2 characters to search.");
        }
        return;
      }

      const activeTerm = sanitized;
      latestSearchTermRef.current = activeTerm;
      setHasSearched(false);
      setIsSubmitting(true);
      try {
        const response = await usersAPI.search(activeTerm);
        const usersList: SearchResponseUser[] =
          (Array.isArray(response?.users) && response.users) ||
          (response?.user ? [response.user] : []);
        if (response?.success) {
          if (latestSearchTermRef.current !== activeTerm) {
            return;
          }
          setResults(usersList);
          setHasSearched(true);
          if (!usersList.length && showFeedback) {
            Alert.alert(
              "No matches",
              "Try another keyword such as last name or phone."
            );
          }
        } else if (showFeedback) {
          Alert.alert("Not found", "Could not find user");
        }
      } catch (error: any) {
        const msg = error?.response?.data?.error || "Search failed";
        if (showFeedback) {
          Alert.alert("Error", msg);
        }
      } finally {
        if (latestSearchTermRef.current === activeTerm) {
          setIsSubmitting(false);
        }
      }
    },
    []
  );

  /**
   * Search for a user by email/phone without sending a request.
   */
  const handleSearch = useCallback(() => {
    performSearch(query, true);
  }, [performSearch, query]);

  useEffect(() => {
    if (!query.trim()) {
      latestSearchTermRef.current = "";
      setDebouncedQuery("");
      setResults([]);
      setHasSearched(false);
      setIsSubmitting(false);
      return;
    }

    const timeout = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      return;
    }
    performSearch(debouncedQuery, false);
  }, [debouncedQuery, performSearch]);

  /**
   * Navigate to the profile viewer for the found user.
   */
  const handleViewProfile = useCallback((user: SearchResponseUser) => {
    if (!user) return;
    const userId = user.id || user._id;
    router.push(
      `/tabs/profile-viewer?userId=${encodeURIComponent(
        userId
      )}&emailOrPhone=${encodeURIComponent(user.email)}`
    );
  }, []);

  const renderUserItem = useCallback<ListRenderItem<SearchResponseUser>>(
    ({ item }) => <ResultCard user={item} onPress={handleViewProfile} />,
    [handleViewProfile]
  );

  const keyExtractor = useCallback(
    (item: SearchResponseUser) => item._id || item.id || item.email,
    []
  );

  const emptyComponent = useMemo(() => {
    if (!hasSearched || isSubmitting) return null;
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No players found</Text>
        <Text style={styles.emptySubtitle}>
          Try different keywords such as last name or phone number.
        </Text>
      </View>
    );
  }, [hasSearched, isSubmitting]);

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={handleQueryChange}
          placeholder="search display name / username / email / phone"
          placeholderTextColor="#949494"
          autoCapitalize="none"
          keyboardType="default"
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <Pressable
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Search players"
          accessibilityHint="Looks up players by the text you entered"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Image
              source={require("../assets/search.png")}
              style={styles.searchIcon}
            />
          )}
        </Pressable>
      </View>
      <Text style={styles.helperText} accessibilityRole="text">
        Suggestions update automatically as you type.
      </Text>

      <FlatList
        data={results}
        keyExtractor={keyExtractor}
        renderItem={renderUserItem}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={emptyComponent}
        ItemSeparatorComponent={CardSeparator}
        contentContainerStyle={
          results.length ? styles.resultsContent : styles.resultsEmptyContent
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingTop: 10,
    alignSelf: "stretch",
    width: "100%",
  },
  helperText: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: "#666666",
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E6E6E6",
    borderRadius: 16,
    padding: 8,
    marginBottom: 12,
    width: "100%",
  },
  input: {
    flex: 1,
    height: 52,
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    letterSpacing: 1,
    color: "#333333",
  },
  searchButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    marginLeft: 8,
    backgroundColor: "#D79AD9",
    alignItems: "center",
    justifyContent: "center",
  },
  searchIcon: {
    width: 18,
    height: 18,
    tintColor: "white",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardSeparator: {
    height: 10,
  },
  resultsContent: {
    paddingBottom: 24,
  },
  resultsEmptyContent: {
    paddingVertical: 24,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0E5B37",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    overflow: "hidden",
  },
  cardAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  avatarInitial: {
    fontSize: 16,
    color: "white",
    fontFamily: "DMSans_700Bold",
  },
  nameBlock: {
    flex: 1,
  },
  nameText: {
    fontSize: 16,
    color: "#333333",
    fontFamily: "DMSans_700Bold",
  },
  metaText: {
    marginTop: 2,
    fontSize: 12,
    color: "#4F4F4F",
    fontFamily: "DMSans_400Regular",
  },
  viewBlock: {
    alignItems: "center",
    marginLeft: 8,
  },
  viewArrow: {
    fontSize: 16,
    color: "#0E5B37",
    fontFamily: "DMSans_700Bold",
  },
  viewText: {
    fontSize: 10,
    color: "#666666",
    fontFamily: "DMSans_400Regular",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#333333",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: "#666666",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  friendBadge: {
    backgroundColor: "#0E5B37",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  friendBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    textTransform: "uppercase",
  },
});

const CardSeparator = () => <View style={styles.cardSeparator} />;

export default React.memo(AddFriendComponent);
