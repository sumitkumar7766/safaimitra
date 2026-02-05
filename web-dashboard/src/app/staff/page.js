'use client';

import React, { useState, useEffect, useRef } from "react";
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import axios from "axios";
import { io } from "socket.io-client";
import { useMap } from 'react-leaflet';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Dynamically import map components
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center">Loading map...</div> }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

// Is component ko file me neeche kahin bhi rakh dein
function MapRecenter({ lat, lng }) {
  const map = useMap();

  useEffect(() => {
    // setView map ko smooth animate karega bina refresh kiye
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
  const [currentLocation, setCurrentLocation] = useState("Fetching location...");
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
  const targetStop = routeStops.slice(currentStop - 1).find(stop =>
    !['clean', 'skiped', 'suspecies', 'resolved'].includes(stop.status)
  );
  // Get Current Stop Data Safely
  const currentStopData = routeStops[currentStop - 1];
  const nextStop = routeStops.length > 0 ? routeStops[currentStop - 1] : null;

  const isCurrentBinLocked = currentStopData?.status === 'clean' || currentStopData?.status === 'suspecies';

  // Route is "technically" complete if count matches, BUT we allow fixing skips
  const isRouteCountComplete = totalStops > 0 && todayCompleted === totalStops;

  // UI ko tabhi "Duty Over" dikhana chahiye jab route complete ho AUR current bin bhi clean ho
  const showCompletionUI = isRouteCountComplete && isCurrentBinLocked;


  if (!ORS_API_KEY) {
    console.error("❌ ORS API key missing in .env");
  }

  const getBinIcon = (status) => {
    const colors = {
      clean: '#10b981',
      overflow: '#f59e0b',
      skiped: '#ef4444',
      suspecies: '#cc760e',
      ideal: '#000000'
    };
    return createCustomIcon(colors[status] || '#6b7280', '🗑️');
  };

  const createCustomIcon = (color, content) => {
    if (typeof window === "undefined") return null;
    const L = require("leaflet");
    return L.divIcon({
      className: 'custom-marker',
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
      popupAnchor: [0, -36]
    });
  };

  // --- SOCKET IO CONNECTION & EVENT LISTENER ---
  // --- SOCKET IO LISTENER (Map & Popup Update) ---
  useEffect(() => {
    let newSocket = null;
    const token = localStorage.getItem("token");

    const initializeSocket = async () => {
      try {
        const res = await axios.get("http://localhost:5001/staff/userdata", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.success) {
          const userId = res.data.user._id;

          newSocket = io("http://localhost:5001", {
            transports: ["websocket", "polling"],
            reconnectionAttempts: 5,
          });
          setSocket(newSocket);

          newSocket.on("connect", () => {
            newSocket.emit("join_room", `driver_${userId}`);
          });

          // 🔥 MERGE LOGIC HERE
          newSocket.on("new_job_alert", (data) => {
            try {
              const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
              audio.play().catch(e => { });
            } catch (e) { }

            setNewJobAlert(data);

            setRouteStops((prevStops) => {
              const incomingId = data.newStop.id;

              // Check karo agar ye dustbin pehle se list mein hai (Daily Route)
              const existingIndex = prevStops.findIndex(stop => stop.id === incomingId);

              if (existingIndex !== -1) {
                // Agar hai, to purane wale ko update kar do (Upgrade to Complaint)
                const updatedStops = [...prevStops];
                updatedStops[existingIndex] = {
                  ...updatedStops[existingIndex], // Purana data (coordinates, name)
                  status: "overflow",             // Force status overflow
                  type: "complaint",              // Mark as complaint
                  complaintId: data.newStop.complaintId, // Attach Complaint ID
                  isEmergency: true,              // UI Red karne ke liye
                  isNew: true                     // Popup/Notification ke liye
                };
                return updatedStops;
              } else {
                // Agar nahi hai (Ad-hoc location), to naya add karo
                return [...prevStops, {
                  ...data.newStop,
                  isEmergency: true,
                  type: "complaint"
                }];
              }
            });
          });
        }
      } catch (err) {
        console.error("Socket Init Failed:", err);
      }
    };

    initializeSocket();
    return () => { if (newSocket) newSocket.disconnect(); };
  }, []);

  const handleAcceptJob = () => {
    setNewJobAlert(null);

    if (newJobAlert?.newStop?.coordinates) {
      const [lat, lng] = newJobAlert.newStop.coordinates;

      if (driverLocation) {
        fetchShortestRoute(driverLocation, [lat, lng]);
      }

      alert("✅ Task Accepted! Route updated to new location.");
    }
  };

  // --- 1. Setup Leaflet ---
  useEffect(() => {
    setIsClient(true);
    import('leaflet').then((L) => {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
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

  // --- 2. Geolocation ---
  useEffect(() => {
    if (!navigator.geolocation) return;
    const token = localStorage.getItem("token");
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDriverLocation([lat, lng]);
        if (token) {
          try {
            await axios.post(
              "http://localhost:5001/staff/update-vehicle-location",
              { latitude: lat, longitude: lng },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } catch (err) { console.error("Location error:", err); }
        }
      },
      (err) => console.error("Geo error:", err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // --- 3. Offline/Heartbeat ---
  useEffect(() => {
    const handleTabClose = () => {
      const data = new Blob([JSON.stringify({})], { type: 'application/json' });
      navigator.sendBeacon("http://localhost:5001/staff/set-offline", data);
    };
    window.addEventListener("beforeunload", handleTabClose);
    return () => window.removeEventListener("beforeunload", handleTabClose);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const heartbeatInterval = setInterval(async () => {
      try {
        await axios.post("http://localhost:5001/staff/ping-vehicle", {}, { headers: { Authorization: `Bearer ${token}` } });
      } catch (err) { console.error("Heartbeat failed", err); }
    }, 60000);

    const handleTabClose = () => {
      fetch("http://localhost:5001/staff/set-vehicle-offline", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        keepalive: true
      });
    };
    window.addEventListener("beforeunload", handleTabClose);
    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener("beforeunload", handleTabClose);
    };
  }, []);

  // --- 4. Helper Functions ---
  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  function getBearing(lat1, lon1, lat2, lon2) {
    const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  let distance = 0;
  let bearing = 0;
  if (driverLocation && targetStop && targetStop.coordinates) {
    distance = getDistance(
      driverLocation[0], driverLocation[1],
      targetStop.coordinates[0], targetStop.coordinates[1]
    );
    bearing = getBearing(
      driverLocation[0], driverLocation[1],
      targetStop.coordinates[0], targetStop.coordinates[1]
    );
  }

  // --- 5. Fetch Route ---
  const fetchShortestRoute = async (start, end) => {
    if (!start || !end) return;
    try {
      const res = await axios.post(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        { coordinates: [[Number(start[1]), Number(start[0])], [Number(end[1]), Number(end[0])]] },
        { headers: { "Authorization": ORS_API_KEY, "Content-Type": "application/json" } }
      );
      setRouteLine(res.data.features[0].geometry.coordinates.map(c => [c[1], c[0]]));
    } catch (err) { console.error("ORS Error:", err); }
  };

  // --- 6. Data Fetching (Auto Update) ---
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await axios.get("http://localhost:5001/staff/dashboard", {
          headers: { Authorization: `Bearer ${token}` }
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
            isEmergency: d.isEmergency || (d.complaintId ? true : false) // Ensure flag
          }));

          setRouteStops((prevStops) => {
            // Map banayenge ID ke basis par taaki duplicates hat jayein
            const stopMap = new Map();

            // 1. Pehle Backend data dalo (Daily Route + Complaints form DB)
            backendStops.forEach(stop => stopMap.set(stop.id, stop));

            // 2. Agar koi Local Socket data hai jo abhi tak DB me reflect nahi hua, use merge karo
            prevStops.forEach(localStop => {
              if (localStop.isNew) {
                if (stopMap.has(localStop.id)) {
                  // Agar ID match hui, to Socket wala data (Complaint info) prefer karo
                  const existing = stopMap.get(localStop.id);
                  stopMap.set(localStop.id, {
                    ...existing,
                    ...localStop,
                    isEmergency: true
                  });
                } else {
                  stopMap.set(localStop.id, localStop);
                }
              }
            });

            const mergedList = Array.from(stopMap.values());

            // Re-render rokne ke liye comparison
            if (JSON.stringify(prevStops.map(s => s.id + s.status)) === JSON.stringify(mergedList.map(s => s.id + s.status))) {
              return prevStops;
            }
            return mergedList;
          });

          // Count sirf unka jo Daily route ka hissa hain aur complete hain
          // (Logic: Complaint solve hone par bhi count badhna chahiye)
          const doneCount = backendStops.filter(s => ['clean', 'suspecies', 'skiped'].includes(s.status)).length;
          setTodayCompleted(doneCount);
        }
      } catch (err) { console.error(err); }
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, []);

  // Staff Profile alag se fetch karo (Ye baar baar update karne ki zarurat nahi)
  useEffect(() => {
    const fetchStaffProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await axios.get("http://localhost:5001/staff/userdata", { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.success) setStaff(res.data.user);
      } catch (err) { console.error(err); }
    };
    fetchStaffProfile();
  }, []);

  // --- 7. Update Route ---
  // --- 7. Update Route (Auto-Find Next Pending Stop) ---
  useEffect(() => {
    // Agar driver location hai aur koi target (pending) stop bacha hai
    if (driverLocation && targetStop && targetStop.coordinates) {
      fetchShortestRoute(driverLocation, targetStop.coordinates);
    } else {
      // Agar sab kuch clean hai ya koi target nahi mila
      setRouteLine([]);
    }
    // 👇 Dependency array me 'targetStop' add kiya
  }, [currentStop, driverLocation, routeStops, targetStop]);

  // --- 8. Update Location Name ---
  // 🔥 AUTO-DETECT NEXT PENDING STOP ON LOAD 🔥
  useEffect(() => {
    if (routeStops.length > 0) {
      // 1. Dhoondho ki pehla 'Unclean' (Pending/Overflow/New) bin kaun sa hai
      const firstPendingIndex = routeStops.findIndex(stop =>
        !['clean', 'skiped', 'suspecies', 'resolved'].includes(stop.status)
      );

      // 2. Agar koi pending kaam mila, to Current Stop ko wahan set kar do
      if (firstPendingIndex !== -1) {
        // (index + 1) isliye kyunki aapka currentStop 1-based hai
        setCurrentStop(firstPendingIndex + 1);
      }
    }
  }, [routeStops]); // Jab bhi list load hogi, ye chalega

  // --- Handlers ---
  const handleAfterImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Current Stop Data ko safely nikalo
    const activeStopData = routeStops[currentStop - 1];

    // Safety Check: Agar stop data nahi mila to aage mat badho
    if (!activeStopData) {
      alert("❌ Error: Could not identify the current dustbin. Please re-select the stop.");
      return;
    }

    console.log("📸 Image Selected for Bin:", activeStopData.name, "ID:", activeStopData.id);

    setFileToUpload(file);
    const reader = new FileReader();
    reader.onloadend = () => setAfterImage(reader.result);
    reader.readAsDataURL(file);

    setVerifying(true);
    setIsCleanVerified(false);
    setSubmissionStatus("clean");

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", file);

      // ✅ Explicitly ID attach karein aur log karein
      formData.append("dustbinId", activeStopData.id);

      console.log("🚀 Sending to AI API...");

      const res = await axios.post("http://localhost:5001/api/predict", formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("🤖 AI Response:", res.data);
      const { status, confidence } = res.data;

      if (status !== "empty") {
        if (confirm(`⚠️ AI Alert: Bin looks '${status.toUpperCase()}' (${confidence}%)\n\nAre you sure you want to submit?\n(Mark as Suspicious?)`)) {
          setIsCleanVerified(true);
          setSubmissionStatus("suspecies");
        } else {
          // Reset if cancelled
          setAfterImage(null);
          setFileToUpload(null);
          if (afterFileRef.current) afterFileRef.current.value = "";
          setIsCleanVerified(false);
        }
      } else {
        setIsCleanVerified(true);
        setSubmissionStatus("clean");
        alert(`✅ Clean verified (${confidence}%)`);
      }
    } catch (err) {
      console.error("❌ AI Verification Failed:", err);
      // Agar API fail ho jaye, tab bhi driver ko manual submit karne do
      if (confirm("⚠️ AI Server not responding. Verify manually as Clean/Suspicious?")) {
        setIsCleanVerified(true);
        // Default to clean if manual override
        setSubmissionStatus("clean");
      } else {
        setAfterImage(null);
        setFileToUpload(null);
        if (afterFileRef.current) afterFileRef.current.value = "";
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleMarkComplete = async () => {
    console.log("🚀 Current Stop Data (Full Object):", currentStopData);
    console.log("🆔 Complaint ID Check:", currentStopData?.complaintId);
    if (!afterImage) return alert("❌ Photo required!");
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", fileToUpload);
      formData.append("dustbinId", currentStopData.id);

      // Agar Complaint ID hai to attach karo
      if (currentStopData.complaintId) {
        formData.append("complaintId", currentStopData.complaintId);
      }

      formData.append("status", submissionStatus);
      formData.append("latitude", driverLocation[0]);
      formData.append("longitude", driverLocation[1]);

      const res = await axios.post("http://localhost:5001/dustbin/mark-clean", formData, {
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });

      if (res.data.success) {
        // 🔥 UPDATE LIST:
        // Chahe Complaint ho ya Daily route, hum usse remove nahi karenge, bas status "Clean" karenge.
        // Taki driver ko dikhe ki "Haan ye kaam ho gaya".

        setRouteStops(prev => prev.map(s =>
          s.id === currentStopData.id
            ? {
              ...s,
              status: submissionStatus,
              completedAt: new Date().toISOString(),
              isEmergency: false, // Emergency hat gayi
              isNew: false
            }
            : s
        ));

        setRouteLine([]);

        // Count badhao
        setTodayCompleted(prev => prev + 1);

        // Next stop par move karo
        if (currentStop < totalStops) setCurrentStop(prev => prev + 1);

        alert(`🎉 Task Completed! (Complaint Resolved + Daily Counted)`);

        setAfterImage(null); setFileToUpload(null); setIsCleanVerified(false);
      }
    } catch (e) { alert("❌ Failed to save."); } finally { setIsSubmitting(false); }
  };

  const skipStop = async () => {
    if (!confirm("⚠️ Mark this stop as MISSED/SKIPPED?")) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `http://localhost:5001/dustbin/driver-update-status/${currentStopData.id}`,
        { status: "skiped" },
        { headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } }
      );

      if (res.data.success) {
        const updatedStops = routeStops.map((stop) => {
          if (stop.id === currentStopData.id) return { ...stop, status: "skiped", completedAt: new Date().toISOString() };
          return stop;
        });
        setRouteStops(updatedStops);

        // Recalculate Count
        const newDoneCount = updatedStops.filter(s => ['clean', 'suspecies', 'skiped'].includes(s.status)).length;
        setTodayCompleted(newDoneCount);

        if (currentStop < totalStops) setCurrentStop(prev => prev + 1);

        setAfterImage(null);
        setFileToUpload(null);
        setIsCleanVerified(false);
        if (afterFileRef.current) afterFileRef.current.value = "";

        if (newDoneCount === totalStops && currentStop === totalStops) {
          setTimeout(() => alert("🎉 Route Completed!"), 500);
        } else {
          alert("⚠️ Stop marked as Skipped.");
        }
      }
    } catch (err) {
      console.error("Skip failed", err);
      alert("Failed to skip stop.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("Are you sure?")) return;
    try {
      const token = localStorage.getItem("token");
      if (token) {
        await axios.post("http://localhost:5001/staff/set-offline", {}, { headers: { Authorization: `Bearer ${token}` } });
        await axios.post("http://localhost:5001/staff/logout", {}, { headers: { Authorization: `Bearer ${token}` } });
      }
    } catch (err) { }
    finally {
      localStorage.clear();
      document.cookie = "token=; Max-Age=0; path=/;";
      router.replace("/");
    }
  };

  const handleFindNearest = () => {
    // 1. Check GPS
    if (!driverLocation) {
      alert("📍 Waiting for GPS location... Please wait.");
      return;
    }

    // 2. Sirf 'Pending' bins nikalo (Jo Clean/Skipped nahi hain)
    // Hum original index store kar rahe hain taaki 'currentStop' sahi set ho sake
    const pendingBins = routeStops
      .map((stop, index) => ({ ...stop, originalIndex: index + 1 }))
      .filter(stop => !['clean', 'skiped', 'suspecies', 'missed'].includes(stop.status));

    if (pendingBins.length === 0) {
      alert("🎉 All bins are already completed!");
      return;
    }

    // 3. Distance ke hisaab se Sort karo (Sabse paas wala pehle)
    const sortedBins = pendingBins.sort((a, b) => {
      const distA = getDistance(driverLocation[0], driverLocation[1], a.coordinates[0], a.coordinates[1]);
      const distB = getDistance(driverLocation[0], driverLocation[1], b.coordinates[0], b.coordinates[1]);
      return distA - distB;
    });

    const nearestBin = sortedBins[0];
    const distInMeters = Math.round(getDistance(driverLocation[0], driverLocation[1], nearestBin.coordinates[0], nearestBin.coordinates[1]));

    // 4. Confirmation lo aur Route Change karo
    if (confirm(`📍 Nearest Bin Found: "${nearestBin.name}"\nDistance: ${distInMeters} meters.\n\nGo to this bin now?`)) {
      setCurrentStop(nearestBin.originalIndex);
      // Agar Map hidden tha to open kar do taaki location dikhe
      if (!showMap) setShowMap(true);
    }
  };

  // --- 🕒 Smart Date Formatter Helper ---
  const formatSmartTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();

    // Check if Today
    const isToday = date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    // Check if Yesterday
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    // Time format (e.g., 10:30 pm)
    const timeStr = date.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    if (isToday) {
      return `Today, ${timeStr}`;
    } else if (isYesterday) {
      return `Yesterday, ${timeStr}`;
    } else {
      // Agar purana hai to Date dikhao (e.g., 25 Jan, 10:30 pm)
      return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, ${timeStr}`;
    }
  };

  const mapCenter = (driverLocation && driverLocation.length >= 2) ? [driverLocation[0], driverLocation[1]] : [0, 0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-10">
      <header className="bg-white shadow-md sticky top-0 z-30">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><span className="text-2xl">🚛</span></div>
            <div><h1 className="text-lg font-bold text-gray-800">SafaiMitra Driver</h1><p className="text-xs text-gray-600">{staff ? staff.assignedVehicleId?.vehicleNumber : "No Vehicle"}</p></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right"><p className="text-xs text-gray-500">Route</p><p className="text-sm font-semibold text-gray-800">{staff ? staff.assignedVehicleId.routeId?.name : "No Route"}</p></div>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors">Logout</button>
          </div>
        </div>
        <div className="px-4 pb-3 grid grid-cols-3 gap-3">
          <div className="bg-green-500 rounded-xl p-3 text-white text-center"><p className="text-2xl font-bold">{todayCompleted}</p><p className="text-xs">Completed</p></div>
          <div className="bg-blue-500 rounded-xl p-3 text-white text-center"><p className="text-2xl font-bold">{currentStop}</p><p className="text-xs">Current</p></div>
          <div className="bg-orange-500 rounded-xl p-3 text-white text-center"><p className="text-2xl font-bold">{totalStops > 0 ? totalStops - todayCompleted : 0}</p><p className="text-xs">Remaining</p></div>
        </div>
      </header>

      <main className="pb-24 px-4 py-5 space-y-5">
        <div className="bg-white rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div><p className="text-sm text-gray-600 font-medium mb-1">Today's Progress</p><p className="text-3xl font-bold text-blue-600">{todayCompleted} / {totalStops}</p></div>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center"><span className="text-xl font-bold text-blue-600">{totalStops > 0 ? Math.round((todayCompleted / totalStops) * 100) : 0}%</span></div>
          </div>
          <div className="bg-gray-200 rounded-full h-3 overflow-hidden"><div className="bg-gradient-to-r from-green-500 to-emerald-600 h-full transition-all duration-700" style={{ width: `${totalStops > 0 ? (todayCompleted / totalStops) * 100 : 0}%` }} /></div>
        </div>

        <div className="flex gap-3">
          {/* Toggle Map Button */}
          <button
            onClick={() => setShowMap(!showMap)}
            className="flex-1 py-3 bg-white rounded-xl shadow-md font-semibold text-gray-700 hover:shadow-lg transition-shadow flex items-center justify-center gap-2"
          >
            <span className="text-xl">{showMap ? "📋" : "🗺️"}</span>
            <span>{showMap ? "Show Route List" : "Show Map"}</span>
          </button>

          {/* Find Nearest Button (New) */}
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
            <h2 className="text-xl font-bold text-gray-800 mb-3">🗺️ Route Map</h2>
            <div className="h-80 rounded-xl overflow-hidden border-2 border-gray-200 relative z-0">
              {isClient && (
                <MapContainer key={mapCenter.join(",")} center={mapCenter} zoom={17} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                  <MapRecenter lat={mapCenter[0]} lng={mapCenter[1]} />
                  {!isRouteCountComplete && routeLine.length > 0 && <Polyline positions={routeLine} pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.85 }} />}
                  {routeStops.map((stop, index) => (
                    <Marker key={stop.id} position={stop.coordinates} icon={getBinIcon(stop.status)}
                      eventHandlers={{
                        click: () => {
                          if (stop.status === 'clean') {
                            alert("✅ This bin is already cleaned.");
                          } else {
                            setCurrentStop(index + 1);
                          }
                        }
                      }}>
                      <Popup>
                        <div className="text-center min-w-[100px]">
                          <p className="font-bold text-gray-800 mb-2 text-sm">{stop.name}</p>
                          <span className="px-2 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider shadow-sm" style={{ backgroundColor: stop.status === 'clean' ? '#10b981' : stop.status === 'overflow' ? '#f59e0b' : stop.status === 'missed' ? '#ef4444' : stop.status === 'skiped' ? '#2066f3' : stop.status === 'suspecies' ? '#cc760e' : stop.status === 'current' ? '#3b82f6' : '#6b7280' }}>
                            {stop.status === 'current' ? "📍 Arriving" : stop.status || "PENDING"}
                          </span>
                          {stop.status !== 'clean' && <p className="text-[10px] text-blue-600 mt-2 font-bold cursor-pointer">👆 Tap marker to Clean</p>}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  {driverLocation && truckIcon && <Marker position={driverLocation} icon={truckIcon}><Popup>🚛 You are here</Popup></Marker>}
                </MapContainer>
              )}
            </div>
            {driverLocation && targetStop && !showCompletionUI && (
              <div className="bg-white rounded-xl p-3 shadow mt-3 text-center border border-gray-200">
                <div className="flex justify-between items-center px-4">
                  <div className="text-left">
                    <p className="text-xs text-gray-500 uppercase font-bold">Going To</p>
                    {/* Yahan Target Stop ka naam aayega */}
                    <p className="text-sm font-bold text-gray-800">{targetStop.name}</p>
                  </div>

                  {/* Rotating Arrow */}
                  <div className="text-4xl text-blue-600" style={{ transform: `rotate(${bearing}deg)` }}>➤</div>

                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase font-bold">Distance</p>
                    <p className="text-lg font-bold text-blue-600">{(distance / 1000).toFixed(2)} km</p>
                  </div>
                </div>
              </div>
            )}
            {showCompletionUI && <div className="bg-green-50 rounded-xl p-3 shadow mt-3 text-center border border-green-200"><p className="text-green-700 font-bold">🎉 Route Completed Successfully!</p></div>}
          </div>
        )}

        {!showMap && (
          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex justify-between">
              <span>📍 All Stops</span>
              {showCompletionUI && <span className="text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full">All Done!</span>}
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 p-5 pr-5">
              {routeStops.map((stop, index) => {
                const isCurrent = (index + 1) === currentStop;
                const isCompleted = ['clean', 'overflow', 'missed', 'skiped', 'suspecies'].includes(stop.status);
                let statusColor = "bg-gray-50 border-gray-200";
                let iconColor = "bg-gray-200 text-gray-500";
                let iconSymbol = index + 1;
                let statusLabel = "⏳ Pending";

                if (isCompleted) {
                  switch (stop.status) {
                    case 'clean': statusColor = "bg-green-50 border border-green-200"; iconColor = "bg-green-500 text-white"; iconSymbol = "✓"; statusLabel = "✅ Cleaned"; break;
                    case 'overflow': statusColor = "bg-yellow-50 border border-yellow-200"; iconColor = "bg-yellow-500 text-white"; iconSymbol = "⚠"; statusLabel = "🟠 Overflow"; break;
                    case 'missed':
                    case 'skiped': statusColor = "bg-red-50 border border-red-200"; iconColor = "bg-red-500 text-white"; iconSymbol = "✕"; statusLabel = "⛔ Missed / Skipped"; break;
                    case 'suspecies': statusColor = "bg-orange-50 border border-orange-200"; iconColor = "bg-orange-600 text-white"; iconSymbol = "👁"; statusLabel = "⚠️ Suspicious"; break;
                  }
                } else if (isCurrent) {
                  statusColor = "bg-blue-50 border-2 border-blue-500 shadow-md transform scale-[1.01]"; iconColor = "bg-blue-600 text-white animate-pulse"; iconSymbol = "📍"; statusLabel = "🚛 En Route";
                }

                return (
                  <div key={stop.id} onClick={() => { if (!isCompleted || stop.status === 'skiped') setCurrentStop(index + 1) }} className={`flex items-center gap-3 p-4 rounded-xl transition-all cursor-pointer ${statusColor}`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm ${iconColor}`}>{iconSymbol}</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className={`font-bold ${isCurrent && !isCompleted ? "text-blue-800" : "text-gray-800"}`}>{stop.name}</p>

                        {stop.completedAt && (
                          <span className="text-[10px] font-mono bg-white px-2 py-1 rounded border border-gray-200 text-gray-500 whitespace-nowrap shadow-sm">
                            {formatSmartTime(stop.completedAt)}
                          </span>
                        )}

                      </div>
                      <p className={`text-xs mt-1 font-medium ${isCurrent && !isCompleted ? "text-blue-600" : "text-gray-500"}`}>{statusLabel}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Card */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
          <div className={`p-5 text-white ${showCompletionUI ? "bg-gray-500" : "bg-gradient-to-r from-blue-600 to-indigo-600"}`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <span className={`text-xl font-bold ${showCompletionUI ? "text-green-600" : "text-blue-600"}`}>
                  {showCompletionUI ? "✓" : currentStop}
                </span>
              </div>
              <div>
                <h2 className="text-white uppercase font-bold">
                  {showCompletionUI ? "Status" : "Next Stop"}
                </h2>

                {/* 🛠️ FIX: Safe Navigation (?.) and Logic Handle */}
                <p className="text- font-bold text-gray-100">
                  {showCompletionUI
                    ? "All Tasks Done"
                    : (targetStop?.name || "Select a Stop")}
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <label className="block text-base font-bold text-gray-800 mb-3">{showCompletionUI ? "🎉 Duty Over" : "📸 Upload Proof (After Cleaning)"}</label>
              <div onClick={() => {
                // 👇 IMPORTANT FIX: Allow click if bin is NOT Clean/Suspicious (even if route is "done")
                // if (showCompletionUI) { alert("🎉 This bin is already clean!"); return; }

                // // Check the location of the driver before allowing photo capture in radius of 100 meters
                // // 👇👇 NEW LOGIC: 100m Radius Check 👇👇
                // if (driverLocation && currentStopData && currentStopData.coordinates) {
                //   const dist = getDistance(
                //     driverLocation[0], driverLocation[1],
                //     currentStopData.coordinates[0], currentStopData.coordinates[1]
                //   );

                //   // Agar doori 100m se zyada hai
                //   if (dist > 100) {
                //     alert(`⚠️ You are too far from the dustbin!\n\nCurrent Distance: ${Math.round(dist)} meters\nAllowed Radius: 100 meters\n\nPlease move closer to upload proof.`);
                //     return; // ⛔ Yahi rok do, camera mat kholo
                //   }
                // } else {
                //   alert("📍 Fetching your location... Please wait.");
                //   return;
                // }
                // end of the distance check

                afterFileRef.current?.click();
              }}
                className={`w-full h-56 rounded-xl border-2 border-dashed overflow-hidden transition-colors ${showCompletionUI ? "border-gray-300 bg-gray-100 cursor-not-allowed opacity-60" : "cursor-pointer hover:border-blue-500 " + (afterImage ? "border-blue-300 bg-blue-50" : "border-gray-300 bg-gray-50")}`}>
                {showCompletionUI ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400"><span className="text-4xl mb-2">🏁</span><p className="font-bold">Bin Cleaned</p></div>
                ) : afterImage ? (
                  <div className="relative w-full h-full"><img src={afterImage} alt="After" className="w-full h-full object-cover" /><div className="absolute top-3 left-3 bg-green-500 px-4 py-2 rounded-lg"><span className="text-white font-bold text-sm">✅ Ready to Submit</span></div></div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full"><div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-3"><span className="text-3xl text-white">📸</span></div><p className="font-semibold text-gray-800">Tap to take photo </p><p className="text-sm text-gray-500 mt-1">Verify cleanliness</p></div>
                )}
              </div>
              {!showCompletionUI && driverLocation && currentStopData && currentStopData.coordinates && (
                <p className={`text-xs mt-3 font-bold text-center transition-colors duration-300 ${getDistance(driverLocation[0], driverLocation[1], currentStopData.coordinates[0], currentStopData.coordinates[1]) > 100
                  ? "text-red-500 animate-pulse" // Agar dur hai to Red aur Blink karega
                  : "text-green-600"             // Agar pass hai to Green
                  }`}>
                  📍 Distance from Bin: {Math.round(getDistance(driverLocation[0], driverLocation[1], currentStopData.coordinates[0], currentStopData.coordinates[1]))} meters
                  {getDistance(driverLocation[0], driverLocation[1], currentStopData.coordinates[0], currentStopData.coordinates[1]) > 100 && (
                    <span className="block text-[10px] font-normal text-gray-500">(Must be under 100m)</span>
                  )}
                </p>
              )}
              <input ref={afterFileRef} type="file" accept="image/*" capture="environment" onChange={handleAfterImage} className="hidden" disabled={showCompletionUI} />
              {afterImage && !showCompletionUI && <button onClick={(e) => { e.stopPropagation(); setAfterImage(null); if (afterFileRef.current) afterFileRef.current.value = ""; }} className="mt-3 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors">🔄 Retake Photo</button>}
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 px-4 py-4 flex gap-3 shadow-2xl z-20">
        <button onClick={skipStop} disabled={showCompletionUI} className={`flex-1 py-4 border-2 font-bold rounded-xl transition-colors ${showCompletionUI ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed" : "bg-red-50 border-red-300 text-red-600 hover:bg-red-100"}`}><div className="flex flex-col items-center"><span className="text-xl mb-1">⚠️</span><span className="text-sm">Skip</span></div></button>
        <button onClick={handleMarkComplete} disabled={!afterImage || !isCleanVerified || verifying || isSubmitting || showCompletionUI} className={`flex-1 py-4 font-bold rounded-xl transition-colors ${showCompletionUI ? "bg-gray-200 text-gray-400 cursor-not-allowed" : afterImage && isCleanVerified ? submissionStatus === "suspecies" ? "bg-gradient-to-r from-yellow-500 to-orange-600 text-white" : "bg-gradient-to-r from-green-500 to-emerald-600 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}><div className="flex flex-col items-center"><span className="text-xl mb-1">{submissionStatus === "suspecies" ? "⚠️" : "✅"}</span><span className="text-sm">{verifying ? "Verifying..." : isSubmitting ? "Uploading..." : "Complete"}</span></div></button>
      </div>

      {newJobAlert && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-4 border-red-500 relative overflow-hidden">

            {/* Blinking Background Effect */}
            <div className="absolute top-0 left-0 w-full h-2 bg-red-500 animate-pulse"></div>

            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <span className="text-4xl">🚨</span>
              </div>

              <h2 className="text-2xl font-black text-gray-900 mb-2">{newJobAlert.title}</h2>
              <p className="text-gray-600 mb-4">{newJobAlert.message}</p>

              {newJobAlert.imageUrl && (
                <div className="mb-4 rounded-xl overflow-hidden border-2 border-gray-200 h-40">
                  <img src={newJobAlert.imageUrl} alt="Complaint" className="w-full h-full object-cover" />
                </div>
              )}

              <button
                onClick={handleAcceptJob}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-lg shadow-lg transform transition-transform active:scale-95"
              >
                ACCEPT TASK 🚛
              </button>
            </div>
          </div>
        </div>
      )}

      {(isSubmitting || verifying) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-bounce-in max-w-xs w-full">
            <div className="relative w-16 h-16 mb-4"><div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div><div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{verifying ? "🤖 AI Verifying..." : "☁️ Uploading..."}</h3>
            <p className="text-sm text-gray-500 text-center">{verifying ? "Checking if the bin is clean. Please wait..." : "Saving data & image to the server."}</p>
          </div>
        </div>
      )}
    </div>
  );
}