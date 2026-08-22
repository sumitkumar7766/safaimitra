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
  TextInput,
  SafeAreaView,
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
import {
  Home,
  FileText,
  Plus,
  Compass,
  User,
  Camera,
  MapPin,
  Bell,
  ShieldCheck,
  CheckCircle2,
  Award,
  Sparkles,
  Navigation,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  LogOut,
  Phone,
  Mail,
  Building2,
  Eye,
  ArrowRight,
  ChevronRight,
  Crosshair,
  Trophy,
  Megaphone,
  Zap,
  Maximize2,
  Minimize2,
  Truck,
  Layers,
  PartyPopper,
  Calendar,
} from "lucide-react-native";
import EventDustbinRequestScreen from "./EventDustbinRequestScreen";

const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const { width, height } = Dimensions.get("window");

export default function CitizenScreen({ navigation, goBack }) {
  // State Management - Default to "home"
  const [selectedTab, setSelectedTab] = useState("home");
  const [userData, setUserData] = useState(null);
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
  const [scorecard, setScorecard] = useState(null);
  const [cityLeaderboard, setCityLeaderboard] = useState([]);
  const [areaLeaderboard, setAreaLeaderboard] = useState([]);
  const [appealReason, setAppealReason] = useState("");
  const [appealEvidenceUrl, setAppealEvidenceUrl] = useState("");
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  // Event Dustbin Request State
  const [showEventModal, setShowEventModal] = useState(false);
  const [myEventRequests, setMyEventRequests] = useState([]);

  // Full Screen Map State
  const [isFullScreenMap, setIsFullScreenMap] = useState(false);
  const [mapFilter, setMapFilter] = useState("all"); // "all", "bins", "trucks"
  const [inspectedMarker, setInspectedMarker] = useState(null);

  const socketRef = useRef(null);
  const mapRef = useRef(null);
  const fullMapRef = useRef(null);
  const locationSubscription = useRef(null);

  // ==================== LOAD USER PROFILE ====================
  const loadUserData = async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        setUserData(JSON.parse(userStr));
      }
    } catch (e) {
      console.error("Error loading user from storage", e);
    }
  };

  // ==================== API FUNCTIONS ====================
  const fetchScorecard = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;

      const res = await axios.get(
        `${API_URL}/citizen-system/profile-scorecard/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data && res.data.success) {
        setScorecard(res.data.scorecard);
      }
    } catch (err) {
      console.error("Error loading scorecard", err);
    }
  };

  const fetchLeaderboards = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;

      const res = await axios.get(
        `${API_URL}/citizen-system/leaderboard/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data && res.data.success) {
        setCityLeaderboard(res.data.cityLeaderboard || []);
        setAreaLeaderboard(res.data.areaLeaderboard || []);
      }
    } catch (err) {
      console.error("Error loading leaderboards", err);
    }
  };

  const handleSubmitAppeal = async () => {
    if (!appealReason) return;
    setAppealSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/citizen-system/citizen/appeal`,
        { reason: appealReason, evidenceUrl: appealEvidenceUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data && res.data.success) {
        Alert.alert("Success 🎉", "Appeal submitted successfully! Admin will review it shortly.");
        setAppealReason("");
        setAppealEvidenceUrl("");
        fetchScorecard();
      }
    } catch (err) {
      console.error("Appeal submit error", err);
      Alert.alert("Error", err.response?.data?.message || "Failed to submit appeal");
    } finally {
      setAppealSubmitting(false);
    }
  };

  const fetchMyComplaints = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;

      const res = await axios.get(
        `${API_URL}/citizen/complaint/history/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data && res.data.success) {
        setMyComplaints(res.data.complaints || []);
      }
    } catch (err) {
      console.error("Error loading history", err);
    }
  };

  const fetchMyEventRequests = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/event-dustbin-requests/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data && res.data.success) {
        setMyEventRequests(res.data.requests || []);
      }
    } catch (err) {
      console.log("Error loading my event requests:", err);
    }
  };

  const fetchNearbyVehicles = async (lat, lng) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(
        `${API_URL}/citizen/active-vehicles-nearby?lat=${lat}&lng=${lng}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data && res.data.success) {
        setActiveVehicles(res.data.vehicles || []);
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

      if (res.data && res.data.success) {
        setAreaStats(res.data.stats || { cleanedToday: 0, activeVehicles: 0, pendingBins: 0 });
      }
    } catch (err) {
      console.error("Stats fetch error", err);
    }
  };

  const fetchDustbins = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const officeId = await AsyncStorage.getItem("officeId");

      if (!officeId) return;

      const res = await fetch(`${API_URL}/citizen/dustbin/list/${officeId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data && data.success) {
        setDustbins(data.dustbins || []);
      }
    } catch (err) {
      console.error("Error loading dustbins:", err);
    }
  };

  // Sound Effect
  const playResolvedSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync({
        uri: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
      });
      await sound.playAsync();
    } catch (error) {
      console.log("Could not play sound", error);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to log out from Safaimitra?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("token");
            await axios.post(
              `${API_URL}/citizen/logout`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            ).catch(() => {});
          } catch (e) {}
          await AsyncStorage.clear();
          if (goBack) goBack();
        },
      },
    ]);
  };

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadUserData(),
      fetchDustbins(),
      fetchMyComplaints(),
      fetchMyEventRequests(),
      fetchScorecard(),
      fetchLeaderboards(),
      getCurrentLocation(),
    ]);
    setRefreshing(false);
  };

  // Get GPS Location
  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      let { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(permStatus);

      if (permStatus !== "granted") {
        setAddress("Location permission denied");
        setLoadingLocation(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;
      setUserLocation([latitude, longitude]);

      // Reverse geocode
      try {
        let geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocode && geocode.length > 0) {
          let g = geocode[0];
          let formatted = `${g.name || g.street || ""}, ${g.subregion || g.city || ""}, ${g.region || ""}`.trim();
          setAddress(formatted || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      } catch (e) {
        setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }

      fetchNearbyVehicles(latitude, longitude);
      fetchAreaStats(latitude, longitude);
    } catch (err) {
      console.error("Location error", err);
      setAddress("Could not determine GPS coordinates");
    } finally {
      setLoadingLocation(false);
    }
  };

  // Find Nearest Dustbin Helper
  const getCalculatedNearestBin = () => {
    if (!userLocation || dustbins.length === 0) return null;
    let nearest = null;
    let minDist = Infinity;

    dustbins.forEach((bin) => {
      const d = Math.hypot(bin.latitude - userLocation[0], bin.longitude - userLocation[1]);
      if (d < minDist) {
        minDist = d;
        nearest = bin;
      }
    });
    return nearest;
  };

  // Find Nearest Dustbin Action
  const findNearestBin = () => {
    const nearest = getCalculatedNearestBin();
    if (nearest) {
      setSelectedBin(nearest);
      setInspectedMarker({ type: "bin", data: nearest });
      Alert.alert("Nearest Bin Selected 🎯", `Auto-selected: ${nearest.name || "Dustbin"}`);
      const targetMap = isFullScreenMap ? fullMapRef.current : mapRef.current;
      if (targetMap) {
        targetMap.animateToRegion({
          latitude: nearest.latitude,
          longitude: nearest.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        });
      }
      return nearest;
    } else {
      Alert.alert("Notice", "Acquiring GPS or dustbins. Please try again in a moment.");
      return null;
    }
  };

  // Center on User GPS
  const centerUserGPS = () => {
    if (!userLocation) {
      getCurrentLocation();
      return;
    }
    const targetMap = isFullScreenMap ? fullMapRef.current : mapRef.current;
    if (targetMap) {
      targetMap.animateToRegion({
        latitude: userLocation[0],
        longitude: userLocation[1],
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      });
    }
  };

  // 🔥 AUTO-SELECT NEAREST BIN + START REPORT FLOW 🔥
  const handleStartReportFlow = async () => {
    // 1. Auto-select nearest dustbin if not selected
    if (!selectedBin) {
      const localNearest = getCalculatedNearestBin();
      if (localNearest) {
        setSelectedBin(localNearest);
      } else if (userLocation) {
        try {
          const token = await AsyncStorage.getItem("token");
          const officeId = await AsyncStorage.getItem("officeId");
          const res = await axios.get(
            `${API_URL}/citizen/dustbin/nearest?lat=${userLocation[0]}&lng=${userLocation[1]}&officeId=${officeId || ""}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.data && res.data.success && res.data.dustbin) {
            setSelectedBin(res.data.dustbin);
          }
        } catch (e) {
          console.error("Auto nearest bin fetch error:", e);
        }
      }
    }

    // 2. Launch Camera directly
    await takePhoto();
  };

  // Camera & Image Capture
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Needed", "Please enable camera access to snap photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImage(asset.uri);
        setFileToUpload(asset);
        setSelectedTab("report"); // Switch to review & submit
        verifyPhotoWithAI(asset);
      }
    } catch (e) {
      console.error("Camera error:", e);
    }
  };

  // AI Verification
  const verifyPhotoWithAI = async (asset) => {
    setVerifying(true);
    setAiResult(null);
    try {
      const token = await AsyncStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", {
        uri: asset.uri,
        type: "image/jpeg",
        name: "complaint.jpg",
      });

      const res = await axios.post(`${API_URL}/citizen/verify-image`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        timeout: 15000,
      });

      if (res.data && res.data.success) {
        setAiResult(res.data.result);
      }
    } catch (e) {
      console.error("AI Verify error", e);
    } finally {
      setVerifying(false);
    }
  };

  // Submit Complaint
  const handleSubmit = async () => {
    if (!image || !selectedBin) {
      Alert.alert("Incomplete", "Please take a photo and select a dustbin marker.");
      return;
    }

    if (scorecard?.isSuspended) {
      Alert.alert("Account Suspended", "Your account is temporarily suspended. Please submit an appeal in the Profile tab.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const userId = await AsyncStorage.getItem("userId");
      const officeId = await AsyncStorage.getItem("officeId");

      const formData = new FormData();
      formData.append("image", {
        uri: image,
        type: "image/jpeg",
        name: "complaint_report.jpg",
      });
      formData.append("userId", userId);
      formData.append("dustbinId", selectedBin.id || selectedBin._id);
      formData.append("officeId", officeId);
      formData.append("address", address);
      if (userLocation) {
        formData.append("latitude", userLocation[0].toString());
        formData.append("longitude", userLocation[1].toString());
      }

      const res = await axios.post(`${API_URL}/citizen/complaint/create`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        timeout: 20000,
      });

      if (res.data && res.data.success) {
        Alert.alert("Complaint Registered! 🎉", "Your grievance has been logged with JAES SLA timer. Field workers have been notified.");
        setImage(null);
        setSelectedBin(null);
        setFileToUpload(null);
        setAiResult(null);
        fetchMyComplaints();
        fetchScorecard();
        setSelectedTab("history");
      } else {
        Alert.alert("Failed", res.data?.message || "Could not register complaint.");
      }
    } catch (err) {
      console.error("Submission error", err);
      Alert.alert("Error", err.response?.data?.message || "Failed to submit grievance.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initial Data Mount
  useEffect(() => {
    loadUserData();
    getCurrentLocation();
    fetchDustbins();
    fetchMyComplaints();
    fetchMyEventRequests();
    fetchScorecard();
    fetchLeaderboards();

    // Socket Setup
    try {
      socketRef.current = io(API_URL, { transports: ["websocket"] });
      socketRef.current.on("connect", () => console.log("Citizen Socket Connected"));
      socketRef.current.on("complaint_resolved", (data) => {
        setResolvedModal(data);
        playResolvedSound();
        fetchMyComplaints();
        fetchScorecard();
      });
    } catch (e) {
      console.error("Socket error", e);
    }

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Calculated Stats
  const totalComplaints = myComplaints.length;
  const resolvedComplaints = myComplaints.filter((c) => c.status === "resolved").length;
  const earnedPoints = scorecard?.trustScore || (resolvedComplaints * 15) || 120;

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <StatusBar style="light" />

      {/* ==================== 1. TOP HEADER (EXACT TO REFERENCE) ==================== */}
      <LinearGradient
        colors={["#059669", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingHorizontal: 20,
          paddingTop: Platform.OS === "ios" ? 54 : 42,
          paddingBottom: 22,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          shadowColor: "#059669",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          {/* User Profile Header Left */}
          <TouchableOpacity
            onPress={() => setSelectedTab("profile")}
            style={{ flexDirection: "row", alignItems: "center" }}
            activeOpacity={0.85}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#FFFFFF",
                padding: 2,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Image
                source={require("../../assets/logoapp.png")}
                style={{ width: "100%", height: "100%", borderRadius: 22 }}
                resizeMode="cover"
              />
            </View>

            <View>
              <Text style={{ fontSize: 20, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.3 }}>
                SafaiMitra
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#D1FAE5", marginRight: 4 }}>
                  Citizen Dashboard
                </Text>
                <ShieldCheck size={14} color="#A7F3D0" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Header Actions Right (Bell + Status) */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {/* Notification Bell */}
            <TouchableOpacity
              onPress={() => Alert.alert("Notifications", "You have 3 active updates regarding your municipal area cleaning.")}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
              }}
            >
              <Bell size={18} color="#FFFFFF" />
              <View
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  backgroundColor: "#EF4444",
                  borderRadius: 9,
                  minWidth: 16,
                  height: 16,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 3,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 9, fontWeight: "900" }}>3</Text>
              </View>
            </TouchableOpacity>

            {/* Online Status Pill */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#FFFFFF",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 20,
                shadowColor: "#000",
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#10B981", marginRight: 6 }} />
              <Text style={{ fontSize: 10, fontWeight: "800", color: "#065F46" }}>ONLINE</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* ==================== 2. MAIN BODY SCROLL VIEW ==================== */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ======================================================== */}
        {/* 🌟 TAB: HOME (EXACT MATCH TO REFERENCE DESIGN) */}
        {/* ======================================================== */}
        {selectedTab === "home" && (
          <View>
            {/* 1. Hero Feature Banner ("Together for a Cleaner City") */}
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 24,
                padding: 18,
                marginBottom: 18,
                borderWidth: 1,
                borderColor: "#E2E8F0",
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.06,
                shadowRadius: 16,
                elevation: 3,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                overflow: "hidden",
              }}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A", lineHeight: 26 }}>
                  Together for a{"\n"}
                  <Text style={{ color: "#059669" }}>Cleaner City</Text>
                </Text>
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748B", marginTop: 4, marginBottom: 12 }}>
                  Report • Track • Get it Cleaned
                </Text>

                <TouchableOpacity
                  onPress={handleStartReportFlow}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: "#059669",
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    alignSelf: "flex-start",
                    shadowColor: "#059669",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "800", marginRight: 6 }}>
                    Report Now
                  </Text>
                  <ArrowRight size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Right Illustration Artwork */}
              <View
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 20,
                  backgroundColor: "#ECFDF5",
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#A7F3D0",
                }}
              >
                <Text style={{ fontSize: 34 }}>🌿👥</Text>
                <View style={{ backgroundColor: "#FFFFFF", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#047857" }}>Swachh City</Text>
                </View>
              </View>
            </View>

            {/* 2. 4 Action Grid Cards */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 18 }}>
              {/* Report Issue (Auto-selects nearest bin + launches camera) */}
              <TouchableOpacity
                onPress={handleStartReportFlow}
                activeOpacity={0.85}
                style={{
                  width: "23%",
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  paddingVertical: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  shadowColor: "#000",
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#ECFDF5", justifyContent: "center", alignItems: "center", marginBottom: 6 }}>
                  <FileText size={22} color="#059669" />
                </View>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#0F172A", textAlign: "center" }}>
                  Report{"\n"}Issue
                </Text>
              </TouchableOpacity>

              {/* Track Status */}
              <TouchableOpacity
                onPress={() => setSelectedTab("track")}
                activeOpacity={0.85}
                style={{
                  width: "23%",
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  paddingVertical: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  shadowColor: "#000",
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginBottom: 6 }}>
                  <Compass size={22} color="#2563EB" />
                </View>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#0F172A", textAlign: "center" }}>
                  Track{"\n"}Status
                </Text>
              </TouchableOpacity>

              {/* Leader Board */}
              <TouchableOpacity
                onPress={() => setSelectedTab("leaderboard")}
                activeOpacity={0.85}
                style={{
                  width: "23%",
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  paddingVertical: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  shadowColor: "#000",
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#FEF3C7", justifyContent: "center", alignItems: "center", marginBottom: 6 }}>
                  <Trophy size={22} color="#D97706" />
                </View>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#0F172A", textAlign: "center" }}>
                  Leader{"\n"}Board
                </Text>
              </TouchableOpacity>

              {/* My Profile */}
              <TouchableOpacity
                onPress={() => setSelectedTab("profile")}
                activeOpacity={0.85}
                style={{
                  width: "23%",
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  paddingVertical: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  shadowColor: "#000",
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#F5F3FF", justifyContent: "center", alignItems: "center", marginBottom: 6 }}>
                  <User size={22} color="#7C3AED" />
                </View>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#0F172A", textAlign: "center" }}>
                  My{"\n"}Profile
                </Text>
              </TouchableOpacity>
            </View>

            {/* 🎉 PROMINENT FEATURE: REQUEST DUSTBINS FOR EVENT */}
            <TouchableOpacity
              onPress={() => setShowEventModal(true)}
              activeOpacity={0.88}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 24,
                padding: 16,
                marginBottom: 18,
                borderWidth: 1.5,
                borderColor: "#A7F3D0",
                shadowColor: "#059669",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 12,
                elevation: 3,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 8 }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: "#ECFDF5",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                    borderWidth: 1,
                    borderColor: "#A7F3D0",
                  }}
                >
                  <PartyPopper size={24} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ fontSize: 15, fontWeight: "900", color: "#0F172A", marginRight: 6 }}>
                      Request Dustbins for Event
                    </Text>
                    <View style={{ backgroundColor: "#DCFCE7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 9, fontWeight: "900", color: "#047857" }}>NEW AI</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: "#64748B", fontWeight: "600", marginTop: 2 }}>
                    Get temporary dustbins for your event
                  </Text>
                </View>
              </View>
              <View style={{ backgroundColor: "#059669", width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" }}>
                <ArrowRight size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {/* 3. "Your Location" Mini-Map Card (With Fullscreen & Nearest Actions) */}
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 24,
                padding: 16,
                marginBottom: 18,
                borderWidth: 1,
                borderColor: "#E2E8F0",
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 3,
              }}
            >
              {/* Location Header */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
                  <Crosshair size={20} color="#059669" style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A" }}>
                      Your Location
                    </Text>
                    <Text style={{ fontSize: 11, color: "#64748B", fontWeight: "600", marginTop: 1 }} numberOfLines={1}>
                      {userLocation ? `${userLocation[0].toFixed(6)}, ${userLocation[1].toFixed(6)}` : "23.265152, 77.472083"}
                    </Text>
                  </View>
                </View>

                {/* Fullscreen Expand Button */}
                <TouchableOpacity
                  onPress={() => setIsFullScreenMap(true)}
                  style={{
                    backgroundColor: "#ECFDF5",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#A7F3D0",
                  }}
                >
                  <Maximize2 size={13} color="#059669" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#047857" }}>Full Screen</Text>
                </TouchableOpacity>
              </View>

              {/* Map Preview */}
              <TouchableOpacity
                onPress={() => setIsFullScreenMap(true)}
                activeOpacity={0.95}
                style={{ height: 160, borderRadius: 18, overflow: "hidden", position: "relative" }}
              >
                <MapView
                  ref={mapRef}
                  showsUserLocation={true}
                  provider={PROVIDER_GOOGLE}
                  style={{ flex: 1 }}
                  initialRegion={{
                    latitude: userLocation ? userLocation[0] : 23.2599,
                    longitude: userLocation ? userLocation[1] : 77.4126,
                    latitudeDelta: 0.015,
                    longitudeDelta: 0.015,
                  }}
                >
                  {dustbins.map((bin) => (
                    <Marker
                      key={bin.id || bin._id}
                      coordinate={{ latitude: bin.latitude, longitude: bin.longitude }}
                      title={bin.name || "Dustbin"}
                      description={bin.address || "Public Waste Collection"}
                    >
                      <View style={{ backgroundColor: "#059669", padding: 6, borderRadius: 12, borderWidth: 1.5, borderColor: "#FFF" }}>
                        <Text style={{ fontSize: 12 }}>🗑️</Text>
                      </View>
                    </Marker>
                  ))}
                  {activeVehiclesnear.map((v) => (
                    <Marker
                      key={v.id || v._id}
                      coordinate={{ latitude: v.latitude, longitude: v.longitude }}
                      title={v.vehicleNumber || "Truck"}
                    >
                      <View style={{ backgroundColor: "#D97706", padding: 6, borderRadius: 12, borderWidth: 1.5, borderColor: "#FFF" }}>
                        <Text style={{ fontSize: 12 }}>🚛</Text>
                      </View>
                    </Marker>
                  ))}
                </MapView>

                {/* Recenter Button */}
                <TouchableOpacity
                  onPress={centerUserGPS}
                  style={{
                    position: "absolute",
                    bottom: 10,
                    right: 10,
                    backgroundColor: "#FFFFFF",
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                    elevation: 4,
                  }}
                >
                  <Crosshair size={18} color="#059669" />
                </TouchableOpacity>
              </TouchableOpacity>
            </View>

            {/* 4. "Quick Actions" Section */}
            <View style={{ marginBottom: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                <Zap size={18} color="#059669" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A" }}>
                  Quick Actions
                </Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                {/* Snap & Report (Auto-selects nearest bin + launches camera) */}
                <TouchableOpacity
                  onPress={handleStartReportFlow}
                  activeOpacity={0.85}
                  style={{
                    width: "31%",
                    backgroundColor: "#ECFDF5",
                    borderRadius: 18,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: "#A7F3D0",
                  }}
                >
                  <Camera size={22} color="#059669" style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#065F46", marginBottom: 2 }}>
                    Snap & Report
                  </Text>
                  <Text style={{ fontSize: 10, color: "#047857", fontWeight: "500", lineHeight: 13 }}>
                    Take photo and report issue
                  </Text>
                </TouchableOpacity>

                {/* Nearby Bins (Opens Full Screen Map + Auto-Finds Nearest) */}
                <TouchableOpacity
                  onPress={() => {
                    setIsFullScreenMap(true);
                    findNearestBin();
                  }}
                  activeOpacity={0.85}
                  style={{
                    width: "31%",
                    backgroundColor: "#EFF6FF",
                    borderRadius: 18,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: "#BFDBFE",
                  }}
                >
                  <MapPin size={22} color="#2563EB" style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#1E40AF", marginBottom: 2 }}>
                    Nearby Bins
                  </Text>
                  <Text style={{ fontSize: 10, color: "#1D4ED8", fontWeight: "500", lineHeight: 13 }}>
                    Find nearest dustbins
                  </Text>
                </TouchableOpacity>

                {/* Give Feedback */}
                <TouchableOpacity
                  onPress={() => setFeedbackModal(true)}
                  activeOpacity={0.85}
                  style={{
                    width: "31%",
                    backgroundColor: "#FAF5FF",
                    borderRadius: 18,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: "#E9D5FF",
                  }}
                >
                  <Megaphone size={22} color="#9333EA" style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#6B21A8", marginBottom: 2 }}>
                    Give Feedback
                  </Text>
                  <Text style={{ fontSize: 10, color: "#7E22CE", fontWeight: "500", lineHeight: 13 }}>
                    Share your suggestions
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 5. "Your Impact" Section */}
            <View style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ fontSize: 16, marginRight: 6 }}>🍃</Text>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A" }}>
                    Your Impact
                  </Text>
                </View>

                <TouchableOpacity onPress={() => setSelectedTab("history")} style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#059669", marginRight: 2 }}>
                    See More
                  </Text>
                  <ArrowRight size={13} color="#059669" />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                {/* Issues Reported */}
                <View
                  style={{
                    width: "31%",
                    backgroundColor: "#ECFDF5",
                    borderRadius: 18,
                    paddingVertical: 14,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#A7F3D0",
                  }}
                >
                  <Text style={{ fontSize: 22, fontWeight: "900", color: "#047857" }}>
                    {totalComplaints}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#065F46", marginTop: 2, textAlign: "center" }}>
                    Issues Reported
                  </Text>
                </View>

                {/* Resolved */}
                <View
                  style={{
                    width: "31%",
                    backgroundColor: "#EFF6FF",
                    borderRadius: 18,
                    paddingVertical: 14,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#BFDBFE",
                  }}
                >
                  <Text style={{ fontSize: 22, fontWeight: "900", color: "#1D4ED8" }}>
                    {resolvedComplaints}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#1E40AF", marginTop: 2, textAlign: "center" }}>
                    Resolved
                  </Text>
                </View>

                {/* Points Earned */}
                <View
                  style={{
                    width: "31%",
                    backgroundColor: "#F0FDF4",
                    borderRadius: 18,
                    paddingVertical: 14,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#BBF7D0",
                  }}
                >
                  <Text style={{ fontSize: 22, fontWeight: "900", color: "#059669" }}>
                    {earnedPoints}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#047857", marginTop: 2, textAlign: "center" }}>
                    Points Earned
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* 👤 TAB: PROFILE (SHOWS ALL CITIZEN PROFILE DATA) */}
        {/* ======================================================== */}
        {selectedTab === "profile" && (
          <View>
            {/* Header Profile Card */}
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 24,
                padding: 20,
                alignItems: "center",
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "#E2E8F0",
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 3,
              }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "#ECFDF5",
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 3,
                  borderColor: "#10B981",
                  marginBottom: 10,
                  overflow: "hidden",
                }}
              >
                <Image
                  source={require("../../assets/logoapp.png")}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </View>
              <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A" }}>
                {userData?.fullName || userData?.name || "Registered Citizen"}
              </Text>
              <View style={{ backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#166534" }}>
                  {scorecard?.citizenLevel || "Active Citizen Member"}
                </Text>
              </View>
            </View>

            {/* Profile Information List */}
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 24,
                padding: 20,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "#E2E8F0",
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 3,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A", marginBottom: 14 }}>
                Citizen Profile Information
              </Text>

              {/* Full Name */}
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
                <User size={18} color="#059669" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>FULL NAME</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E293B", marginTop: 1 }}>
                    {userData?.fullName || userData?.name || "N/A"}
                  </Text>
                </View>
              </View>

              {/* Phone */}
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
                <Phone size={18} color="#059669" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>REGISTERED PHONE</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E293B", marginTop: 1 }}>
                    {userData?.phone || userData?.username || "N/A"}
                  </Text>
                </View>
              </View>

              {/* Email */}
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
                <Mail size={18} color="#059669" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>EMAIL ADDRESS</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E293B", marginTop: 1 }}>
                    {userData?.email || "N/A"}
                  </Text>
                </View>
              </View>

              {/* City Jurisdiction */}
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
                <Building2 size={18} color="#059669" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>MUNICIPAL JURISDICTION</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E293B", marginTop: 1 }}>
                    {userData?.cityName || userData?.city || "Registered City Office"}
                  </Text>
                </View>
              </View>

              {/* Address */}
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
                <MapPin size={18} color="#059669" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>RESIDENTIAL ADDRESS</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E293B", marginTop: 1 }}>
                    {userData?.address || address || "N/A"}
                  </Text>
                </View>
              </View>

              {/* Pincode */}
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10 }}>
                <Navigation size={18} color="#059669" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>POSTAL PINCODE</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E293B", marginTop: 1 }}>
                    {userData?.pincode || "452001"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Scorecard Overview */}
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 24,
                padding: 20,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "#E2E8F0",
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A", marginBottom: 12 }}>
                Trust & Reliability Stats
              </Text>

              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                <View style={{ width: "48%", backgroundColor: "#F0FDF4", padding: 12, borderRadius: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: "900", color: "#166534" }}>
                    ⭐️ {scorecard?.trustScore || 100}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#15803D", fontWeight: "700" }}>Trust Score</Text>
                </View>
                <View style={{ width: "48%", backgroundColor: "#EFF6FF", padding: 12, borderRadius: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: "900", color: "#1E40AF" }}>
                    ✅ {scorecard?.validComplaints || totalComplaints}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#2563EB", fontWeight: "700" }}>Valid Reports</Text>
                </View>
              </View>
            </View>

            {/* Logout Action Button */}
            <TouchableOpacity
              onPress={handleLogout}
              style={{
                backgroundColor: "#FEE2E2",
                borderWidth: 1.5,
                borderColor: "#FECACA",
                borderRadius: 18,
                paddingVertical: 14,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <LogOut size={18} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={{ color: "#DC2626", fontSize: 14, fontWeight: "800" }}>
                Sign Out from Safaimitra
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ======================================================== */}
        {/* 📸 TAB: REPORT COMPLAINT */}
        {/* ======================================================== */}
        {selectedTab === "report" && (
          <View>
            {/* Step 1: Location Status */}
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 24, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: "#E2E8F0" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A" }}>
                  1. Incident GPS Location
                </Text>
                <TouchableOpacity onPress={getCurrentLocation} style={{ backgroundColor: "#DCFCE7", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#166534" }}>Refresh GPS</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 13, color: "#475569", fontWeight: "600" }}>
                📍 {address}
              </Text>
            </View>

            {/* Step 2: Camera Photo Capture */}
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 24, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: "#E2E8F0" }}>
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A", marginBottom: 10 }}>
                2. Waste Photo Capture
              </Text>

              {image ? (
                <View style={{ height: 200, borderRadius: 16, overflow: "hidden", marginBottom: 10 }}>
                  <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleStartReportFlow}
                  style={{
                    backgroundColor: "#ECFDF5",
                    borderRadius: 18,
                    paddingVertical: 36,
                    alignItems: "center",
                    borderWidth: 2,
                    borderStyle: "dashed",
                    borderColor: "#10B981",
                    marginBottom: 10,
                  }}
                >
                  <Camera size={34} color="#059669" style={{ marginBottom: 6 }} />
                  <Text style={{ fontSize: 14, fontWeight: "800", color: "#059669" }}>
                    Tap to Open Camera & Snap Photo
                  </Text>
                  <Text style={{ fontSize: 11, color: "#047857", marginTop: 2 }}>
                    Nearest dustbin will be assigned automatically
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Step 3: Assigned / Nearest Dustbin */}
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 24, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: "#E2E8F0" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#0F172A" }}>
                  3. Assigned Dustbin
                </Text>
                <TouchableOpacity onPress={findNearestBin} style={{ backgroundColor: "#EFF6FF", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#1D4ED8" }}>Re-Select Nearest</Text>
                </TouchableOpacity>
              </View>

              {selectedBin ? (
                <View style={{ backgroundColor: "#ECFDF5", padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "#A7F3D0", marginBottom: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#047857" }}>
                    ✅ Nearest Dustbin: {selectedBin.name || "Station Bin"}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#065F46", marginTop: 2 }}>
                    📍 {selectedBin.address || `${selectedBin.latitude}, ${selectedBin.longitude}`}
                  </Text>
                </View>
              ) : null}

              <View style={{ height: 160, borderRadius: 16, overflow: "hidden" }}>
                <MapView
                  showsUserLocation={true}
                  style={{ flex: 1 }}
                  initialRegion={{
                    latitude: selectedBin ? selectedBin.latitude : (userLocation ? userLocation[0] : 23.2599),
                    longitude: selectedBin ? selectedBin.longitude : (userLocation ? userLocation[1] : 77.4126),
                    latitudeDelta: 0.015,
                    longitudeDelta: 0.015,
                  }}
                >
                  {dustbins.map((bin) => {
                    const isSelected = selectedBin && (selectedBin.id === bin.id || selectedBin._id === bin._id);
                    return (
                      <Marker
                        key={bin.id || bin._id}
                        coordinate={{ latitude: bin.latitude, longitude: bin.longitude }}
                        onPress={() => setSelectedBin(bin)}
                      >
                        <View style={{ backgroundColor: isSelected ? "#DC2626" : "#059669", padding: 6, borderRadius: 12, borderWidth: 2, borderColor: "#FFF" }}>
                          <Text style={{ fontSize: 12 }}>🗑️</Text>
                        </View>
                      </Marker>
                    );
                  })}
                </MapView>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting || !image || !selectedBin}
              style={{
                backgroundColor: !image || !selectedBin || isSubmitting ? "#CBD5E1" : "#059669",
                borderRadius: 18,
                paddingVertical: 16,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#059669",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 4,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#FFFFFF" }}>
                  Submit Complaint to Safaimitra 🚀
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ======================================================== */}
        {/* 🗺️ TAB: TRACK & FLEET MAP */}
        {/* ======================================================== */}
        {selectedTab === "track" && (
          <View>
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 24, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: "#E2E8F0" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A" }}>
                  Live Collection Vehicles & Bins
                </Text>
                <TouchableOpacity
                  onPress={() => setIsFullScreenMap(true)}
                  style={{ backgroundColor: "#ECFDF5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: "row", alignItems: "center" }}
                >
                  <Maximize2 size={12} color="#059669" style={{ marginRight: 3 }} />
                  <Text style={{ fontSize: 10, fontWeight: "800", color: "#047857" }}>Full Screen</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
                Real-time tracking of sanitation trucks in your area
              </Text>

              <View style={{ height: 280, borderRadius: 18, overflow: "hidden" }}>
                <MapView
                  showsUserLocation={true}
                  style={{ flex: 1 }}
                  initialRegion={{
                    latitude: userLocation ? userLocation[0] : 23.2599,
                    longitude: userLocation ? userLocation[1] : 77.4126,
                    latitudeDelta: 0.025,
                    longitudeDelta: 0.025,
                  }}
                >
                  {dustbins.map((bin) => (
                    <Marker
                      key={bin.id || bin._id}
                      coordinate={{ latitude: bin.latitude, longitude: bin.longitude }}
                      title={bin.name}
                    >
                      <View style={{ backgroundColor: "#059669", padding: 5, borderRadius: 10 }}>
                        <Text style={{ fontSize: 11 }}>🗑️</Text>
                      </View>
                    </Marker>
                  ))}
                  {activeVehiclesnear.map((v) => (
                    <Marker
                      key={v.id || v._id}
                      coordinate={{ latitude: v.latitude, longitude: v.longitude }}
                      title={v.vehicleNumber}
                    >
                      <View style={{ backgroundColor: "#D97706", padding: 6, borderRadius: 12 }}>
                        <Text style={{ fontSize: 13 }}>🚛</Text>
                      </View>
                    </Marker>
                  ))}
                </MapView>
              </View>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* 🏆 TAB: LEADERBOARDS */}
        {/* ======================================================== */}
        {selectedTab === "leaderboard" && (
          <View>
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 24, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: "#E2E8F0" }}>
              <Text style={{ fontSize: 17, fontWeight: "900", color: "#0F172A", marginBottom: 4 }}>
                🏆 Community Leaderboard
              </Text>
              <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 14 }}>
                Top citizens driving clean city initiatives
              </Text>

              {cityLeaderboard.length === 0 ? (
                <Text style={{ color: "#94A3B8", textAlign: "center", paddingVertical: 20 }}>No rankings available yet</Text>
              ) : (
                cityLeaderboard.map((u, i) => (
                  <View key={u._id || i} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ fontSize: 14, fontWeight: "900", color: i === 0 ? "#D97706" : "#64748B", width: 28 }}>
                        #{i + 1}
                      </Text>
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>{u.fullName || "Citizen"}</Text>
                        <Text style={{ fontSize: 11, color: "#64748B" }}>{u.citizenLevel || "Citizen Contributor"}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: "900", color: "#059669" }}>
                      ⭐️ {u.trustScore || 100} pts
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* 📑 TAB: REPORTS & HISTORY */}
        {/* ======================================================== */}
        {selectedTab === "history" && (
          <View>
            {/* Event Dustbin Requests Section */}
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <PartyPopper size={18} color="#059669" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 16, fontWeight: "900", color: "#0F172A" }}>
                    Event Dustbin Requests ({myEventRequests.length})
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowEventModal(true)}
                  style={{ backgroundColor: "#ECFDF5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "900", color: "#059669" }}>+ New Event</Text>
                </TouchableOpacity>
              </View>

              {myEventRequests.length === 0 ? (
                <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 18, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#64748B" }}>
                    No event dustbin requests submitted yet.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowEventModal(true)}
                    style={{ marginTop: 8, backgroundColor: "#059669", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 }}
                  >
                    <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 11 }}>Request Dustbins for Event</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                myEventRequests.map((ev) => (
                  <View
                    key={ev._id}
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 20,
                      padding: 16,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={{ fontSize: 14, fontWeight: "900", color: "#0F172A" }}>
                          {ev.event?.name} ({ev.event?.type})
                        </Text>
                        <Text style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                          📅 {ev.event?.date} • {ev.event?.expectedGuests} Guests
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor:
                            ev.status === "APPROVED" || ev.status === "ALLOCATED"
                              ? "#DCFCE7"
                              : ev.status === "REJECTED"
                              ? "#FEE2E2"
                              : "#FEF3C7",
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "900",
                            color:
                              ev.status === "APPROVED" || ev.status === "ALLOCATED"
                                ? "#166534"
                                : ev.status === "REJECTED"
                                ? "#991B1B"
                                : "#B45309",
                          }}
                        >
                          {ev.status?.replace(/_/g, " ")}
                        </Text>
                      </View>
                    </View>

                    <View style={{ backgroundColor: "#F8FAFC", padding: 10, borderRadius: 12, marginTop: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: "#334155" }}>
                        ID: {ev.requestId}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: "900", color: "#059669" }}>
                        🗑️ {ev.adminDecision?.approvedBins?.total || ev.aiAnalysis?.recommendedBins?.total || 3} Bins Quota
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Complaints History Section */}
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#0F172A", marginBottom: 12 }}>
              My Grievance Complaints ({myComplaints.length})
            </Text>

            {myComplaints.length === 0 ? (
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 24, padding: 30, alignItems: "center" }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📑</Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#64748B" }}>No complaints reported yet.</Text>
                <TouchableOpacity onPress={handleStartReportFlow} style={{ marginTop: 12, backgroundColor: "#059669", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}>
                  <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 12 }}>Report New Issue</Text>
                </TouchableOpacity>
              </View>
            ) : (
              myComplaints.map((item) => (
                <TouchableOpacity
                  key={item._id}
                  onPress={() => {
                    setSelectedComplaintDetail(item);
                    setShowDetailModal(true);
                  }}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 20,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: item.status === "resolved" ? "#DCFCE7" : "#FEF3C7", justifyContent: "center", alignItems: "center", marginRight: 12 }}>
                    <Text style={{ fontSize: 18 }}>{item.status === "resolved" ? "✅" : "⏳"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>
                      Complaint #{item._id.toString().slice(-6).toUpperCase()}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#64748B", marginTop: 2 }} numberOfLines={1}>
                      {item.address || "Location logged"}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: item.status === "resolved" ? "#DCFCE7" : "#FEF3C7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: "800", color: item.status === "resolved" ? "#166534" : "#B45309" }}>
                      {item.status?.toUpperCase()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ==================== 3. FLOATING CURVED BOTTOM NAVIGATION ==================== */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderWidth: 1,
          borderColor: "#E2E8F0",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 10,
          paddingHorizontal: 16,
          paddingVertical: 10,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Home */}
        <TouchableOpacity
          onPress={() => setSelectedTab("home")}
          style={{ alignItems: "center", width: "18%" }}
        >
          <Home size={22} color={selectedTab === "home" ? "#059669" : "#94A3B8"} />
          <Text style={{ fontSize: 10, fontWeight: "800", color: selectedTab === "home" ? "#059669" : "#94A3B8", marginTop: 2 }}>
            Home
          </Text>
        </TouchableOpacity>

        {/* Reports / History */}
        <TouchableOpacity
          onPress={() => setSelectedTab("history")}
          style={{ alignItems: "center", width: "18%" }}
        >
          <FileText size={22} color={selectedTab === "history" ? "#059669" : "#94A3B8"} />
          <Text style={{ fontSize: 10, fontWeight: "800", color: selectedTab === "history" ? "#059669" : "#94A3B8", marginTop: 2 }}>
            Reports
          </Text>
        </TouchableOpacity>

        {/* Center Floating Plus Action (Auto-selects nearest bin + launches camera) */}
        <View style={{ width: "20%", alignItems: "center" }}>
          <TouchableOpacity
            onPress={handleStartReportFlow}
            activeOpacity={0.88}
            style={{
              width: 54,
              height: 54,
              borderRadius: 27,
              backgroundColor: "#059669",
              justifyContent: "center",
              alignItems: "center",
              marginTop: -28,
              shadowColor: "#059669",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 8,
              borderWidth: 3,
              borderColor: "#FFFFFF",
            }}
          >
            <Plus size={28} color="#FFFFFF" strokeWidth={3} />
          </TouchableOpacity>
        </View>

        {/* Track / Full Map */}
        <TouchableOpacity
          onPress={() => setIsFullScreenMap(true)}
          style={{ alignItems: "center", width: "18%" }}
        >
          <Compass size={22} color={isFullScreenMap ? "#059669" : "#94A3B8"} />
          <Text style={{ fontSize: 10, fontWeight: "800", color: isFullScreenMap ? "#059669" : "#94A3B8", marginTop: 2 }}>
            City Map
          </Text>
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity
          onPress={() => setSelectedTab("profile")}
          style={{ alignItems: "center", width: "18%" }}
        >
          <User size={22} color={selectedTab === "profile" ? "#059669" : "#94A3B8"} />
          <Text style={{ fontSize: 10, fontWeight: "800", color: selectedTab === "profile" ? "#059669" : "#94A3B8", marginTop: 2 }}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* ======================================================== */}
      {/* 🌟 4. FULL SCREEN CITY MAP MODAL WITH INTERACTIVE FILTERS */}
      {/* ======================================================== */}
      <Modal visible={isFullScreenMap} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
          {/* Top Fullscreen Map Navigation Bar */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottomWidth: 1,
              borderBottomColor: "#E2E8F0",
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <TouchableOpacity
              onPress={() => setIsFullScreenMap(false)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#F1F5F9",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 14,
              }}
            >
              <Minimize2 size={16} color="#334155" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#334155" }}>Exit Fullscreen</Text>
            </TouchableOpacity>

            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#0F172A" }}>
                {userData?.cityName || userData?.city || "Municipal"} Smart Map
              </Text>
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#059669" }}>
                Live City Infrastructure
              </Text>
            </View>

            <TouchableOpacity
              onPress={onRefresh}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#ECFDF5",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <RefreshCw size={16} color="#059669" />
            </TouchableOpacity>
          </View>

          {/* Interactive Filter Pills */}
          <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#FFFFFF", gap: 8 }}>
            <TouchableOpacity
              onPress={() => setMapFilter("all")}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                backgroundColor: mapFilter === "all" ? "#059669" : "#F1F5F9",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "800", color: mapFilter === "all" ? "#FFFFFF" : "#64748B" }}>
                🏷️ All ({dustbins.length + activeVehiclesnear.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMapFilter("bins")}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                backgroundColor: mapFilter === "bins" ? "#059669" : "#F1F5F9",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "800", color: mapFilter === "bins" ? "#FFFFFF" : "#64748B" }}>
                🗑️ Dustbins ({dustbins.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMapFilter("trucks")}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                backgroundColor: mapFilter === "trucks" ? "#059669" : "#F1F5F9",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "800", color: mapFilter === "trucks" ? "#FFFFFF" : "#64748B" }}>
                🚛 Live Trucks ({activeVehiclesnear.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Main Fullscreen MapView */}
          <View style={{ flex: 1, position: "relative" }}>
            <MapView
              ref={fullMapRef}
              showsUserLocation={true}
              showsCompass={true}
              provider={PROVIDER_GOOGLE}
              style={{ flex: 1 }}
              initialRegion={{
                latitude: userLocation ? userLocation[0] : 23.2599,
                longitude: userLocation ? userLocation[1] : 77.4126,
                latitudeDelta: 0.035,
                longitudeDelta: 0.035,
              }}
            >
              {/* Dustbins */}
              {(mapFilter === "all" || mapFilter === "bins") &&
                dustbins.map((bin) => {
                  const isSelected = selectedBin && (selectedBin.id === bin.id || selectedBin._id === bin._id);
                  return (
                    <Marker
                      key={bin.id || bin._id}
                      coordinate={{ latitude: bin.latitude, longitude: bin.longitude }}
                      onPress={() => {
                        setSelectedBin(bin);
                        setInspectedMarker({ type: "bin", data: bin });
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: isSelected ? "#DC2626" : "#059669",
                          padding: 7,
                          borderRadius: 14,
                          borderWidth: 2,
                          borderColor: "#FFFFFF",
                          shadowColor: "#000",
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: 4,
                        }}
                      >
                        <Text style={{ fontSize: 14 }}>🗑️</Text>
                      </View>
                    </Marker>
                  );
                })}

              {/* Active Collection Trucks */}
              {(mapFilter === "all" || mapFilter === "trucks") &&
                activeVehiclesnear.map((v) => (
                  <Marker
                    key={v.id || v._id}
                    coordinate={{ latitude: v.latitude, longitude: v.longitude }}
                    onPress={() => setInspectedMarker({ type: "truck", data: v })}
                  >
                    <View
                      style={{
                        backgroundColor: "#D97706",
                        padding: 7,
                        borderRadius: 14,
                        borderWidth: 2,
                        borderColor: "#FFFFFF",
                        shadowColor: "#000",
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 4,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>🚛</Text>
                    </View>
                  </Marker>
                ))}
            </MapView>

            {/* Floating Action Controls */}
            <View style={{ position: "absolute", top: 16, right: 16, gap: 10 }}>
              {/* Auto Find Nearest Bin */}
              <TouchableOpacity
                onPress={findNearestBin}
                style={{
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 18,
                  flexDirection: "row",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 5,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                }}
              >
                <Crosshair size={16} color="#059669" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: "800", color: "#065F46" }}>Auto Nearest</Text>
              </TouchableOpacity>

              {/* Center User GPS */}
              <TouchableOpacity
                onPress={centerUserGPS}
                style={{
                  backgroundColor: "#FFFFFF",
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  justifyContent: "center",
                  alignItems: "center",
                  alignSelf: "flex-end",
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 5,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                }}
              >
                <Navigation size={20} color="#059669" />
              </TouchableOpacity>
            </View>

            {/* Inspected Marker Bottom Card */}
            {inspectedMarker && (
              <View
                style={{
                  position: "absolute",
                  bottom: 20,
                  left: 16,
                  right: 16,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 22,
                  padding: 16,
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 8,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <Text style={{ fontSize: 15, fontWeight: "900", color: "#0F172A" }}>
                    {inspectedMarker.type === "bin" ? "🗑️ Dustbin Station" : "🚛 Collection Truck"}
                  </Text>
                  <TouchableOpacity onPress={() => setInspectedMarker(null)} style={{ padding: 4 }}>
                    <Text style={{ fontWeight: "700", color: "#94A3B8", fontSize: 13 }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {inspectedMarker.type === "bin" ? (
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#334155" }}>
                      {inspectedMarker.data.name || "Public Dustbin"}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                      📍 {inspectedMarker.data.address || `${inspectedMarker.data.latitude.toFixed(4)}, ${inspectedMarker.data.longitude.toFixed(4)}`}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedBin(inspectedMarker.data);
                        setIsFullScreenMap(false);
                        handleStartReportFlow();
                      }}
                      style={{
                        marginTop: 10,
                        backgroundColor: "#059669",
                        borderRadius: 12,
                        paddingVertical: 10,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 12 }}>
                        Snap & Report at this Bin →
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#334155" }}>
                      Vehicle #{inspectedMarker.data.vehicleNumber}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#059669", fontWeight: "700", marginTop: 2 }}>
                      🟢 Active on Municipal Route
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* ==================== FEEDBACK MODAL ==================== */}
      <Modal visible={feedbackModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 }}>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 24, padding: 22 }}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: "#0F172A", marginBottom: 6 }}>
              Share Your Feedback
            </Text>
            <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 14 }}>
              Help us improve city sanitation and municipal collection efficiency.
            </Text>
            <TextInput
              placeholder="Write your suggestions..."
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              numberOfLines={4}
              style={{ backgroundColor: "#F8FAFC", borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", padding: 12, height: 100, textAlignVertical: "top", marginBottom: 16 }}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setFeedbackModal(false)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center" }}
              >
                <Text style={{ fontWeight: "700", color: "#64748B" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert("Thank You! 🙏", "Your feedback has been submitted to the municipal sanitation team.");
                  setFeedbackModal(false);
                  setFeedbackText("");
                }}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: "#059669", alignItems: "center" }}
              >
                <Text style={{ fontWeight: "800", color: "#FFFFFF" }}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== EVENT DUSTBIN REQUEST MODAL ==================== */}
      <Modal visible={showEventModal} animationType="slide" transparent={false}>
        <EventDustbinRequestScreen
          onClose={() => {
            setShowEventModal(false);
            fetchMyEventRequests();
          }}
          onSuccess={() => {
            fetchMyEventRequests();
          }}
        />
      </Modal>
    </View>
  );
}
