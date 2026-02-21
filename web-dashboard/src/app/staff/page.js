"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import axios from "axios";
import { io } from "socket.io-client";
import { useMap } from "react-leaflet";

// Import Leaflet CSS
import "leaflet/dist/leaflet.css";

// Dynamically import map components
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        Loading map...
      </div>
    ),
  },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false },
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false },
);
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false },
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});

// Map Helper to animate movement
function MapRecenter({ lat, lng }) {
  const map = useMap();

  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], map.getZoom(), {
        animate: true,
      });
    }
  }, [lat, lng, map]);

  return null;
}

export default function VehiclePage() {
  const router = useRouter();

  // State
  const [currentStop, setCurrentStop] = useState(1);
  const [afterImage, setAfterImage] = useState(null);
  const [todayCompleted, setTodayCompleted] = useState(0);
  const [showMap, setShowMap] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [truckIcon, setTruckIcon] = useState(null);

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
  const [socket, setSocket] = useState(null);

  const ORS_API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY;
  const afterFileRef = useRef(null);

  // Derived values
  const totalStops = routeStops.length;
  // Safely find the next target stop (that is not clean/skipped)
  const targetStop = routeStops.find(
    (stop, index) =>
      index >= currentStop - 1 &&
      !["clean", "skiped", "suspecies", "resolved"].includes(stop.status),
  );

  const currentStopData = routeStops[currentStop - 1];

  // Logic to show "Duty Over"
  const isRouteCountComplete = totalStops > 0 && todayCompleted >= totalStops;
  const showCompletionUI = isRouteCountComplete && !targetStop; // Only show if no target left

  const getBinIcon = (status) => {
    const colors = {
      clean: "#10b981",
      overflow: "#f59e0b",
      skiped: "#ef4444",
      suspecies: "#7f4804",
      ideal: "#000000",
      current: "#3b82f6", // Blue for current target
    };
    return createCustomIcon(colors[status] || "#6b7280", "🗑️");
  };

  const createCustomIcon = (color, content) => {
    if (typeof window === "undefined") return null;
    const L = require("leaflet");
    return L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 18px;
          background-color: ${color};
          display: flex;
          justify-content: center;
          align-items: center;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          color: white;
          font-weight: bold;
          font-size: 16px;
        ">
          ${content}
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    });
  };

  // --- 🔥 SOCKET.IO LOGIC IMPLEMENTED HERE 🔥 ---
  useEffect(() => {
    let newSocket = null;
    const token = localStorage.getItem("token");

    const initializeSocket = async () => {
      try {
        // 1. Get User Data to find Driver ID
        const res = await axios.get("http://localhost:5001/staff/userdata", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success) {
          const userId = res.data.user._id;

          // 2. Connect to Backend
          newSocket = io("http://localhost:5001", {
            transports: ["websocket", "polling"],
            reconnectionAttempts: 5,
          });
          setSocket(newSocket);

          newSocket.on("connect", () => {
            console.log("✅ Socket Connected");
            // 3. Join Driver Specific Room
            newSocket.emit("join_room", `driver_${userId}`);
          });

          // 4. Listen for Emergency Jobs
          newSocket.on("new_job_alert", (data) => {
            // Play Notification Sound
            try {
              const audio = new Audio(
                "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
              );
              audio.play().catch((e) => console.log("Audio play failed"));
            } catch (e) {}

            // Show UI Modal
            setNewJobAlert(data);

            // Update the Route List dynamically
            setRouteStops((prevStops) => {
              const incomingId = data.newStop.id;

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
                  isNew: true,
                };
                return updatedStops;
              } else {
                // Add new Ad-hoc stop to the end of the list
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

    if (token) initializeSocket();

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, []);
  // --- 👆 END SOCKET LOGIC 👆 ---

  const handleAcceptJob = () => {
    setNewJobAlert(null); // Hide Modal

    if (newJobAlert?.newStop?.coordinates) {
      const [lat, lng] = newJobAlert.newStop.coordinates;

      // Calculate Route to new job immediately
      if (driverLocation) {
        fetchShortestRoute(driverLocation, [lat, lng]);
      }

      alert("✅ Task Accepted! Route updated to new location.");

      // Optional: Auto-switch to map view if hidden
      if (!showMap) setShowMap(true);
    }
  };

  // --- Leaflet Setup ---
  useEffect(() => {
    setIsClient(true);
    import("leaflet").then((L) => {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });
      const icon = new L.DivIcon({
        html: `<div style="font-size:32px;">🚛</div>`,
        className: "truck-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      setTruckIcon(icon);
    });
  }, []);

  // --- Geolocation ---
  useEffect(() => {
    if (!navigator.geolocation) return;
    const token = localStorage.getItem("token");
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDriverLocation([lat, lng]);

        // Send live location to admin
        if (token) {
          try {
            await axios.post(
              "http://localhost:5001/staff/update-vehicle-location",
              { latitude: lat, longitude: lng },
              { headers: { Authorization: `Bearer ${token}` } },
            );
          } catch (err) {
            console.error("Location error:", err);
          }
        }
      },
      (err) => console.error("Geo error:", err),
      { enableHighAccuracy: true },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // --- 💓 Heartbeat & Tab Close Logic (Offline Handling) 💓 ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const BASE_URL = "http://localhost:5001";

    const sendHeartbeat = async () => {
      try {
        await axios.post(
          `${BASE_URL}/staff/ping-vehicle`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
        console.log("💓 Heartbeat sent");
      } catch (err) {
        console.error("Heartbeat failed", err);
      }
    };

    const sendOfflineSignal = () => {
      fetch(`${BASE_URL}/staff/set-offline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
        keepalive: true,
      });
    };

    sendHeartbeat();

    const heartbeatInterval = setInterval(sendHeartbeat, 60000);

    const handleBeforeUnload = (e) => {
      sendOfflineSignal();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
      } else {
        sendHeartbeat();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      sendOfflineSignal();
    };
  }, []);

  // --- Distance Utils ---
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

  // --- Fetch Route Line (ORS) ---
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
      setRouteLine(
        res.data.features[0].geometry.coordinates.map((c) => [c[1], c[0]]),
      );
    } catch (err) {
      console.error("ORS Error:", err);
    }
  };

  // --- Data Fetching (Polling + Initial) ---
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await axios.get("http://localhost:5001/staff/dashboard", {
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
            // Intelligent Merge: Keep local "new" flags if not yet synced
            const stopMap = new Map();
            backendStops.forEach((stop) => stopMap.set(stop.id, stop));

            // Preserve emergency alerts that might not be in DB yet (rare edge case)
            prevStops.forEach((localStop) => {
              if (localStop.isNew && !stopMap.has(localStop.id)) {
                stopMap.set(localStop.id, localStop);
              }
            });

            return Array.from(stopMap.values());
          });

          // Calculate completed count
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
    // Keep polling for sync, but Socket handles the alerts
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, []);

  // Staff Profile
  useEffect(() => {
    const fetchStaffProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await axios.get("http://localhost:5001/staff/userdata", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) setStaff(res.data.user);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStaffProfile();
  }, []);

  // --- Auto-Route Update ---
  useEffect(() => {
    if (driverLocation && targetStop && targetStop.coordinates) {
      fetchShortestRoute(driverLocation, targetStop.coordinates);
    } else {
      setRouteLine([]);
    }
  }, [currentStop, driverLocation, routeStops]); // Removed targetStop from dependency to avoid loop

  useEffect(() => {
    if (routeStops.length > 0) {
      const activeStopData = routeStops[currentStop - 1];

      const isCurrentStillPending =
        activeStopData &&
        !["clean", "skiped", "suspecies", "resolved"].includes(
          activeStopData.status,
        );

      if (isCurrentStillPending) {
        return;
      }

      const firstPendingIndex = routeStops.findIndex(
        (stop) =>
          !["clean", "skiped", "suspecies", "resolved"].includes(stop.status),
      );

      if (firstPendingIndex !== -1) {
        setCurrentStop(firstPendingIndex + 1);
      }
    }
  }, [routeStops, currentStop]); // 'currentStop' dependency add ki taaki state sync rahe

  // --- Form Handlers ---
  const handleAfterImage = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentStopData) return;

    setFileToUpload(file);
    const reader = new FileReader();
    reader.onloadend = () => setAfterImage(reader.result);
    reader.readAsDataURL(file);

    setVerifying(true);
    setIsCleanVerified(false);
    // Reset status
    setSubmissionStatus("clean");

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", file);
      formData.append("dustbinId", currentStopData.id);

      formData.append("latitude", driverLocation[0]);
      formData.append("longitude", driverLocation[1]);

      const res = await axios.post(
        "http://localhost:5001/api/predict",
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const { status, confidence } = res.data;
      const upperStatus = status.toUpperCase();

      // --- 🔄 OLD LOGIC RESTORED ---
      if (upperStatus !== "EMPTY") {
        // Agar EMPTY ke alawa kuch bhi hai -> Confirm -> Set "suspecies"
        if (
          confirm(
            `⚠️ AI Alert: Bin looks '${status}' (${confidence}%)\n\nAre you sure you want to submit? This will be marked as Suspicious.`,
          )
        ) {
          setIsCleanVerified(true);
          setSubmissionStatus("suspecies"); // <--- DB will receive "suspecies"
        } else {
          setAfterImage(null);
          setFileToUpload(null);
          setIsCleanVerified(false);
          if (afterFileRef.current) afterFileRef.current.value = "";
        }
      } else {
        // Agar status "EMPTY" hai -> Set "clean"
        setIsCleanVerified(true);
        setSubmissionStatus("clean");
      }
    } catch (err) {
      console.error("AI Error:", err);
      // Fallback
      if (confirm("⚠️ AI Server not responding. Verify manually as Clean?")) {
        setIsCleanVerified(true);
        setSubmissionStatus("clean");
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!afterImage) return alert("❌ Photo required!");
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", fileToUpload);
      formData.append("dustbinId", currentStopData.id);
      if (currentStopData.complaintId)
        formData.append("complaintId", currentStopData.complaintId);
      formData.append("status", submissionStatus);
      formData.append("latitude", driverLocation[0]);
      formData.append("longitude", driverLocation[1]);

      const res = await axios.post(
        "http://localhost:5001/dustbin/mark-clean",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (res.data.success) {
        // Optimistic Update
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

        alert(`🎉 Task Completed!`);
        setAfterImage(null);
        setFileToUpload(null);
        setIsCleanVerified(false);
      }
    } catch (e) {
      alert("❌ Failed to save.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const skipStop = async () => {
    if (!confirm("⚠️ Mark this stop as SKIPPED?")) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `http://localhost:5001/dustbin/driver-update-status/${currentStopData.id}`,
        { status: "skiped" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
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
        alert("⚠️ Stop Skipped.");
      }
    } catch (err) {
      alert("Failed to skip.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to logout?")) return;

    try {
      const user = localStorage.getItem("userId");
      const staffId = user;
      console.log("Logging out staff ID:", staffId);

      await axios.post("http://localhost:5001/staff/logout", {
        staffId,
      });

      localStorage.clear();

      alert("Logged out successfully!");
      router.replace("/"); // User ko login page par bhejna
    } catch (error) {
      console.error("Logout Error:", error);

      localStorage.clear();
      navigate("/login");
    }
  };

  const handleFindNearest = () => {
    if (!driverLocation) return alert("📍 Waiting for GPS...");
    const pendingBins = routeStops
      .map((stop, index) => ({ ...stop, originalIndex: index + 1 }))
      .filter(
        (stop) =>
          !["clean", "skiped", "suspecies", "resolved"].includes(stop.status),
      );

    if (pendingBins.length === 0) return alert("🎉 All bins completed!");

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

    if (confirm(`📍 Nearest Bin: "${sorted[0].name}"\nGo there now?`)) {
      setCurrentStop(sorted[0].originalIndex);
      if (!showMap) setShowMap(true);
    }
  };

  const formatSmartTime = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const mapCenter =
    driverLocation && driverLocation.length >= 2
      ? [driverLocation[0], driverLocation[1]]
      : [23.2599, 77.4126];

  // 200 meter logic
  const tryOpenCamera = () => {
    if (showCompletionUI) return;

    if (!driverLocation || !targetStop?.coordinates) {
      alert("📍 Location not available yet. Please wait...");
      return;
    }

    if (distance > 200) {
      alert(
        `❌ You are too far from the dustbin.\n\n` +
          `Allowed distance: 200 meters\n` +
          `Your distance: ${Math.round(distance)} meters\n\n` +
          `Please move closer to the dustbin to take photo.`,
      );
      return;
    }

    // ✅ Within range → open camera
    afterFileRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-10">
      <header className="bg-white shadow-md sticky top-0 z-30">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🚛</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">
                SafaiMitra Driver
              </h1>
              <p className="text-xs text-gray-600">
                {staff ? staff.assignedVehicleId?.vehicleNumber : "No Vehicle"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
        <div className="px-4 pb-3 grid grid-cols-3 gap-3">
          <div className="bg-green-500 rounded-xl p-3 text-white text-center">
            <p className="text-2xl font-bold">{todayCompleted}</p>
            <p className="text-xs">Completed</p>
          </div>
          <div className="bg-blue-500 rounded-xl p-3 text-white text-center">
            <p className="text-2xl font-bold">{currentStop}</p>
            <p className="text-xs">Current</p>
          </div>
          <div className="bg-orange-500 rounded-xl p-3 text-white text-center">
            <p className="text-2xl font-bold">
              {totalStops > 0 ? totalStops - todayCompleted : 0}
            </p>
            <p className="text-xs">Remaining</p>
          </div>
        </div>
      </header>

      <main className="pb-24 px-4 py-5 space-y-5">
        <div className="bg-white rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm text-gray-600 font-medium mb-1">Progress</p>
              <p className="text-3xl font-bold text-blue-600">
                {todayCompleted} / {totalStops}
              </p>
            </div>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-blue-600">
                {totalStops > 0
                  ? Math.round((todayCompleted / totalStops) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>
          <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-600 h-full transition-all duration-700"
              style={{
                width: `${totalStops > 0 ? (todayCompleted / totalStops) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowMap(!showMap)}
            className="flex-1 py-3 bg-white rounded-xl shadow-md font-semibold text-gray-700 hover:shadow-lg transition-shadow flex items-center justify-center gap-2"
          >
            <span className="text-xl">{showMap ? "📋" : "🗺️"}</span>
            <span>{showMap ? "Show List" : "Show Map"}</span>
          </button>
          <button
            onClick={handleFindNearest}
            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-md font-bold text-white hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span className="text-xl">📍</span>
            <span>Find Nearest</span>
          </button>
        </div>

        {showMap && (
          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-3">
              🗺️ Route Map
            </h2>
            <div className="h-80 rounded-xl overflow-hidden border-2 border-gray-200 relative z-0">
              {isClient && (
                <MapContainer
                  key={mapCenter.join(",")}
                  center={mapCenter}
                  zoom={17}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap"
                  />
                  <MapRecenter lat={mapCenter[0]} lng={mapCenter[1]} />
                  {!isRouteCountComplete && routeLine.length > 0 && (
                    <Polyline
                      positions={routeLine}
                      pathOptions={{
                        color: "#2563eb",
                        weight: 5,
                        opacity: 0.85,
                      }}
                    />
                  )}
                  {routeStops.map((stop, index) => (
                    <Marker
                      key={stop.id}
                      position={stop.coordinates}
                      icon={getBinIcon(stop.status)}
                      eventHandlers={{
                        click: () => {
                          if (stop.status !== "clean")
                            setCurrentStop(index + 1);
                        },
                      }}
                    >
                      <Popup>
                        <div className="text-center min-w-[100px]">
                          <p className="font-bold text-gray-800 mb-2 text-sm">
                            {stop.name}
                          </p>
                          <span
                            className="px-2 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider shadow-sm"
                            style={{
                              backgroundColor:
                                stop.status === "clean" ? "#10b981" : "#f59e0b",
                            }}
                          >
                            {stop.status || "PENDING"}
                          </span>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  {driverLocation && truckIcon && (
                    <Marker position={driverLocation} icon={truckIcon}>
                      <Popup>🚛 You</Popup>
                    </Marker>
                  )}
                </MapContainer>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-6 p-4 bg-gray-50 rounded-lg">
              {/* 1. Ideal - Black */}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-black"></div>
                <span className="text-sm font-medium text-gray-700">Ideal</span>
              </div>

              {/* 2. Clean - Emerald Green */}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
                <span className="text-sm font-medium text-gray-700">Clean</span>
              </div>

              {/* 3. Overflow - Amber */}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                <span className="text-sm font-medium text-gray-700">
                  Overflow
                </span>
              </div>

              {/* 3. Overflow - Amber */}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-600"></div>
                <span className="text-sm font-medium text-gray-700">
                  Suspicious
                </span>
              </div>

              {/* 4. Skipped - Red */}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium text-gray-700">
                  Skipped
                </span>
              </div>
            </div>

            {driverLocation && targetStop && !showCompletionUI && (
              <div className="bg-white rounded-xl p-3 shadow mt-3 text-center border border-gray-200">
                <div className="flex justify-between items-center px-4">
                  <div className="text-left">
                    <p className="text-xs text-gray-500 uppercase font-bold">
                      Going To
                    </p>
                    <p className="text-sm font-bold text-gray-800">
                      {targetStop.name}
                    </p>
                  </div>
                  <div
                    className="text-4xl text-blue-600"
                    style={{ transform: `rotate(${bearing}deg)` }}
                  >
                    ➤
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase font-bold">
                      Distance
                    </p>
                    <p className="text-lg font-bold text-blue-600">
                      {(distance / 1000).toFixed(2)} km
                    </p>
                  </div>
                </div>
              </div>
            )}
            {showCompletionUI && (
              <div className="bg-green-50 rounded-xl p-3 shadow mt-3 text-center border border-green-200">
                <p className="text-green-700 font-bold">
                  🎉 Route Completed Successfully!
                </p>
              </div>
            )}
          </div>
        )}

        {!showMap && (
          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              📍 All Stops
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {routeStops.map((stop, index) => {
                const isCurrent = index + 1 === currentStop;
                const isCompleted = ["clean", "skiped", "suspecies"].includes(
                  stop.status,
                );
                return (
                  <div
                    key={stop.id}
                    onClick={() => {
                      if (!isCompleted) setCurrentStop(index + 1);
                    }}
                    className={`flex items-center gap-3 p-4 rounded-xl transition-all cursor-pointer ${isCompleted ? "bg-green-50 border-green-200" : isCurrent ? "bg-blue-50 border-2 border-blue-500" : "bg-gray-50"}`}
                  >
                    <div className="font-bold text-gray-500">#{index + 1}</div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{stop.name}</p>
                      <p className="text-xs text-gray-500">
                        {isCompleted ? "✅ Completed" : "⏳ Pending"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Card */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
          <div
            className={`p-5 text-white ${showCompletionUI ? "bg-gray-500" : "bg-gradient-to-r from-blue-600 to-indigo-600"}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <span
                  className={`text-xl font-bold ${showCompletionUI ? "text-green-600" : "text-blue-600"}`}
                >
                  {showCompletionUI ? "✓" : currentStop}
                </span>
              </div>
              <div>
                <h2 className="text-white uppercase font-bold">
                  {showCompletionUI ? "Status" : "Next Stop"}
                </h2>
                <p className="text-gray-100">
                  {showCompletionUI
                    ? "All Tasks Done"
                    : targetStop?.name || "Select a Stop"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <label className="block text-base font-bold text-gray-800 mb-3">
                {showCompletionUI
                  ? "🎉 Duty Over"
                  : "📸 Upload Proof (After Cleaning)"}
              </label>
              <div
                onClick={() =>
                  !showCompletionUI && afterFileRef.current?.click()
                }
                // onClick={tryOpenCamera}

                className={`w-full h-56 rounded-xl border-2 border-dashed overflow-hidden flex flex-col items-center justify-center ${showCompletionUI ? "bg-gray-100" : "cursor-pointer hover:border-blue-500 bg-gray-50"}`}
              >
                {afterImage ? (
                  <img
                    src={afterImage}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-3 text-white text-3xl">
                      📸
                    </div>
                    <p>Tap to take photo</p>
                  </>
                )}
              </div>
              <input
                ref={afterFileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleAfterImage}
                className="hidden"
                disabled={showCompletionUI}
              />
            </div>
          </div>
        </div>

        {/* --- REVIEW & SUBMIT CARD (AI STATUS) --- */}
        {!showCompletionUI && (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6 relative z-20 border border-gray-100 transition-all duration-300">
            {/* Header Section */}
            <div className="bg-green-600 p-5 flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                <span className="text-lg font-bold text-gray-800">4</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">
                  Review & Submit
                </h2>
                <p className="text-sm text-white/90">AI Verification Status</p>
              </div>
            </div>

            <div className="p-6">
              {/* 1. Loading State */}
              {verifying && (
                <div className="flex flex-col items-center justify-center p-4">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-sm font-bold text-blue-600">
                    🤖 AI is analyzing photo...
                  </p>
                </div>
              )}

              {/* 2. AI Result Display (Handles 4 Cases) */}
              {/* 2. AI Result Display (Clean vs Suspicious Logic) */}
              {!verifying && isCleanVerified && submissionStatus && (
                <div
                  className={`mb-4 p-4 rounded-xl border-l-4 transition-all ${
                    submissionStatus === "clean"
                      ? "bg-green-50 border-green-500"
                      : "bg-orange-50 border-orange-500" // Orange for suspecies
                  }`}
                >
                  <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">
                    AI Detection Result
                  </p>

                  <div className="flex items-center">
                    <p
                      className={`text-lg font-black ${
                        submissionStatus === "clean"
                          ? "text-green-700"
                          : "text-orange-700"
                      }`}
                    >
                      {submissionStatus === "clean"
                        ? "✅ Bin Looks Clean"
                        : "⚠️ Suspicious / Issue Detected"}
                    </p>
                  </div>

                  <p className="text-xs text-gray-500 mt-1 font-medium">
                    {submissionStatus === "clean"
                      ? "Verification successful. Bin is empty."
                      : "AI detected garbage. Marked as 'Suspicious' for review."}
                  </p>
                </div>
              )}

              {/* 3. Status Bar */}
              <div
                className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 ${
                  isSubmitting
                    ? "bg-green-100"
                    : afterImage
                      ? "bg-blue-100"
                      : "bg-gray-100"
                }`}
              >
                {/* Icon Container */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0 transition-colors duration-500 ${
                    isSubmitting
                      ? "bg-green-500"
                      : afterImage
                        ? "bg-blue-500"
                        : "bg-gray-400"
                  }`}
                >
                  <span className="text-2xl transform transition-transform duration-300 scale-110">
                    {isSubmitting ? "✅" : afterImage ? "👍" : "⏳"}
                  </span>
                </div>

                {/* Text Details */}
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 mb-1 uppercase">
                    Current Status
                  </p>
                  <p
                    className={`text-base font-bold leading-none ${
                      isSubmitting
                        ? "text-green-600"
                        : afterImage
                          ? "text-blue-600"
                          : "text-gray-600"
                    }`}
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : afterImage
                        ? "Ready to Submit"
                        : "Waiting for Photo"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 px-4 py-4 flex gap-3 shadow-2xl z-20">
        <button
          onClick={skipStop}
          disabled={showCompletionUI}
          className="flex-1 py-4 border-2 font-bold rounded-xl bg-red-50 text-red-600 border-red-300"
        >
          Skip
        </button>
        <button
          onClick={handleMarkComplete}
          disabled={
            !afterImage ||
            !isCleanVerified ||
            verifying ||
            isSubmitting ||
            showCompletionUI
          }
          className="flex-1 py-4 font-bold rounded-xl bg-green-600 text-white"
        >
          Complete
        </button>
      </div>

      {newJobAlert && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-4 border-red-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-red-500 animate-pulse"></div>
            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <span className="text-4xl">🚨</span>
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">
                {newJobAlert.title}
              </h2>
              <p className="text-gray-600 mb-4">{newJobAlert.message}</p>
              {newJobAlert.imageUrl && (
                <img
                  src={newJobAlert.imageUrl}
                  className="mb-4 rounded-xl h-40 w-full object-cover"
                />
              )}
              <button
                onClick={handleAcceptJob}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-lg shadow-lg"
              >
                ACCEPT TASK 🚛
              </button>
            </div>
          </div>
        </div>
      )}

      {(isSubmitting || verifying) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
              <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {verifying ? "🤖 AI Verifying..." : "☁️ Uploading..."}
            </h3>
          </div>
        </div>
      )}
    </div>
  );
}
