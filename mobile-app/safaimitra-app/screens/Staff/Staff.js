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
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { io } from "socket.io-client";
import tw from "twrnc"; // Tailwind for React Native

// ⚠️ IMPORTANT: Replace 'localhost' with your computer's local IP (e.g., 192.168.1.5)
// because an Emulator/Phone cannot see 'localhost'.
const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const ORS_API_KEY = process.env.EXPO_PUBLIC_ORS_API_KEY;

export default function VehiclePage() {
  // --- STATE ---
  const mapRef = useRef(null);
  const [currentStop, setCurrentStop] = useState(1);
  const [afterImage, setAfterImage] = useState(null); // Stores URI
  const [todayCompleted, setTodayCompleted] = useState(0);
  const [showMap, setShowMap] = useState(true);

  const [staff, setStaff] = useState(null);
  const [routeStops, setRouteStops] = useState([]);
  const [routeLine, setRouteLine] = useState([]); // Array of coordinates
  const [driverLocation, setDriverLocation] = useState(null);

  const [isCleanVerified, setIsCleanVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null); // Stores {uri, type, name}
  const [submissionStatus, setSubmissionStatus] = useState("clean");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newJobAlert, setNewJobAlert] = useState(null);
  const [socket, setSocket] = useState(null);

  // Derived Values
  const totalStops = routeStops.length;
  const currentStopData = routeStops[currentStop - 1];

  const targetStop = routeStops.find(
    (stop, index) =>
      index >= currentStop - 1 &&
      !["clean", "skiped", "suspecies", "resolved"].includes(stop.status),
  );

  const isRouteCountComplete = totalStops > 0 && todayCompleted >= totalStops;
  const showCompletionUI = isRouteCountComplete && !targetStop;

  // --- 🔥 SOCKET.IO LOGIC 🔥 ---
  useEffect(() => {
    let newSocket = null;

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

          // 2. Connect
          newSocket = io(API_URL, {
            transports: ["websocket"], // React Native prefers websocket
            reconnectionAttempts: 5,
          });
          setSocket(newSocket);

          newSocket.on("connect", () => {
            console.log("✅ Socket Connected");
            newSocket.emit("join_room", `driver_${userId}`);
          });

          // 4. Listen for Emergency Jobs
          newSocket.on("new_job_alert", async (data) => {
            console.log("🚨 ALERT RECEIVED:", data);

            // Play Sound
            try {
              const { sound } = await Audio.Sound.createAsync({
                uri: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
              });
              await sound.playAsync();
            } catch (e) {
              console.log("Audio failed");
            }

            setNewJobAlert(data);

            setRouteStops((prevStops) => {
              const incomingId = data.newStop.id;
              const existingIndex = prevStops.findIndex(
                (stop) => stop.id === incomingId,
              );

              if (existingIndex !== -1) {
                const updatedStops = [...prevStops];
                updatedStops[existingIndex] = {
                  ...updatedStops[existingIndex],
                  status: "overflow",
                  type: "complaint",
                  complaintId: data.newStop.complaintId,
                  isEmergency: true,
                  isNew: true,
                };
                return updatedStops;
              } else {
                return [
                  ...prevStops,
                  {
                    ...data.newStop,
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

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, []);

  // --- GEOLOCATION (Expo Location) ---
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

          // Animate Map
          if (mapRef.current && showMap) {
            // Optional: Auto follow driver logic can go here
          }

          const token = await AsyncStorage.getItem("token");
          if (token) {
            try {
              await axios.post(
                `${API_URL}/staff/update-vehicle-location`,
                { latitude: lat, longitude: lng },
                { headers: { Authorization: `Bearer ${token}` } },
              );
            } catch (err) {
              console.error("Loc update err");
            }
          }
        },
      );
    })();
  }, []);

  // --- OFFLINE / HEARTBEAT ---
  useEffect(() => {
    const startHeartbeat = async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const heartbeatInterval = setInterval(async () => {
        try {
          await axios.post(
            `${API_URL}/staff/ping-vehicle`,
            {},
            { headers: { Authorization: `Bearer ${token}` } },
          );
        } catch (err) {
          console.error("Heartbeat failed");
        }
      }, 60000);

      return () => clearInterval(heartbeatInterval);
    };
    startHeartbeat();
  }, []);

  // --- UTILS: Distance & Bearing ---
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

  // --- ROUTE LINE (ORS) ---
  const fetchShortestRoute = async (start, end) => {
    if (!start || !end || !ORS_API_KEY) return;
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

      // Convert [lon, lat] to {latitude, longitude} for React Native Maps
      const coords = res.data.features[0].geometry.coordinates.map((c) => ({
        latitude: c[1],
        longitude: c[0],
      }));
      setRouteLine(coords);

      // Auto-fit map to route
      if (mapRef.current) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    } catch (err) {
      console.error("ORS Error:", err);
    }
  };

  // --- DATA FETCHING ---
  useEffect(() => {
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
        console.error(err);
      }
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- STAFF PROFILE ---
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

  // --- AUTO ROUTE UPDATE ---
  useEffect(() => {
    if (driverLocation && targetStop && targetStop.coordinates) {
      fetchShortestRoute(driverLocation, targetStop.coordinates);
    } else {
      setRouteLine([]);
    }
  }, [currentStop, driverLocation]); // Removed routeStops to prevent heavy looping

  // --- AUTO DETECT STOP ---
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

  // --- HANDLERS ---
  const handleAcceptJob = () => {
    setNewJobAlert(null);
    if (newJobAlert?.newStop?.coordinates) {
      const [lat, lng] = newJobAlert.newStop.coordinates;
      if (driverLocation) fetchShortestRoute(driverLocation, [lat, lng]);
      Alert.alert("Task Accepted", "Route updated to new location.");
      if (!showMap) setShowMap(true);
    }
  };

  const pickImage = async () => {
    if (showCompletionUI) return;

    // Request permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Sorry, we need camera permissions to make this work!");
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.5,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setAfterImage(asset.uri);

      // Create file object for upload
      let localUri = asset.uri;
      let filename = localUri.split("/").pop();
      let match = /\.(\w+)$/.exec(filename);
      let type = match ? `image/${match[1]}` : `image`;

      setFileToUpload({ uri: localUri, name: filename, type });

      // Auto trigger verification
      verifyImage({ uri: localUri, name: filename, type });
    }
  };

  const verifyImage = async (fileObj) => {
    if (!currentStopData) return;
    setVerifying(true);
    setIsCleanVerified(false);
    setSubmissionStatus("clean");

    try {
      const token = await AsyncStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", fileObj);
      formData.append("dustbinId", currentStopData.id);

      const res = await axios.post(`${API_URL}/api/predict`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const { status, confidence } = res.data;

      if (status !== "empty") {
        Alert.alert(
          "⚠️ AI Alert",
          `Bin looks '${status.toUpperCase()}' (${confidence}%)\n\nAre you sure you want to submit?`,
          [
            {
              text: "Cancel",
              onPress: () => {
                setAfterImage(null);
                setFileToUpload(null);
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
      console.error("AI Error:", err);
      Alert.alert(
        "AI Server Error",
        "Server not responding. Verify manually as Clean?",
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes",
            onPress: () => {
              setIsCleanVerified(true);
              setSubmissionStatus("clean");
            },
          },
        ],
      );
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
      formData.append("image", fileToUpload);
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
      Alert.alert("Error", "Failed to save.");
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
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          await AsyncStorage.clear();
          // Navigation logic usually goes here (e.g. router.replace('/login'))
          Alert.alert("Logged Out");
        },
      },
    ]);
  };

  const handleFindNearest = () => {
    if (!driverLocation) return Alert.alert("Wait", "📍 Waiting for GPS...");
    const pendingBins = routeStops
      .map((stop, index) => ({ ...stop, originalIndex: index + 1 }))
      .filter(
        (stop) =>
          !["clean", "skiped", "suspecies", "resolved"].includes(stop.status),
      );

    if (pendingBins.length === 0)
      return Alert.alert("Done", "🎉 All bins completed!");

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

    Alert.alert("Nearest Bin", `Found: "${sorted[0].name}"\nGo there now?`, [
      { text: "No", style: "cancel" },
      {
        text: "Go",
        onPress: () => {
          setCurrentStop(sorted[0].originalIndex);
          if (!showMap) setShowMap(true);
        },
      },
    ]);
  };

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

  // --- RENDER ---
  return (
    <SafeAreaView style={tw`flex-1 bg-blue-50`}>
      <StatusBar barStyle="dark-content" />
      {/* HEADER */}
      <View style={tw`bg-white shadow-sm z-10 p-4 border-b border-gray-200`}>
        <View style={tw`flex-row justify-between items-center mb-4`}>
          <View style={tw`flex-row items-center gap-3`}>
            <View
              style={tw`w-12 h-12 bg-blue-600 rounded-xl items-center justify-center`}
            >
              <Text style={{ fontSize: 24 }}>🚛</Text>
            </View>
            <View>
              <Text style={tw`text-lg font-bold text-gray-800`}>
                SafaiMitra
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

      <ScrollView contentContainerStyle={tw`pb-32 p-4`}>
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
            <View style={tw`h-80 rounded-xl overflow-hidden bg-gray-100`}>
              <MapView
                ref={mapRef}
                style={tw`w-full h-full`}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: driverLocation ? driverLocation[0] : 23.2599,
                  longitude: driverLocation ? driverLocation[1] : 77.4126,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                showsUserLocation={true}
              >
                {!isRouteCountComplete && routeLine.length > 0 && (
                  <Polyline
                    coordinates={routeLine}
                    strokeColor="#2563eb"
                    strokeWidth={5}
                  />
                )}
                {routeStops.map((stop, index) => (
                  <Marker
                    key={stop.id}
                    coordinate={{
                      latitude: stop.coordinates[0],
                      longitude: stop.coordinates[1],
                    }}
                    onPress={() => {
                      if (stop.status !== "clean") setCurrentStop(index + 1);
                    }}
                  >
                    <View
                      style={[
                        tw`w-8 h-8 rounded-full justify-center items-center border-2 border-white`,
                        { backgroundColor: getMarkerColor(stop.status) },
                      ]}
                    >
                      <Text style={tw`text-white text-xs`}>🗑️</Text>
                    </View>
                  </Marker>
                ))}
              </MapView>
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
                  <Text style={tw`font-bold text-gray-500`}>#{index + 1}</Text>
                  <View style={tw`flex-1`}>
                    <Text style={tw`font-bold text-gray-800`}>{stop.name}</Text>
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
      </ScrollView>

      {/* FOOTER ACTIONS */}
      <View
        style={tw`absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex-row gap-3`}
      >
        <TouchableOpacity
          onPress={skipStop}
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

      {/* LOADING MODAL */}
      <Modal visible={isSubmitting || verifying} transparent>
        <View style={tw`flex-1 bg-black/70 justify-center items-center`}>
          <View style={tw`bg-white p-8 rounded-2xl items-center`}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={tw`text-lg font-bold text-gray-800 mt-4`}>
              {verifying ? "🤖 AI Verifying..." : "☁️ Uploading..."}
            </Text>
          </View>
        </View>
      </Modal>

      {/* NEW JOB ALERT MODAL */}
      <Modal visible={!!newJobAlert} transparent animationType="slide">
        <View style={tw`flex-1 bg-black/80 justify-center items-center p-4`}>
          <View
            style={tw`bg-white rounded-3xl p-6 w-full max-w-sm border-4 border-red-500 items-center`}
          >
            <View
              style={tw`w-20 h-20 bg-red-100 rounded-full items-center justify-center mb-4`}
            >
              <Text style={{ fontSize: 40 }}>🚨</Text>
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
