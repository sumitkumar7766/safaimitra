import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
  Dimensions,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  AppState, // 🔥 Added AppState to handle background/foreground
} from "react-native";
import MapView, {
  Marker,
  Polyline,
  Callout,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { io } from "socket.io-client";
import tw from "twrnc";

const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const ORS_API_KEY =
  process.env.NEXT_PUBLIC_ORS_API_KEY ||
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImU0ZTY1YzcwYTRjOTQ5OGViMDVjMDQ1ZGRlM2VhOWIzIiwiaCI6Im11cm11cjY0In0=";

const getMarkerColor = (status) => {
  const colors = {
    clean: "#10b981",
    overflow: "#f59e0b",
    skiped: "#ef4444",
    suspecies: "#cc760e",
    ideal: "#000000",
    current: "#3b82f6",
  };
  return colors[status] || "#6b7280";
};

const DustbinMarker = React.memo(
  ({ stop, index, onPress }) => {
    const [tracksViewChanges, setTracksViewChanges] = useState(true);

    useEffect(() => {
      const timer = setTimeout(() => {
        setTracksViewChanges(false);
      }, 100);
      return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
      setTracksViewChanges(true);
      const timer = setTimeout(() => {
        setTracksViewChanges(false);
      }, 100);
      return () => clearTimeout(timer);
    }, [stop.status]);

    return (
      <Marker
        coordinate={{
          latitude: stop.coordinates[0],
          longitude: stop.coordinates[1],
        }}
        tracksViewChanges={tracksViewChanges}
        calloutOffset={{ x: 0, y: -10 }}
        calloutAnchor={{ x: 0.5, y: 0 }}
        onPress={onPress}
      >
        <View
          style={[
            tw`w-10 h-10 rounded-full justify-center items-center border-2 border-white shadow-md`,
            { backgroundColor: getMarkerColor(stop.status) },
          ]}
        >
          <Text style={tw`text-white text-xs`}>🗑️</Text>
        </View>

        <Callout tooltip={true}>
          <View>
            <View
              style={tw`bg-white w-40 p-3 rounded-lg border border-gray-200 shadow-lg items-center relative`}
            >
              <Text
                style={tw`font-bold text-gray-800 mb-2 text-center text-xs`}
              >
                {stop.name}
              </Text>
              <View
                style={[
                  tw`px-2 py-1 rounded-full mb-1`,
                  {
                    backgroundColor:
                      stop.status === "clean" ? "#10b981" : "#f59e0b",
                  },
                ]}
              >
                <Text style={tw`text-white text-[10px] font-bold uppercase`}>
                  {stop.status || "PENDING"}
                </Text>
              </View>
              <View
                style={tw`absolute -bottom-2 w-4 h-4 bg-white rotate-45 border-r border-b border-gray-200`}
              />
            </View>
            <View style={tw`h-2 w-full bg-transparent`} />
          </View>
        </Callout>
      </Marker>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.stop.id === nextProps.stop.id &&
      prevProps.stop.status === nextProps.stop.status
    );
  },
);

export default function VehiclePage({ goBack }) {
  // --- STATE ---
  const mapRef = useRef(null);
  // 🔥 Socket Ref taki re-renders me connection lost na ho
  const socketRef = useRef(null);
  const appState = useRef(AppState.currentState);

  const [currentStop, setCurrentStop] = useState(1);
  const [afterImage, setAfterImage] = useState(null);
  const [todayCompleted, setTodayCompleted] = useState(0);
  const [showMap, setShowMap] = useState(true);

  const [staff, setStaff] = useState(null);
  const [routeStops, setRouteStops] = useState([]);
  const [routeLine, setRouteLine] = useState([]);
  const [driverLocation, setDriverLocation] = useState(null);

  const [isCleanVerified, setIsCleanVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState("clean");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newJobAlert, setNewJobAlert] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);

  // Navigation States
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeInstructions, setRouteInstructions] = useState([]);
  const [nextTurn, setNextTurn] = useState(null);

  const getDirectionIcon = (type) => {
    switch (type) {
      case 0:
        return "⬆️";
      case 1:
        return "↗️";
      case 2:
        return "⬅️";
      case 3:
        return "➡️";
      case 4:
        return "↖️";
      case 5:
        return "↗️";
      case 10:
        return "🏁";
      default:
        return "⬆️";
    }
  };

  const renderMapContent = () => (
    <MapView
      ref={mapRef}
      style={tw`w-full h-full`}
      provider={PROVIDER_GOOGLE}
      initialRegion={{
        latitude: mapCenter[0],
        longitude: mapCenter[1],
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }}
      showsUserLocation={true}
    >
      {routeLine.length > 0 && (
        <Polyline
          coordinates={routeLine}
          strokeColor="#2563eb"
          strokeWidth={4}
          lineDashPattern={[0]}
        />
      )}

      {/* {driverLocation && (
        <Marker
          coordinate={{
            latitude: driverLocation[0],
            longitude: driverLocation[1],
          }}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={999}
        >
          <View className="w-8 h-8 justify-center items-center">
            <Text className="text-2xl"></Text>
          </View>
        </Marker>
      )} */}

      {routeStops.map((stop, index) => (
        <DustbinMarker
          key={stop.id}
          stop={stop}
          index={index}
          onPress={() => {
            // Allow navigation if status is NOT clean (so skipped, pending, overflow, etc. work)
            if (stop.status !== "clean") {
              setCurrentStop(index + 1); // Update current stop to this marker
              if (driverLocation)
                fetchShortestRoute(driverLocation, stop.coordinates); // Draw route to this marker
            }
          }}
        />
      ))}
    </MapView>
  );

  const fetchDashboard = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await axios.get(`${API_URL}/staff/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data && res.data.dustbins) {
        const backendStops = res.data.dustbins.map((d, index) => ({
          id: d._id,
          displayId: index + 1,
          name: d.name,
          coordinates: [d.latitude, d.longitude],
          status: d.status,
          completedAt: d.lastCleanedAt,
          complaintId: d.complaintId,
          isEmergency: d.isEmergency || (d.complaintId ? true : false),
        }));

        setRouteStops((prevStops) => {
          const stopMap = new Map();
          backendStops.forEach((stop) => stopMap.set(stop.id, stop));
          prevStops.forEach((localStop) => {
            if (localStop.isNew && !stopMap.has(localStop.id)) {
              stopMap.set(localStop.id, localStop);
            }
          });
          return Array.from(stopMap.values());
        });

        const doneCount = backendStops.filter((s) =>
          ["clean", "suspecies", "skiped"].includes(s.status),
        ).length;
        setTodayCompleted(doneCount);
      }
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchDashboard();
      console.log("Page Refreshed!");
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isNavigating && mapRef.current && driverLocation) {
      mapRef.current.animateCamera(
        {
          center: { latitude: driverLocation[0], longitude: driverLocation[1] },
          pitch: 50,
          heading: bearing,
          zoom: 18,
        },
        { duration: 1000 },
      );
    }
  }, [driverLocation, isNavigating, bearing]);

  const totalStops = routeStops.length;
  const currentStopData = routeStops[currentStop - 1];

  const targetStop = routeStops.find(
    (stop, index) =>
      index >= currentStop - 1 &&
      !["clean", "skiped", "suspecies", "resolved"].includes(stop.status),
  );

  const isRouteCountComplete = totalStops > 0 && todayCompleted >= totalStops;
  const showCompletionUI = isRouteCountComplete && !targetStop;

  // --- 🔥 SOCKET.IO FIX (Auto Reconnect & Background Handle) 🔥 ---
  // --- 🔥 SOCKET.IO LOGIC (Robust + Dynamic Route Update) 🔥 ---
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        // 1. Get User Data
        const res = await axios.get(`${API_URL}/staff/userdata`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success) {
          const userId = res.data.user._id;

          // 2. Connect with Reconnection Logic
          socketRef.current = io(API_URL, {
            transports: ["websocket"],
            reconnection: true, // Auto Reconnect
            reconnectionAttempts: Infinity, // Keep trying
            reconnectionDelay: 1000,
            pingTimeout: 60000, // 60 sec ping timeout
          });

          const newSocket = socketRef.current;

          // 3. Socket Event Listeners
          newSocket.on("connect", () => {
            console.log("✅ Socket Connected");
            newSocket.emit("join_room", `driver_${userId}`);
          });

          newSocket.on("disconnect", (reason) => {
            console.log("⚠️ Socket Disconnected:", reason);
            if (reason === "io server disconnect") {
              newSocket.connect();
            }
          });

          newSocket.on("update_dashboard", () => {
            console.log("🔄 Socket Event: Updating Dashboard...");
            fetchDashboard();
          });

          // 4. Handle Emergency Jobs (Merged Logic)
          newSocket.on("new_job_alert", async (data) => {
            // A. Play Audio (Expo Way)
            try {
              const { sound } = await Audio.Sound.createAsync({
                uri: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
              });
              await sound.playAsync();
            } catch (e) {
              console.log("Audio failed", e);
            }

            // B. Show UI Modal
            setNewJobAlert(data);

            // C. Update Route List Dynamically (Logic from Input 1)
            setRouteStops((prevStops) => {
              // Ensure we are checking the correct ID field (id or _id)
              const incomingId = data.newStop.id || data.newStop._id;

              // Check if bin already exists in list
              const existingIndex = prevStops.findIndex(
                (stop) => stop.id === incomingId,
              );

              if (existingIndex !== -1) {
                // Update existing bin to Emergency status
                const updatedStops = [...prevStops];
                updatedStops[existingIndex] = {
                  ...updatedStops[existingIndex],
                  status: "overflow",
                  type: "complaint",
                  complaintId: data.newStop.complaintId,
                  isEmergency: true,
                  isNew: true, // Optional: for highlighting UI
                };
                return updatedStops;
              } else {
                // Add new Ad-hoc stop to the end of the list
                return [
                  ...prevStops,
                  {
                    ...data.newStop,
                    // Ensure ID is consistent
                    id: incomingId,
                    isEmergency: true,
                    type: "complaint",
                    status: "overflow",
                    displayId: prevStops.length + 1,
                  },
                ];
              }
            });
          });
        }
      } catch (err) {
        console.error("Socket Init Failed:", err);
      }
    };

    initializeSocket();

    // 5. App State Listener (Handle Background/Foreground)
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log("⚡ App came to foreground - Checking Socket...");
        if (socketRef.current && !socketRef.current.connected) {
          socketRef.current.connect();
        }
      }
      appState.current = nextAppState;
    });

    // 6. Cleanup
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission to access location was denied");
        return;
      }

      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        async (location) => {
          const lat = location.coords.latitude;
          const lng = location.coords.longitude;
          setDriverLocation([lat, lng]);

          const token = await AsyncStorage.getItem("token");
          if (token) {
            try {
              await axios.post(
                `${API_URL}/staff/update-vehicle-location`,
                { latitude: lat, longitude: lng },
                { headers: { Authorization: `Bearer ${token}` } },
              );
            } catch (err) {
              // Silent error for location updates to avoid spam
            }
          }
        },
      );
    })();
  }, []);

  useEffect(() => {
    const fetchStaffProfile = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (token) {
          const res = await axios.get(`${API_URL}/staff/userdata`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.data.success) setStaff(res.data.user);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStaffProfile();
  }, []);

  useEffect(() => {
    if (driverLocation && targetStop && targetStop.coordinates) {
      const dist = getDistance(
        driverLocation[0],
        driverLocation[1],
        targetStop.coordinates[0],
        targetStop.coordinates[1],
      );

      if (routeLine.length === 0 || dist > 20) {
        fetchShortestRoute(driverLocation, targetStop.coordinates);
      }
    }
  }, [currentStop, driverLocation]);

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (routeStops.length > 0) {
      const activeStopData = routeStops[currentStop - 1];
      const isCurrentStillPending =
        activeStopData &&
        !["clean", "skiped", "suspecies", "resolved"].includes(
          activeStopData.status,
        );

      if (isCurrentStillPending) return;

      const firstPendingIndex = routeStops.findIndex(
        (stop) =>
          !["clean", "skiped", "suspecies", "resolved"].includes(stop.status),
      );
      if (firstPendingIndex !== -1) {
        setCurrentStop(firstPendingIndex + 1);
      }
    }
  }, [routeStops, currentStop]);

  // --- 💓 Heartbeat & App State Logic (Offline Handling) 💓 ---
  useEffect(() => {
    let heartbeatTimer;

    const performStatusUpdate = async (type) => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const endpoint =
          type === "offline"
            ? `${API_URL}/staff/set-offline`
            : `${API_URL}/staff/ping-vehicle`;

        await axios.post(
          endpoint,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        console.log(`📡 Status Update: ${type}`);
      } catch (err) {
        console.log("Heartbeat failed/ignored");
      }
    };

    performStatusUpdate("online");

    heartbeatTimer = setInterval(() => {
      performStatusUpdate("online");
    }, 60000);

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        performStatusUpdate("offline");
      } else if (nextAppState === "active") {
        performStatusUpdate("online");
      }
    });

    // Cleanup
    return () => {
      clearInterval(heartbeatTimer);
      subscription.remove();
      performStatusUpdate("offline");
    };
  }, []);

  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function getBearing(lat1, lon1, lat2, lon2) {
    const y =
      Math.sin(((lon2 - lon1) * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180);
    const x =
      Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
      Math.sin((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.cos(((lon2 - lon1) * Math.PI) / 180);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }

  let distance = 0;
  let bearing = 0;
  if (driverLocation && targetStop && targetStop.coordinates) {
    distance = getDistance(
      driverLocation[0],
      driverLocation[1],
      targetStop.coordinates[0],
      targetStop.coordinates[1],
    );
    bearing = getBearing(
      driverLocation[0],
      driverLocation[1],
      targetStop.coordinates[0],
      targetStop.coordinates[1],
    );
  }

  const fetchShortestRoute = async (start, end) => {
    if (!start || !end || !ORS_API_KEY) {
      console.log("❌ Missing Location or API Key");
      return;
    }

    try {
      const res = await axios.post(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        {
          coordinates: [
            [Number(start[1]), Number(start[0])],
            [Number(end[1]), Number(end[0])],
          ],
        },
        {
          headers: {
            Authorization: ORS_API_KEY,
            "Content-Type": "application/json",
          },
        },
      );

      if (res.data.features && res.data.features.length > 0) {
        const coords = res.data.features[0].geometry.coordinates.map((c) => ({
          latitude: c[1],
          longitude: c[0],
        }));
        setRouteLine(coords);

        const segments = res.data.features[0].properties.segments;
        if (segments && segments.length > 0) {
          const steps = segments[0].steps;
          setRouteInstructions(steps);
          if (steps.length > 1) setNextTurn(steps[1]);
          else setNextTurn(steps[0]);
        }
      }
    } catch (err) {
      console.error("ORS Error:", err);
      setRouteLine([
        { latitude: start[0], longitude: start[1] },
        { latitude: end[0], longitude: end[1] },
      ]);
    }
  };

  const handleAcceptJob = () => {
    setNewJobAlert(null);
    if (newJobAlert?.newStop?.coordinates) {
      const [lat, lng] = newJobAlert.newStop.coordinates;
      if (driverLocation) fetchShortestRoute(driverLocation, [lat, lng]);
      Alert.alert("Task Accepted", "Route updated to new location.");
      if (!showMap) setShowMap(true);
    }
  };

  // --- 🔥 FIX: Image Quality & Size ---
  const pickImage = async () => {
    if (!driverLocation || !targetStop) {
      Alert.alert("Wait", "📍 Waiting for GPS location");
      return;
    }

    const dist = getDistance(
      driverLocation[0],
      driverLocation[1],
      targetStop.coordinates[0],
      targetStop.coordinates[1],
    );

    if (dist > 70) {
      Alert.alert(
        "❌ You are too far",
        `You are ${(dist / 1000).toFixed(2)} km away.\nMove within 70 meters to upload photo.`,
      );
      return;
    }

    if (showCompletionUI) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Sorry, we need camera permissions to make this work!");
      return;
    }

    // 1. Launch Camera with Reduced Quality
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, // Editing on karne se aspect ratio fix rehta hai
      aspect: [9, 16],
      quality: 0.8, // 🔥 Quality 0.8 (80%) taaki size kam ho (Important)
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setAfterImage(asset.uri);
      let localUri = asset.uri;
      let filename = localUri.split("/").pop();
      let match = /\.(\w+)$/.exec(filename);
      let type = match ? `image/${match[1]}` : `image/jpeg`;

      const fileObj = { uri: localUri, name: filename, type };
      setFileToUpload(fileObj);
      verifyImage(fileObj);
    }
  };

  // --- 🔥 FIX: Upload Logic & Timeout ---
  const verifyImage = async (fileObj) => {
    if (!currentStopData) return;
    setVerifying(true);
    setIsCleanVerified(false);
    setSubmissionStatus("clean");

    try {
      const token = await AsyncStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", {
        uri: fileObj.uri,
        name: fileObj.name || "upload.jpg",
        type: fileObj.type || "image/jpeg",
      });
      formData.append("dustbinId", currentStopData.id);

      // 2. Increase Timeout to 30 Seconds
      const res = await axios.post(`${API_URL}/api/predict`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000, // 🔥 30s timeout
      });

      const { status, confidence } = res.data;
      console.log(
        `AI Prediction Result: ${status} with confidence ${confidence}%`,
      );

      const upperStatus = status.toUpperCase();

      if (upperStatus !== "EMPTY") {
        Alert.alert(
          "⚠️ AI Detection Alert",
          `Bin Status: ${status} (${confidence}%)\n\nAre you sure you want to submit?`,
          [
            {
              text: "Retake Photo",
              style: "cancel",
              onPress: () => {
                setAfterImage(null);
                setFileToUpload(null);
                setIsCleanVerified(false);
              },
            },
            {
              text: "Yes, Submit",
              onPress: () => {
                setIsCleanVerified(true);
                setSubmissionStatus("suspecies");
              },
            },
          ],
        );
      } else {
        setIsCleanVerified(true);
        setSubmissionStatus("clean");
      }
    } catch (err) {
      console.error("AI Error:", err.message);

      // 3. Better Error Handling
      let errorMsg = "Server not responding. Verify manually as Clean?";
      if (err.message.includes("timeout")) {
        errorMsg = "Request timed out (Slow Internet). Verify manually?";
      } else if (err.response && err.response.status === 413) {
        errorMsg = "Image too large. Verify manually?";
      }

      Alert.alert("AI Server Error", errorMsg, [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: () => {
            setIsCleanVerified(true);
            setSubmissionStatus("clean");
          },
        },
      ]);
    } finally {
      setVerifying(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!afterImage) return Alert.alert("Error", "Photo required!");
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", {
        uri: fileToUpload.uri,
        name: fileToUpload.name,
        type: fileToUpload.type,
      });
      formData.append("dustbinId", currentStopData.id);
      if (currentStopData.complaintId)
        formData.append("complaintId", currentStopData.complaintId);
      formData.append("status", submissionStatus);
      formData.append("latitude", String(driverLocation[0]));
      formData.append("longitude", String(driverLocation[1]));

      const res = await axios.post(`${API_URL}/dustbin/mark-clean`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000,
      });

      if (res.data.success) {
        setRouteStops((prev) =>
          prev.map((s) =>
            s.id === currentStopData.id
              ? {
                  ...s,
                  status: submissionStatus,
                  completedAt: new Date().toISOString(),
                  isEmergency: false,
                  isNew: false,
                }
              : s,
          ),
        );
        setRouteLine([]);
        setTodayCompleted((prev) => prev + 1);
        if (currentStop < totalStops) setCurrentStop((prev) => prev + 1);
        Alert.alert("Success", "🎉 Task Completed!");
        setAfterImage(null);
        setFileToUpload(null);
        setIsCleanVerified(false);
      }
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Failed to save data. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const skipStop = async () => {
    Alert.alert("Skip Stop", "Mark this stop as SKIPPED?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Skip",
        onPress: async () => {
          setIsSubmitting(true);
          try {
            const token = await AsyncStorage.getItem("token");
            const res = await axios.put(
              `${API_URL}/dustbin/driver-update-status/${currentStopData.id}`,
              { status: "skiped" },
              { headers: { Authorization: `Bearer ${token}` } },
            );
            if (res.data.success) {
              setRouteStops((prev) =>
                prev.map((s) =>
                  s.id === currentStopData.id
                    ? {
                        ...s,
                        status: "skiped",
                        completedAt: new Date().toISOString(),
                      }
                    : s,
                ),
              );
              setTodayCompleted((prev) => prev + 1);
              if (currentStop < totalStops) setCurrentStop((prev) => prev + 1);
              Alert.alert("Skipped", "⚠️ Stop Skipped.");
            }
          } catch (err) {
            Alert.alert("Error", "Failed to skip.");
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.post(`${API_URL}/staff/logout`, { staffId: staff._id });
            await AsyncStorage.multiRemove(["token", "user", "role", "userId"]);
            Alert.alert("Success", "Logged out successfully");

            if (goBack) {
              goBack();
            } else {
              console.warn("goBack prop not passed");
            }
          } catch (error) {
            console.error("Logout Error", error);
            Alert.alert("Error", "Logout failed, please check your internet.");
          }
        },
      },
    ]);
  };

  const handleFindNearest = () => {
    // 1. GPS Check
    if (!driverLocation) return Alert.alert("Wait", "📍 Waiting for GPS...");

    // 2. Filter Pending Bins
    const pendingBins = routeStops
      .map((stop, index) => ({ ...stop, originalIndex: index + 1 }))
      .filter(
        (stop) =>
          !["clean", "skiped", "suspecies", "resolved"].includes(stop.status),
      );

    if (pendingBins.length === 0)
      return Alert.alert("Done", "🎉 All bins completed!");

    // 3. Sort by Distance
    const sorted = pendingBins.sort((a, b) => {
      const distA = getDistance(
        driverLocation[0],
        driverLocation[1],
        a.coordinates[0],
        a.coordinates[1],
      );
      const distB = getDistance(
        driverLocation[0],
        driverLocation[1],
        b.coordinates[0],
        b.coordinates[1],
      );
      return distA - distB;
    });

    const nearestBin = sorted[0];

    // 4. Calculate exact distance for display
    const distMeters = getDistance(
      driverLocation[0],
      driverLocation[1],
      nearestBin.coordinates[0],
      nearestBin.coordinates[1],
    );

    // 5. Alert with Distance Info
    Alert.alert(
      "Nearest Bin Found",
      `Found: "${nearestBin.name}"\n📏 Distance: ${distMeters.toFixed(0)} meters\n\nGo there now?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Go",
          onPress: () => {
            setCurrentStop(nearestBin.originalIndex);
            if (!showMap) setShowMap(true);
          },
        },
      ],
    );
  };

  const mapCenter =
    driverLocation && driverLocation.length >= 2
      ? [driverLocation[0], driverLocation[1]]
      : [0, 0];

  return (
    <SafeAreaView style={tw`flex-1 bg-blue-50`}>
      <StatusBar barStyle="dark-content" />
      {/* HEADER */}
      <View
        style={[
          tw`bg-white shadow-sm z-10 p-4 border-b border-gray-200`,
          { paddingTop: 35 },
        ]}
      >
        <View style={tw`flex-row justify-between items-center mb-4`}>
          <View style={tw`flex-row items-center gap-3`}>
            <View
              style={tw`w-12 h-12 bg-white rounded-xl items-center justify-center shadow-sm p-1 border border-gray-100`}
            >
              <Image
                source={require("../../assets/logoapp.png")}
                style={{ width: "100%", height: "100%", borderRadius: 8 }}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={tw`text-lg font-bold text-gray-800`}>
                Safaimitra
              </Text>
              <Text style={tw`text-xs text-gray-600`}>
                {staff ? staff.assignedVehicleId?.vehicleNumber : "No Vehicle"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            style={tw`px-4 py-2 bg-red-500 rounded-lg`}
          >
            <Text style={tw`text-white font-bold`}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={tw`flex-row justify-between gap-2`}>
          <View style={tw`flex-1 bg-green-500 rounded-xl p-2 items-center`}>
            <Text style={tw`text-xl font-bold text-white`}>
              {todayCompleted}
            </Text>
            <Text style={tw`text-xs text-white`}>Done</Text>
          </View>
          <View style={tw`flex-1 bg-blue-500 rounded-xl p-2 items-center`}>
            <Text style={tw`text-xl font-bold text-white`}>{currentStop}</Text>
            <Text style={tw`text-xs text-white`}>Current</Text>
          </View>
          <View style={tw`flex-1 bg-orange-500 rounded-xl p-2 items-center`}>
            <Text style={tw`text-xl font-bold text-white`}>
              {totalStops > 0 ? totalStops - todayCompleted : 0}
            </Text>
            <Text style={tw`text-xs text-white`}>Left</Text>
          </View>
        </View>
      </View>

      <View style={tw`flex-1`}>
        <ScrollView
          contentContainerStyle={tw`pb-32 p-4`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2563eb"]}
            />
          }
        >
          {/* PROGRESS BAR */}
          <View style={tw`bg-white rounded-2xl p-5 shadow-sm mb-5`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <View>
                <Text style={tw`text-sm text-gray-600 font-medium`}>
                  Progress
                </Text>
                <Text style={tw`text-2xl font-bold text-blue-600`}>
                  {todayCompleted} / {totalStops}
                </Text>
              </View>
              <View
                style={tw`w-14 h-14 bg-blue-100 rounded-full items-center justify-center`}
              >
                <Text style={tw`text-lg font-bold text-blue-600`}>
                  {totalStops > 0
                    ? Math.round((todayCompleted / totalStops) * 100)
                    : 0}
                  %
                </Text>
              </View>
            </View>
            <View style={tw`bg-gray-200 rounded-full h-3 overflow-hidden`}>
              <View
                style={[
                  tw`bg-green-500 h-full`,
                  {
                    width: `${totalStops > 0 ? (todayCompleted / totalStops) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* TOGGLE BUTTONS */}
          <View style={tw`flex-row gap-3 mb-5`}>
            <TouchableOpacity
              onPress={() => setShowMap(!showMap)}
              style={tw`flex-1 py-3 bg-white rounded-xl border border-gray-200 items-center flex-row justify-center gap-2`}
            >
              <Text>{showMap ? "📋" : "🗺️"}</Text>
              <Text style={tw`font-bold text-gray-700`}>
                {showMap ? "Show List" : "Show Map"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleFindNearest}
              style={tw`flex-1 py-3 bg-blue-600 rounded-xl items-center flex-row justify-center gap-2`}
            >
              <Text>📍</Text>
              <Text style={tw`font-bold text-white`}>Nearest</Text>
            </TouchableOpacity>
          </View>

          {/* MAP VIEW */}
          {showMap && (
            <View
              style={tw`bg-white rounded-2xl p-2 shadow-sm mb-5 overflow-hidden`}
            >
              <View style={tw`flex-row justify-between items-center mb-2 px-2`}>
                <Text style={tw`text-lg font-bold text-gray-800`}>
                  🗺️ Route Map
                </Text>
                <TouchableOpacity
                  onPress={() => setIsMapFullScreen(true)}
                  style={tw`bg-blue-100 px-3 py-1.5 rounded-lg flex-row items-center gap-1`}
                >
                  <Text style={tw`text-base`}>⛶</Text>
                  <Text style={tw`text-blue-700 font-bold text-xs`}>
                    Full Screen
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={tw`h-80 rounded-xl overflow-hidden bg-gray-100`}>
                {renderMapContent()}
              </View>

              <View
                style={tw`mt-3 flex-row flex-wrap items-center justify-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100`}
              >
                <View style={tw`flex-row items-center gap-1.5`}>
                  <View style={tw`w-3 h-3 rounded-full bg-black`} />
                  <Text
                    style={tw`text-[11px] font-bold text-gray-600 uppercase`}
                  >
                    Ideal
                  </Text>
                </View>
                <View style={tw`flex-row items-center gap-1.5`}>
                  <View style={tw`w-3 h-3 rounded-full bg-emerald-500`} />
                  <Text
                    style={tw`text-[11px] font-bold text-gray-600 uppercase`}
                  >
                    Clean
                  </Text>
                </View>
                <View style={tw`flex-row items-center gap-1.5`}>
                  <View style={tw`w-3 h-3 rounded-full bg-amber-500`} />
                  <Text
                    style={tw`text-[11px] font-bold text-gray-600 uppercase`}
                  >
                    Overflow
                  </Text>
                </View>
                <View style={tw`flex-row items-center gap-1.5`}>
                  <View style={tw`w-3 h-3 rounded-full bg-amber-600`} />
                  <Text
                    style={tw`text-[11px] font-bold text-gray-600 uppercase`}
                  >
                    Suspicious
                  </Text>
                </View>
                <View style={tw`flex-row items-center gap-1.5`}>
                  <View style={tw`w-3 h-3 rounded-full bg-red-500`} />
                  <Text
                    style={tw`text-[11px] font-bold text-gray-600 uppercase`}
                  >
                    Skipped
                  </Text>
                </View>
              </View>

              {driverLocation && targetStop && !showCompletionUI && (
                <View
                  style={tw`mt-3 p-3 bg-white border border-gray-200 rounded-xl flex-row justify-between items-center`}
                >
                  <View>
                    <Text style={tw`text-xs text-gray-500 font-bold uppercase`}>
                      Going To
                    </Text>
                    <Text style={tw`text-sm font-bold text-gray-800`}>
                      {targetStop.name}
                    </Text>
                  </View>
                  <Text
                    style={[
                      tw`text-4xl text-blue-600`,
                      { transform: [{ rotate: `${bearing}deg` }] },
                    ]}
                  >
                    ➤
                  </Text>
                  <View style={tw`items-end`}>
                    <Text style={tw`text-xs text-gray-500 font-bold uppercase`}>
                      Dist.
                    </Text>
                    <Text style={tw`text-lg font-bold text-blue-600`}>
                      {(distance / 1000).toFixed(2)} km
                    </Text>
                  </View>
                </View>
              )}

              {showCompletionUI && (
                <View
                  style={tw`bg-green-50 rounded-xl p-3 shadow mt-3 items-center border border-green-200`}
                >
                  <Text style={tw`text-green-700 font-bold`}>
                    🎉 Route Completed Successfully!
                  </Text>
                </View>
              )}

              <Modal
                visible={isMapFullScreen}
                animationType="slide"
                onRequestClose={() => setIsMapFullScreen(false)}
              >
                <View style={tw`flex-1 bg-white relative`}>
                  <View style={tw`flex-1`}>{renderMapContent()}</View>

                  <SafeAreaView style={tw`absolute top-0 right-0 left-0`}>
                    <View style={tw`items-start p-4`}>
                      <TouchableOpacity
                        onPress={() => setIsMapFullScreen(false)}
                        style={tw`bg-red-500 px-4 py-2 rounded-full shadow-lg border-2 border-white`}
                      >
                        <Text style={tw`text-white font-bold`}>
                          ✕ Close Map
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </SafeAreaView>

                  {driverLocation && targetStop && (
                    <View style={tw`absolute bottom-0 left-0 right-0 p-4`}>
                      {isNavigating && nextTurn && (
                        <View
                          style={tw`bg-green-600 rounded-2xl p-4 shadow-xl mb-3 flex-row items-center`}
                        >
                          <View
                            style={tw`bg-white/20 w-12 h-12 rounded-full items-center justify-center mr-4`}
                          >
                            <Text style={{ fontSize: 24 }}>
                              {getDirectionIcon(nextTurn.type)}
                            </Text>
                          </View>
                          <View style={tw`flex-1`}>
                            <Text
                              style={tw`text-white font-bold text-lg uppercase`}
                            >
                              {nextTurn.instruction || "Follow Route"}
                            </Text>
                            <Text style={tw`text-white/80 text-sm`}>
                              In{" "}
                              {nextTurn.distance > 1000
                                ? (nextTurn.distance / 1000).toFixed(1) + " km"
                                : Math.round(nextTurn.distance) + " m"}
                            </Text>
                          </View>
                        </View>
                      )}

                      <View
                        style={tw`bg-white border border-gray-200 rounded-xl p-4 shadow-lg`}
                      >
                        <View
                          style={tw`flex-row justify-between items-center mb-4`}
                        >
                          <View>
                            <Text
                              style={tw`text-xs text-gray-500 font-bold uppercase`}
                            >
                              TARGET
                            </Text>
                            <Text style={tw`text-lg font-bold text-gray-900`}>
                              {targetStop.name}
                            </Text>
                          </View>
                          <View style={tw`items-end`}>
                            <Text
                              style={tw`text-xs text-gray-500 font-bold uppercase`}
                            >
                              REMAINING
                            </Text>
                            <Text style={tw`text-xl font-bold text-blue-600`}>
                              {(distance / 1000).toFixed(2)} km
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          onPress={() => setIsNavigating(!isNavigating)}
                          style={[
                            tw`w-full py-4 rounded-xl flex-row justify-center items-center`,
                            isNavigating ? tw`bg-red-500` : tw`bg-blue-600`,
                          ]}
                        >
                          <Text style={{ fontSize: 20, marginRight: 8 }}>
                            {isNavigating ? "🛑" : "🚀"}
                          </Text>
                          <Text
                            style={tw`text-white font-bold text-lg uppercase tracking-wider`}
                          >
                            {isNavigating ? "Stop Navigation" : "Start Route"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </Modal>
            </View>
          )}

          {/* LIST VIEW */}
          {!showMap && (
            <View style={tw`bg-white rounded-2xl p-5 shadow-sm mb-5`}>
              {routeStops.map((stop, index) => {
                const isCurrent = index + 1 === currentStop;
                const isCompleted = ["clean", "skiped", "suspecies"].includes(
                  stop.status,
                );
                return (
                  <TouchableOpacity
                    key={stop.id}
                    onPress={() => {
                      if (!isCompleted) setCurrentStop(index + 1);
                    }}
                    style={tw`flex-row items-center gap-3 p-4 rounded-xl mb-2 ${isCompleted ? "bg-green-50 border border-green-200" : isCurrent ? "bg-blue-50 border-2 border-blue-500" : "bg-gray-50"}`}
                  >
                    <Text style={tw`font-bold text-gray-500`}>
                      #{index + 1}
                    </Text>
                    <View style={tw`flex-1`}>
                      <Text style={tw`font-bold text-gray-800`}>
                        {stop.name}
                      </Text>
                      <Text style={tw`text-xs text-gray-500`}>
                        {isCompleted ? "✅ Completed" : "⏳ Pending"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* UPLOAD CARD */}
          <View style={tw`bg-white rounded-2xl overflow-hidden shadow-sm`}>
            <View
              style={tw`p-5 ${showCompletionUI ? "bg-gray-500" : "bg-blue-600"} flex-row items-center gap-3`}
            >
              <View
                style={tw`w-12 h-12 bg-white rounded-xl items-center justify-center`}
              >
                <Text
                  style={[
                    tw`text-xl font-bold`,
                    { color: showCompletionUI ? "#16a34a" : "#2563eb" },
                  ]}
                >
                  {showCompletionUI ? "✓" : currentStop}
                </Text>
              </View>
              <View>
                <Text style={tw`text-white font-bold uppercase`}>
                  {showCompletionUI ? "Status" : "Next Stop"}
                </Text>
                <Text style={tw`text-gray-100`}>
                  {showCompletionUI
                    ? "All Tasks Done"
                    : targetStop?.name || "Select a Stop"}
                </Text>
              </View>
            </View>

            <View style={tw`p-5`}>
              <Text style={tw`text-base font-bold text-gray-800 mb-3`}>
                {showCompletionUI
                  ? "🎉 Duty Over"
                  : "📸 Upload Proof (After Cleaning)"}
              </Text>
              <TouchableOpacity
                onPress={pickImage}
                disabled={showCompletionUI}
                style={tw`w-full h-56 rounded-xl border-2 border-dashed border-gray-300 items-center justify-center bg-gray-50 overflow-hidden`}
              >
                {afterImage ? (
                  <Image
                    source={{ uri: afterImage }}
                    style={tw`w-full h-full`}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={tw`items-center`}>
                    <View
                      style={tw`w-16 h-16 bg-blue-500 rounded-full items-center justify-center mb-3`}
                    >
                      <Text style={{ fontSize: 30 }}>📸</Text>
                    </View>
                    <Text style={tw`text-gray-500`}>Tap to take photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* --- REVIEW & SUBMIT CARD (AI STATUS) --- */}
          {!showCompletionUI && (
            <View
              style={tw`bg-white rounded-3xl shadow-lg overflow-hidden mt-6 mx-1 border border-gray-100`}
            >
              <View style={tw`bg-green-600 p-5 flex-row items-center gap-3`}>
                <View
                  style={tw`w-10 h-10 bg-white rounded-full items-center justify-center shadow-md`}
                >
                  <Text style={tw`text-lg font-bold text-gray-800`}>AI</Text>
                </View>
                <View>
                  <Text style={tw`text-lg font-bold text-white`}>
                    Review & Submit
                  </Text>
                  <Text style={tw`text-sm text-white/90`}>
                    AI Verification Status
                  </Text>
                </View>
              </View>

              <View style={tw`p-6`}>
                {verifying && (
                  <View style={tw`flex-col items-center justify-center p-4`}>
                    <ActivityIndicator
                      size="small"
                      color="#2563eb"
                      style={tw`mb-2`}
                    />
                    <Text style={tw`text-sm font-bold text-blue-600`}>
                      🤖 AI is analyzing photo...
                    </Text>
                  </View>
                )}

                {/* 2. AI Result Section (Updated for Clean/Suspicious Logic) */}
                {!verifying && isCleanVerified && submissionStatus && (
                  <View
                    style={[
                      tw`mb-4 p-4 rounded-xl border-l-4`,
                      submissionStatus === "clean"
                        ? tw`bg-green-50 border-green-500`
                        : tw`bg-orange-50 border-orange-500`, // Orange for Suspicious
                    ]}
                  >
                    <Text
                      style={tw`text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1`}
                    >
                      AI Detection Result
                    </Text>

                    <View style={tw`flex-row items-center`}>
                      <Text
                        style={[
                          tw`text-lg font-black`,
                          submissionStatus === "clean"
                            ? tw`text-green-700`
                            : tw`text-orange-700`,
                        ]}
                      >
                        {submissionStatus === "clean"
                          ? "✅ Bin Looks Clean"
                          : "⚠️ Suspicious / Issue Detected"}
                      </Text>
                    </View>

                    <Text
                      style={tw`text-[11px] text-gray-500 mt-1 font-medium`}
                    >
                      {submissionStatus === "clean"
                        ? "Verification successful. Bin is empty."
                        : "AI detected garbage/issue. Marked as 'Suspicious' for review."}
                    </Text>
                  </View>
                )}

                <View
                  style={[
                    tw`flex-row items-center gap-4 p-4 rounded-2xl`,
                    isSubmitting
                      ? tw`bg-green-100`
                      : afterImage
                        ? tw`bg-blue-100`
                        : tw`bg-gray-100`,
                  ]}
                >
                  <View
                    style={[
                      tw`w-12 h-12 rounded-xl items-center justify-center shadow-md`,
                      isSubmitting
                        ? tw`bg-green-500`
                        : afterImage
                          ? tw`bg-blue-500`
                          : tw`bg-gray-400`,
                    ]}
                  >
                    <Text style={tw`text-2xl`}>
                      {isSubmitting ? "✅" : afterImage ? "👍" : "⏳"}
                    </Text>
                  </View>

                  <View style={tw`flex-1`}>
                    <Text style={tw`text-xs font-semibold text-gray-600 mb-1`}>
                      Current Status
                    </Text>
                    <Text
                      style={[
                        tw`text-base font-bold`,
                        isSubmitting
                          ? tw`text-green-600`
                          : afterImage
                            ? tw`text-blue-600`
                            : tw`text-gray-600`,
                      ]}
                    >
                      {isSubmitting
                        ? "Submitting..."
                        : afterImage
                          ? "Ready to Submit"
                          : "Waiting for Photo"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      <View style={tw`bg-white border-t border-gray-200 p-4 flex-row gap-3`}>
        <TouchableOpacity
          onPress={pickImage}
          disabled={showCompletionUI}
          style={tw`flex-1 py-4 border-2 border-red-300 bg-red-50 rounded-xl items-center`}
        >
          <Text style={tw`font-bold text-red-600`}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleMarkComplete}
          disabled={
            !afterImage ||
            !isCleanVerified ||
            verifying ||
            isSubmitting ||
            showCompletionUI
          }
          style={tw`flex-1 py-4 bg-green-600 rounded-xl items-center ${!afterImage || isSubmitting ? "opacity-50" : "opacity-100"}`}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={tw`font-bold text-white`}>Complete</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={isSubmitting || verifying}
        transparent
        animationType="fade"
      >
        <View style={tw`flex-1 bg-black/70 justify-center items-center px-6`}>
          <View
            style={tw`bg-white p-8 rounded-3xl shadow-2xl items-center w-full max-w-[280px]`}
          >
            <View style={tw`mb-5`}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>

            <Text style={tw`text-xl font-bold text-gray-800 text-center mb-1`}>
              {verifying ? "🤖 AI Verifying" : "☁️ Uploading"}
            </Text>

            <Text style={tw`text-gray-500 text-sm text-center`}>
              Please wait a moment...
            </Text>
          </View>
        </View>
      </Modal>

      <Modal visible={!!newJobAlert} transparent animationType="slide">
        <View style={tw`flex-1 bg-black/80 justify-center items-center p-4`}>
          <View
            style={tw`bg-white rounded-3xl p-6 w-full max-w-sm border-4 border-red-500 items-center`}
          >
            <View
              style={tw`w-20 h-20 bg-red-100 rounded-full items-center justify-center mb-4`}
            >
              <Text style={{ fontSize: 40 }}>⚠️</Text>
            </View>
            <Text style={tw`text-2xl font-black text-gray-900 mb-2`}>
              {newJobAlert?.title}
            </Text>
            <Text style={tw`text-gray-600 mb-4 text-center`}>
              {newJobAlert?.message}
            </Text>
            {newJobAlert?.imageUrl && (
              <Image
                source={{ uri: newJobAlert.imageUrl }}
                style={tw`w-full h-40 rounded-xl mb-4`}
                resizeMode="cover"
              />
            )}
            <TouchableOpacity
              onPress={handleAcceptJob}
              style={tw`w-full py-4 bg-red-600 rounded-xl items-center shadow-lg`}
            >
              <Text style={tw`text-white font-bold text-lg`}>
                ACCEPT TASK 🚛
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
