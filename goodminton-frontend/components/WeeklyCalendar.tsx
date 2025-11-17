import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import GradientComponent from "./GradientComponent";
import { gamesAPI } from "../services/api";
import { fetchWithRetry } from "../services/apiHelpers";

/**
 * Game interface matching API response
 */
interface Game {
  id: string;
  time: string;
  scores: number[][]; // Array of sets, each set is [teamAScore, teamBScore]
  result: "win" | "loss";
  players?: string[];
  teamA?: string;
  teamB?: string;
  winnerTeamDisplay?: string;
}

/**
 * API response interface
 */
interface WeeklyGamesResponse {
  success: boolean;
  games: Game[];
}

/**
 * WeeklyCalendar component displays a week view with game data and match details
 * Shows gradient banner, day selector, and game details for selected day
 */
interface WeeklyCalendarProps {
  refreshTrigger?: number;
}

export default function WeeklyCalendar({
  refreshTrigger,
}: WeeklyCalendarProps) {
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [weeklyGames, setWeeklyGames] = useState<{ [key: number]: Game[] }>({
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Formats ISO date string to readable time format
   * @param isoString - ISO 8601 date string from API
   * @returns Formatted time string like "12:30PM"
   */
  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes}${ampm}`;
  };

  /**
   * Groups games by day of week
   * @param games - Array of games from API
   * @returns Object with day indices (0-6) as keys and game arrays as values
   */
  const groupGamesByDay = (games: Game[]): { [key: number]: Game[] } => {
    const grouped: { [key: number]: Game[] } = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };

    games.forEach((game) => {
      const gameDate = new Date(game.time);
      const dayOfWeek = gameDate.getDay(); // 0 = Sunday, 6 = Saturday
      grouped[dayOfWeek].push(game);
    });

    return grouped;
  };

  const getGamePlayerNames = (game: Game): string => {
    if (Array.isArray(game.players) && game.players.length > 0) {
      return game.players.join(" | ");
    }

    const teamLabels = [game.teamA, game.teamB].filter(
      (name): name is string =>
        typeof name === "string" && name.trim().length > 0
    );

    if (teamLabels.length === 2) {
      return `${teamLabels[0]} vs ${teamLabels[1]}`;
    }

    if (teamLabels.length === 1) {
      return teamLabels[0];
    }

    return "Unknown players";
  };

  /**
   * Calculate sets won for each team from scores array
   * @param scores - Array of sets, each set is [teamAScore, teamBScore]
   * @returns Object with teamAWins and teamBWins counts
   */
  const calculateSetsWon = (
    scores: number[][]
  ): { teamAWins: number; teamBWins: number } => {
    const teamAWins = scores.filter((score) => score[0] > score[1]).length;
    const teamBWins = scores.filter((score) => score[1] > score[0]).length;
    return { teamAWins, teamBWins };
  };

  /**
   * Fetches weekly games data from API on component mount
   * Transforms and groups data by day of week
   * Uses retry logic with exponential backoff and caching
   */
  useEffect(() => {
    const fetchWeeklyGames = async () => {
      try {
        setLoading(true);
        setError(null);

        const response: WeeklyGamesResponse = await fetchWithRetry(
          () => gamesAPI.getWeeklyGames(),
          {
            cacheKey: "weekly-games-calendar",
            cacheTTL: 60000, // Cache for 1 minute
            maxRetries: 3,
            retryDelay: 1000,
          }
        );

        if (response.success && response.games) {
          const groupedGames = groupGamesByDay(response.games);
          setWeeklyGames(groupedGames);
        }
      } catch (err: any) {
        console.error("Failed to fetch weekly games:", err);
        const status = err?.response?.status;
        if (status === 429) {
          setError("Too many requests. Please wait a moment and try again.");
        } else {
          setError("Failed to load games. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyGames();
  }, []);

  /**
   * Respond to external refresh trigger without remounting
   */
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      console.log(
        "🔄 WeeklyCalendar external refresh trigger received:",
        refreshTrigger
      );
      // Trigger a fresh fetch
      const fetchWeeklyGames = async () => {
        try {
          setLoading(true);
          setError(null);

          const response: WeeklyGamesResponse = await fetchWithRetry(
            () => gamesAPI.getWeeklyGames(),
            {
              cacheKey: "weekly-games-calendar",
              cacheTTL: 60000,
              maxRetries: 3,
              retryDelay: 1000,
              skipCache: true, // Force fresh data
            }
          );

          if (response.success && response.games) {
            const groupedGames = groupGamesByDay(response.games);
            setWeeklyGames(groupedGames);
          }
        } catch (error: any) {
          console.error("Failed to fetch weekly games:", error);
          setError(error.message || "Failed to load games");
        } finally {
          setLoading(false);
        }
      };

      fetchWeeklyGames();
    }
  }, [refreshTrigger]);

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const selectedGames =
    weeklyGames[selectedDay as keyof typeof weeklyGames] || [];
  const wins = selectedGames.filter((game) => game.result === "win").length;
  const totalMatches = selectedGames.length;

  /**
   * Check if a day is today
   * @param dayIndex - Day of week (0 = Sunday, 6 = Saturday)
   */
  const isToday = (dayIndex: number): boolean => {
    const today = new Date().getDay();
    return dayIndex === today;
  };

  /**
   * Get day color based on whether it has games and if it's today
   * @param dayIndex - Day of week (0 = Sunday, 6 = Saturday)
   * @returns Color string for the day button background
   */
  const getDayColor = (dayIndex: number): string => {
    const hasGames = weeklyGames[dayIndex]?.length > 0;
    const today = new Date().getDay();

    if (today === dayIndex) {
      return "#4CAF50";
    } else if (hasGames) {
      return "#FFC4EB";
    } else {
      return "#EAEAEA";
    }
  };

  /**
   * Handle day selection with debugging
   * @param dayIndex - Day of week (0 = Sunday, 6 = Saturday)
   */
  const handleDayPress = (dayIndex: number) => {
    console.log(`Day ${dayIndex} pressed, current selected: ${selectedDay}`);
    setSelectedDay(dayIndex);
  };

  return (
    <View style={styles.container}>
      {/* Banner */}
      <View style={styles.banner}>
        <GradientComponent>
          <Text style={styles.bannerTitle}>
            Your personal badminton journey recorded.
          </Text>
          <Text style={styles.bannerSubtitle}>
            Track your progress, see your wins, and view your upcoming games.
          </Text>
        </GradientComponent>
      </View>

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0E5B37" />
          <Text style={styles.loadingText}>Loading your games...</Text>
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Week Header */}
      {!loading && !error && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Games This Week</Text>

          {/* Day Selector */}
          <View style={styles.daySelector}>
            {dayLabels.map((day, index) => (
              <Pressable
                key={`day-${index}-${selectedDay}`}
                style={[
                  styles.dayButton,
                  { backgroundColor: getDayColor(index) },
                  selectedDay === index && styles.selectedBorder,
                ]}
                onPress={() => handleDayPress(index)}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    { color: isToday(index) ? "white" : "#666" },
                  ]}
                >
                  {day}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Game Details */}
          {selectedGames.length > 0 && (
            <View style={styles.gameDetailsContainer}>
              {/* Win/Loss Summary */}
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryText}>
                  {wins}/{totalMatches} MATCHES WON
                </Text>
                <Text style={styles.expandIcon}>⌄</Text>
              </View>

              {/* Game List */}
              <ScrollView
                style={styles.gameList}
                showsVerticalScrollIndicator={false}
              >
                {selectedGames.map((game) => {
                  const { teamAWins, teamBWins } = calculateSetsWon(
                    game.scores
                  );
                  // Determine which team is the user's team based on result
                  // If user won, their team has more sets won
                  const userTeamSetsWon =
                    game.result === "win"
                      ? Math.max(teamAWins, teamBWins)
                      : Math.min(teamAWins, teamBWins);
                  const opponentTeamSetsWon =
                    game.result === "win"
                      ? Math.min(teamAWins, teamBWins)
                      : Math.max(teamAWins, teamBWins);

                  return (
                    <View
                      key={game.id}
                      style={[
                        styles.gameItem,
                        game.result === "win"
                          ? styles.gameItemWin
                          : styles.gameItemLoss,
                      ]}
                    >
                      <Text style={styles.gameTime}>
                        {formatTime(game.time)}
                      </Text>
                      <View style={styles.gamePlayers}>
                        <Text style={styles.playerNames}>
                          {getGamePlayerNames(game)}
                        </Text>
                      </View>
                      {game.winnerTeamDisplay && (
                        <Text style={styles.winnerText}>
                          Winner: {game.winnerTeamDisplay}
                        </Text>
                      )}
                      <View style={styles.scoreContainer}>
                        <Text
                          style={[
                            styles.score,
                            game.result === "win"
                              ? styles.winScore
                              : styles.lossScore,
                          ]}
                        >
                          {userTeamSetsWon}
                        </Text>
                        <Text style={styles.scoreSeparator}>-</Text>
                        <Text
                          style={[
                            styles.score,
                            game.result === "loss"
                              ? styles.winScore
                              : styles.lossScore,
                          ]}
                        >
                          {opponentTeamSetsWon}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* No games message */}
          {selectedGames.length === 0 && (
            <View style={styles.noGamesContainer}>
              <Text style={styles.noGamesText}>
                No games played on this day
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f5f5f5",
  },
  banner: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  bannerTitle: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: "white",
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "white",
    opacity: 0.9,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
    marginBottom: 16,
  },
  daySelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F5A623",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  dayLabel: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
  },
  gameDetailsContainer: {
    backgroundColor: "rgb(255, 207, 117)",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 14,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#666",
  },
  expandIcon: {
    fontSize: 16,
    color: "#666",
  },
  gameList: {
    maxHeight: 200,
  },
  gameItem: {
    backgroundColor: "rgba(255, 255, 255)",
    borderRadius: 8,
    borderWidth: 3,
    padding: 12,
    marginBottom: 8,
  },
  gameItemWin: {
    borderColor: "rgba(116, 255, 120)",
    borderWidth: 3,
  },
  gameItemLoss: {
    borderColor: "rgba(246, 152, 152)",
    borderWidth: 3,
  },
  gameTime: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: "#666",
    marginBottom: 6,
  },
  gamePlayers: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  playerNames: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#333",
    flex: 1,
  },
  winnerText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    color: "#0E5B37",
    marginBottom: 8,
  },
  vsText: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: "#666",
    marginHorizontal: 12,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  score: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    minWidth: 20,
    textAlign: "center",
  },
  winScore: {
    color: "#4CAF50",
  },
  lossScore: {
    color: "#FF4444",
  },
  scoreSeparator: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#666",
    marginHorizontal: 4,
  },
  noGamesContainer: {
    backgroundColor: "#E0E0E0",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  noGamesText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#666",
  },
  selectedBorder: {
    borderWidth: 3,
    borderColor: "#6CCCCE",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#666",
  },
  errorContainer: {
    padding: 20,
    marginHorizontal: 20,
    backgroundColor: "#FFE5E5",
    borderRadius: 12,
    marginTop: 20,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#D32F2F",
    textAlign: "center",
  },
});
