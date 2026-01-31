'use client';

import React, { useState, useEffect, useRef } from "react";
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import axios from "axios";

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
  const [vehicle, setVehicle] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeStops, setRouteStops] = useState([]);
  const [routeLine, setRouteLine] = useState([]);
  const [driverLocation, setDriverLocation] = useState(null);
  const [isCleanVerified, setIsCleanVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState("clean");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ORS_API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY;

  const afterFileRef = useRef(null);

  // Derived values
  const totalStops = routeStops.length;
  // Get Current Stop Data Safely
  const currentStopData = routeStops[currentStop - 1];
  const nextStop = routeStops.length > 0 ? routeStops[currentStop - 1] : null;

  // 👇 LOGIC FIX: Check if current bin is effectively "Done" (Clean or Suspicious)
  // Skipped/Missed/Overflow are NOT considered "Locked", so you can fix them.
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
  if (driverLocation && nextStop && nextStop.coordinates) {
    distance = getDistance(driverLocation[0], driverLocation[1], nextStop.coordinates[0], nextStop.coordinates[1]);
    bearing = getBearing(driverLocation[0], driverLocation[1], nextStop.coordinates[0], nextStop.coordinates[1]);
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

  // --- 6. Data Fetching ---
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await axios.get("http://localhost:5001/staff/dashboard", { headers: { Authorization: `Bearer ${token}` } });
        if (res.data) {
          const { staff, vehicle, route, dustbins } = res.data;
          setStaff(staff);
          setVehicle(vehicle);
          setRoute(route);
          if (dustbins && Array.isArray(dustbins)) {
            const stops = dustbins.map((d, index) => ({
              id: d._id,
              displayId: index + 1,
              name: d.name,
              coordinates: [d.latitude, d.longitude],
              status: d.status,
              completedAt: d.lastCleanedAt,
            }));
            setRouteStops(stops);

            const doneCount = stops.filter(s => ['clean', 'suspecies', 'skiped'].includes(s.status)).length;
            setTodayCompleted(doneCount);

            const firstPendingIndex = stops.findIndex(s => !['clean', 'suspecies', 'skiped'].includes(s.status));
            if (firstPendingIndex !== -1) {
              setCurrentStop(firstPendingIndex + 1);
            } else if (stops.length > 0) {
              setCurrentStop(stops.length);
              alert("🎉 All dustbins for today are already cleaned!");
            }
          }
        }
      } catch (err) { console.error("Dashboard Error:", err); }
    };
    fetchDashboard();

    // Fetch Staff Profile
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
  useEffect(() => {
    if (driverLocation && routeStops.length > 0 && currentStop <= routeStops.length) {
      const next = routeStops[currentStop - 1];
      if (next?.coordinates) fetchShortestRoute(driverLocation, next.coordinates);
    }
  }, [currentStop, driverLocation, routeStops]);

  // --- 8. Update Location Name ---
  useEffect(() => {
    if (routeStops[currentStop - 1]) {
      const name = routeStops[currentStop - 1].name;
      setCurrentLocation(name.includes(" - ") ? name.split(" - ")[1] : name);
    }
  }, [currentStop, routeStops]);

  // --- Handlers ---
  const handleAfterImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
      if (routeStops[currentStop - 1]) formData.append("dustbinId", routeStops[currentStop - 1].id);

      const res = await axios.post("http://localhost:5001/api/predict", formData, { headers: { Authorization: `Bearer ${token}` } });
      const { status, confidence } = res.data;

      if (status !== "empty") {
        if (confirm(`⚠️ AI Alert: Bin looks '${status.toUpperCase()}' (${confidence}%)\n\nAre you sure you want to submit?\n(Mark as Suspicious?)`)) {
          setIsCleanVerified(true);
          setSubmissionStatus("suspecies");
        } else {
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
      console.error(err);
      if (confirm("⚠️ AI Verification failed. Submit manually as Suspicious?")) {
        setIsCleanVerified(true);
        setSubmissionStatus("suspecies");
      } else {
        setAfterImage(null);
        setFileToUpload(null);
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!afterImage || !isCleanVerified) return alert("❌ Bin not verified!");
    if (!fileToUpload) return alert("❌ Image file lost.");
    if (!confirm(`Mark Stop ${currentStop} complete?`)) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", fileToUpload);
      formData.append("dustbinId", currentStopData.id);
      formData.append("status", submissionStatus);

      // Location bhejna zaroori hai backend check ke liye
      formData.append("latitude", driverLocation[0]);
      formData.append("longitude", driverLocation[1]);

      const res = await axios.post("http://localhost:5001/dustbin/mark-clean", formData, {
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        const updatedStops = routeStops.map((stop) => {
          if (stop.id === currentStopData.id) {
            return { ...stop, status: submissionStatus, completedAt: new Date().toISOString() };
          }
          return stop;
        });
        setRouteStops(updatedStops);
        setRouteLine([]);

        const newDoneCount = updatedStops.filter(s => ['clean', 'suspecies', 'skiped'].includes(s.status)).length;
        setTodayCompleted(newDoneCount);

        if (currentStop < totalStops) {
          setCurrentStop((prev) => prev + 1);
        }

        setAfterImage(null);
        setFileToUpload(null);
        setIsCleanVerified(false);
        setSubmissionStatus("clean");
        if (afterFileRef.current) afterFileRef.current.value = "";

        if (newDoneCount === totalStops && currentStop === totalStops) {
          setTimeout(() => alert("🎉 Route Completed!"), 500);
        } else {
          alert(`🎉 Saved! Status: ${submissionStatus.toUpperCase()}`);
        }
      }
    } catch (err) {
      console.error("Upload failed", err);

      // 👇👇 YAHAN CHANGE KIYA HAI 👇👇
      // Agar Backend ne koi specific message bheja hai (jaise distance error), to wo dikhao
      if (err.response && err.response.data && err.response.data.message) {
        alert(`❌ ${err.response.data.message}`);
      } else {
        // Agar koi aur error hai (server down etc.)
        alert("❌ Failed to save progress. Please try again.");
      }

    } finally {
      setIsSubmitting(false);
    }
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
            <div><h1 className="text-lg font-bold text-gray-800">SafaiMitra Driver</h1><p className="text-xs text-gray-600">{vehicle ? vehicle.vehicleNumber : "No Vehicle"}</p></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right"><p className="text-xs text-gray-500">Route</p><p className="text-sm font-semibold text-gray-800">{route ? route.name : "No Route"}</p></div>
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
            {driverLocation && nextStop && !showCompletionUI && (
              <div className="bg-white rounded-xl p-3 shadow mt-3 text-center border border-gray-200">
                <div className="flex justify-between items-center px-4">
                  <div className="text-left"><p className="text-xs text-gray-500 uppercase font-bold">Next Stop</p><p className="text-sm font-bold text-gray-800">{nextStop.name}</p></div>
                  <div className="text-4xl text-blue-600" style={{ transform: `rotate(${bearing}deg)` }}>➤</div>
                  <div className="text-right"><p className="text-xs text-gray-500 uppercase font-bold">Distance</p><p className="text-lg font-bold text-blue-600">{(distance / 1000).toFixed(2)} km</p></div>
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
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center"><span className={`text-xl font-bold ${showCompletionUI ? "text-gray-600" : "text-blue-600"}`}>{showCompletionUI ? "✓" : currentStop}</span></div>
              <div><h2 className="text-lg font-bold">{showCompletionUI ? "All Tasks Done" : "Current Stop"}</h2><p className="text-sm opacity-90">{showCompletionUI ? "Great job!" : currentLocation}</p></div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <label className="block text-base font-bold text-gray-800 mb-3">{showCompletionUI ? "🎉 Duty Over" : "📸 Upload Proof (After Cleaning)"}</label>
              <div onClick={() => {
                // 👇 IMPORTANT FIX: Allow click if bin is NOT Clean/Suspicious (even if route is "done")
                if (showCompletionUI) { alert("🎉 This bin is already clean!"); return; }

                // Check the location of the driver before allowing photo capture in radius of 100 meters
                // 👇👇 NEW LOGIC: 100m Radius Check 👇👇
                if (driverLocation && currentStopData && currentStopData.coordinates) {
                  const dist = getDistance(
                    driverLocation[0], driverLocation[1],
                    currentStopData.coordinates[0], currentStopData.coordinates[1]
                  );

                  // Agar doori 100m se zyada hai
                  if (dist > 100) {
                    alert(`⚠️ You are too far from the dustbin!\n\nCurrent Distance: ${Math.round(dist)} meters\nAllowed Radius: 100 meters\n\nPlease move closer to upload proof.`);
                    return; // ⛔ Yahi rok do, camera mat kholo
                  }
                } else {
                  alert("📍 Fetching your location... Please wait.");
                  return;
                }
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