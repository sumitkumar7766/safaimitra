'use client';
import "leaflet/dist/leaflet.css";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import axios from "axios";

// --- ERROR FIX START ---
// We must import hooks directly. We cannot use dynamic() for hooks like useMap.
// Since MapUpdater is used inside MapContainer (which is ssr: false), this is safe.
import { useMap } from 'react-leaflet';
// --- ERROR FIX END ---

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

// Component to update map center when location changes
function MapUpdater({ center }) {
  const map = useMap(); // Now this works correctly because it's a real hook
  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);
  return null;
}

export default function CitizenPage() {
  const router = useRouter();
  const [image, setImage] = useState(null);
  const [status, setStatus] = useState("waiting");
  const [address, setAddress] = useState("Detecting location...");
  const [selectedTab, setSelectedTab] = useState("report");
  const [isMapReady, setIsMapReady] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showNotification, setShowNotification] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState("prompt"); // "prompt", "granted", "denied"
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [myComplaints, setMyComplaints] = useState([]);
  const [selectedBin, setSelectedBin] = useState(null);
  const fileInputRef = useRef(null);
  // Add these inside existing useState definitions
  const [verifying, setVerifying] = useState(false); // To show loading spinner
  const [aiResult, setAiResult] = useState(null);    // To store AI result (Clean/Overflow)
  const [fileToUpload, setFileToUpload] = useState(null); // To store actual file for API
  const [isSubmitting, setIsSubmitting] = useState(false); // For final submit loading
  const [areaStats, setAreaStats] = useState({ cleanedToday: 0, activeVehicles: 0, pendingBins: 0 });
  const [activeVehiclesnear, setActiveVehicles] = useState([]);

  const fetchNearbyVehicles = async (lat, lng) => {
    try {
      const res = await axios.get(`http://localhost:5001/citizen/active-vehicles-nearby?lat=${lat}&lng=${lng}`);
      if (res.data.success) {
        setActiveVehicles(res.data.vehicles);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAreaStats = async (lat, lng) => {
    try {
      const res = await axios.get(`http://localhost:5001/citizen/area-stats?lat=${lat}&lng=${lng}`);
      if (res.data.success) {
        setAreaStats(res.data.stats);
      }
    } catch (err) {
      console.error("Stats fetch error", err);
    }
  };

  const [dustbins, setDustbins] = useState([]);
  const [L, setL] = useState(null);
  const fetchDustbins = async () => {
    try {
      const token = localStorage.getItem("token");
      const officeId = localStorage.getItem("officeId");

      if (!officeId) {
        console.warn("Office ID not found in localStorage");
        return;
      }

      const res = await fetch(
        `http://localhost:5001/citizen/dustbin/list/${officeId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (data.success) {
        setDustbins(data.dustbins || []); // Ensure it's always an array
      }
    } catch (err) {
      console.error("Fetch Dustbins Error:", err);
      setDustbins([]); // Fallback to empty array on error
    }
  };

  // Handle logout
  const handleLogout = async () => {
    // 1. User se confirm karwana
    if (confirm("Are you sure you want to logout from SafaiMitra?")) {
      try {
        console.log("Citizen Logging out...");

        await axios.post("http://localhost:5001/citizen/logout");

        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        localStorage.removeItem("userId");
        localStorage.removeItem("officeId");

        // 4. Cookies manually clear karna
        document.cookie = "token=; Max-Age=0; path=/;";
        document.cookie = "role=; Max-Age=0; path=/;";

        // 5. Success alert aur Redirect
        alert("Logged out successfully!");
        router.replace("/"); // Next.js router use karke home par bhejna

      } catch (error) {
        console.error("Logout error:", error);
        // Error hone par bhi local data saaf kar dena chahiye safety ke liye
        localStorage.clear();
        router.replace("/");
      }
    }
  };

  // Mock user complaints data
  const mockComplaints = [
    {
      id: 1,
      location: "Sector 4 Market",
      status: "resolved",
      submittedAt: "2 days ago",
      resolvedAt: "Yesterday 3:30 PM",
      vehicle: "MH-09-AB-1234",
      image: null
    },
    {
      id: 2,
      location: "Main Road Junction",
      status: "in-progress",
      submittedAt: "5 hours ago",
      expectedTime: "Today 6:00 PM",
      vehicle: "MH-09-AB-5678",
      image: null
    }
  ];

  useEffect(() => {
    setIsMapReady(true);
    checkLocationPermission();
    fetchDustbins();

    (async function initLeaflet() {
      const leaflet = await import('leaflet');
      setL(leaflet.default);
      delete leaflet.default.Icon.Default.prototype._getIconUrl;
      leaflet.default.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    })();
  }, []);

  const getBinIcon = (status) => {
    if (!L) return null;
    const colors = {
      clean: '#10b981',
      overflow: '#f59e0b',
      missed: '#ef4444',
      pending: '#f59e0b'
    };
    const color = colors[status] || '#6b7280';

    return L.divIcon({
      className: 'custom-bin-icon',
      html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">🗑️</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  };

  const checkLocationPermission = async () => {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setLocationPermission(result.state);

        if (result.state === 'granted') {
          getCurrentLocation();
        }

        result.addEventListener('change', () => {
          setLocationPermission(result.state);
        });
      } catch (error) {
        console.log('Permission API not supported');
      }
    }
  };

  const getCurrentLocation = () => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setLoadingLocation(true);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setLocationPermission("granted");
          setLoadingLocation(false);

          // Reverse geocode to get address
          reverseGeocode(latitude, longitude);
          fetchAreaStats(latitude, longitude);
          fetchNearbyVehicles(latitude, longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationPermission("denied");
          setLoadingLocation(false);
          setAddress("Location access denied");
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();

      if (data.display_name) {
        // Extract meaningful parts of address
        const addressParts = data.display_name.split(',').slice(0, 3).join(',');
        setAddress(addressParts);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  const requestLocationPermission = () => {
    getCurrentLocation();
  };

  // Nearby bins - will be positioned relative to user location
  const getNearbyBins = () => {
    if (!userLocation) {
      // Return some default bins for initial display
      return [
        {
          id: 1,
          name: "Sector 4 Market Bin",
          coordinates: [23.2599, 77.4126],
          address: "Sector 4, Main Market, Near Vegetable Market",
          status: "clean",
          cleanedAt: "8:30 AM Today",
          vehicle: "MH-09-AB-1234",
          distance: "---",
          binCode: "BIN-A001"
        },
        {
          id: 2,
          name: "Main Road Junction Bin",
          coordinates: [23.2620, 77.4150],
          address: "Main Road Junction, Near Bus Stop",
          status: "overflow",
          reportedAt: "2 hours ago",
          vehicle: "Pending",
          distance: "---",
          binCode: "BIN-A002"
        },
        {
          id: 3,
          name: "New Market Area Bin",
          coordinates: [23.2580, 77.4100],
          address: "New Market Area, Near ATM",
          status: "clean",
          cleanedAt: "9:15 AM Today",
          vehicle: "MH-09-AB-5678",
          distance: "---",
          binCode: "BIN-A003"
        },
        {
          id: 4,
          name: "Park Junction Bin",
          coordinates: [23.2565, 77.4135],
          address: "Park Junction, Children's Park Area",
          status: "pending",
          reportedAt: "30 mins ago",
          vehicle: "On the way",
          distance: "---",
          binCode: "BIN-A004"
        },
        {
          id: 5,
          name: "Railway Station Bin",
          coordinates: [23.2610, 77.4115],
          address: "Railway Station Road, Near Platform 1",
          status: "overflow",
          reportedAt: "1 hour ago",
          vehicle: "Pending",
          distance: "---",
          binCode: "BIN-A005"
        },
      ];
    }

    const [userLat, userLng] = userLocation;

    return [
      {
        id: 1,
        name: "Sector 4 Market Bin",
        coordinates: [userLat + 0.002, userLng + 0.003],
        address: "Sector 4, Main Market, Near Vegetable Market",
        status: "clean",
        cleanedAt: "8:30 AM Today",
        vehicle: "MH-09-AB-1234",
        distance: "200m",
        binCode: "BIN-A001"
      },
      {
        id: 2,
        name: "Main Road Junction Bin",
        coordinates: [userLat + 0.004, userLng - 0.002],
        address: "Main Road Junction, Near Bus Stop",
        status: "overflow",
        reportedAt: "2 hours ago",
        vehicle: "Pending",
        distance: "450m",
        binCode: "BIN-A002"
      },
      {
        id: 3,
        name: "New Market Area Bin",
        coordinates: [userLat - 0.003, userLng + 0.001],
        address: "New Market Area, Near ATM",
        status: "clean",
        cleanedAt: "9:15 AM Today",
        vehicle: "MH-09-AB-5678",
        distance: "320m",
        binCode: "BIN-A003"
      },
      {
        id: 4,
        name: "Park Junction Bin",
        coordinates: [userLat - 0.001, userLng + 0.004],
        address: "Park Junction, Children's Park Area",
        status: "pending",
        reportedAt: "30 mins ago",
        vehicle: "On the way",
        distance: "180m",
        binCode: "BIN-A004"
      },
      {
        id: 5,
        name: "Railway Station Bin",
        coordinates: [userLat + 0.003, userLng - 0.003],
        address: "Railway Station Road, Near Platform 1",
        status: "overflow",
        reportedAt: "1 hour ago",
        vehicle: "Pending",
        distance: "410m",
        binCode: "BIN-A005"
      },
    ];
  };

  const getActiveVehicles = () => {
    if (!userLocation) return [];

    const [userLat, userLng] = userLocation;

    return [
      {
        id: 1,
        number: "MH-09-AB-1234",
        coordinates: [userLat + 0.005, userLng + 0.004],
        status: "active",
        route: "Zone A → Market Area → Park Junction",
        currentStop: "Market Area",
        stopsCompleted: 3,
        totalStops: 8,
        eta: "15 mins to your area"
      },
      {
        id: 2,
        number: "MH-09-AB-5678",
        coordinates: [userLat - 0.004, userLng - 0.003],
        status: "active",
        route: "Zone B → Residential → Commercial",
        currentStop: "Residential Block",
        stopsCompleted: 5,
        totalStops: 10,
        eta: "30 mins to your area"
      },
    ];
  };

  // --- NEW: Haversine Formula to calculate distance in meters ---
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Returns distance in meters
  };

  const activeVehicles = getActiveVehicles();

  const filteredBins = filterStatus === "all"
    ? dustbins
    : dustbins.filter(bin => bin.status === filterStatus);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // 1. Show Preview Immediately
      setFileToUpload(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(file);

      // 2. Start AI Verification
      setVerifying(true);
      setAiResult(null); // Reset previous result
      setStatus("verifying"); // Update UI status

      try {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("image", file);

        // If a bin is selected, send its ID for better context (optional)
        if (selectedBin) {
          formData.append("dustbinId", selectedBin._id);
        }

        // 3. Call the AI Prediction API (Same as Vehicle Page)
        const res = await axios.post("http://localhost:5001/api/predict", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        });

        const { status: apiStatus, confidence } = res.data;

        // 4. Update UI based on AI Logic
        setAiResult({ status: apiStatus, confidence });

        if (apiStatus === "empty" || apiStatus === "clean") {
          // If AI says clean, warn the citizen (Why report a clean bin?)
          alert(`⚠️ AI Analysis: This bin looks CLEAN (${confidence}%).`);
          setStatus("ready"); // Still allow them to submit if they insist
        } else {
          // If AI detects garbage/overflow
          setStatus("ready");
        }

      } catch (err) {
        console.error("AI Verification Failed:", err);
        alert("⚠️ AI could not verify the image. You can still submit manually.");
        setStatus("ready");
      } finally {
        setVerifying(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!image || !fileToUpload) {
      alert("📸 Please take a photo of the issue first!");
      return;
    }

    if (!selectedBin) {
      alert("🗑️ Please select a dustbin from the map!");
      return;
    }

    setIsSubmitting(true);

    // Prepare data for backend
    const formData = new FormData();
    formData.append("officeId", localStorage.getItem("officeId")); // Assuming generic office
    formData.append("citizenId", localStorage.getItem("userId"));
    formData.append("dustbinId", selectedBin._id);
    formData.append("complaintType", "Waste Dumping"); // Or dynamic based on AI
    formData.append("description", `Reported via App. AI Status: ${aiResult?.status || "Manual"}`);
    formData.append("latitude", selectedBin.latitude);
    formData.append("longitude", selectedBin.longitude);
    formData.append("area", selectedBin.area);
    formData.append("priority", aiResult?.status === "overflow" ? "high" : "medium");
    formData.append("image", fileToUpload); // Send actual file

    // Add vehicle details if valid (Optional, based on your schema)
    formData.append("status", "pending");

    try {
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:5001/citizen/complaint/create", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      // Success UI
      setShowNotification(true);
      setStatus("submitted");
      setImage(null);
      setFileToUpload(null);
      setAiResult(null);
      setSelectedBin(null);

      setTimeout(() => setShowNotification(false), 3000);

    } catch (error) {
      console.error("Submission error", error);
      alert("❌ Failed to submit complaint. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetake = () => {
    setImage(null);
    setFileToUpload(null); // Add this
    setAiResult(null);     // Add this
    setStatus("waiting");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // --- REPLACED: New Selection Logic with 100m Check ---
  const handleBinSelect = (bin) => {
    // 1. Check if user location exists
    if (!userLocation) {
      alert("📍 Waiting for your location... Please ensure GPS is on.");
      return;
    }

    // 2. Calculate Distance
    const distance = calculateDistance(
      userLocation[0], userLocation[1], // User Lat, Lng
      bin.latitude, bin.longitude       // Bin Lat, Lng
    );

    console.log(`Distance to bin: ${distance.toFixed(2)} meters`);

    // 3. Condition Check (100 Meters)
    // if (distance > 100) {
    //   alert(`🚫 You are too far! (${distance.toFixed(0)}m away).\nPlease get within 100m of the dustbin to select it.`);
    //   setSelectedBin(null); // Clear selection if previously selected
    // } else {
    // Allow Selection
    setSelectedBin(bin);
    // Optional: Update address text to confirm selection
    setAddress(`✅ Selected: ${bin.name} (${distance.toFixed(0)}m away)`);
    // }
  };

  // Add inside Component
  const fetchMyComplaints = async () => {
    try {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      const res = await axios.get(`http://localhost:5001/citizen/complaint/history/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setMyComplaints(res.data.complaints);
        console.log("My Complaints:", res.data.complaints);
      }
    } catch (err) {
      console.error("Error loading history", err);
    }
  };

  // Add to useEffect
  useEffect(() => {
    // ... existing calls
    fetchMyComplaints(); // <--- Call this here
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "resolved": return "green";
      case "in-progress": return "blue";
      case "pending": return "amber";
      default: return "gray";
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-100">
      {/* Success Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl animate-slide-in-right flex items-center gap-3 z-[9999]">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-bold">Success!</p>
            <p className="text-sm">Complaint registered successfully</p>
          </div>
        </div>
      )}

      {/* Location Permission Modal */}
      {locationPermission === "prompt" && selectedTab === "track" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl transform animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📍</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Enable Location Access</h2>
              <p className="text-gray-600">
                We need your location to show nearby bins, active vehicles, and track cleanliness in your area
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                <span className="text-lg">🗺️</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-800">See Nearby Bins</p>
                  <p className="text-xs text-gray-600">View all collection points near you</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                <span className="text-lg">🚛</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-800">Track Active Vehicles</p>
                  <p className="text-xs text-gray-600">Know when cleaning happens in your area</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                <span className="text-lg">📊</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-800">Get Accurate Updates</p>
                  <p className="text-xs text-gray-600">Receive location-based notifications</p>
                </div>
              </div>
            </div>

            <button
              onClick={requestLocationPermission}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all transform hover:scale-105 active:scale-95 mb-3"
            >
              Allow Location Access
            </button>

            <button
              onClick={() => setLocationPermission("denied")}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-blue-800 text-white shadow-lg relative z-50">
        <div className="container mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <button
                onClick={() => router.back()} // Back jane ke liye
                className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-all hover:scale-105 active:scale-95"
              >
                <span className="text-2xl font-bold">←</span>
              </button>

              <div>
                <h1 className="text-2xl font-bold">SafaiMitra Citizen</h1>
                <p className="text-sm text-blue-200">Report & Track Cleanliness</p>
              </div>
            </div>

            {/* Right Side: Live Status & Logout */}
            <div className="flex items-center gap-3">
              {/* Live Badge */}
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/10">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold text-white">LIVE</span>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout} // Aapka logout function
                className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/40 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-red-500/30 transition-all active:scale-95 group"
              >
                <span className="text-xs font-bold text-red-200 group-hover:text-white transition-colors">Logout</span>
                <span className="text-sm">🚀</span>
                {/* Agar Lucide use kar rahe hain to: <LogOut className="w-4 h-4 text-red-200" /> */}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="container mx-auto px-5 pb-4">
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedTab("report")}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all transform ${selectedTab === "report"
                ? "bg-white text-blue-800 shadow-lg scale-105"
                : "bg-white/10 text-white/70 hover:bg-white/20 hover:scale-102"
                }`}
            >
              📸 Report Issue
            </button>
            <button
              onClick={() => setSelectedTab("track")}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all transform ${selectedTab === "track"
                ? "bg-white text-blue-800 shadow-lg scale-105"
                : "bg-white/10 text-white/70 hover:bg-white/20 hover:scale-102"
                }`}
            >
              🗺️ Track Status
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-5 py-6 pb-32 relative z-10">
        {selectedTab === "report" ? (
          <>
            {/* Step 1: Location Status Card */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6 relative z-20">
              <div className="bg-blue-600 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                      <span className="text-lg font-bold text-gray-800">1</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Your Location</h3>
                      <p className="text-xs text-white/70">Enable to see nearby dustbins</p>
                    </div>
                  </div>

                  {locationPermission === "granted" ? (
                    <div className="flex items-center gap-2 bg-green-500 px-3 py-1.5 rounded-lg">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                      <span className="text-xs font-bold text-white">DETECTED</span>
                    </div>
                  ) : (
                    <button
                      onClick={requestLocationPermission}
                      className="bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all"
                    >
                      Enable
                    </button>
                  )}
                </div>
              </div>

              <div className="p-5">
                {loadingLocation ? (
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Detecting your location...</span>
                  </div>
                ) : locationPermission === "granted" && userLocation ? (
                  <div>
                    <p className="font-bold text-gray-800 mb-1">{address}</p>
                    <p className="text-xs text-gray-500">
                      {userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-amber-600 font-semibold">
                    ⚠️ Please enable location to submit complaints
                  </p>
                )}
              </div>
            </div>

            {/* Step 2: Interactive Map - Select Dustbin */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6 relative z-20">
              <div className="bg-purple-600 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                    <span className="text-lg font-bold text-gray-800">2</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Select Dustbin Location</h2>
                    <p className="text-sm text-white/90">Tap on a dustbin marker to select it</p>
                  </div>
                </div>
              </div>

              <div className="p-6">

                {/* Map */}
                <div className="h-96 rounded-2xl overflow-hidden border-2 border-gray-200 mb-4 relative z-0">
                  {isMapReady && typeof window !== 'undefined' && (
                    <MapContainer
                      center={dustbins.length > 0 ? dustbins[0].coordinates : [23.2599, 77.4126]}
                      zoom={14}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={true}
                      className="map-container-custom"
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap'
                      />

                      {userLocation && <MapUpdater center={userLocation} />}

                      {/* User location if available */}
                      {userLocation && (
                        <>
                          <Circle
                            center={userLocation}
                            radius={500}
                            pathOptions={{
                              color: 'rgba(59, 130, 246, 0.5)',
                              fillColor: 'rgba(59, 130, 246, 0.1)',
                              fillOpacity: 0.3
                            }}
                          />
                          <Marker position={userLocation}>
                            <Popup>
                              <div className="text-center">
                                <p className="font-bold">📍 You are here</p>
                                <p className="text-xs">{address}</p>
                              </div>
                            </Popup>
                          </Marker>
                        </>
                      )}

                      {/* All dustbins */}
                      {L && dustbins.map((bin) => (
                        <Marker
                          key={bin._id} // Fixed Key
                          position={[bin.latitude, bin.longitude]}
                          icon={getBinIcon(bin.status)}
                          eventHandlers={{ click: () => handleBinSelect(bin) }}
                        >
                          <Popup>
                            <div className="text-center min-w-[200px]">
                              <div className="mb-2">
                                <p className="font-bold text-base">{bin.name}</p>
                                <p className="text-xs text-gray-500 mb-1">{bin.area}</p>
                              </div>

                              <div className={`inline-block px-3 py-1 rounded-lg mb-2 ${bin.status === "clean" ? "bg-green-100 text-green-700" :
                                bin.status === "overflow" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                                }`}>
                                <span className="text-xs font-bold uppercase">
                                  {bin.status === "clean" ? "✅ Clean" :
                                    bin.status === "overflow" ? "⚠️ Overflow" : "⏳ Pending"}
                                </span>
                              </div>

                              <div className="text-left space-y-1 mb-3">
                                <p className="text-xs">
                                  <span className="font-semibold">📍</span> {bin.latitude}, {bin.longitude}
                                </p>
                                <p className="text-xs">
                                  <span className="font-semibold">📏</span> {bin.lastCleanedAt ? new Date(bin.lastCleanedAt).toLocaleDateString() : "Never"} {bin.lastCleanedAt ? new Date(bin.lastCleanedAt).toLocaleTimeString() : "N/A"}
                                </p>
                                {bin.status === "overflow" && (
                                  <p className="text-xs text-red-600">
                                    <span className="font-semibold">⚠️</span> Reported: {bin.reportedAt}
                                  </p>
                                )}
                              </div>

                              <button
                                onClick={() => handleBinSelect(bin)}
                                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-sm"
                              >
                                Select This Bin
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  )}
                </div>

                {/* Map Legend */}
                <div className="flex justify-center gap-4 flex-wrap text-xs relative z-10">
                  {[
                    { icon: "📍", label: "Your Location", color: "text-blue-600" },
                    { icon: "✅", label: "Clean Bin", color: "text-green-600" },
                    { icon: "⚠️", label: "Overflow Bin", color: "text-red-600" },
                    { icon: "⏳", label: "Pending", color: "text-amber-600" }
                  ].map((item, index) => (
                    <div key={index} className={`flex items-center gap-1 ${item.color} font-semibold`}>
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>

                {!selectedBin && (
                  <p className="text-center text-sm text-purple-600 font-semibold mt-4 relative z-10">
                    👆 Click on any dustbin marker to select it for your complaint
                  </p>
                )}
              </div>
            </div>

            {/* Step 3: Photo Card */}
            {/* Step 3: Photo Card */}
            <div className={`bg-white rounded-3xl shadow-xl overflow-hidden mb-6 transform transition-all duration-300 ${!selectedBin ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:shadow-2xl'}`}>
              <div className={`p-5 flex items-center gap-3 ${!selectedBin ? 'bg-gray-400' : 'bg-amber-500'}`}>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                  <span className="text-lg font-bold text-gray-800">3</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Take a Photo</h2>
                  <p className="text-sm text-white/90">Click a clear picture of the problem</p>
                </div>
              </div>

              <div className="p-6 relative">

                {/* Overlay for Disabled State */}
                {!selectedBin && (
                  <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center text-center p-4">
                    <div className="bg-white p-4 rounded-2xl shadow-lg border-2 border-red-100 animate-bounce">
                      <span className="text-3xl block mb-2">👆</span>
                      <p className="font-bold text-red-500">First Select a Dustbin</p>
                      <p className="text-xs text-gray-500">Tap a marker on the map above</p>
                    </div>
                  </div>
                )}

                <div
                  onClick={() => {
                    if (selectedBin) fileInputRef.current?.click();
                    else alert("🚫 Please select a dustbin from the map first!");
                  }}
                  className={`w-full h-60 rounded-2xl border-3 border-dashed overflow-hidden transition-all group
                    ${!selectedBin
                      ? 'border-gray-300 bg-gray-50'
                      : image
                        ? 'border-blue-300'
                        : 'border-blue-300 bg-blue-50 cursor-pointer hover:border-blue-500 hover:shadow-lg'
                    }`}
                >
                  {image ? (
                    <img src={image} alt="Uploaded" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-5 group-hover:scale-105 transition-transform">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-lg transition-all ${!selectedBin ? 'bg-gray-300' : 'bg-blue-800 group-hover:shadow-xl'}`}>
                        <span className="text-4xl">📸</span>
                      </div>
                      <h3 className={`text-lg font-bold mb-2 ${!selectedBin ? 'text-gray-400' : 'text-gray-800'}`}>
                        {selectedBin ? "Tap to Upload Photo" : "Upload Disabled"}
                      </h3>
                      <p className="text-sm text-gray-500 text-center">
                        {selectedBin ? "Take a photo of the overflowing bin or dirty area" : "Select a location to enable camera"}
                      </p>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={!selectedBin} // Disable input itself
                />

                {image && (
                  <button
                    onClick={handleRetake}
                    className="mt-4 mx-auto block px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all transform hover:scale-105 active:scale-95"
                  >
                    🔄 Take Another Photo
                  </button>
                )}
              </div>
            </div>

            {/* Step 4: Review & Submit Card */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6 relative z-20">
              <div className="bg-green-500 p-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                  <span className="text-lg font-bold text-gray-800">4</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Review & Submit</h2>
                  <p className="text-sm text-white/90">AI Verification Status</p>
                </div>
              </div>

              <div className="p-6">
                {/* Loading State */}
                {verifying && (
                  <div className="flex flex-col items-center justify-center p-4">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-sm font-bold text-blue-600">🤖 AI is analyzing photo...</p>
                  </div>
                )}

                {/* AI Result Display */}
                {!verifying && aiResult && (
                  <div className={`mb-4 p-3 rounded-xl border-l-4 ${aiResult.status === 'clean' || aiResult.status === 'empty' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                    }`}>
                    <p className="text-xs font-bold uppercase text-gray-500">AI Detection Result</p>
                    <p className={`text-lg font-bold ${aiResult.status === 'clean' || aiResult.status === 'empty' ? 'text-green-700' : 'text-red-700'
                      }`}>
                      {aiResult.status === 'clean' || aiResult.status === 'empty' ? "✅ Bin Looks Clean" : "⚠️ Garbage / Overflow"}
                    </p>
                    <p className="text-xs text-gray-500">Confidence: {aiResult.confidence}%</p>
                  </div>
                )}

                {/* Status Bar */}
                <div className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${status === "submitted" ? "bg-green-100" :
                  status === "ready" ? "bg-blue-100" : "bg-gray-100"
                  }`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 ${status === "submitted" ? "bg-green-500" :
                    status === "ready" ? "bg-blue-500" : "bg-gray-400"
                    }`}>
                    <span className="text-2xl">
                      {status === "submitted" ? "✅" : status === "ready" ? "👍" : "⏳"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Current Status</p>
                    <p className={`text-base font-bold ${status === "submitted" ? "text-green-600" :
                      status === "ready" ? "text-blue-600" : "text-gray-600"
                      }`}>
                      {status === "submitted" ? "Complaint Registered" :
                        status === "ready" ? "Ready to Submit" : "Waiting for Photo"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips Card */}
            <div className="bg-blue-50 rounded-3xl p-6 border-2 border-blue-200 mb-6 relative z-20">
              <h3 className="text-lg font-bold text-blue-800 mb-4">💡 Quick Tips</h3>
              <ul className="space-y-3">
                {[
                  "Enable location to see all nearby dustbins on map",
                  "Select the exact dustbin from the map",
                  "Take a clear photo showing the problem",
                  "Track your complaint status in real-time"
                ].map((tip, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-blue-500 text-xl">•</span>
                    <span className="text-sm text-blue-900 leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <>
            {/* 📜 Complaint History Section (Only keep this one) */}
            <div className="bg-white rounded-3xl p-6 shadow-xl mb-6 relative z-20">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <span>📜</span> My complaints History
                </h2>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  {myComplaints.length} Records
                </span>
              </div>

              {/* Scrollable List */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">

                {myComplaints.length === 0 ? (
                  <div className="text-center py-10 flex flex-col items-center opacity-60">
                    <div className="text-6xl mb-2">📭</div>
                    <p className="text-gray-500 font-medium">No complaints registered yet.</p>
                    <p className="text-xs text-gray-400">Your reports will appear here.</p>
                  </div>
                ) : (
                  myComplaints.map((complaint, index) => (
                    <div
                      // 🛠️ FIX: Safe Key Logic
                      key={complaint._id || complaint.id || index}
                      className="group flex gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md transition-all duration-300"
                    >
                      {/* Left: Image or Icon */}
                      <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-200 border border-gray-200 relative">
                        {complaint.ComimageUrl ? (
                          <img
                            src={complaint.ComimageUrl}
                            alt="Proof"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">🗑️</div>
                        )}

                        {/* Status Overlay on Image */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-[2px] py-1 flex justify-center">
                          <span className={`text-[10px] font-bold uppercase ${complaint.status === 'resolved' ? 'text-green-400' :
                            complaint.status === 'pending' ? 'text-yellow-400' : 'text-blue-400'
                            }`}>
                            {complaint.status}
                          </span>
                        </div>
                      </div>

                      {/* Right: Content */}
                      <div className="flex-1 flex flex-col justify-between">

                        {/* Header: Location & Time */}
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-gray-800 text-sm line-clamp-1">
                              {/* Safe Check for Dustbin Object */}
                              {typeof complaint.dustbinId === 'object' ? complaint.dustbinId.name : "Location Unavailable"}
                            </h4>
                            <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap bg-white px-2 py-0.5 rounded border border-gray-200">
                              {new Date(complaint.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {typeof complaint.dustbinId === 'object' ? complaint.dustbinId.area : complaint.area || "Area not available"}
                          </p>
                        </div>

                        {/* Footer: Details & Vehicle */}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold border ${complaint.status === 'resolved' ? 'bg-green-50 border-green-200 text-green-700' :
                              complaint.status === 'assigned' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                'bg-amber-50 border-amber-200 text-amber-700'
                              }`}>
                              {complaint.status === 'resolved' ? '✅ Cleaned' :
                                complaint.status === 'assigned' ? '🚛 On Way' : '⏳ Pending'}
                            </span>
                          </div>

                          {/* Vehicle Info (If Assigned) */}
                          {complaint.vehicle && complaint.vehicle !== "Not Assigned" && (
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 bg-gray-200 px-2 py-1 rounded-lg">
                              <span>🚛</span>
                              <span>{complaint.vehicle}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>



            {/* Today's Status Card */}
            {locationPermission === "granted" && (
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 shadow-xl mb-6 text-white relative z-20">
                <h2 className="text-xl font-bold mb-5">📊 Today's Status in Your Area</h2>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: "✅", number: areaStats.cleanedToday, label: "Cleaned Today" },
                    { icon: "🚛", number: areaStats.activeVehicles, label: "Vehicles Active" },
                    { icon: "⚠️", number: areaStats.pendingBins, label: "Pending" }
                  ].map((stat, index) => (
                    <div key={index} className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center transform transition-all hover:scale-105 hover:bg-white/30">
                      <div className="text-3xl mb-2">{stat.icon}</div>
                      <div className="text-2xl font-bold mb-1">{stat.number}</div>
                      <div className="text-xs font-semibold opacity-90">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Vehicles with Routes */}
            {locationPermission === "granted" && activeVehicles.length > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-xl mb-6 relative z-20">
                <h2 className="text-xl font-bold text-gray-800 mb-4">🚛 Active Vehicles & Routes</h2>

                <div className="space-y-4">
                  {activeVehiclesnear.map((vehicle) => (
                    <div key={vehicle.id} className="bg-blue-50 rounded-2xl p-5 border-2 border-blue-200">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                          <span className="text-2xl">🚛</span>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-bold text-gray-800 text-lg">{vehicle.number}</p>
                            <div className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-lg">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-xs font-bold text-green-700">ACTIVE</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-600">Route:</span>
                              <span className="text-sm text-gray-800">{vehicle.route}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-600">Current:</span>
                              <span className="text-sm font-bold text-blue-600">{vehicle.currentStop}</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-600">Progress:</span>
                                <span className="text-sm text-gray-800">{vehicle.stopsCompleted}/{vehicle.totalStops} stops</span>
                              </div>
                              <span className="text-sm font-bold text-green-600">{vehicle.eta}</span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${(vehicle.stopsCompleted / vehicle.totalStops) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nearby Bins List */}
            {locationPermission === "granted" && filteredBins.length > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-xl mb-6 relative z-20">
                <h2 className="text-xl font-bold text-gray-800 mb-4">📍 Nearby Collection Points</h2>

                <div className="space-y-3">
                  {filteredBins.map((bin) => (
                    <div key={bin._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl transition-all hover:bg-gray-100 hover:shadow-md">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${bin.status === "clean" ? "bg-green-100" :
                        bin.status === "overflow" ? "bg-amber-100" : "bg-gray-200"
                        }`}>
                        <span className="text-xl">
                          {bin.status === "clean" ? "✅" :
                            bin.status === "overflow" ? "⚠️" : "⏳"}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-bold text-gray-800">{bin.name}</p>
                          <span className="text-xs font-bold text-blue-600">{bin.distance}</span>
                        </div>
                        <p className="text-xs text-gray-600 truncate">
                          {bin.status === "clean"
                            ? `Cleaned at ${bin.cleanedAt} by ${bin.vehicle}`
                            : bin.status === "overflow"
                              ? `Overflow reported ${bin.reportedAt}`
                              : bin.vehicle}
                        </p>
                      </div>

                      {bin.status === "clean" && (
                        <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-bold">✓</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transparency Card */}
            <div className="bg-green-50 rounded-3xl p-6 border-2 border-green-200 text-center relative z-20">
              <div className="text-5xl mb-3">👁️</div>
              <h3 className="text-xl font-bold text-green-700 mb-2">Full Transparency</h3>
              <p className="text-sm text-green-800 leading-relaxed">
                All collection activities are verified with photos and GPS. You can see exactly when and where cleaning happened in your area.
              </p>
            </div>
          </>
        )}
      </main>

      {/* Bottom Submit Button - Only show in Report tab */}
      {selectedTab === "report" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-5 shadow-2xl z-[100]">
          <div className="container mx-auto max-w-2xl">
            <button
              onClick={handleSubmit}
              disabled={!image || !selectedBin || status === "submitted" || verifying}
              className={`w-full py-4 rounded-xl font-bold text-base transition-all transform flex items-center justify-center gap-2
                ${verifying
                  ? "bg-blue-600 text-white cursor-wait opacity-90"
                  : image && selectedBin && status !== "submitted"
                    ? "bg-green-500 hover:bg-green-600 text-white shadow-lg hover:scale-105 active:scale-95"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
            >
              {verifying ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>AI Analyzing Image...</span>
                </>
              ) : status === "submitted" ? (
                "✅ Submitted Successfully"
              ) : !selectedBin ? (
                "🗑️ Select Dustbin from Map"
              ) : !image ? (
                "📸 Take Photo to Continue"
              ) : (
                "Submit Your Complaint"
              )}
            </button>

            {(!image || !selectedBin) && status !== "submitted" && !verifying && (
              <p className="text-center text-sm text-gray-500 mt-3">
                {!selectedBin ? "🗑️ Please select a dustbin from the map first" : "📸 Please take a photo to continue"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Professional Loading Overlay */}
      {(verifying || isSubmitting) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-xs w-full">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">{verifying ? "🤖" : "☁️"}</span>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {verifying ? "AI Analysis" : "Sending Report"}
            </h3>
            <p className="text-sm text-gray-500 text-center leading-relaxed">
              {verifying
                ? "Checking if the photo is valid garbage..."
                : "Uploading your complaint to the server."}
            </p>

            <div className="mt-6 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full w-1/2 animate-progress-indefinite rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        .leaflet-container {
          font-family: inherit;
          z-index: 1 !important;
        }
        .map-container-custom {
          position: relative;
          z-index: 1 !important;
        }
        .leaflet-pane {
          z-index: 1 !important;
        }
        .leaflet-top,
        .leaflet-bottom {
          z-index: 2 !important;
        }
        .leaflet-popup {
          z-index: 3 !important;
        }
        @keyframes progress-indefinite {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-progress-indefinite {
          animation: progress-indefinite 1.5s infinite linear;
        }
      `}</style>
    </div>
  );
}