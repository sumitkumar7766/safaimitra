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

  const ORS_API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY;

  const afterFileRef = useRef(null);

  // Derived values
  const totalStops = routeStops.length;
  const nextStop = routeStops.length > 0 ? routeStops[currentStop - 1] : null;

  if (!ORS_API_KEY) {
    console.error("❌ ORS API key missing in .env");
  }

  // --- 1. Setup Leaflet & Icons ---
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

  // --- 2. Geolocation Logic ---
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
          } catch (err) {
            console.error("Location send error:", err);
          }
        }
      },
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // --- 3. Offline Logic ---
  useEffect(() => {
    const goOffline = () => {
      navigator.sendBeacon("http://localhost:5001/staff/set-offline", JSON.stringify({}));
    };
    window.addEventListener("beforeunload", goOffline);
    return () => window.removeEventListener("beforeunload", goOffline);
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
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
      Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.cos((lon2 - lon1) * Math.PI / 180);
    const brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
  }

  let distance = 0;
  let bearing = 0;

  if (driverLocation && nextStop && nextStop.coordinates) {
    distance = getDistance(driverLocation[0], driverLocation[1], nextStop.coordinates[0], nextStop.coordinates[1]);
    bearing = getBearing(driverLocation[0], driverLocation[1], nextStop.coordinates[0], nextStop.coordinates[1]);
  }

  // --- 5. Fetch Route ---
  const fetchShortestRoute = async (start, end) => {
    if (!start || !end || start.length !== 2 || end.length !== 2) return;
    try {
      const res = await axios.post(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        {
          coordinates: [
            [Number(start[1]), Number(start[0])],
            [Number(end[1]), Number(end[0])]
          ],
        },
        {
          headers: {
            "Authorization": process.env.NEXT_PUBLIC_ORS_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/geo+json, application/json, */*"
          },
        }
      );
      const coords = res.data.features[0].geometry.coordinates;
      const leafletCoords = coords.map(c => [c[1], c[0]]);
      setRouteLine(leafletCoords);
    } catch (err) {
      console.error("ORS Route Error:", err);
    }
  };

  // --- 6. Data Fetching ---
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await axios.get("http://localhost:5001/staff/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data) {
          const { staff, vehicle, route, dustbins } = res.data;
          setStaff(staff);
          setVehicle(vehicle);
          setRoute(route);

          if (dustbins && Array.isArray(dustbins)) {
            const stops = dustbins.map((d, index) => ({
              id: d._id, // ✅ FIXED: Mapping real MongoDB ID
              displayId: index + 1,
              name: d.name,
              coordinates: [d.latitude, d.longitude],
              status: "pending",
              completedAt: null,
            }));
            setRouteStops(stops);
          }
        }
      } catch (err) {
        console.error("Dashboard Load Error:", err);
      }
    };
    fetchDashboard();

    const fetchStaffProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await axios.get("http://localhost:5001/staff/userdata", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          setStaff(res.data.user);
        }
      } catch (err) { console.error(err); }
    };
    fetchStaffProfile();
  }, []);

  // --- 7. Update Route ---
  useEffect(() => {
    if (driverLocation && routeStops.length > 0 && currentStop <= routeStops.length) {
      const next = routeStops[currentStop - 1];
      if (next && next.coordinates) {
        fetchShortestRoute(driverLocation, next.coordinates);
      }
    }
  }, [currentStop, driverLocation, routeStops]);

  // --- 8. Update Location Name ---
  useEffect(() => {
    const currentStopData = routeStops[currentStop - 1];
    if (currentStopData) {
      setCurrentLocation(
        currentStopData.name.includes(" - ") ? currentStopData.name.split(" - ")[1] : currentStopData.name
      );
    }
  }, [currentStop, routeStops]);

  // --- Handlers ---

  const handleAfterImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileToUpload(file);

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => setAfterImage(reader.result);
    reader.readAsDataURL(file);

    setVerifying(true);
    setIsCleanVerified(false);
    setSubmissionStatus("clean"); // Reset to default

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", file);

      if (routeStops[currentStop - 1]) {
        formData.append("dustbinId", routeStops[currentStop - 1].id);
      }

      const res = await axios.post("http://localhost:5001/api/predict", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const { status, confidence } = res.data;

      // 👇 UPDATED LOGIC HERE
      if (status !== "empty") {
        const confirmSubmit = confirm(
          `⚠️ AI Alert: Bin looks '${status.toUpperCase()}' (${confidence}%)\n\nAre you sure you want to submit?\n(This will be marked as Suspicious)`
        );

        if (confirmSubmit) {
          setIsCleanVerified(true);
          setSubmissionStatus("suspecies"); // 👈 Set status to suspicious if bypassed
        } else {
          // User cancelled
          setAfterImage(null);
          setFileToUpload(null);
          if (afterFileRef.current) afterFileRef.current.value = "";
          setIsCleanVerified(false);
        }
      } else {
        // AI confirms it is clean
        setIsCleanVerified(true);
        setSubmissionStatus("clean"); // 👈 Set status to clean
        alert(`✅ Clean verified (${confidence}%)`);
      }

    } catch (err) {
      console.error(err);
      if (confirm("⚠️ AI Verification failed. Submit manually as Suspicious?")) {
        setIsCleanVerified(true);
        setSubmissionStatus("suspecies"); // Fallback to suspicious on error override
      } else {
        setAfterImage(null);
        setFileToUpload(null);
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!afterImage || !isCleanVerified) {
      alert("❌ Bin not verified!");
      return;
    }
    if (!fileToUpload) {
      alert("❌ Image file lost. Please retake photo.");
      return;
    }

    if (confirm(`Mark Stop ${currentStop} complete?`)) {
      try {
        const token = localStorage.getItem("token");
        const currentStopData = routeStops[currentStop - 1];

        const formData = new FormData();
        formData.append("image", fileToUpload);
        formData.append("dustbinId", currentStopData.id);

        // 👇 SEND THE STATUS (Clean or Suspecies)
        formData.append("status", submissionStatus);

        const res = await axios.post(
          "http://localhost:5001/dustbin/mark-clean",
          formData,
          {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );

        if (res.data.success) {
          alert(`🎉 Saved! Status: ${submissionStatus.toUpperCase()}`);

          // Reset UI
          setRouteLine([]);
          if (currentStop < totalStops) {
            setCurrentStop((prev) => prev + 1);
            setTodayCompleted((prev) => prev + 1);
          } else {
            alert("🎉 Route Completed!");
          }

          setAfterImage(null);
          setFileToUpload(null);
          setIsCleanVerified(false);
          setSubmissionStatus("clean");
          if (afterFileRef.current) afterFileRef.current.value = "";
        }

      } catch (err) {
        console.error("Upload failed", err);
        alert("Failed to save progress.");
      }
    }
  };

  const handleLogout = async () => {
    if (!confirm("Are you sure you want to logout?")) return;
    try {
      const token = localStorage.getItem("token");
      if (token) {
        await axios.post("http://localhost:5001/staff/set-offline", {}, { headers: { Authorization: `Bearer ${token}` } });
        await axios.post("http://localhost:5001/staff/logout", {}, { headers: { Authorization: `Bearer ${token}` } });
      }
    } catch (err) { console.error(err); }
    finally {
      localStorage.clear();
      document.cookie = "token=; Max-Age=0; path=/;";
      router.replace("/");
    }
  };

  const skipStop = () => {
    if (confirm("⚠️ Mark this stop as MISSED?")) {
      if (currentStop < totalStops) {
        setCurrentStop(currentStop + 1);
      } else {
        alert("This is the last stop.");
      }
    }
  };

  const mapCenter = routeStops.length > 0 ? routeStops[0].coordinates : [20.5937, 78.9629];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-30">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🚛</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">SafaiMitra Driver</h1>
                <p className="text-xs text-gray-600">{vehicle ? vehicle.vehicleNumber : "No Vehicle"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-500">Route</p>
                <p className="text-sm font-semibold text-gray-800">{route ? route.name : "No Route"}</p>
              </div>
              <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors">
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
              <p className="text-2xl font-bold">{totalStops > 0 ? totalStops - todayCompleted : 0}</p>
              <p className="text-xs">Remaining</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-24 px-4 py-5 space-y-5">

        {/* Progress Bar */}
        <div className="bg-white rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm text-gray-600 font-medium mb-1">Today's Progress</p>
              <p className="text-3xl font-bold text-blue-600">{todayCompleted} / {totalStops}</p>
            </div>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-blue-600">{totalStops > 0 ? Math.round((todayCompleted / totalStops) * 100) : 0}%</span>
            </div>
          </div>
          <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-full transition-all duration-700" style={{ width: `${totalStops > 0 ? (todayCompleted / totalStops) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Map Toggle */}
        <button onClick={() => setShowMap(!showMap)} className="w-full py-3 bg-white rounded-xl shadow-md font-semibold text-gray-700 hover:shadow-lg transition-shadow flex items-center justify-center gap-2">
          <span className="text-xl">{showMap ? "📋" : "🗺️"}</span>
          <span>{showMap ? "Show Route List" : "Show Map"}</span>
        </button>

        {/* Map */}
        {showMap && (
          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-3">🗺️ Route Map</h2>
            <div className="h-80 rounded-xl overflow-hidden border-2 border-gray-200 relative z-0">
              {isClient && (
                <MapContainer key={mapCenter.join(",")} center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                  {routeLine.length > 0 && <Polyline positions={routeLine} pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.85 }} />}
                  {routeStops.map((stop) => (
                    <Marker key={stop.id} position={stop.coordinates}>
                      <Popup>
                        <div className="text-center">
                          <p className="font-bold">{stop.name}</p>
                          <p className="text-xs text-gray-600">{stop.status === "completed" ? `✅ ${stop.completedAt}` : stop.status === "current" ? "📍 Current" : "⏳ Pending"}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  {driverLocation && truckIcon && <Marker position={driverLocation} icon={truckIcon}><Popup>🚛 You are here</Popup></Marker>}
                </MapContainer>
              )}
            </div>
            {driverLocation && nextStop && (
              <div className="bg-white rounded-xl p-3 shadow mt-3 text-center">
                <p className="text-sm font-semibold text-gray-700">Next Stop: {nextStop.name}</p>
                <p className="text-xs text-gray-600">Distance: {(distance / 1000).toFixed(2)} km</p>
                <div className="text-4xl mt-2 transition-transform" style={{ transform: `rotate(${bearing}deg)` }}>➤</div>
              </div>
            )}
          </div>
        )}

        {/* List View */}
        {!showMap && (
          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">📍 All Stops</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {routeStops.map((stop) => (
                <div key={stop.id} className={`flex items-center gap-3 p-4 rounded-xl ${stop.status === "current" ? "bg-blue-100 border-2 border-blue-500" : stop.status === "completed" ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${stop.status === "completed" ? "bg-green-500 text-white" : stop.status === "current" ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-600"}`}>
                    {stop.status === "completed" ? "✓" : stop.status === "current" ? "📍" : stop.id}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{stop.name}</p>
                    <p className="text-xs text-gray-600 mt-1">{stop.status === "completed" ? `✅ ${stop.completedAt}` : stop.status === "current" ? "🚛 In Progress" : "⏳ Pending"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Card: Upload Photo */}
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
            {/* ONLY ONE PHOTO OPTION NOW */}
            <div>
              <label className="block text-base font-bold text-gray-800 mb-3">📸 Upload Proof (After Cleaning)</label>

              <div
                onClick={() => afterFileRef.current?.click()}
                className={`w-full h-56 rounded-xl border-2 border-dashed overflow-hidden transition-colors cursor-pointer hover:border-blue-500 ${afterImage ? "border-blue-300 bg-blue-50" : "border-gray-300 bg-gray-50"}`}
              >
                {afterImage ? (
                  <div className="relative w-full h-full">
                    <img src={afterImage} alt="After" className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 bg-green-500 px-4 py-2 rounded-lg">
                      <span className="text-white font-bold text-sm">✅ Ready to Submit</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-3">
                      <span className="text-3xl text-white">📸</span>
                    </div>
                    <p className="font-semibold text-gray-800">Tap to take photo</p>
                    <p className="text-sm text-gray-500 mt-1">Verify cleanliness</p>
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
              />

              {afterImage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAfterImage(null);
                    if (afterFileRef.current) afterFileRef.current.value = "";
                  }}
                  className="mt-3 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                >
                  🔄 Retake Photo
                </button>
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 px-4 py-4 flex gap-3 shadow-2xl z-20">
        <button onClick={skipStop} className="flex-1 py-4 bg-red-50 border-2 border-red-300 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors">
          <div className="flex flex-col items-center">
            <span className="text-xl mb-1">⚠️</span>
            <span className="text-sm">Skip</span>
          </div>
        </button>
        <button
          onClick={handleMarkComplete}
          disabled={!afterImage || !isCleanVerified || verifying}
          className={`flex-1 py-4 font-bold rounded-xl transition-colors ${afterImage && isCleanVerified
            ? submissionStatus === "suspecies"
              ? "bg-gradient-to-r from-yellow-500 to-orange-600 text-white" // Visual cue for suspicious
              : "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
        >
          <div className="flex flex-col items-center">
            <span className="text-xl mb-1">
              {submissionStatus === "suspecies" ? "⚠️" : "✅"}
            </span>
            <span className="text-sm">
              {verifying ? "Verifying..." : "Complete"}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}