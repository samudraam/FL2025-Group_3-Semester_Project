import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Image,
} from "react-native";
import { authAPI, gamesAPI, usersAPI } from "../services/api";
import { fetchWithRetry } from "../services/apiHelpers";
import { useAuth } from "../services/authContext";

/**
 * Interface for friend data structure
 * Updated to use ratings system instead of single points value
 */
interface Friend {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  level?: string;
  ratings?: {
    singles: number;
    doubles: number;
    mixed: number;
  };
  profile?: {
    displayName?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    level?: string;
  };
}

/**
 * Interface for user data with friends
 * Updated to use ratings system
 */
interface UserWithFriends {
  id: string;
  email: string;
  profile: {
    displayName: string;
    firstName: string;
    lastName?: string;
    avatar?: string;
    level: string;
  };
  ratings?: {
    singles: number;
    doubles: number;
    mixed: number;
  };
  friends?: Friend[];
}

/**
 * Props for FriendsList component
 */
interface FriendsListProps {
  onRefresh?: () => void;
}

type GameType = "singles" | "doubles";
type TeamKey = "teamA" | "teamB";
type ScoreKey = "set1" | "set2" | "set3";

interface ScoreState {
  set1: { teamA: string; teamB: string };
  set2: { teamA: string; teamB: string };
  set3: { teamA: string; teamB: string };
}

const createEmptyScores = (): ScoreState => ({
  set1: { teamA: "", teamB: "" },
  set2: { teamA: "", teamB: "" },
  set3: { teamA: "", teamB: "" },
});

const getFriendDisplayName = (friend?: Friend | null): string => {
  if (!friend) return "Unknown Player";
  return (
    friend.profile?.displayName ||
    friend.displayName ||
    friend.firstName ||
    friend.email ||
    "Unknown Player"
  );
};

const mapUserToFriend = (user: any): Friend => ({
  id: user.id,
  displayName: user.displayName || user.profile?.displayName,
  firstName: user.firstName || user.profile?.firstName,
  lastName: user.lastName || user.profile?.lastName,
  email: user.email,
  avatar: user.avatar || user.profile?.avatar,
  level: user.level || user.profile?.level,
  ratings: user.ratings || { singles: 1000, doubles: 1000, mixed: 1000 },
  profile: {
    displayName: user.displayName || user.profile?.displayName,
    firstName: user.firstName || user.profile?.firstName,
    lastName: user.lastName || user.profile?.lastName,
    level: user.level || user.profile?.level,
  },
});

/**
 * Component that displays a list of user's friends with Create Game buttons
 * Fetches friends data from the /auth/me endpoint and displays them in a scrollable list
 */
export default function FriendsList({ onRefresh }: FriendsListProps) {
  const { user } = useAuth();
  const currentUserPlayer = useMemo<Friend | null>(() => {
    if (!user) {
      return null;
    }
    return mapUserToFriend({
      id: user.id,
      email: user.email,
      displayName: user.profile.displayName,
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      avatar: user.profile.avatar,
      level: user.profile.level,
      ratings: (user as any).ratings || {
        singles: 1000,
        doubles: 1000,
        mixed: 1000,
      },
    });
  }, [user]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [gameType, setGameType] = useState<GameType>("singles");
  const [teamAPlayers, setTeamAPlayers] = useState<Friend[]>(
    currentUserPlayer ? [currentUserPlayer] : []
  );
  const [teamBPlayers, setTeamBPlayers] = useState<Friend[]>([]);
  const [scores, setScores] = useState<ScoreState>(createEmptyScores());
  const [winner, setWinner] = useState<TeamKey | null>(null);
  const [teamASearchQuery, setTeamASearchQuery] = useState("");
  const [teamBSearchQuery, setTeamBSearchQuery] = useState("");
  const [teamASearchResults, setTeamASearchResults] = useState<Friend[]>([]);
  const [teamBSearchResults, setTeamBSearchResults] = useState<Friend[]>([]);
  const [teamASearching, setTeamASearching] = useState(false);
  const [teamBSearching, setTeamBSearching] = useState(false);

  useEffect(() => {
    if (!isModalVisible && currentUserPlayer) {
      setTeamAPlayers([currentUserPlayer]);
    }
  }, [currentUserPlayer, isModalVisible]);

  /**
   * Fetches user data including friends from the API
   * Uses caching and retry logic for better performance
   */
  const fetchFriends = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const userData = await fetchWithRetry(() => authAPI.getCurrentUser(), {
        cacheKey: "user-friends",
        cacheTTL: 30000, // Cache for 30 seconds
        maxRetries: 2,
      });

      if (userData.success && userData.user) {
        const userWithFriends = userData.user as UserWithFriends;

        // Ensure friends is an array and filter out any invalid entries
        const friendsArray = Array.isArray(userWithFriends.friends)
          ? userWithFriends.friends.filter((friend) => friend && friend.id)
          : [];

        setFriends(friendsArray);
      } else {
        setError("Failed to load friends data");
      }
    } catch (err: any) {
      console.error("Error fetching friends:", err);
      setError("Unable to load friends. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles Create Game button press
   * Opens the Create Game modal for the selected friend
   */
  const handleCreateGame = (friend: Friend) => {
    setSelectedFriend(friend);
    setGameType("singles");
    setScores(createEmptyScores());
    setWinner(null);
    setTeamASearchQuery("");
    setTeamBSearchQuery("");
    setTeamASearchResults([]);
    setTeamBSearchResults([]);
    if (currentUserPlayer) {
      setTeamAPlayers([currentUserPlayer]);
    } else {
      setTeamAPlayers([]);
    }
    setTeamBPlayers(friend?.id ? [friend] : []);
    setIsModalVisible(true);
  };

  /**
   * Closes the Create Game modal and resets scores
   */
  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedFriend(null);
    setGameType("singles");
    setScores(createEmptyScores());
    setWinner(null);
    setTeamASearchQuery("");
    setTeamBSearchQuery("");
    setTeamASearchResults([]);
    setTeamBSearchResults([]);
    if (currentUserPlayer) {
      setTeamAPlayers([currentUserPlayer]);
    } else {
      setTeamAPlayers([]);
    }
    setTeamBPlayers([]);
  };

  /**
   * Handles score input changes for each set
   */
  const handleScoreChange = (
    setKey: ScoreKey,
    team: TeamKey,
    value: string
  ) => {
    setScores((prev) => ({
      ...prev,
      [setKey]: {
        ...prev[setKey],
        [team]: value,
      },
    }));
  };

  const normalizeToFriend = (input: any): Friend | null => {
    if (!input) return null;
    const id = input.id || input._id;
    if (!id) return null;
    const profile = input.profile || {};
    return {
      id,
      displayName: input.displayName || profile.displayName,
      firstName: input.firstName || profile.firstName,
      lastName: input.lastName || profile.lastName,
      email: input.email,
      avatar: input.avatar || profile.avatar,
      level: input.level ?? profile.level,
      ratings: input.ratings || { singles: 1000, doubles: 1000, mixed: 1000 },
      profile: {
        displayName: profile.displayName || input.displayName,
        firstName: profile.firstName || input.firstName,
        lastName: profile.lastName || input.lastName,
        level: profile.level ?? input.level,
      },
    };
  };

  const handleGameTypeToggle = (type: GameType) => {
    if (type === gameType) return;
    setGameType(type);
    setWinner(null);

    if (type === "singles") {
      if (currentUserPlayer) {
        setTeamAPlayers([currentUserPlayer]);
      } else {
        setTeamAPlayers([]);
      }

      setTeamBPlayers((prev) => {
        if (prev.length > 0) {
          return [prev[0]];
        }
        return selectedFriend?.id ? [selectedFriend] : [];
      });
      setTeamASearchQuery("");
      setTeamASearchResults([]);
    } else {
      if (currentUserPlayer) {
        setTeamAPlayers((prev) => {
          const withoutCurrent = prev.filter(
            (player) => player.id !== currentUserPlayer.id
          );
          return [currentUserPlayer, ...withoutCurrent].slice(0, 2);
        });
      }

      setTeamBPlayers((prev) => {
        if (prev.length === 0 && selectedFriend?.id) {
          return [selectedFriend];
        }
        return prev.slice(0, 2);
      });
    }
  };

  const handleSearchPlayers = async (team: TeamKey) => {
    const query = (
      team === "teamA" ? teamASearchQuery : teamBSearchQuery
    ).trim();
    if (!query) {
      Alert.alert("Enter an email to search");
      return;
    }

    const setSearching =
      team === "teamA" ? setTeamASearching : setTeamBSearching;
    const setResults =
      team === "teamA" ? setTeamASearchResults : setTeamBSearchResults;

    setSearching(true);
    setResults([]);

    try {
      const response = await usersAPI.search(query);

      const candidates: Friend[] = [];
      if (Array.isArray(response?.users)) {
        response.users.forEach((userResult: any) => {
          const friend = normalizeToFriend(userResult);
          if (friend) candidates.push(friend);
        });
      }
      if (response?.user) {
        const friend = normalizeToFriend(response.user);
        if (friend) candidates.push(friend);
      }

      const uniqueCandidates = candidates.filter(
        (candidate, index, arr) =>
          arr.findIndex((c) => c.id === candidate.id) === index &&
          !teamAPlayers.some((player) => player.id === candidate.id) &&
          !teamBPlayers.some((player) => player.id === candidate.id)
      );

      if (uniqueCandidates.length === 0) {
        Alert.alert(
          "No results",
          "No matching players found or they are already added."
        );
      } else {
        setResults(uniqueCandidates);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.error || "Search failed. Please try again.";
      Alert.alert("Error", message);
    } finally {
      setSearching(false);
    }
  };

  const handleAddPlayerToTeam = (team: TeamKey, player: Friend) => {
    if (!player?.id) {
      Alert.alert("Unable to add player", "Selected player is missing an ID.");
      return;
    }

    if (
      currentUserPlayer &&
      player.id === currentUserPlayer.id &&
      team === "teamB"
    ) {
      Alert.alert("Invalid selection", "You cannot add yourself to Team 2.");
      return;
    }

    const existsInTeam = (team === "teamA" ? teamAPlayers : teamBPlayers).some(
      (member) => member.id === player.id
    );
    const existsInOpposingTeam = (
      team === "teamA" ? teamBPlayers : teamAPlayers
    ).some((member) => member.id === player.id);

    if (existsInTeam || existsInOpposingTeam) {
      Alert.alert("Already added", "This player is already part of the game.");
      return;
    }

    if (team === "teamA") {
      if (gameType !== "doubles") {
        Alert.alert("Singles game", "Team 1 only needs you in singles mode.");
        return;
      }

      if (teamAPlayers.length >= 2) {
        Alert.alert("Team full", "Team 1 already has two players.");
        return;
      }

      setTeamAPlayers((prev) => [...prev, player]);
      setTeamASearchQuery("");
      setTeamASearchResults([]);
    } else {
      const limit = gameType === "singles" ? 1 : 2;
      if (teamBPlayers.length >= limit) {
        Alert.alert(
          "Team full",
          `Team 2 already has ${limit} player${limit === 1 ? "" : "s"}.`
        );
        return;
      }

      setTeamBPlayers((prev) => [...prev, player]);
      setTeamBSearchQuery("");
      setTeamBSearchResults([]);
    }
  };

  const handleRemovePlayerFromTeam = (team: TeamKey, playerId: string) => {
    if (team === "teamA") {
      if (currentUserPlayer && playerId === currentUserPlayer.id) {
        Alert.alert("Action not allowed", "You must remain on Team 1.");
        return;
      }
      setTeamAPlayers((prev) =>
        prev.filter((player) => player.id !== playerId)
      );
    } else {
      setTeamBPlayers((prev) =>
        prev.filter((player) => player.id !== playerId)
      );
    }
  };

  const teamADisplayName =
    teamAPlayers.length > 0
      ? teamAPlayers.map((player) => getFriendDisplayName(player)).join(" & ")
      : "Team 1";
  const teamBDisplayName =
    teamBPlayers.length > 0
      ? teamBPlayers.map((player) => getFriendDisplayName(player)).join(" & ")
      : "Team 2";

  /**
   * Handles Create Game modal submission
   * Validates form data and submits to the games API
   */
  const handleCreateGameSubmit = async () => {
    try {
      if (!scores.set1.teamA || !scores.set1.teamB) {
        Alert.alert("Invalid Input", "Please enter scores for Set 1");
        return;
      }

      if (!winner) {
        Alert.alert("Invalid Input", "Please select the winning team");
        return;
      }

      const scoreSets: number[][] = [];

      const scoreKeys: ScoreKey[] = ["set1", "set2", "set3"];
      const setLabels: Record<ScoreKey, string> = {
        set1: "Set 1",
        set2: "Set 2",
        set3: "Set 3",
      };

      for (const key of scoreKeys) {
        const teamAScoreRaw = scores[key].teamA;
        const teamBScoreRaw = scores[key].teamB;

        if (!teamAScoreRaw && !teamBScoreRaw) {
          continue;
        }

        if (!teamAScoreRaw || !teamBScoreRaw) {
          Alert.alert(
            "Invalid Input",
            `${setLabels[key]} must include scores for both teams.`
          );
          return;
        }

        const teamAScore = Number.parseInt(teamAScoreRaw, 10);
        const teamBScore = Number.parseInt(teamBScoreRaw, 10);

        if (Number.isNaN(teamAScore) || Number.isNaN(teamBScore)) {
          Alert.alert(
            "Invalid Input",
            `${setLabels[key]} scores must be numbers.`
          );
          return;
        }

        scoreSets.push([teamAScore, teamBScore]);
      }

      if (scoreSets.length === 0) {
        Alert.alert(
          "Invalid Input",
          "Please provide at least one completed set."
        );
        return;
      }

      if (!currentUserPlayer?.id) {
        Alert.alert("Error", "Unable to determine your player record.");
        return;
      }

      let gamePayload:
        | {
            gameType: "singles";
            opponentId: string;
            winnerId: string;
            scores: number[][];
          }
        | {
            gameType: "doubles";
            teammateId: string;
            opponent1Id: string;
            opponent2Id: string;
            winnerTeam: TeamKey;
            scores: number[][];
          };

      if (gameType === "singles") {
        const opponent = teamBPlayers[0] || selectedFriend;
        if (!opponent?.id) {
          Alert.alert("Invalid Input", "Please select an opponent.");
          return;
        }

        const winnerId =
          winner === "teamA" ? currentUserPlayer.id : opponent.id;

        gamePayload = {
          gameType: "singles",
          opponentId: opponent.id,
          winnerId,
          scores: scoreSets,
        };
      } else {
        const teammate = teamAPlayers.find(
          (player) => currentUserPlayer && player.id !== currentUserPlayer.id
        );
        if (!teammate?.id) {
          Alert.alert("Invalid Input", "Please add a teammate for Team 1.");
          return;
        }

        if (teamBPlayers.length < 2) {
          Alert.alert("Invalid Input", "Please add two opponents for Team 2.");
          return;
        }

        const [opponent1, opponent2] = teamBPlayers;
        if (!opponent1?.id || !opponent2?.id) {
          Alert.alert(
            "Invalid Input",
            "Opponents must have valid player records."
          );
          return;
        }

        gamePayload = {
          gameType: "doubles",
          teammateId: teammate.id,
          opponent1Id: opponent1.id,
          opponent2Id: opponent2.id,
          winnerTeam: winner,
          scores: scoreSets,
        };
      }

      const response = await fetchWithRetry(
        () => gamesAPI.submitGame(gamePayload),
        {
          cacheKey: `game-${Date.now()}`,
          skipCache: true,
        }
      );

      if (response.success) {
        Alert.alert("Game Created!", `Game submitted successfully!`, [
          { text: "OK", onPress: closeModal },
        ]);
      } else {
        throw new Error(response.message || "Failed to create game");
      }
    } catch (error: any) {
      console.error("Error creating game:", error);
      Alert.alert(
        "Error",
        `Failed to create game: ${error.message || "Please try again"}`,
        [{ text: "OK" }]
      );
    }
  };

  /**
   * Refreshes the friends list
   */
  const handleRefresh = () => {
    fetchFriends();
    onRefresh?.();
  };

  // Fetch friends on component mount
  useEffect(() => {
    fetchFriends();
  }, []);

  /**
   * Renders a loading indicator
   */
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0E5B37" />
        <Text style={styles.loadingText}>Loading friends...</Text>
      </View>
    );
  }

  /**
   * Renders error state
   */
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  /**
   * Renders empty state when no friends
   */
  if (friends.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No friends yet</Text>
        <Text style={styles.emptySubtext}>
          Add friends to start creating games!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <Pressable style={styles.refreshButton} onPress={handleRefresh}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.friendsList}
        showsVerticalScrollIndicator={false}
      >
        {friends
          .filter((friend) => friend && friend.id)
          .map((friend) => {
            const avatarUri = friend.avatar || friend.profile?.avatar;
            const friendInitial = (
              friend.profile?.displayName ||
              friend.displayName ||
              friend.firstName ||
              friend.email ||
              "U"
            )
              .charAt(0)
              .toUpperCase();

            return (
              <View key={friend.id} style={styles.friendItem}>
                <View style={styles.friendInfo}>
                  <View style={styles.avatar}>
                    {avatarUri ? (
                      <Image
                        source={{ uri: avatarUri }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.avatarText}>{friendInitial}</Text>
                    )}
                  </View>
                  <View style={styles.friendDetails}>
                    <Text style={styles.friendName}>
                      {friend.profile?.displayName ||
                        friend.displayName ||
                        friend.firstName ||
                        friend.email ||
                        "Unknown User"}
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={styles.createGameButton}
                  onPress={() => handleCreateGame(friend)}
                >
                  <Text style={styles.createGameButtonText}>Create Game</Text>
                </Pressable>
              </View>
            );
          })}
      </ScrollView>

      {/* Create Game Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                Create Game with{" "}
                {selectedFriend?.profile?.displayName ||
                  selectedFriend?.displayName ||
                  selectedFriend?.firstName ||
                  selectedFriend?.email ||
                  "Unknown User"}
              </Text>
              <Text style={styles.modalSubtitle}>
                Enter the scores for each set played
              </Text>

              <View style={styles.gameTypeToggle}>
                <Pressable
                  style={[
                    styles.gameTypeOption,
                    gameType === "singles" && styles.gameTypeOptionActive,
                  ]}
                  onPress={() => handleGameTypeToggle("singles")}
                >
                  <Text
                    style={[
                      styles.gameTypeOptionText,
                      gameType === "singles" && styles.gameTypeOptionTextActive,
                    ]}
                  >
                    Singles
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.gameTypeOption,
                    gameType === "doubles" && styles.gameTypeOptionActive,
                  ]}
                  onPress={() => handleGameTypeToggle("doubles")}
                >
                  <Text
                    style={[
                      styles.gameTypeOptionText,
                      gameType === "doubles" && styles.gameTypeOptionTextActive,
                    ]}
                  >
                    Doubles
                  </Text>
                </Pressable>
              </View>

              <View style={styles.teamSection}>
                <Text style={styles.teamSectionTitle}>Team 1 Players</Text>
                {teamAPlayers.length === 0 ? (
                  <Text style={styles.teamEmptyText}>
                    Add players to Team 1.
                  </Text>
                ) : (
                  teamAPlayers.map((player) => {
                    const canRemove =
                      !currentUserPlayer || player.id !== currentUserPlayer.id;
                    return (
                      <View key={player.id} style={styles.teamPlayerRow}>
                        <Text style={styles.teamPlayerName}>
                          {getFriendDisplayName(player)}
                        </Text>
                        {canRemove && (
                          <Pressable
                            style={styles.removePlayerButton}
                            onPress={() =>
                              handleRemovePlayerFromTeam("teamA", player.id)
                            }
                          >
                            <Text style={styles.removePlayerText}>Remove</Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })
                )}
                {gameType === "doubles" && (
                  <>
                    <View style={styles.teamSearchRow}>
                      <TextInput
                        style={styles.teamSearchInput}
                        value={teamASearchQuery}
                        onChangeText={setTeamASearchQuery}
                        placeholder="Search by email"
                        placeholderTextColor="#949494"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        returnKeyType="search"
                        onSubmitEditing={() => handleSearchPlayers("teamA")}
                      />
                      <Pressable
                        style={[
                          styles.teamSearchButton,
                          teamASearching && styles.teamSearchButtonDisabled,
                        ]}
                        onPress={() => handleSearchPlayers("teamA")}
                        disabled={teamASearching}
                      >
                        {teamASearching ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Text style={styles.teamSearchButtonText}>
                            Search
                          </Text>
                        )}
                      </Pressable>
                    </View>
                    {teamASearchResults.map((player) => (
                      <View key={player.id} style={styles.searchResultRow}>
                        <Text style={styles.searchResultName}>
                          {getFriendDisplayName(player)}
                        </Text>
                        <Pressable
                          style={styles.addPlayerButton}
                          onPress={() => handleAddPlayerToTeam("teamA", player)}
                        >
                          <Text style={styles.addPlayerButtonText}>Add</Text>
                        </Pressable>
                      </View>
                    ))}
                  </>
                )}
              </View>

              <View style={styles.teamSection}>
                <Text style={styles.teamSectionTitle}>Team 2 Players</Text>
                {teamBPlayers.length === 0 ? (
                  <Text style={styles.teamEmptyText}>
                    {gameType === "singles"
                      ? "No opponent selected."
                      : "Add opponents to Team 2."}
                  </Text>
                ) : (
                  teamBPlayers.map((player) => (
                    <View key={player.id} style={styles.teamPlayerRow}>
                      <Text style={styles.teamPlayerName}>
                        {getFriendDisplayName(player)}
                      </Text>
                      {gameType === "doubles" && (
                        <Pressable
                          style={styles.removePlayerButton}
                          onPress={() =>
                            handleRemovePlayerFromTeam("teamB", player.id)
                          }
                        >
                          <Text style={styles.removePlayerText}>Remove</Text>
                        </Pressable>
                      )}
                    </View>
                  ))
                )}
                {gameType === "doubles" && (
                  <>
                    <View style={styles.teamSearchRow}>
                      <TextInput
                        style={styles.teamSearchInput}
                        value={teamBSearchQuery}
                        onChangeText={setTeamBSearchQuery}
                        placeholder="Search by email"
                        placeholderTextColor="#949494"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        returnKeyType="search"
                        onSubmitEditing={() => handleSearchPlayers("teamB")}
                      />
                      <Pressable
                        style={[
                          styles.teamSearchButton,
                          teamBSearching && styles.teamSearchButtonDisabled,
                        ]}
                        onPress={() => handleSearchPlayers("teamB")}
                        disabled={teamBSearching}
                      >
                        {teamBSearching ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Text style={styles.teamSearchButtonText}>
                            Search
                          </Text>
                        )}
                      </Pressable>
                    </View>
                    {teamBSearchResults.map((player) => (
                      <View key={player.id} style={styles.searchResultRow}>
                        <Text style={styles.searchResultName}>
                          {getFriendDisplayName(player)}
                        </Text>
                        <Pressable
                          style={styles.addPlayerButton}
                          onPress={() => handleAddPlayerToTeam("teamB", player)}
                        >
                          <Text style={styles.addPlayerButtonText}>Add</Text>
                        </Pressable>
                      </View>
                    ))}
                  </>
                )}
              </View>

              <View style={styles.setContainer}>
                <Text style={styles.setTitle}>Set 1</Text>
                <View style={styles.scoreInputContainer}>
                  <View style={styles.scoreInputWrapper}>
                    <Text style={styles.scoreLabel}>Team 1</Text>
                    <Text style={styles.scoreSublabel}>{teamADisplayName}</Text>
                    <TextInput
                      style={styles.scoreInput}
                      value={scores.set1.teamA}
                      onChangeText={(value) =>
                        handleScoreChange("set1", "teamA", value)
                      }
                      placeholder="0"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                  <Text style={styles.scoreSeparator}>-</Text>
                  <View style={styles.scoreInputWrapper}>
                    <Text style={styles.scoreLabel}>Team 2</Text>
                    <Text style={styles.scoreSublabel}>{teamBDisplayName}</Text>
                    <TextInput
                      style={styles.scoreInput}
                      value={scores.set1.teamB}
                      onChangeText={(value) =>
                        handleScoreChange("set1", "teamB", value)
                      }
                      placeholder="0"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.setContainer}>
                <Text style={styles.setTitle}>Set 2</Text>
                <View style={styles.scoreInputContainer}>
                  <View style={styles.scoreInputWrapper}>
                    <Text style={styles.scoreLabel}>Team 1</Text>
                    <Text style={styles.scoreSublabel}>{teamADisplayName}</Text>
                    <TextInput
                      style={styles.scoreInput}
                      value={scores.set2.teamA}
                      onChangeText={(value) =>
                        handleScoreChange("set2", "teamA", value)
                      }
                      placeholder="0"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                  <Text style={styles.scoreSeparator}>-</Text>
                  <View style={styles.scoreInputWrapper}>
                    <Text style={styles.scoreLabel}>Team 2</Text>
                    <Text style={styles.scoreSublabel}>{teamBDisplayName}</Text>
                    <TextInput
                      style={styles.scoreInput}
                      value={scores.set2.teamB}
                      onChangeText={(value) =>
                        handleScoreChange("set2", "teamB", value)
                      }
                      placeholder="0"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.setContainer}>
                <Text style={styles.setTitle}>Set 3</Text>
                <View style={styles.scoreInputContainer}>
                  <View style={styles.scoreInputWrapper}>
                    <Text style={styles.scoreLabel}>Team 1</Text>
                    <Text style={styles.scoreSublabel}>{teamADisplayName}</Text>
                    <TextInput
                      style={styles.scoreInput}
                      value={scores.set3.teamA}
                      onChangeText={(value) =>
                        handleScoreChange("set3", "teamA", value)
                      }
                      placeholder="0"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                  <Text style={styles.scoreSeparator}>-</Text>
                  <View style={styles.scoreInputWrapper}>
                    <Text style={styles.scoreLabel}>Team 2</Text>
                    <Text style={styles.scoreSublabel}>{teamBDisplayName}</Text>
                    <TextInput
                      style={styles.scoreInput}
                      value={scores.set3.teamB}
                      onChangeText={(value) =>
                        handleScoreChange("set3", "teamB", value)
                      }
                      placeholder="0"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.winnerContainer}>
                <Text style={styles.winnerTitle}>Who won?</Text>
                <View style={styles.winnerButtons}>
                  <Pressable
                    style={[
                      styles.winnerButton,
                      winner === "teamA" && styles.winnerButtonSelected,
                    ]}
                    onPress={() => setWinner("teamA")}
                  >
                    <Text
                      style={[
                        styles.winnerButtonText,
                        winner === "teamA" && styles.winnerButtonTextSelected,
                      ]}
                    >
                      Team 1
                    </Text>
                    <Text
                      style={[
                        styles.winnerButtonSublabel,
                        winner === "teamA" &&
                          styles.winnerButtonSublabelSelected,
                      ]}
                    >
                      {teamADisplayName}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.winnerButton,
                      styles.winnerButtonLast,
                      winner === "teamB" && styles.winnerButtonSelected,
                    ]}
                    onPress={() => setWinner("teamB")}
                  >
                    <Text
                      style={[
                        styles.winnerButtonText,
                        winner === "teamB" && styles.winnerButtonTextSelected,
                      ]}
                    >
                      Team 2
                    </Text>
                    <Text
                      style={[
                        styles.winnerButtonSublabel,
                        winner === "teamB" &&
                          styles.winnerButtonSublabelSelected,
                      ]}
                    >
                      {teamBDisplayName}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.modalButtons}>
                  <Pressable style={styles.cancelButton} onPress={closeModal}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={styles.submitButton}
                    onPress={handleCreateGameSubmit}
                  >
                    <Text style={styles.submitButtonText}>Create Game</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#0E5B37",
    borderRadius: 6,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
  },
  friendsList: {
    flex: 1,
    padding: 10,
    paddingBottom: 10,
  },
  friendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#0E5B37",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 25,
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "#333",
    marginBottom: 4,
  },
  friendLevel: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#666",
    textTransform: "capitalize",
  },
  createGameButton: {
    backgroundColor: "#FF8C00",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createGameButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: "DMSans_400Regular",
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "DMSans_400Regular",
    color: "#e74c3c",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#0E5B37",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: "DMSans_600SemiBold",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#666",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    margin: 20,
    minWidth: 350,
    maxHeight: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  gameTypeToggle: {
    flexDirection: "row",
    backgroundColor: "#E6E6E6",
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E3F2FD",
  },
  gameTypeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  gameTypeOptionActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  gameTypeOptionText: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: "#666",
  },
  gameTypeOptionTextActive: {
    color: "#0E5B37",
    fontFamily: "DMSans_700Bold",
  },
  teamSection: {
    marginBottom: 24,
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E3F2FD",
    padding: 16,
  },
  teamSectionTitle: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#333",
    marginBottom: 12,
  },
  teamEmptyText: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: "#666",
    marginBottom: 12,
  },
  teamPlayerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  teamPlayerName: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: "#333",
  },
  removePlayerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FFE4E4",
  },
  removePlayerText: {
    fontSize: 12,
    color: "#D64242",
    fontFamily: "DMSans_600SemiBold",
  },
  teamSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  teamSearchInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#333",
    marginRight: 8,
  },
  teamSearchButton: {
    width: 90,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#0E5B37",
    alignItems: "center",
    justifyContent: "center",
  },
  teamSearchButtonDisabled: {
    opacity: 0.6,
  },
  teamSearchButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EDEDED",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  searchResultName: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: "#333",
    flex: 1,
    marginRight: 12,
  },
  addPlayerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#0E5B37",
  },
  addPlayerButtonText: {
    fontSize: 12,
    color: "#ffffff",
    fontFamily: "DMSans_600SemiBold",
  },
  setContainer: {
    marginBottom: 20,
  },
  setTitle: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "#333",
    marginBottom: 10,
  },
  scoreInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scoreInputWrapper: {
    flex: 1,
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: "#666",
    marginBottom: 6,
  },
  scoreSublabel: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: "#9A9A9A",
    marginBottom: 6,
    textAlign: "center",
  },
  scoreInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "#333",
    backgroundColor: "#f9f9f9",
  },
  scoreSeparator: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: "#666",
    marginHorizontal: 15,
  },
  winnerContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  winnerTitle: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "#333",
    textAlign: "center",
    marginBottom: 15,
  },
  winnerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  winnerButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
    alignItems: "center",
    marginRight: 12,
  },
  winnerButtonSelected: {
    borderColor: "#5E9673",
    backgroundColor: "#5E9673",
  },
  winnerButtonLast: {
    marginRight: 0,
  },
  winnerButtonText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "#666",
  },
  winnerButtonTextSelected: {
    color: "#fff",
  },
  winnerButtonSublabel: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: "#666",
    marginTop: 4,
  },
  winnerButtonSublabelSelected: {
    color: "#ffffff",
  },
  modalButtons: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 12,
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
  },
  submitButton: {
    flex: 1,
    backgroundColor: "#0E5B37",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
  },
});
