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
} from "react-native";

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
  const R = 6371; // 地球半径 km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // 返回距离（km）
}

export default function CourtDetailsModal({
  court,
  visible,
  onClose,
  userLocation,
}: Props) {
  if (!court) return null;

  const { user } = useAuth();

  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [userHasRated, setUserHasRated] = useState(false);

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

  // ✅ 处理评分提交
  const handleSubmitRating = async () => {
    if (!selectedRating) {
      Alert.alert("Please rate first！");
      return;
    }

    if (!user?.id && !user?.id) {
      Alert.alert("You must be logged in to rate a court.");
      return;
    }

    try {
      // 向后端发送评分请求
      const res = await axios.post(
        `http://localhost:3001/api/courts/${court._id}/rate`,
        { userId: user.id, score: selectedRating }
      );

      // 返回新的平均分
      const newRating = res.data.newAverage;
      Alert.alert("Thanks！", `New Average Rating：${newRating.toFixed(1)}`);

      // 可选：本地更新 court.rating 以即时反映变化
      court.rating = newRating;
    } catch (err) {
      console.error("Rating failed:", err);
      Alert.alert("Try again later.");
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <Text style={styles.title}>{court.name}</Text>
          {court.address && <Text style={styles.address}>{court.address}</Text>}

          {/* 图片占位 */}
          <View style={styles.imageGallery}>
            <Text style={styles.placeholderText}>
              [Image gallery placeholder]
            </Text>
          </View>

          <View style={styles.infoRow}>
            <TouchableOpacity onPress={handleCallPress}>
              <Text style={styles.phoneText}>
                📞 Contact: {court.contact ?? " "}
              </Text>
            </TouchableOpacity>
            <Text> 📍 Distance: {distanceText ?? "Unknown"} </Text>
          </View>

          <Text style={styles.ratingText}>
            ⭐ Rating: {court.rating?.toFixed(1) ?? "暂无"}
          </Text>

          {/* ⭐ 评分区域 */}
          <View style={styles.ratingContainer}>
            <Text style={styles.sectionTitle}>Rate for the court</Text>
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
              <Text style={styles.submitText}>Submit</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "80%",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
  },
  imageGallery: {
    height: 120,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  placeholderText: {
    color: "#888",
    fontStyle: "italic",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  schedule: {
    marginBottom: 12,
  },
  courtRow: {
    marginRight: 16,
  },
  courtLabel: {
    marginBottom: 4,
    fontWeight: "600",
  },
  timeSlots: {
    flexDirection: "row",
  },
  phoneText: {
    color: "#6BCB77",
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  ratingContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  sectionTitle: {
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
  },
  ratingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ddd",
    marginHorizontal: 4,
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
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  submitText: {
    color: "#fff",
    fontWeight: "600",
  },
  closeBtn: {
    backgroundColor: "#0E5B37",
    padding: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  closeText: {
    color: "#fff",
    fontWeight: "600",
  },
});
