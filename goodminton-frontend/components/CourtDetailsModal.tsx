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
  ActivityIndicator,
  Platform,
  StatusBar,
} from "react-native";

const API_BASE_URL = "http://192.168.1.186:3001/api";

type Court = {
  _id: string;
  name: string;
  address?: string;
  price?: number;
  rating?: number;
  location: { type: string; coordinates: [number, number] };
  contact?: string;
};

type TimeSlot = { time: string; isBooked: boolean; bookedBy?: string };

type CourtSchedule = { courtId: number; courtName: string; slots: TimeSlot[] };

type Props = { court: Court | null; visible: boolean; onClose: () => void; userLocation: { latitude: number; longitude: number } | null };

const { width } = Dimensions.get("window");

const HOURS = Array.from({ length: 14 }, (_, i) => `${i + 8}:00`); // 8:00 - 21:00

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CourtDetailsModal({ court, visible, onClose, userLocation }: Props) {
  const { user } = useAuth();
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<CourtSchedule[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  useEffect(() => {
    if (visible && court) loadSchedule();
  }, [visible, court]);

  const loadSchedule = async () => {
    if (!court) return;
    setLoadingSchedule(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/reservations/${court._id}`, { params: { date: todayStr } });
      const bookings: { hour: string; userId: string }[] = response.data.slots || [];

      const slots: TimeSlot[] = HOURS.map((hour) => {
        const booked = bookings.find((b) => b.hour === hour);
        return { time: hour, isBooked: !!booked, bookedBy: booked?.userId };
      });

      setSchedule([{ courtId: 1, courtName: "Court 1", slots }]);
    } catch (error) {
      console.error("Failed to load schedule:", error);
      Alert.alert("Error", "Could not load court availability.");
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleBooking = async (time: string) => {
    if (!user?.id) return Alert.alert("Login Required", "Please login to book a court.");
    Alert.alert("Confirm Booking", `Book Court 1 at ${time}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          try {
            await axios.post(`${API_BASE_URL}/reservations/${court!._id}/create`, {
              userId: user.id,
              date: todayStr,
              hour: time,
            });
            Alert.alert("Success", "Booking confirmed!");
            loadSchedule();
          } catch (error) {
            console.error("Booking failed:", error);
            Alert.alert("Error", "Booking failed. Please try again.");
          }
        },
      },
    ]);
  };

  if (!court) return null;

  const handleCallPress = () => {
    if (court.contact) Linking.openURL(`tel:${court.contact}`);
  };

  const distanceText =
    userLocation && court.location?.coordinates
      ? `${getDistance(userLocation.latitude, userLocation.longitude, court.location.coordinates[1], court.location.coordinates[0]).toFixed(2)} km`
      : "Unknown";

  const handleSubmitRating = async () => {
    if (!selectedRating) return Alert.alert("Please select a score!");
    if (!user?.id) return Alert.alert("Please login first.");

    try {
      const res = await axios.post(`${API_BASE_URL}/courts/${court._id}/rate`, { userId: user.id, score: selectedRating });
      Alert.alert("Success", `New Rating: ${res.data.newAverage.toFixed(1)}`);
      court.rating = res.data.newAverage;
    } catch {
      Alert.alert("Rating failed, please try again.");
    }
  };

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <View style={[styles.safeAreaContainer, styles.safeAreaPadding]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Text style={styles.backButtonText}>{"< Back"}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {court.name}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.infoSection}>
            {court.address && <Text style={styles.address}>{court.address}</Text>}
            <View style={styles.infoRow}>
              <TouchableOpacity onPress={handleCallPress}>
                <Text style={styles.phoneText}>📞 {court.contact || "No Contact"}</Text>
              </TouchableOpacity>
              <Text style={styles.distanceText}>📍 {distanceText}</Text>
            </View>
            <Text style={styles.ratingText}>⭐ Rating: {court.rating?.toFixed(1) ?? "N/A"}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Book a Court ({todayStr})</Text>
          {loadingSchedule ? (
            <ActivityIndicator size="large" color="#0E5B37" style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.scheduleContainer}>
              {schedule[0]?.slots.map((slot, idx) => (
                <TouchableOpacity
                  key={idx}
                  disabled={slot.isBooked}
                  style={[styles.timeSlot, slot.isBooked ? styles.slotBooked : styles.slotAvailable]}
                  onPress={() => handleBooking(slot.time)}
                >
                  <Text style={[styles.timeText, slot.isBooked ? styles.timeTextBooked : styles.timeTextAvailable]}>
                    {slot.time}
                  </Text>
                  <Text style={styles.slotStatusText}>{slot.isBooked ? "Full" : "Book"}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.ratingContainer}>
            <Text style={styles.sectionTitle}>Rate this place</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[styles.ratingButton, selectedRating === num && styles.ratingSelected]}
                  onPress={() => setSelectedRating(num)}
                >
                  <Text style={[styles.ratingNumber, selectedRating === num && styles.ratingNumberSelected]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitRating}>
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
  scheduleContainer: {
    paddingLeft: 16,
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
