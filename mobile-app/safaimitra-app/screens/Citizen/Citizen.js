import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  RefreshControl,
  Dimensions,
  Share,
  Linking,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { io } from "socket.io-client";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";

const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const { width } = Dimensions.get("window");

export default function CitizenScreen({ navigation, goBack }) {
  // State Management
  const [selectedTab, setSelectedTab] = useState("report");
  const [image, setImage] = useState(null);
  const [selectedComplaintDetail, setSelectedComplaintDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [status, setStatus] = useState("waiting");
  const [address, setAddress] = useState("Detecting location...");
  const [showNotification, setShowNotification] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState("prompt");
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [myComplaints, setMyComplaints] = useState([]);
  const [selectedBin, setSelectedBin] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [areaStats, setAreaStats] = useState({
    cleanedToday: 0,
    activeVehicles: 0,
    pendingBins: 0,
  });
  const [activeVehiclesnear, setActiveVehicles] = useState([]);
  const [resolvedModal, setResolvedModal] = useState(null);
  const [dustbins, setDustbins] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const socketRef = useRef(null);
  const mapRef = useRef(null);
  const locationSubscription = useRef(null);

  // ==================== API FUNCTIONS ====================

  const fetchMyComplaints = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;

      const res = await axios.get(
        `${API_URL}/citizen/complaint/history/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data.success) {
        setMyComplaints(res.data.complaints);
        console.log("🔄 Complaints Refreshed:", res.data.complaints.length);
      }
    } catch (err) {
      console.error("Error loading history", err);
    }
  };

  const fetchNearbyVehicles = async (lat, lng) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(
        `${API_URL}/citizen/active-vehicles-nearby?lat=${lat}&lng=${lng}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data.success) {
        setActiveVehicles(res.data.vehicles);
      }
    } catch (err) {
      console.error("Error fetching nearby vehicles:", err);
    }
  };

  const fetchAreaStats = async (lat, lng) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(
        `${API_URL}/citizen/area-stats?lat=${lat}&lng=${lng}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data.success) {
        setAreaStats(res.data.stats);
      }
    } catch (err) {
      console.error("Stats fetch error", err);
    }
  };

  const fetchDustbins = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const officeId = await AsyncStorage.getItem("officeId");

      if (!officeId) {
        console.warn("Office ID not found");
        return;
      }

      const res = await fetch(`${API_URL}/citizen/dustbin/list/${officeId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setDustbins(data.dustbins || []);
      }
    } catch (err) {
      console.error("Fetch Dustbins Error:", err);
      setDustbins([]);
    }
  };

  // ==================== LOCATION FUNCTIONS ====================

  // ==================== LIVE LOCATION TRACKING ====================
  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationPermission("denied");
        setAddress("Location access denied");
        setLoadingLocation(false);
        return;
      }

      setLocationPermission("granted");

      // Agar pehle se koi tracking chal rahi hai to usko band karein
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }

      // 🔥 Live Tracking Start (Har 1 Second Update)
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000, // Har 1000ms (1 second) me update karega
          distanceInterval: 1, // Agar 1 meter bhi hila to update hoga
        },
        (location) => {
          const { latitude, longitude } = location.coords;

          // State Update (Coordinate Update)
          setUserLocation([latitude, longitude]);
          setLoadingLocation(false);

          // Address bhi update karein (Optional: Ise throttle kar sakte hain taaki API limit hit na ho)
          // reverseGeocode(latitude, longitude);

          // Agar aap chahte hain ki Map user ke sath-sath move kare:
          mapRef.current?.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 500);
        },
      );
    } catch (error) {
      console.error("Error getting location:", error);
      setLocationPermission("denied");
      setAddress("Location error");
      setLoadingLocation(false);
    }
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      );
      const data = await response.json();

      if (data.city || data.locality || data.principalSubdivision) {
        const loc = [data.locality, data.city, data.principalSubdivision]
          .filter(Boolean)
          .join(", ");
        setAddress(loc);
      } else {
        setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  // ==================== IMAGE & COMPLAINT FUNCTIONS ====================

  const handleImageUpload = async () => {
    if (!selectedBin) {
      Alert.alert(
        "Select Dustbin",
        "🗑️ Please select a dustbin from the map first!",
      );
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Camera permission is required to take photos",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      setImage(imageUri);
      setFileToUpload(result.assets[0]);

      setVerifying(true);
      setAiResult(null);
      setStatus("verifying");

      try {
        const token = await AsyncStorage.getItem("token");
        const formData = new FormData();

        formData.append("image", {
          uri: imageUri,
          type: "image/jpeg",
          name: "complaint.jpg",
        });

        if (selectedBin) {
          formData.append("dustbinId", selectedBin._id);
        }

        const res = await axios.post(
          `${API_URL}/api/predict/complaint`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const { status: apiStatus, confidence } = res.data;
        setAiResult({ status: apiStatus, confidence });

        if (apiStatus === "empty" || apiStatus === "clean") {
          Alert.alert(
            "AI Analysis",
            `⚠️ This bin looks CLEAN (${confidence}%).`,
            [{ text: "OK" }],
          );
          setStatus("ready");
        } else if (apiStatus == "UNKNOWN") {
          Alert.alert(
            "AI Analysis",
            `⚠️ There is no Bin is Look in image (${confidence}%).`,
            [{ text: "OK" }],
          );
          setStatus("ready");
        } else {
          setStatus("ready");
        }
      } catch (err) {
        console.error("AI Verification Failed:", err);
        Alert.alert(
          "AI Verification",
          "⚠️ AI could not verify the image. You can still submit manually.",
          [{ text: "OK" }],
        );
        setStatus("ready");
      } finally {
        setVerifying(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!image || !fileToUpload) {
      Alert.alert(
        "Photo Required",
        "📸 Please take a photo of the issue first!",
      );
      return;
    }

    if (!selectedBin) {
      Alert.alert(
        "Dustbin Required",
        "🗑️ Please select a dustbin from the map!",
      );
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    const officeId = await AsyncStorage.getItem("officeId");
    const citizenId = await AsyncStorage.getItem("userId");

    formData.append("officeId", officeId || "");
    formData.append("citizenId", citizenId || "");
    formData.append("dustbinId", selectedBin._id);
    formData.append("complaintType", "Waste Dumping");
    formData.append(
      "description",
      `Reported via App. AI Status: ${aiResult?.status || "Manual"}`,
    );
    formData.append("latitude", selectedBin.latitude.toString());
    formData.append("longitude", selectedBin.longitude.toString());
    formData.append("area", selectedBin.area);
    formData.append(
      "priority",
      aiResult?.status === "overflow" ? "high" : "medium",
    );
    formData.append("image", {
      uri: image,
      type: "image/jpeg",
      name: "complaint.jpg",
    });
    formData.append("status", "pending");

    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(`${API_URL}/citizen/complaint/create`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      setShowNotification(true);
      setStatus("submitted");
      setImage(null);
      setFileToUpload(null);
      setAiResult(null);
      setSelectedBin(null);

      fetchMyComplaints();

      setTimeout(() => setShowNotification(false), 3000);
    } catch (error) {
      console.error("Submission error", error);
      Alert.alert("Error", "❌ Failed to submit complaint. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetake = () => {
    setImage(null);
    setFileToUpload(null);
    setAiResult(null);
    setStatus("waiting");
  };

  const handleBinSelect = (bin) => {
    if (!userLocation) {
      Alert.alert(
        "Location Required",
        "📍 Waiting for your location... Please ensure GPS is on.",
      );
      return;
    }

    const distance = calculateDistance(
      userLocation[0],
      userLocation[1],
      bin.latitude,
      bin.longitude,
    );

    // 🔒 200m Geo-fence check
    if (distance > 70) {
      Alert.alert(
        "Too Far from Dustbin",
        `❌ You are ${distance.toFixed(0)} meters away.\nPlease move within 70 meters to report this bin.`,
      );
      return;
    }

    setSelectedBin(bin);
    setAddress(`✅ Selected: ${bin.name} (${distance.toFixed(0)}m away)`);

    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: bin.latitude,
        longitude: bin.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout from SafaiMitra?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            if (socketRef.current) {
              socketRef.current.disconnect();
              socketRef.current = null;
            }

            await axios.post(`${API_URL}/citizen/logout`);
            await AsyncStorage.multiRemove([
              "token",
              "user",
              "role",
              "userId",
              "officeId",
            ]);

            Alert.alert("Success", "Logged out successfully!");
            if (goBack) {
              goBack();
            } else {
              console.warn("goBack prop not passed to OfficeDashboard");
            }
          } catch (error) {
            console.error("Logout error:", error);
            await AsyncStorage.clear();
          }
        },
      },
    ]);
  };

  // ==================== UTILITY FUNCTIONS ====================

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "resolved":
        return "#10b981";
      case "in-progress":
        return "#3b82f6";
      case "pending":
        return "#f59e0b";
      default:
        return "#6b7280";
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMyComplaints(), fetchDustbins()]);
    if (userLocation) {
      await fetchAreaStats(userLocation[0], userLocation[1]);
      await fetchNearbyVehicles(userLocation[0], userLocation[1]);
    }
    setRefreshing(false);
  };

  // ==================== EFFECTS ====================

  useEffect(() => {
    fetchDustbins();
    fetchMyComplaints();
    getCurrentLocation();

    const initSocket = async () => {
      const userStr = await AsyncStorage.getItem("user");
      const parsedUser = userStr ? JSON.parse(userStr) : null;

      if (parsedUser && parsedUser._id) {
        socketRef.current = io(`${API_URL}`, {
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        const socket = socketRef.current;

        socket.on("connect", () => {
          console.log("✅ Citizen Connected to Socket:", socket.id);
          socket.emit("join_room", `citizen_${parsedUser._id}`);
          console.log(`🔔 Joined room: citizen_${parsedUser._id}`);
        });

        socket.on("disconnect", (reason) => {
          console.warn("⚠️ Socket Disconnected:", reason);
        });

        socket.on("reconnect", (attemptNumber) => {
          console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
          socket.emit("join_room", `citizen_${parsedUser._id}`);
          fetchMyComplaints();
        });

        socket.on("complaint_resolved_alert", async (data) => {
          console.log("🎉 Complaint Resolved Event Received:", data);

          setResolvedModal({
            message: data.message,
            imageUrl: data.imageUrl,
          });

          fetchMyComplaints();

          try {
            const { sound } = await Audio.Sound.createAsync({
              uri: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
            });
            await sound.playAsync();
          } catch (e) {
            console.error("Audio error:", e);
          }
        });

        socket.on("complaint_status_update", (payload) => {
          console.log("🔄 Status Update Received:", payload);
          fetchMyComplaints();
        });

        socket.on("complaint_accepted", (payload) => {
          console.log("✅ Complaint Accepted Event:", payload);
          fetchMyComplaints();
        });

        socket.on("connect_error", (error) => {
          console.error("❌ Socket Connection Error:", error);
        });
      }
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        console.log("🔌 Disconnecting socket...");
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const BIN_STATUS_COLOR = {
    clean: "#10b981", // green
    pending: "#f59e0b", // yellow
    overflow: "#ef4444", // red
    complaint: "#7c3aed", // purple
  };

  // Nearest dustbin
  // ==================== NEW FUNCTION: FIND NEAREST BIN ====================
  const findNearestBin = () => {
    if (!userLocation) {
      Alert.alert(
        "Location Required",
        "📍 Please wait for your location to be detected.",
      );
      return;
    }

    if (dustbins.length === 0) {
      Alert.alert("No Bins", "❌ No dustbins data available.");
      return;
    }

    let nearestBin = null;
    let minDistance = Infinity;

    // Loop through all bins to find the closest one
    dustbins.forEach((bin) => {
      const distance = calculateDistance(
        userLocation[0],
        userLocation[1],
        bin.latitude,
        bin.longitude,
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestBin = bin;
      }
    });

    if (nearestBin) {
      if (minDistance > 70) {
        Alert.alert(
          "Too Far",
          `❌ No dustbin found within 70 meters.\n📏 Nearest bin is ${minDistance.toFixed(0)} meters away.`,
        );
        return; // Stop execution here
      }
      // Auto-select the bin using your existing logic
      handleBinSelect(nearestBin);

      Alert.alert(
        "Nearest Bin Found",
        `✅ Auto-selected: ${nearestBin.name || "Dustbin"} \n📏 Distance: ${minDistance.toFixed(0)} meters`,
      );
    }
  };

  return (
    <View className="flex-1 bg-gray-100 relative">
      <StatusBar style="light" />

      {/* ==================== SUCCESS NOTIFICATION ==================== */}
      {showNotification && (
        <View
          className="absolute top-16 right-4 z-50 rounded-2xl overflow-hidden"
          style={{ elevation: 10 }}
        >
          <BlurView
            intensity={90}
            className="flex-row items-center gap-3 px-6 py-4 bg-green-500"
          >
            <Text className="text-2xl">✅</Text>
            <View>
              <Text className="text-base font-bold text-white">Success!</Text>
              <Text className="text-xs text-white">
                Complaint registered successfully
              </Text>
            </View>
          </BlurView>
        </View>
      )}

      {/* ==================== LOCATION PERMISSION MODAL ==================== */}
      <Modal
        visible={locationPermission === "prompt" && selectedTab === "track"}
        animationType="fade"
        transparent
      >
        <View className="flex-1 justify-center items-center p-4 bg-black/50">
          <BlurView
            intensity={80}
            className="w-full max-w-md rounded-3xl overflow-hidden"
          >
            <View className="bg-white p-8">
              <View className="w-20 h-20 bg-blue-100 rounded-full justify-center items-center self-center mb-4">
                <Text className="text-4xl">📍</Text>
              </View>
              <Text className="text-2xl font-bold text-gray-800 text-center mb-2">
                Enable Location Access
              </Text>
              <Text className="text-sm text-gray-600 text-center mb-6">
                We need your location to show nearby bins, active vehicles, and
                track cleanliness in your area
              </Text>

              <View className="gap-3 mb-6">
                {[
                  {
                    icon: "🗺️",
                    title: "See Nearby Bins",
                    desc: "View all collection points near you",
                  },
                  {
                    icon: "🚛",
                    title: "Track Active Vehicles",
                    desc: "Know when cleaning happens in your area",
                  },
                  {
                    icon: "📊",
                    title: "Get Accurate Updates",
                    desc: "Receive location-based notifications",
                  },
                ].map((item, index) => (
                  <View
                    key={index}
                    className="flex-row items-start gap-3 p-3 bg-blue-50 rounded-xl"
                  >
                    <Text className="text-lg">{item.icon}</Text>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-800">
                        {item.title}
                      </Text>
                      <Text className="text-xs text-gray-600">{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                className="w-full py-4 bg-blue-600 rounded-xl mb-3 active:opacity-80"
                onPress={getCurrentLocation}
              >
                <Text className="text-base font-bold text-white text-center">
                  Allow Location Access
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-full py-3 bg-gray-100 rounded-xl active:opacity-80"
                onPress={() => setLocationPermission("denied")}
              >
                <Text className="text-sm font-semibold text-gray-700 text-center">
                  Maybe Later
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* ==================== HEADER ==================== */}
      <LinearGradient
        colors={["#1e40af", "#3b82f6"]}
        className={`px-5 pb-4 ${Platform.OS === "ios" ? "pt-16" : "pt-10"}`}
      >
        {/* Top Header Row */}
        <View className="flex-row justify-between items-center mb-6">
          {/* Left Side: Logo & App Name */}
          <View className="flex-row items-center gap-3">
            {/* Citizen Logo (Profile/Avatar) */}
            <View className="w-12 h-12 bg-white rounded-full p-0.5 justify-center items-center border-2 border-white/30">
              <Image
                source={{
                  uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png", // Replace with require('./assets/logo.png')
                }}
                className="w-full h-full rounded-full"
                resizeMode="cover"
              />
            </View>

            {/* Text Info */}
            <View>
              <Text className="text-xl font-bold text-white shadow-sm">
                SafaiMitra
              </Text>
              <Text className="text-xs text-blue-100 font-medium">
                Citizen Dashboard
              </Text>
            </View>
          </View>

          {/* Right Side: Status & Logout */}
          <View className="flex-row items-center gap-3">
            {/* Live Badge */}
            <View className="flex-row items-center gap-1.5 bg-green-500/20 px-2.5 py-1 rounded-full border border-green-400/30">
              <View className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <Text className="text-[10px] font-bold text-green-100 pb-1">
                ONLINE
              </Text>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              className="bg-white/10 p-2 rounded-xl active:bg-white/20"
              onPress={handleLogout}
            >
              <Text className="text-lg">🚪</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs Section */}
        <View className="flex-row bg-white/10 p-1 rounded-2xl">
          <TouchableOpacity
            className={`flex-1 py-3 rounded-xl flex-row justify-center items-center ${
              selectedTab === "report" ? "bg-white shadow-sm" : "bg-transparent"
            } active:opacity-80`}
            onPress={() => setSelectedTab("report")}
          >
            <Text className="text-lg">📸</Text>
            <Text
              className={`text-sm font-bold ${
                selectedTab === "report" ? "text-blue-700" : "text-blue-100"
              }`}
            >
              Report Issue
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-3 rounded-xl flex-row justify-center items-center ${
              selectedTab === "track" ? "bg-white shadow-sm" : "bg-transparent"
            } active:opacity-80`}
            onPress={() => setSelectedTab("track")}
          >
            <Text className="text-lg">🗺️</Text>
            <Text
              className={`text-sm font-bold ${
                selectedTab === "track" ? "text-blue-700" : "text-blue-100"
              }`}
            >
              Track Status
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ==================== MAIN CONTENT ==================== */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {selectedTab === "report" ? (
          <>
            {/* Step 1: Location Status */}
            <View className="bg-white rounded-3xl overflow-hidden mb-6">
              <LinearGradient
                colors={["#2563eb", "#3b82f6"]}
                className="p-5 flex-row justify-between items-center"
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="w-10 h-10 bg-white rounded-full justify-center items-center">
                    <Text className="text-lg font-bold text-gray-800">1</Text>
                  </View>
                  <View>
                    <Text className="text-sm font-semibold text-white">
                      Your Location
                    </Text>
                    <Text className="text-xs text-white/70">
                      Enable to see nearby dustbins
                    </Text>
                  </View>
                </View>
                {locationPermission === "granted" ? (
                  <View className="flex-row items-center justify-center bg-green-500 px-3 py-1.5 rounded-lg">
                    <View className="w-2 h-2 bg-white rounded-full mr-2" />
                    <Text
                      style={{ textAlignVertical: "center" }}
                      className="text-xs font-bold text-white leading-[12px]"
                    >
                      DETECTED
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    className="bg-amber-500 px-4 py-2 rounded-lg active:opacity-80"
                    onPress={getCurrentLocation}
                  >
                    <Text className="text-xs font-bold text-white">Enable</Text>
                  </TouchableOpacity>
                )}
              </LinearGradient>

              <View className="p-5">
                {loadingLocation ? (
                  <View className="flex-row items-center gap-3">
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text className="text-sm text-gray-600">
                      Detecting your location...
                    </Text>
                  </View>
                ) : locationPermission === "granted" && userLocation ? (
                  <View>
                    <Text className="font-bold text-gray-800 mb-1">
                      {address}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-sm text-amber-600 font-semibold">
                    ⚠️ Please enable location to submit complaints
                  </Text>
                )}
              </View>
            </View>

            {/* Step 2: Interactive Map */}
            <View className="bg-white rounded-3xl overflow-hidden mb-6">
              <LinearGradient colors={["#7c3aed", "#8b5cf6"]} className="p-5">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-white rounded-full justify-center items-center">
                    <Text className="text-lg font-bold text-gray-800">2</Text>
                  </View>
                  <View>
                    <Text className="text-lg font-bold text-white">
                      Select Dustbin Location
                    </Text>
                    <Text className="text-sm text-white/90">
                      Tap on a dustbin marker to select it
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              <View className="p-6">
                {/* the extra buttion add */}
                <TouchableOpacity
                  onPress={findNearestBin}
                  className="flex-row items-center justify-center bg-purple-100 border border-purple-300 py-3 rounded-xl mb-4 active:bg-purple-200"
                >
                  <Text className="text-xl mr-2">🎯</Text>
                  <Text className="text-purple-700 font-bold text-base">
                    Auto-Select Nearest Bin
                  </Text>
                </TouchableOpacity>

                <View className="h-96 rounded-2xl overflow-hidden border-2 border-gray-200 mb-4">
                  <MapView
                    ref={mapRef}
                    showsMyLocationButton={true}
                    showsUserLocation={true}
                    provider={PROVIDER_GOOGLE}
                    style={{ flex: 1 }}
                    initialRegion={{
                      latitude:
                        dustbins.length > 0 ? dustbins[0].latitude : 23.2599,
                      longitude:
                        dustbins.length > 0 ? dustbins[0].longitude : 77.4126,
                      latitudeDelta: 0.02,
                      longitudeDelta: 0.02,
                    }}
                  >
                    {/* {userLocation && (
                      <>
                        <Circle
                          center={{
                            latitude: userLocation[0],
                            longitude: userLocation[1],
                          }}
                          radius={500}
                          strokeColor="rgba(59, 130, 246, 0.5)"
                          fillColor="rgba(59, 130, 246, 0.1)"
                        />
                        <Marker
                          coordinate={{
                            latitude: userLocation[0],
                            longitude: userLocation[1],
                          }}
                          title="You are here"
                          description={address}
                        >
                          <View className="w-8 h-8 justify-center items-center">
                            <Text className="text-2xl"></Text>
                          </View>
                        </Marker>
                      </>
                    )} */}

                    {dustbins.map((bin) => (
                      <Marker
                        key={bin._id}
                        coordinate={{
                          latitude: bin.latitude,
                          longitude: bin.longitude,
                        }}
                        onPress={() => handleBinSelect(bin)}
                      >
                        <View
                          className="w-8 h-8 rounded-full border-2 border-white justify-center items-center"
                          style={{
                            backgroundColor:
                              BIN_STATUS_COLOR[bin.status] || "#9ca3af",
                          }}
                        >
                          <Text className="text-base">🗑️</Text>
                        </View>
                      </Marker>
                    ))}
                  </MapView>
                </View>

                {/* Map Legend */}
                <View className="flex-row justify-center gap-4 flex-wrap mb-4">
                  {[
                    {
                      icon: "📍",
                      label: "Your Location",
                      color: "text-blue-600",
                    },
                    { icon: "✅", label: "Clean Bin", color: "text-green-600" },
                    {
                      icon: "⚠️",
                      label: "Overflow Bin",
                      color: "text-red-600",
                    },
                    { icon: "⏳", label: "Pending", color: "text-amber-600" },
                  ].map((item, index) => (
                    <View key={index} className="flex-row items-center gap-1">
                      <Text>{item.icon}</Text>
                      <Text className={`text-xs font-semibold ${item.color}`}>
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>

                {!selectedBin && (
                  <Text className="text-center text-sm text-purple-600 font-semibold">
                    👆 Click on any dustbin marker to select it for your
                    complaint
                  </Text>
                )}
              </View>
            </View>

            {/* Step 3: Photo */}
            <View
              className={`bg-white rounded-3xl overflow-hidden mb-6 ${!selectedBin && "opacity-50"}`}
            >
              <LinearGradient
                colors={
                  !selectedBin ? ["#9ca3af", "#6b7280"] : ["#f59e0b", "#f97316"]
                }
                className="p-5 flex-row items-center gap-3"
              >
                <View className="w-10 h-10 bg-white rounded-full justify-center items-center">
                  <Text className="text-lg font-bold text-gray-800">3</Text>
                </View>
                <View>
                  <Text className="text-lg font-bold text-white">
                    Take a Photo
                  </Text>
                  <Text className="text-sm text-white/90">
                    Click a clear picture of the problem
                  </Text>
                </View>
              </LinearGradient>

              <View className="p-6 relative">
                {!selectedBin && (
                  <View className="absolute inset-0 bg-white/60 z-10 justify-center items-center rounded-2xl">
                    <View className="bg-white p-4 rounded-2xl border-2 border-red-100">
                      <Text className="text-3xl text-center mb-2">👆</Text>
                      <Text className="font-bold text-red-500 text-center">
                        First Select a Dustbin
                      </Text>
                      <Text className="text-xs text-gray-500 text-center">
                        Tap a marker on the map above
                      </Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  className="h-60 rounded-2xl border-3 border-dashed border-blue-300 overflow-hidden"
                  onPress={handleImageUpload}
                  disabled={!selectedBin}
                  activeOpacity={0.7}
                >
                  {image ? (
                    <Image
                      source={{ uri: image }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="flex-1 justify-center items-center bg-blue-50 p-5">
                      <View
                        className={`w-20 h-20 rounded-full justify-center items-center mb-4 ${
                          !selectedBin ? "bg-gray-300" : "bg-blue-800"
                        }`}
                      >
                        <Text className="text-4xl">📸</Text>
                      </View>
                      <Text
                        className={`text-lg font-bold mb-2 ${
                          !selectedBin ? "text-gray-400" : "text-gray-800"
                        }`}
                      >
                        {selectedBin
                          ? "Tap to Upload Photo"
                          : "Upload Disabled"}
                      </Text>
                      <Text className="text-sm text-gray-500 text-center">
                        {selectedBin
                          ? "Take a photo of the overflowing bin or dirty area"
                          : "Select a location to enable camera"}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {image && (
                  <TouchableOpacity
                    className="mt-4 px-6 py-3 bg-gray-100 rounded-xl self-center active:opacity-80"
                    onPress={handleRetake}
                  >
                    <Text className="text-sm font-semibold text-gray-700">
                      🔄 Take Another Photo
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Step 4: Review & Submit */}
            <View className="bg-white rounded-3xl overflow-hidden mb-6">
              <LinearGradient
                colors={["#10b981", "#059669"]}
                className="p-5 flex-row items-center gap-3"
              >
                <View className="w-10 h-10 bg-white rounded-full justify-center items-center">
                  <Text className="text-lg font-bold text-gray-800">4</Text>
                </View>
                <View>
                  <Text className="text-lg font-bold text-white">
                    Review & Submit
                  </Text>
                  <Text className="text-sm text-white/90">
                    AI Verification Status
                  </Text>
                </View>
              </LinearGradient>

              <View className="p-6">
                {verifying && (
                  <View className="flex-col items-center justify-center p-4 gap-2">
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text className="text-sm font-bold text-blue-600">
                      🤖 AI is analyzing photo...
                    </Text>
                  </View>
                )}

                {!verifying &&
                  aiResult &&
                  (() => {
                    // 1. Define configuration for each status
                    const statusConfig = {
                      empty: {
                        container: "bg-green-50 border-green-500",
                        textColor: "text-green-700",
                        message: "✅ Bin Looks Clean (Empty)",
                      },
                      clean: {
                        container: "bg-green-50 border-green-500",
                        textColor: "text-green-700",
                        message: "✅ Bin Looks Clean",
                      },
                      medium: {
                        container: "bg-yellow-50 border-yellow-500",
                        textColor: "text-yellow-700",
                        message: "⚠️ Bin is Half Full (Medium)",
                      },
                      full: {
                        container: "bg-red-50 border-red-500",
                        textColor: "text-red-700",
                        message: "🚨 Garbage Overflow (Full)",
                      },
                      unknown: {
                        container: "bg-gray-50 border-gray-500",
                        textColor: "text-gray-700",
                        message: "❓ Status Unknown",
                      },
                    };

                    // 2. Select the config (default to unknown if status doesn't match)
                    const config =
                      statusConfig[aiResult.status] || statusConfig["unknown"];

                    return (
                      <View
                        className={`mb-4 p-3 rounded-xl border-l-4 ${config.container}`}
                      >
                        <Text className="text-xs font-bold uppercase text-gray-500">
                          AI Detection Result
                        </Text>

                        <Text
                          className={`text-lg font-bold ${config.textColor}`}
                        >
                          {config.message}
                        </Text>

                        <Text className="text-xs text-gray-500">
                          Confidence: {aiResult.confidence}%
                        </Text>
                      </View>
                    );
                  })()}

                {/* Status Bar */}
                <View
                  className={`flex-row items-center gap-4 p-4 rounded-2xl ${
                    status === "submitted"
                      ? "bg-green-100"
                      : status === "ready"
                        ? "bg-blue-100"
                        : "bg-gray-100"
                  }`}
                >
                  <View
                    className={`w-12 h-12 rounded-xl justify-center items-center ${
                      status === "submitted"
                        ? "bg-green-500"
                        : status === "ready"
                          ? "bg-blue-500"
                          : "bg-gray-400"
                    }`}
                  >
                    <Text className="text-2xl">
                      {status === "submitted"
                        ? "✅"
                        : status === "ready"
                          ? "👍"
                          : "⏳"}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-gray-600 mb-1">
                      Current Status
                    </Text>
                    <Text
                      className={`text-base font-bold ${
                        status === "submitted"
                          ? "text-green-600"
                          : status === "ready"
                            ? "text-blue-600"
                            : "text-gray-600"
                      }`}
                    >
                      {status === "submitted"
                        ? "Complaint Registered"
                        : status === "ready"
                          ? "Ready to Submit"
                          : "Waiting for Photo"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Tips Card */}
            <View className="bg-blue-50 rounded-3xl p-6 border-2 border-blue-200 mb-6">
              <Text className="text-lg font-bold text-blue-800 mb-4">
                💡 Quick Tips
              </Text>
              {[
                "Enable location to see all nearby dustbins on map",
                "Select the exact dustbin from the map",
                "Take a clear photo showing the problem",
                "Track your complaint status in real-time",
              ].map((tip, index) => (
                <View key={index} className="flex-row items-start gap-3 mb-3">
                  <Text className="text-blue-500 text-xl">•</Text>
                  <Text className="text-sm text-blue-900 flex-1 leading-relaxed">
                    {tip}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            {/* Complaint History */}
            <View className="bg-white rounded-3xl overflow-hidden mb-6">
              <View className="flex-row justify-between items-center p-5 border-b border-gray-100">
                <Text className="text-xl font-bold text-gray-800">
                  📜 My Complaints History
                </Text>
                <View className="bg-blue-50 px-3 py-1 rounded-full">
                  <Text className="text-xs font-bold text-blue-600">
                    {myComplaints.length} Records
                  </Text>
                </View>
              </View>

              <ScrollView className="max-h-[500px] p-5" nestedScrollEnabled>
                {myComplaints.length === 0 ? (
                  <View className="items-center py-10">
                    <Text className="text-6xl mb-2">📭</Text>
                    <Text className="text-gray-500 font-medium">
                      No complaints registered yet.
                    </Text>
                    <Text className="text-xs text-gray-400">
                      Your reports will appear here.
                    </Text>
                  </View>
                ) : (
                  myComplaints.map((complaint, index) => (
                    <TouchableOpacity
                      key={complaint._id || index}
                      onPress={() => {
                        setSelectedComplaintDetail(complaint);
                        setShowDetailModal(true);
                      }}
                      className="flex-row gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50 mb-4 active:opacity-90"
                    >
                      <View className="w-20 h-20 rounded-xl overflow-hidden bg-gray-200 border border-gray-200 relative">
                        {complaint.ComimageUrl ? (
                          <Image
                            source={{ uri: complaint.ComimageUrl }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="w-full h-full justify-center items-center">
                            <Text className="text-2xl">🗑️</Text>
                          </View>
                        )}
                        <View className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 justify-center">
                          <Text
                            className="text-[10px] font-bold uppercase text-center"
                            style={{ color: getStatusColor(complaint.status) }}
                          >
                            {complaint.status}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-1 justify-between">
                        <View>
                          <View className="flex-row justify-between items-start">
                            <Text
                              className="font-bold text-gray-800 text-sm flex-1"
                              numberOfLines={1}
                            >
                              {typeof complaint.dustbinId === "object"
                                ? complaint.dustbinId?.name ||
                                  "Location Unavailable"
                                : "Location Unavailable"}
                            </Text>
                            <Text className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                              {new Date(
                                complaint.createdAt || Date.now(),
                              ).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </Text>
                          </View>
                          <Text
                            className="text-xs text-gray-500 mt-1"
                            numberOfLines={1}
                          >
                            {typeof complaint.dustbinId === "object"
                              ? complaint.dustbinId?.area ||
                                "Area not available"
                              : complaint.area || "Area not available"}
                          </Text>
                        </View>

                        <View className="flex-row items-center justify-between mt-3">
                          <View
                            className={`px-2 py-1 rounded border ${
                              complaint.status === "resolved"
                                ? "bg-green-50 border-green-200"
                                : complaint.status === "assigned" ||
                                    complaint.status === "in-progress"
                                  ? "bg-blue-50 border-blue-200"
                                  : "bg-amber-50 border-amber-200"
                            }`}
                          >
                            <Text
                              className={`text-[10px] font-bold ${
                                complaint.status === "resolved"
                                  ? "text-green-700"
                                  : complaint.status === "assigned" ||
                                      complaint.status === "in-progress"
                                    ? "text-blue-700"
                                    : "text-amber-700"
                              }`}
                            >
                              {complaint.status === "resolved"
                                ? "✅ Cleaned"
                                : complaint.status === "assigned" ||
                                    complaint.status === "in-progress"
                                  ? "🚛 On Way"
                                  : "⏳ Pending"}
                            </Text>
                          </View>

                          <View className="flex-row items-center gap-2">
                            {complaint.status !== "resolved" && complaint.nextEscalationAt && (
                              <View className="bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                                <Text className="text-[10px] text-amber-700 font-bold">
                                  ⏱️ {(() => {
                                    const diff = new Date(complaint.nextEscalationAt) - new Date();
                                    if (diff <= 0) return "Escalating...";
                                    const hours = Math.floor(diff / (1000 * 60 * 60));
                                    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                    return `${hours}h ${mins}m`;
                                  })()}
                                </Text>
                              </View>
                            )}
                            {complaint.vehicle &&
                              complaint.vehicle !== "Not Assigned" && (
                                <View className="flex-row items-center gap-1 bg-gray-200 px-2 py-1 rounded-lg">
                                  <Text className="text-[10px]">🚛</Text>
                                  <Text className="text-[10px] font-semibold text-gray-600">
                                    {complaint.vehicle}
                                  </Text>
                                </View>
                              )}
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>

            {/* Today's Stats */}
            {locationPermission === "granted" && (
              <LinearGradient
                colors={["#3b82f6", "#2563eb"]}
                className="rounded-3xl p-6 mb-6"
              >
                <Text className="text-xl font-bold text-white mb-5">
                  📊 Today's Status in Your Area
                </Text>
                <View className="flex-row gap-4">
                  {[
                    {
                      icon: "✅",
                      number: areaStats.cleanedToday,
                      label: "Cleaned Today",
                    },
                    {
                      icon: "🚛",
                      number: areaStats.activeVehicles,
                      label: "Vehicles Active",
                    },
                    {
                      icon: "⚠️",
                      number: areaStats.pendingBins,
                      label: "Pending",
                    },
                  ].map((stat, index) => (
                    <View
                      key={index}
                      className="flex-1 bg-white/20 rounded-2xl p-4 items-center"
                    >
                      <Text className="text-3xl mb-2">{stat.icon}</Text>
                      <Text className="text-2xl font-bold text-white mb-1">
                        {stat.number}
                      </Text>
                      <Text className="text-xs font-semibold text-white/90 text-center">
                        {stat.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            )}

            {/* Active Vehicles */}
            {locationPermission === "granted" &&
              activeVehiclesnear.length > 0 && (
                <View className="bg-white rounded-3xl p-6 mb-6">
                  <Text className="text-xl font-bold text-gray-800 mb-4">
                    🚛 Active Vehicles & Routes
                  </Text>
                  {activeVehiclesnear.map((vehicle) => (
                    <View
                      key={vehicle.id}
                      className="bg-blue-50 rounded-2xl p-5 border-2 border-blue-200 mb-4"
                    >
                      <View className="flex-row items-start gap-4 mb-4">
                        <View className="w-14 h-14 bg-blue-500 rounded-xl justify-center items-center">
                          <Text className="text-2xl">🚛</Text>
                        </View>

                        <View className="flex-1">
                          <View className="flex-row items-center justify-between mb-2">
                            <Text className="font-bold text-gray-800 text-lg">
                              {vehicle.number}
                            </Text>
                            <View className="flex-row items-center gap-2 bg-green-100 px-3 py-1 rounded-lg">
                              <View className="w-2 h-2 bg-green-500 rounded-full" />
                              <Text className="text-xs font-bold text-green-700">
                                ACTIVE
                              </Text>
                            </View>
                          </View>

                          <View className="gap-2">
                            <View className="flex-row items-center gap-2">
                              <Text className="text-sm font-semibold text-gray-600">
                                Route:
                              </Text>
                              <Text className="text-sm text-gray-800">
                                {vehicle.route}
                              </Text>
                            </View>
                            <View className="flex-row items-center gap-2">
                              <Text className="text-sm font-semibold text-gray-600">
                                Current:
                              </Text>
                              <Text className="text-sm font-bold text-blue-600">
                                {vehicle.currentStop}
                              </Text>
                            </View>
                            <View className="flex-row items-center justify-between">
                              <View className="flex-row items-center gap-2">
                                <Text className="text-sm font-semibold text-gray-600">
                                  Progress:
                                </Text>
                                <Text className="text-sm text-gray-800">
                                  {vehicle.stopsCompleted}/{vehicle.totalStops}{" "}
                                  stops
                                </Text>
                              </View>
                              <Text className="text-sm font-bold text-green-600">
                                {vehicle.eta}
                              </Text>
                            </View>

                            <View className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <View
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${(vehicle.stopsCompleted / vehicle.totalStops) * 100}%`,
                                }}
                              />
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

            {/* Transparency Card */}
            <View className="bg-green-50 rounded-3xl p-6 border-2 border-green-200 items-center">
              <Text className="text-5xl mb-3">👁️</Text>
              <Text className="text-xl font-bold text-green-700 mb-2">
                Full Transparency
              </Text>
              <Text className="text-sm text-green-800 text-center leading-relaxed">
                All collection activities are verified with photos and GPS. You
                can see exactly when and where cleaning happened in your area.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* ==================== BOTTOM SUBMIT BUTTON ==================== */}
      {selectedTab === "report" && (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-5 z-40">
          <TouchableOpacity
            className={`w-full py-4 rounded-xl flex-row items-center justify-center gap-2 ${
              !image ||
              !selectedBin ||
              status === "submitted" ||
              verifying ||
              isSubmitting
                ? "bg-gray-200"
                : "bg-green-500 active:opacity-80"
            }`}
            onPress={handleSubmit}
            disabled={
              !image ||
              !selectedBin ||
              status === "submitted" ||
              verifying ||
              isSubmitting
            }
          >
            {/* Dynamic Button Text */}
            <Text
              className={`text-base font-bold ${
                !image ||
                !selectedBin ||
                status === "submitted" ||
                verifying ||
                isSubmitting
                  ? "text-gray-400"
                  : "text-white"
              }`}
            >
              {status === "submitted"
                ? "✅ Submitted Successfully"
                : verifying || isSubmitting
                  ? "Processing..."
                  : !selectedBin
                    ? "🗑️ Select Dustbin from Map"
                    : !image
                      ? "📸 Take Photo to Continue"
                      : "Submit Your Complaint"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ==================== RESOLVED MODAL ==================== */}
      <Modal visible={!!resolvedModal} animationType="fade" transparent>
        <View className="flex-1 justify-center items-center p-4 bg-black/80">
          <BlurView
            intensity={90}
            className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden"
          >
            <LinearGradient
              colors={["#10b981", "#059669"]}
              className="p-6 items-center relative overflow-hidden"
            >
              <View className="w-20 h-20 bg-white rounded-full justify-center items-center mb-2">
                <Text className="text-4xl">🎉</Text>
              </View>
              <Text className="text-2xl font-black text-white tracking-tight">
                Job Done!
              </Text>
              <Text className="text-green-100 font-medium text-sm">
                Your complaint has been resolved.
              </Text>
            </LinearGradient>

            <View className="p-6">
              <Text className="text-gray-600 text-center mb-5 font-medium leading-relaxed">
                {resolvedModal?.message ||
                  "Thank you for helping us keep the city clean!"}
              </Text>

              {resolvedModal?.imageUrl ? (
                <View className="mb-6">
                  <Text className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 text-center">
                    Proof of Cleaning
                  </Text>
                  <View className="rounded-2xl overflow-hidden border-4 border-green-100 h-48 bg-gray-50 relative">
                    <Image
                      source={{ uri: resolvedModal.imageUrl }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                    <View className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded-md">
                      <Text className="text-[10px] text-white">
                        Verified ✅
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="bg-gray-100 rounded-xl p-4 mb-6">
                  <Text className="text-center text-sm text-gray-500">
                    No image proof provided.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                className="w-full py-4 bg-green-600 rounded-xl items-center active:opacity-80"
                onPress={() => setResolvedModal(null)}
              >
                <Text className="text-lg font-bold text-white">
                  Awesome! 👍
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* ==================== JAES COMPLAINT DETAIL & TIMELINE MODAL ==================== */}
      <Modal
        visible={showDetailModal && selectedComplaintDetail !== null}
        animationType="slide"
        transparent
      >
        <View className="flex-1 justify-end bg-black/60">
          <BlurView
            intensity={90}
            className="w-full h-[85%] rounded-t-3xl overflow-hidden bg-white"
          >
            <View className="flex-1 p-6">
              <View className="flex-row justify-between items-center pb-4 border-b border-gray-100">
                <Text className="text-xl font-bold text-gray-800">
                  ⚠️ Grievance SLA Timeline
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowDetailModal(false);
                    setSelectedComplaintDetail(null);
                  }}
                  className="w-10 h-10 bg-gray-100 rounded-full justify-center items-center"
                >
                  <Text className="text-lg font-bold text-black">✕</Text>
                </TouchableOpacity>
              </View>

              {selectedComplaintDetail && (
                <ScrollView className="flex-1 mt-4" showsVerticalScrollIndicator={false}>
                  <View className="flex-row gap-4 mb-5">
                    <View className="w-28 h-28 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                      {selectedComplaintDetail.ComimageUrl ? (
                        <Image
                          source={{ uri: selectedComplaintDetail.ComimageUrl }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-full h-full justify-center items-center">
                          <Text className="text-3xl">🗑️</Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-1 justify-between py-1">
                      <View>
                        <Text className="text-base font-black text-gray-900">
                          ID: #SM{selectedComplaintDetail._id.toString().slice(-6).toUpperCase()}
                        </Text>
                        <Text className="text-xs text-gray-500 mt-1">
                          📍 {selectedComplaintDetail.area || "Location Area"}
                        </Text>
                        <Text className="text-xs text-gray-400 mt-1">
                          📅 Created: {new Date(selectedComplaintDetail.createdAt || selectedComplaintDetail.reportedAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </Text>
                      </View>
                      <View className="flex-row gap-2">
                        <View className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                          <Text className="text-[10px] font-bold text-blue-600">
                            Level {selectedComplaintDetail.currentEscalationLevel || 1}
                          </Text>
                        </View>
                        <View className="bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                          <Text className="text-[10px] font-bold text-gray-600">
                            {selectedComplaintDetail.pendingDays || 0} Days Pending
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View className="bg-gray-50 p-4 rounded-2xl mb-5 border border-gray-100">
                    <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Description
                    </Text>
                    <Text className="text-sm text-gray-700 leading-relaxed">
                      {selectedComplaintDetail.description || "No description provided."}
                    </Text>
                  </View>

                  <View className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-5">
                    <Text className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">
                      SLA Countdown / Next Escalation
                    </Text>
                    {selectedComplaintDetail.status === "resolved" ? (
                      <Text className="text-sm font-bold text-green-700">
                        ✅ Issue Resolved! Escalation Stopped.
                      </Text>
                    ) : selectedComplaintDetail.nextEscalationAt ? (
                      <View>
                        <Text className="text-base font-black text-amber-800">
                          {(() => {
                            const diff = new Date(selectedComplaintDetail.nextEscalationAt) - new Date();
                            if (diff <= 0) return "Escalating...";
                            const hours = Math.floor(diff / (1000 * 60 * 60));
                            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                            if (selectedComplaintDetail.currentEscalationLevel >= 5) {
                              return `${hours}h ${mins}m remaining before Public Share Eligibility`;
                            }
                            return `${hours}h ${mins}m remaining before Level ${selectedComplaintDetail.currentEscalationLevel + 1}`;
                          })()}
                        </Text>
                        <Text className="text-xs text-amber-600 mt-1">
                          Deadline: {new Date(selectedComplaintDetail.nextEscalationAt).toLocaleString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "short"
                          })}
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-sm font-bold text-red-700">
                        🚨 Max Escalation reached (Level 5 Commissioner).
                      </Text>
                    )}
                  </View>

                  <View className="mb-6">
                    <Text className="text-sm font-bold text-gray-800 mb-4">
                      📈 JAES Escalation Timeline
                    </Text>

                    {[
                      { level: 1, label: "Level 1: Driver / Worker", staff: selectedComplaintDetail.driverId?.name || selectedComplaintDetail.vehicle || "Assigned Driver" },
                      { level: 2, label: "Level 2: Area Supervisor", staff: selectedComplaintDetail.supervisorId?.name || "Area Supervisor" },
                      { level: 3, label: "Level 3: Zone Officer", staff: selectedComplaintDetail.zoneOfficerId?.name || "Zone Officer" },
                      { level: 4, label: "Level 4: Municipal Officer", staff: selectedComplaintDetail.municipalOfficerId?.name || "Municipal Officer" },
                      { level: 5, label: "Level 5: City Commissioner", staff: selectedComplaintDetail.commissionerId?.name || "City Commissioner" }
                    ].map((stage, idx) => {
                      const isReached = selectedComplaintDetail.currentEscalationLevel >= stage.level;
                      return (
                        <View key={stage.level} className="flex-row items-start mb-6 relative">
                          {idx < 4 && (
                            <View 
                              className="absolute left-[11px] top-6 w-[2px] h-10" 
                              style={{ backgroundColor: selectedComplaintDetail.currentEscalationLevel > stage.level ? "#ef4444" : "#d1d5db" }} 
                            />
                          )}
                          
                          <View 
                            className="w-6 h-6 rounded-full items-center justify-center border-2 mr-4 flex-shrink-0"
                            style={{ 
                              backgroundColor: isReached ? "#ef4444" : "#ffffff", 
                              borderColor: isReached ? "#ef4444" : "#9ca3af" 
                            }}
                          >
                            {isReached && (
                              <Text className="text-[10px] font-black text-white">✓</Text>
                            )}
                          </View>

                          <View className="flex-1">
                            <Text className={`text-sm font-bold ${isReached ? 'text-gray-900' : 'text-gray-400'}`}>
                              {stage.label}
                            </Text>
                            <Text className="text-xs text-gray-500">
                              Responsible: {stage.staff}
                            </Text>
                            {isReached && selectedComplaintDetail.currentEscalationLevel === stage.level && selectedComplaintDetail.status !== "resolved" && (
                              <Text className="text-[10px] font-bold text-red-500 mt-1">
                                ⚠️ CURRENT ACTIVE RESPONSIBILITY
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {selectedComplaintDetail.status !== "resolved" && selectedComplaintDetail.publicEscalationEligible === true && (
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert(
                          "Share Grievance Card",
                          "Select a platform to share this card publicly:",
                          [
                            {
                              text: "WhatsApp 🟢",
                              onPress: () => {
                                const msg = `📢 Grievance #${selectedComplaintDetail._id.toString().slice(-6).toUpperCase()} at ${selectedComplaintDetail.area} remains UNRESOLVED after 5 days.\n\nEscalated to: Commissioner\n\nView details: ${API_URL}/complaint/share-card/${selectedComplaintDetail._id}`;
                                Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`);
                              }
                            },
                            {
                              text: "X / Twitter 🐦",
                              onPress: () => {
                                const msg = `Grievance #${selectedComplaintDetail._id.toString().slice(-6).toUpperCase()} at ${selectedComplaintDetail.area} remains UNRESOLVED after 5 days. Escalated to Commissioner. @SafaiMitra: ${API_URL}/complaint/share-card/${selectedComplaintDetail._id}`;
                                Linking.openURL(`https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`);
                              }
                            },
                            {
                              text: "Download / Open Card 📥",
                              onPress: () => {
                                Linking.openURL(`${API_URL}/complaint/share-card/${selectedComplaintDetail._id}`);
                              }
                            },
                            { text: "Cancel", style: "cancel" }
                          ]
                        );
                      }}
                      className="w-full py-4 bg-red-600 rounded-2xl flex-row items-center justify-center gap-2 mb-8 shadow-lg active:opacity-85"
                    >
                      <Text className="text-xl">📢</Text>
                      <Text className="text-base font-bold text-white">Share Publicly</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              )}
            </View>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}
