import axios from "axios";
import React, { useEffect, useState } from "react";
import { useAuth } from "../services/authContext";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Linking,
  Alert,
  FlatList,
  ActivityIndicator,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons"; 

type Court = {
  _id: string;
  name: string;
  address?: string;
  price?: number;
  rating?: number;
  openingHours?: {
    open: string;
    close: string;
  };
  courts: number; 
  availableCourts: number;
  location: {
    type: string;
    coordinates: [number, number];
  };
  contact?: string;
};

type TimeSlot = {
  time: string; 
  isBooked: boolean;
  bookedBy?: string; 
};

type CourtSchedule = {
  courtId: number; 
  courtName: string; 
  slots: TimeSlot[];
};

type Props = {
  court: Court | null;
  visible: boolean;
  onClose: () => void;
  userLocation: {
    latitude: number;
    longitude: number;
  } | null;
};

const { width } = Dimensions.get("window");

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const generateMockSchedule = (courtCount: number, dateStr: string): CourtSchedule[] => {
  const schedule: CourtSchedule[] = [];
  const times = [
    "09:00", "10:00", "11:00", "12:00", "13:00", 
    "14:00", "15:00", "16:00", "17:00", "18:00", 
    "19:00", "20:00", "21:00"
  ];

  for (let i = 1; i <= courtCount; i++) {
    const slots: TimeSlot[] = times.map((time) => ({
      time,
      isBooked: Math.random() < 0.3, 
    }));
    schedule.push({
      courtId: i,
      courtName: `Court ${i}`,
      slots,
    });
  }
  return schedule;
};

export default function CourtDetailsModal({
  court,
  visible,
  onClose,
  userLocation,
}: Props) {
  const { user } = useAuth();
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedule, setSchedule] = useState<CourtSchedule[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  useEffect(() => {
    if (visible && court) {
      loadSchedule();
    }
  }, [visible, court, selectedDate]);

  const loadSchedule = async () => {
    setLoadingSchedule(true);
    setTimeout(() => {
      if (court) {
        const mockData = generateMockSchedule(court.courts || 4, selectedDate.toISOString());
        setSchedule(mockData);
      }
      setLoadingSchedule(false);
    }, 500);
  };

  if (!court) return null;

  const handleCallPress = () => {
    if (court.contact) {
      Linking.openURL(`tel:${court.contact}`);
    }
  };

  const distanceText =
    userLocation && court.location?.coordinates
      ? `${getDistance(
          userLocation.latitude,
          userLocation.longitude,
          court.location.coordinates[1],
          court.location.coordinates[0]
        ).toFixed(2)} km`
      : "Unknown";

  const handleSubmitRating = async () => {
    if (!selectedRating) {
      Alert.alert("Please select a score!");
      return;
    }
    if (!user?.id) {
      Alert.alert("Please login first.");
      return;
    }

    try {
      const res = await axios.post(
        `http://localhost:3001/api/courts/${court._id}/rate`,
        { userId: user.id, score: selectedRating }
      );
      Alert.alert("Success", `New Rating: ${res.data.newAverage.toFixed(1)}`);
      court.rating = res.data.newAverage;
    } catch (err) {
      console.error("Rating failed:", err);
      Alert.alert("Rating failed, please try again.");
    }
  };

  const handleBooking = async (courtId: number, time: string) => {
    if (!user?.id) {
      Alert.alert("Login Required", "Please login to book a court.");
      return;
    }

    Alert.alert(
      "Confirm Booking",
      `Book Court ${courtId} at ${time}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              setSchedule((prev) =>
                prev.map((c) => {
                  if (c.courtId === courtId) {
                    return {
                      ...c,
                      slots: c.slots.map((slot) =>
                        slot.time === time ? { ...slot, isBooked: true, bookedBy: user.id } : slot
                      ),
                    };
                  }
                  return c;
                })
              );
              Alert.alert("Success", "Booking confirmed! Check your schedule.");
            } catch (error) {
              Alert.alert("Error", "Booking failed.");
            }
          },
        },
      ]
    );
  };

  const dateOptions = [0, 1, 2].map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  });

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={[styles.safeAreaContainer, styles.safeAreaPadding]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Text style={styles.backButtonText}>{"< Back"}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{court.name}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Info Section */}
          <View style={styles.infoSection}>
            {court.address && <Text style={styles.address}>{court.address}</Text>}
            <View style={styles.infoRow}>
              <TouchableOpacity onPress={handleCallPress}>
                <Text style={styles.phoneText}>📞 {court.contact || "No Contact"}</Text>
              </TouchableOpacity>
              <Text style={styles.distanceText}>📍 {distanceText}</Text>
            </View>
            <Text style={styles.ratingText}>
              ⭐ Rating: {court.rating?.toFixed(1) ?? "N/A"}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Booking Section */}
          <Text style={styles.sectionTitle}>Book a Court</Text>
          
          {/* Date Selector */}
          <View style={styles.dateSelector}>
            {dateOptions.map((date, index) => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text style={[styles.dateText, isSelected && styles.dateTextSelected]}>
                    {date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Schedule Grid */}
          {loadingSchedule ? (
            <ActivityIndicator size="large" color="#0E5B37" style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.scheduleContainer}>
              {schedule.map((courtItem) => (
                <View key={courtItem.courtId} style={styles.courtRowContainer}>
                  <Text style={styles.courtNameLabel}>{courtItem.courtName}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {courtItem.slots.map((slot, index) => (
                      <TouchableOpacity
                        key={index}
                        disabled={slot.isBooked}
                        style={[
                          styles.timeSlot,
                          slot.isBooked ? styles.slotBooked : styles.slotAvailable
                        ]}
                        onPress={() => handleBooking(courtItem.courtId, slot.time)}
                      >
                        <Text style={[
                          styles.timeText, 
                          slot.isBooked ? styles.timeTextBooked : styles.timeTextAvailable
                        ]}>
                          {slot.time}
                        </Text>
                        <Text style={styles.slotStatusText}>
                          {slot.isBooked ? "Full" : "Book"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ))}
            </View>
          )}

          <View style={styles.divider} />

          {/* Rating Section */}
          <View style={styles.ratingContainer}>
            <Text style={styles.sectionTitle}>Rate this place</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.ratingButton,
                    selectedRating === num && styles.ratingSelected,
                  ]}
                  onPress={() => setSelectedRating(num)}
                >
                  <Text
                    style={[
                      styles.ratingNumber,
                      selectedRating === num && styles.ratingNumberSelected,
                    ]}
                  >
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmitRating}
            >
              <Text style={styles.submitText}>Submit Rating</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  safeAreaPadding: {
    // Android 使用 StatusBar.currentHeight，iOS 使用固定的 50 来避开刘海
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  backButton: {
    padding: 8,
    width: 60,
  },
  backButtonText: {
    fontSize: 16,
    color: "#0E5B37",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  infoSection: {
    padding: 16,
  },
  address: {
    fontSize: 16,
    color: "#555",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    alignItems: "center",
  },
  phoneText: {
    fontSize: 15,
    color: "#0E5B37",
    fontWeight: "500",
  },
  distanceText: {
    fontSize: 14,
    color: "#888",
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  divider: {
    height: 8,
    backgroundColor: "#f5f5f5",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    margin: 16,
    marginBottom: 10,
    color: "#333",
  },
  dateSelector: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  dateChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    marginRight: 10,
  },
  dateChipSelected: {
    backgroundColor: "#0E5B37",
  },
  dateText: {
    color: "#333",
    fontWeight: "500",
  },
  dateTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  scheduleContainer: {
    paddingLeft: 16,
  },
  courtRowContainer: {
    marginBottom: 20,
  },
  courtNameLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#444",
  },
  timeSlot: {
    width: 70,
    height: 60,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 1,
  },
  slotAvailable: {
    backgroundColor: "#E8F5E9", 
    borderColor: "#C8E6C9",
  },
  slotBooked: {
    backgroundColor: "#F5F5F5", 
    borderColor: "#E0E0E0",
  },
  timeText: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  timeTextAvailable: {
    color: "#2E7D32",
  },
  timeTextBooked: {
    color: "#BDBDBD",
    textDecorationLine: "line-through",
  },
  slotStatusText: {
    fontSize: 10,
    color: "#666",
  },
  ratingContainer: {
    padding: 16,
    alignItems: "center",
  },
  ratingRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  ratingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingSelected: {
    backgroundColor: "#0E5B37",
  },
  ratingNumber: {
    fontSize: 16,
    color: "#333",
  },
  ratingNumberSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  submitBtn: {
    backgroundColor: "#0E5B37",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
