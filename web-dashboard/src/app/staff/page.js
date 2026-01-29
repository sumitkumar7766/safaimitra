'use client';

import React, { useState, useEffect, useRef } from "react";
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import axios from "axios";

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Dynamically import map components with proper error handling
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

  const [currentStop, setCurrentStop] = useState(1);
  const [beforeImage, setBeforeImage] = useState(null);
  const [afterImage, setAfterImage] = useState(null);
  const [todayCompleted, setTodayCompleted] = useState(0);
  const [currentLocation, setCurrentLocation] = useState("Fetching location...");
  const [showMap, setShowMap] = useState(true);
  const [isClient, setIsClient] = useState(false);

  const [staff, setStaff] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeStops, setRouteStops] = useState([]); // 👈 pehle ye

  const beforeFileRef = useRef(null);
  const afterFileRef = useRef(null);

  // 👇 ab derived values banao
  const totalStops = routeStops.length;
  const routeCoordinates = routeStops.map(stop => stop.coordinates);
  const [driverLocation, setDriverLocation] = useState(null);

  const truckIcon =
    typeof window !== "undefined"
      ? new (require("leaflet").DivIcon)({
        html: `<div style="font-size:32px;">🚛</div>`,
        className: "truck-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
      : null;

  useEffect(() => {
    if (!navigator.geolocation) return;

    const token = localStorage.getItem("token");

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setDriverLocation([lat, lng]);

        try {
          await axios.post(
            "http://localhost:5001/staff/update-vehicle-location",
            { latitude: lat, longitude: lng },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        } catch (err) {
          console.error("Location send error:", err);
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");

    const goOffline = () => {
      navigator.sendBeacon(
        "http://localhost:5001/staff/set-offline",
        JSON.stringify({})
      );
    };

    window.addEventListener("beforeunload", goOffline);
    return () => window.removeEventListener("beforeunload", goOffline);
  }, []);

  const nextStop = routeStops[currentStop - 1];

  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // meters
  }

  function getBearing(lat1, lon1, lat2, lon2) {
    const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
      Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.cos((lon2 - lon1) * Math.PI / 180);
    const brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
  }

  let distance = null;
  let bearing = null;

  if (driverLocation && nextStop) {
    distance = getDistance(
      driverLocation[0],
      driverLocation[1],
      nextStop.coordinates[0],
      nextStop.coordinates[1]
    );

    bearing = getBearing(
      driverLocation[0],
      driverLocation[1],
      nextStop.coordinates[0],
      nextStop.coordinates[1]
    );
  }

  useEffect(() => {
    setIsClient(true);

    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get("http://localhost:5001/staff/dashboard", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const { staff, vehicle, route, dustbins } = res.data;

        setStaff(staff);
        setVehicle(vehicle);
        setRoute(route);

        // Dustbins → Stops format
        const stops = dustbins.map((d, index) => ({
          id: index + 1,
          name: d.name,
          coordinates: [d.latitude, d.longitude],
          status: "pending",
          completedAt: null,
        }));

        setRouteStops(stops);
        console.log("The dashboard Data:", JSON.stringify(res.data.dustbins, null, 2));
      } catch (err) {
        console.error("Dashboard Load Error:", err);
        alert("Failed to load route data");
      }
    };

    const fetchStaffProfile = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get("http://localhost:5001/staff/userdata", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.data.success) {
          setStaff(res.data.user);
          console.log(res.data.user);
        }
      } catch (err) {
        console.error("Staff Profile Load Error:", err);
      }
    };

    fetchDashboard();
    fetchStaffProfile();

    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
      });
    }
  }, []);



  useEffect(() => {
    setIsClient(true);

    // Fix Leaflet icons
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
      });
    }

    const currentStopData = routeStops[currentStop - 1];
    if (currentStopData) {
      setCurrentLocation(currentStopData.name.split(" - ")[1]);
    }
  }, [currentStop, routeStops]);

  const handleBeforeImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBeforeImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAfterImage = (e) => {
    if (!beforeImage) {
      alert("📸 Please take a BEFORE photo first!");
      return;
    }
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAfterImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleMarkComplete = () => {
    if (!beforeImage || !afterImage) {
      alert("📸 Please take both BEFORE and AFTER photos!");
      return;
    }

    if (confirm(`Mark Stop ${currentStop} complete?`)) {
      if (currentStop < totalStops) {
        setCurrentStop(currentStop + 1);
        setTodayCompleted(todayCompleted + 1);
        setBeforeImage(null);
        setAfterImage(null);
        if (beforeFileRef.current) beforeFileRef.current.value = "";
        if (afterFileRef.current) afterFileRef.current.value = "";
      } else {
        alert("🎉 Route Completed!");
      }
    }
  };

  const handleLogout = async () => {
    if (!confirm("Are you sure you want to logout?")) return;

    try {
      const token = localStorage.getItem("token");

      // Driver ko offline mark karo
      await axios.post(
        "http://localhost:5001/staff/set-offline",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Logout API
      await axios.post(
        "http://localhost:5001/staff/logout",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Clear client-side data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");

      document.cookie = "token=; Max-Age=0; path=/;";
      document.cookie = "role=; Max-Age=0; path=/;";

      router.replace("/"); // back to login
      alert("Logged out successfully!");
    }
  };

  const skipStop = () => {
    if (confirm("⚠️ Mark this stop as MISSED?")) {
      if (currentStop < totalStops) {
        setCurrentStop(currentStop + 1);
      }
      alert("🚨 Stop flagged and reported");
    }
  };

  // Map center
  const mapCenter =
    routeStops.length > 0
      ? routeStops[0].coordinates
      : [0, 0]; // fallback

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-30">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo + Title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🚛</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">SafaiMitra Driver</h1>
                <p className="text-xs text-gray-600">
                  {vehicle ? vehicle.vehicleNumber : "No Vehicle"}
                </p>
              </div>
            </div>

            {/* Right: Route + Logout */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-500">Route</p>
                <p className="text-sm font-semibold text-gray-800">
                  {route ? route.name : "No Route Assigned"}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
        {/* Stats */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-500 rounded-xl p-3 text-white text-center">
              <p className="text-2xl font-bold">{todayCompleted}</p>
              <p className="text-xs">Completed</p>
            </div>
            <div className="bg-blue-500 rounded-xl p-3 text-white text-center">
              <p className="text-2xl font-bold">{currentStop}</p>
              <p className="text-xs">Current</p>
            </div>
            <div className="bg-orange-500 rounded-xl p-3 text-white text-center">
              <p className="text-2xl font-bold">{totalStops - todayCompleted}</p>
              <p className="text-xs">Remaining</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-24 px-4 py-5 space-y-5">

        {/* Progress Card */}
        <div className="bg-white rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm text-gray-600 font-medium mb-1">Today's Progress</p>
              <p className="text-3xl font-bold text-blue-600">{todayCompleted} / {totalStops}</p>
            </div>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-blue-600">
                {Math.round((todayCompleted / totalStops) * 100)}%
              </span>
            </div>
          </div>

          <div className="bg-gray-200 rounded-full h-3 overflow-hidden">

            <div
              className="bg-gradient-to-r from-green-500 to-emerald-600 h-full transition-all duration-700"
              style={{ width: `${(todayCompleted / totalStops) * 100}%` }}
            />
          </div>

          <p className="text-sm text-gray-600 text-center mt-3">
            🎯 {totalStops - todayCompleted} stops remaining
          </p>
        </div>

        {/* Map Toggle */}
        <button
          onClick={() => setShowMap(!showMap)}
          className="w-full py-3 bg-white rounded-xl shadow-md font-semibold text-gray-700 hover:shadow-lg transition-shadow flex items-center justify-center gap-2"
        >
          <span className="text-xl">{showMap ? "📋" : "🗺️"}</span>
          <span>{showMap ? "Show Route List" : "Show Map"}</span>
        </button>

        {/* Map View */}
        {showMap && (
          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-3">🗺️ Route Map</h2>

            <div className="h-80 rounded-xl overflow-hidden border-2 border-gray-200 relative z-0">
              {isClient && (
                <MapContainer
                  key={mapCenter.join(",")}
                  center={mapCenter}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                  />

                  <Polyline
                    positions={routeCoordinates}
                    pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.7 }}
                  />

                  {routeStops.map((stop) => (
                    <Marker key={stop.id} position={stop.coordinates}>
                      <Popup>
                        <div className="text-center">
                          <p className="font-bold">{stop.name}</p>
                          <p className="text-xs text-gray-600">
                            {stop.status === "completed" ? `✅ ${stop.completedAt}` :
                              stop.status === "current" ? "📍 Current" : "⏳ Pending"}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {driverLocation && truckIcon && (
                    <Marker position={driverLocation} icon={truckIcon}>
                      <Popup>🚛 You are here</Popup>
                    </Marker>
                  )}
                </MapContainer>
              )}
            </div>
            {driverLocation && nextStop && (
              <div className="bg-white rounded-xl p-3 shadow mt-3 text-center">
                <p className="text-sm font-semibold text-gray-700">
                  Next Stop: {nextStop.name}
                </p>
                <p className="text-xs text-gray-600">
                  Distance: {(distance / 1000).toFixed(2)} km
                </p>
                <div
                  className="text-4xl mt-2 transition-transform"
                  style={{ transform: `rotate(${bearing}deg)` }}
                >
                  ➤
                </div>
              </div>
            )}
          </div>
        )}

        {/* Route List */}
        {!showMap && (
          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">📍 All Stops</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {routeStops.map((stop) => (
                <div
                  key={stop.id}
                  className={`flex items-center gap-3 p-4 rounded-xl ${stop.status === "current"
                    ? "bg-blue-100 border-2 border-blue-500"
                    : stop.status === "completed"
                      ? "bg-green-50 border border-green-200"
                      : "bg-gray-50 border border-gray-200"
                    }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${stop.status === "completed" ? "bg-green-500 text-white" :
                      stop.status === "current" ? "bg-blue-500 text-white" :
                        "bg-gray-300 text-gray-600"
                      }`}
                  >
                    {stop.status === "completed" ? "✓" :
                      stop.status === "current" ? "📍" : stop.id}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{stop.name}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {stop.status === "completed" ? `✅ ${stop.completedAt}` :
                        stop.status === "current" ? "🚛 In Progress" :
                          "⏳ Pending"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Stop */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <span className="text-xl font-bold text-blue-600">{currentStop}</span>
              </div>
              <div>
                <h2 className="text-lg font-bold">Current Stop</h2>
                <p className="text-sm opacity-90">{currentLocation}</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Before Photo */}
            <div>
              <label className="block text-base font-bold text-gray-800 mb-3">
                📸 BEFORE Photo
              </label>
              <div
                onClick={() => beforeFileRef.current?.click()}
                className="w-full h-56 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 overflow-hidden cursor-pointer hover:border-blue-500 transition-colors"
              >
                {beforeImage ? (
                  <div className="relative w-full h-full">
                    <img src={beforeImage} alt="Before" className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 bg-green-500 px-4 py-2 rounded-lg">
                      <span className="text-white font-bold text-sm">✅ BEFORE</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-3">
                      <span className="text-3xl">📸</span>
                    </div>
                    <p className="font-semibold text-gray-800">Tap to take photo</p>
                    <p className="text-sm text-gray-600 mt-1">Before cleaning</p>
                  </div>
                )}
              </div>
              <input
                ref={beforeFileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleBeforeImage}
                className="hidden"
              />
              {beforeImage && (
                <button
                  onClick={() => {
                    setBeforeImage(null);
                    if (beforeFileRef.current) beforeFileRef.current.value = "";
                  }}
                  className="mt-3 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                >
                  🔄 Retake
                </button>
              )}
            </div>

            {/* After Photo */}
            <div>
              <label className="block text-base font-bold text-gray-800 mb-3">
                📸 AFTER Photo
              </label>
              <div
                onClick={() => beforeImage && afterFileRef.current?.click()}
                className={`w-full h-56 rounded-xl border-2 border-dashed overflow-hidden transition-colors ${beforeImage
                  ? "border-blue-300 bg-blue-50 cursor-pointer hover:border-blue-500"
                  : "border-gray-300 bg-gray-100 cursor-not-allowed opacity-60"
                  }`}
              >
                {afterImage ? (
                  <div className="relative w-full h-full">
                    <img src={afterImage} alt="After" className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 bg-green-500 px-4 py-2 rounded-lg">
                      <span className="text-white font-bold text-sm">✅ AFTER</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${beforeImage ? "bg-blue-500" : "bg-gray-400"
                      }`}>
                      <span className="text-3xl">📸</span>
                    </div>
                    <p className={`font-semibold ${beforeImage ? "text-gray-800" : "text-gray-500"}`}>
                      {beforeImage ? "Tap to take photo" : "Take BEFORE first"}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">After cleaning</p>
                  </div>
                )}
              </div>
              <input
                ref={afterFileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleAfterImage}
                className="hidden"
                disabled={!beforeImage}
              />
              {afterImage && (
                <button
                  onClick={() => {
                    setAfterImage(null);
                    if (afterFileRef.current) afterFileRef.current.value = "";
                  }}
                  className="mt-3 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                >
                  🔄 Retake
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border-2 border-amber-200">
          <h3 className="text-lg font-bold text-amber-900 mb-3 flex items-center gap-2">
            <span className="text-xl">💡</span>
            Quick Tips
          </h3>
          <div className="space-y-2 text-sm text-amber-800">
            <p>• Take clear photos in good lighting</p>
            <p>• Use same angle for before & after</p>
            <p>• Complete stops in sequence</p>
            <p>• Attendance auto-recorded!</p>
          </div>
        </div>

      </main>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 px-4 py-4 flex gap-3 shadow-2xl z-20">
        <button
          onClick={skipStop}
          className="flex-1 py-4 bg-red-50 border-2 border-red-300 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors"
        >
          <div className="flex flex-col items-center">
            <span className="text-xl mb-1">⚠️</span>
            <span className="text-sm">Skip</span>
          </div>
        </button>
        <button
          onClick={handleMarkComplete}
          disabled={!beforeImage || !afterImage}
          className={`flex-1 py-4 font-bold rounded-xl transition-colors ${beforeImage && afterImage
            ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
        >
          <div className="flex flex-col items-center">
            <span className="text-xl mb-1">✅</span>
            <span className="text-sm">Complete</span>
          </div>
        </button>
      </div>
    </div>
  );
}
