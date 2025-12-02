import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Button,
  TouchableOpacity,
  Switch,
  TextInput,
} from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import * as Location from "expo-location";
import BottomNavPill from "../../components/BottomNavPill";
import {
  HomeIcon,
  RankingsIcon,
  CommunityIcon,
  CourtsIcon,
  PlayIcon,
} from "../../components/NavIcons";
import { router } from "expo-router";
import CourtDetailsModal from "../../components/CourtDetailsModal";
import ProfileHeader from "../../components/ProfileHeader";
import { useAuth } from "../../services/authContext";

type Court = {
  _id: string;
  name: string;
  address?: string;
  indoor: boolean;
  price?: number;
  rating?: number;
  openHours?: {
    open: string;
    close: string;
  };
  courts: number;
  availableCourts: number;
  location: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  contact?: string;
};
const API_BASE_URL = "http://localhost:3001"; // ⚠️替换成你的后端 URL

/**
 * Courts screen - displays a map with user's current location
 */
export default function Courts() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("courts");
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [hasSearchedInitially, setHasSearchedInitially] = useState(false);
  const [filters, setFilters] = useState({
    onlyOpen: false,
    onlyAvailable: false,
    maxDistance: 12, // km
  });
  const [searchText, setSearchText] = useState("");
  // radius search value
  const [radiusInput, setRadiusInput] = useState<string>(
    String(filters.maxDistance)
  );
  // user press search button
  const [searchTriggered, setSearchTriggered] = useState<boolean>(false);
  const mapRef = useRef<MapView>(null);

  /**
   * Default location (St Louis) as fallback
   */
  const defaultRegion = {
    latitude: 38.627,
    longitude: -90.1994,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const handleSettingsPress = () => {
    router.push("/tabs/settings");
  };

  const handleNotificationPress = () => {
    console.log("Notifications pressed");
  };

  const handleMessagePress = () => {
    router.push("/chat/messages");
  };

  const handleProfilePress = () => {
    router.push("/profile");
  };
  /**
   * Get user's current location on component mount
   */
  useEffect(() => {
    (async () => {
      try {
        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          setErrorMsg("Permission to access location was denied");
          setLoading(false);
          return;
        }

        // Get current position
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
        setErrorMsg(null);
      } catch (error) {
        console.error("Error getting location:", error);
        setErrorMsg("Unable to get your current location");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * Animate map to user's location when available
   */
  useEffect(() => {
    if (location && mapRef.current && !loading) {
      const region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      mapRef.current.animateToRegion(region, 1000);
    }
  }, [location, loading]);

  const fetchCourts = async (customRadius?: number) => {
    if (!location) return;
    try {
      const radiusToUse = customRadius ?? filters.maxDistance;

      const body = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        radius: filters.maxDistance,
        name: searchText || undefined,
        isOpen: filters.onlyOpen || undefined,
        hasAvailableCourts: filters.onlyAvailable || undefined,
      };

      console.log("Fetching courts with body:", body);

      const res = await fetch(`${API_BASE_URL}/api/courts/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      console.log("Received courts data:", data);
      setCourts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching courts:", err);
    }
  };

  const handleSearch = async () => {
    // 解析用户输入的半径为浮点数；若解析失败则保持原值
    const parsed = parseFloat(radiusInput);
    const newRadius = isNaN(parsed) ? filters.maxDistance : parsed;

    setSearchTriggered(true);

    // 等待 filters 更新完毕再调用 fetchCourts
    setFilters((prev) => {
      const updated = { ...prev, maxDistance: newRadius };
      // 在这里直接使用更新后的值触发 fetchCourts
      fetchCourts(newRadius);
      return updated;
    });
  };

  useEffect(() => {
    if (!loading && !hasSearchedInitially && location) {
      fetchCourts();
      setHasSearchedInitially(true); // ✅ 只第一次触发
    }
  }, [loading, location]);

  /**
   * Handle tab navigation
   */
  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);

    switch (tabId) {
      case "rankings":
        router.replace("/tabs/rankings");
        break;
      case "community":
        router.replace("/tabs/community");
        break;
      case "home":
        router.replace("/tabs");
        break;
      case "courts":
        router.replace("/tabs/courts");
        break;
      case "play":
        router.replace("/tabs/play");
        break;
    }
  };

  const navItems = [
    { id: "community", label: "community", icon: <CommunityIcon /> },
    { id: "rankings", label: "rankings", icon: <RankingsIcon /> },
    { id: "home", label: "home", icon: <HomeIcon /> },
    { id: "play", label: "play", icon: <PlayIcon /> },
    { id: "courts", label: "courts", icon: <CourtsIcon /> },
  ];

  /**
   * Get the map region based on user location or default
   */
  const getMapRegion = () => {
    if (location) {
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
    }
    return defaultRegion;
  };

  return (
    <View style={styles.container}>
      <ProfileHeader
        username={user?.profile?.displayName || user?.email || "JSONderulo"}
        profileImageUri={user?.profile?.avatar}
        onSettingsPress={handleSettingsPress}
        onNotificationPress={handleNotificationPress}
        onMessagePress={handleMessagePress}
        onProfilePress={handleProfilePress}
      />
      {/* Search Bar View */}
      <View style={styles.searchContainer}>
        {/* 搜索框 */}
        <TextInput
          placeholder="Search by name"
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
        />

        {/* 半径输入框 */}
        <View style={styles.radiusRow}>
          <Text style={{ marginRight: 8 }}>Radius (km):</Text>
          <TextInput
            style={styles.radiusInput}
            keyboardType="numeric"
            value={radiusInput}
            onChangeText={setRadiusInput}
            placeholder="10"
          />
        </View>

        {/* 筛选开关 */}
        <View style={styles.filterRow}>
          <Text>Only Open:</Text>
          <Switch
            value={filters.onlyOpen}
            onValueChange={(v) => setFilters((f) => ({ ...f, onlyOpen: v }))}
          />
          <Text>Only Available:</Text>
          <Switch
            value={filters.onlyAvailable}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, onlyAvailable: v }))
            }
          />
        </View>

        {/* Search 按钮 */}
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={getMapRegion()}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        mapType="standard"
      >
        {courts.map((court) => {
          console.log(
            "Rendering marker for:",
            court.name,
            court.location.coordinates
          );

          return (
            <Marker
              key={court._id}
              coordinate={{
                latitude: court.location.coordinates[1],
                longitude: court.location.coordinates[0],
              }}
              pinColor="#ffe657ff"
              onCalloutPress={() => {
                setSelectedCourt(court);
                setModalVisible(true);
              }}
            >
              <Callout tooltip>
                <View
                  style={{
                    width: 180,
                    backgroundColor: "#fff",
                    padding: 10,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "DMSans_600SemiBold",
                      fontSize: 16,
                    }}
                  >
                    {court.name}
                  </Text>
                  <Text>{court.address}</Text>
                  <Text>Price: ${court.price}/hour</Text>
                  <Text>Rating: {court.rating}</Text>
                  <Text>Courts: {court.courts}</Text>
                  <Text>Available: {court.availableCourts}</Text>
                  <View
                    style={{
                      marginTop: 8,
                      backgroundColor: "#0E5B37",
                      paddingVertical: 6,
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        textAlign: "center",
                        fontFamily: "DMSans_600SemiBold",
                      }}
                    >
                      See Details
                    </Text>
                  </View>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Loading or Error Overlay */}
      {loading && (
        <View style={styles.overlay}>
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      )}

      {errorMsg && (
        <View style={styles.overlay}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      <BottomNavPill
        items={navItems}
        activeTab={activeTab}
        onTabPress={handleTabPress}
      />

      <CourtDetailsModal
        court={selectedCourt}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        userLocation={
          location
            ? {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }
            : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fb",
  },

  map: {
    flex: 1,
    marginBottom: -110,
  },

  searchContainer: {
    position: "absolute",
    top: 180,
    left: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 14,
    // 更柔和的现代阴影
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  searchInput: {
    backgroundColor: "#f2f4f7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
    borderWidth: 0, // 去掉古老的边框
  },

  radiusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  radiusInput: {
    backgroundColor: "#f2f4f7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 70,
    fontSize: 14,
    borderWidth: 0,
  },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  searchButton: {
    backgroundColor: "#0E5B37",
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: "#0E5B37",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  searchButtonText: {
    color: "#fff",
    textAlign: "center",
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
  },

  overlay: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  loadingText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "#0E5B37",
  },

  errorText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#FF4444",
    textAlign: "center",
  },
});
