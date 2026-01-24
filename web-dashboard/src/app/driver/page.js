'use client';

import React, { useState, useEffect, useRef } from "react";
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

// --- FIX 1: Import Leaflet CSS (Crucial for map to show) ---
import 'leaflet/dist/leaflet.css';

// --- FIX 2: Import Leaflet Core to fix broken icons ---
import L from 'leaflet';

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
  const totalStops = 8;
  const [beforeImage, setBeforeImage] = useState(null);
  const [afterImage, setAfterImage] = useState(null);
  const [todayCompleted, setTodayCompleted] = useState(3);
  const [currentLocation, setCurrentLocation] = useState("Fetching location...");
  const [showMap, setShowMap] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const beforeFileRef = useRef(null);
  const afterFileRef = useRef(null);

  // Mock route data with bin locations
  const routeStops = [
    {
      id: 1,
      name: "Stop 1 - Sector 4 Market",
      coordinates: [23.2599, 77.4126],
      status: "completed",
      completedAt: "8:30 AM"
    },
    {
      id: 2,
      name: "Stop 2 - Zone-A Ward-12",
      coordinates: [23.2645, 77.4186],
      status: "completed",
      completedAt: "9:15 AM"
    },
    {
      id: 3,
      name: "Stop 3 - New Market",
      coordinates: [23.2688, 77.4068],
      status: "completed",
      completedAt: "9:45 AM"
    },
    {
      id: 4,
      name: "Stop 4 - Kolar Road Block-3",
      coordinates: [23.2520, 77.4050],
      status: "current",
      completedAt: null
    },
    {
      id: 5,
      name: "Stop 5 - MP Nagar Zone 1",
      coordinates: [23.2315, 77.4245],
      status: "pending",
      completedAt: null
    },
    {
      id: 6,
      name: "Stop 6 - Ayodhya Bypass",
      coordinates: [23.2450, 77.4320],
      status: "pending",
      completedAt: null
    },
    {
      id: 7,
      name: "Stop 7 - Hoshangabad Road",
      coordinates: [23.2280, 77.4180],
      status: "pending",
      completedAt: null
    },
    {
      id: 8,
      name: "Stop 8 - Shahpura Lake",
      coordinates: [23.2550, 77.4280],
      status: "pending",
      completedAt: null
    },
  ];

  // Route polyline coordinates
  const routeCoordinates = routeStops.map(stop => stop.coordinates);

  useEffect(() => {
    setIsMapReady(true);

    // --- FIX 3: Fix for Broken Marker Icons in Next.js ---
    // This resets the icon paths to use online CDNs
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    const currentStopData = routeStops[currentStop - 1];
    if (currentStopData) {
      setCurrentLocation(currentStopData.name.split(" - ")[1]);
    }
  }, [currentStop]);

  const handleBeforeImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBeforeImage(reader.result);
      };
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
      reader.onloadend = () => {
        setAfterImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMarkComplete = () => {
    if (!beforeImage || !afterImage) {
      alert("📸 Please take both BEFORE and AFTER photos to mark this stop complete!");
      return;
    }
    
    if (confirm(`Stop ${currentStop} will be marked complete. Photos will be uploaded. Continue?`)) {
      if (currentStop < totalStops) {
        setCurrentStop(currentStop + 1);
        setTodayCompleted(todayCompleted + 1);
        setBeforeImage(null);
        setAfterImage(null);
        if (beforeFileRef.current) beforeFileRef.current.value = "";
        if (afterFileRef.current) afterFileRef.current.value = "";
      } else {
        alert("Route Completed! 🎉 All stops have been completed for today!");
      }
    }
  };

  const skipStop = () => {
    if (confirm("⚠️ This stop will be marked as MISSED and flagged in the system. Are you sure?")) {
      if (currentStop < totalStops) {
        setCurrentStop(currentStop + 1);
      }
      alert("🚨 Stop Flagged - This stop has been marked as MISSED and reported to municipal office.");
    }
  };

  return (
    <div className="min-h-screen bg-teal-700 flex flex-col">
      {/* Header */}
      <header className="bg-teal-700 text-white px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-all hover:scale-105"
            >
              <span className="text-2xl font-bold">←</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold">SafaiMitra Driver</h1>
              <p className="text-sm text-teal-200">Vehicle: MH-09-AB-1234</p>
            </div>
          </div>
          <button
            onClick={() => setShowMap(!showMap)}
            className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-all"
          >
            <span className="text-xl">{showMap ? "📋" : "🗺️"}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-gray-100 overflow-y-auto pb-24">
        <div className="px-5 py-6 space-y-6">
          
          {/* Progress Card */}
          <div className="bg-white rounded-3xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">Today's Route Progress</p>
                <p className="text-3xl font-bold text-teal-700">{todayCompleted} / {totalStops} Stops</p>
              </div>
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-teal-700">
                  {Math.round((todayCompleted / totalStops) * 100)}%
                </span>
              </div>
            </div>
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden mb-3">
              <div
                className="bg-green-500 h-full transition-all duration-500 rounded-full"
                style={{ width: `${(todayCompleted / totalStops) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 text-center">
              🎯 {totalStops - todayCompleted} stops remaining • Keep going!
            </p>
          </div>

          {/* Map View Section */}
          {showMap && (
            <div className="bg-white rounded-3xl p-6 shadow-xl">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-800 mb-1">🗺️ Your Route Map</h2>
                <p className="text-sm text-gray-600">Today's collection route with all stops</p>
              </div>
              
              {/* Added Z-index 0 to prevent map from overlapping fixed elements */}
              <div className="h-72 rounded-2xl overflow-hidden border-2 border-gray-200 mb-4 relative z-0">
                {isMapReady && typeof window !== 'undefined' && (
                  <MapContainer
                    center={[23.2520, 77.4180]}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                    
                    {/* Route Line */}
                    <Polyline
                      positions={routeCoordinates}
                      pathOptions={{
                        color: '#0F766E',
                        weight: 4,
                        opacity: 0.7,
                        dashArray: '10, 10'
                      }}
                    />

                    {/* Markers for each stop */}
                    {routeStops.map((stop) => (
                      <Marker key={stop.id} position={stop.coordinates}>
                        <Popup>
                          <div className="text-center">
                            <p className="font-bold mb-1">{stop.name}</p>
                            <p className="text-xs text-gray-600">
                              {stop.status === "completed" ? `✅ Completed at ${stop.completedAt}` : 
                               stop.status === "current" ? "📍 Current Stop" : "⏳ Pending"}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                )}
              </div>

              {/* Map Legend */}
              <div className="flex justify-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-semibold text-gray-600">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-semibold text-gray-600">Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-sm font-semibold text-gray-600">Pending</span>
                </div>
              </div>
            </div>
          )}

          {/* Route List */}
          <div className="bg-white rounded-3xl p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">📍 All Stops on Your Route</h3>
            <div className="space-y-3">
              {routeStops.map((stop) => (
                <div
                  key={stop.id}
                  className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                    stop.status === "current" 
                      ? "bg-blue-50 border-2 border-blue-500" 
                      : "bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                      stop.status === "completed" ? "bg-green-100 text-green-600" :
                      stop.status === "current" ? "bg-blue-100 text-blue-600" : 
                      "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {stop.status === "completed" ? "✓" : 
                     stop.status === "current" ? "📍" : stop.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">{stop.name}</p>
                    <p className="text-xs text-gray-600">
                      {stop.status === "completed" ? `✅ Done at ${stop.completedAt}` :
                       stop.status === "current" ? "🚛 Current Stop - In Progress" :
                       "⏳ Pending"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Stop Card */}
          <div className="bg-white rounded-3xl overflow-hidden shadow-xl">
            <div className="bg-teal-500 p-5 flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                <span className="text-lg font-bold text-teal-700">{currentStop}</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Current Stop</h2>
                <p className="text-sm text-white/90">Upload photos to mark complete</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Location Info */}
              <div className="flex items-center gap-4 p-4 bg-teal-5 rounded-2xl">
                <div className="w-12 h-12 bg-teal-700 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">📍</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-teal-700 mb-1">Current Location</p>
                  <p className="text-base font-bold text-teal-900">{currentLocation}</p>
                </div>
              </div>

              {/* Before Photo Section */}
              <div>
                <label className="block text-base font-bold text-gray-700 mb-3">
                  STEP 1: Before Collection
                </label>
                <div
                  onClick={() => beforeFileRef.current?.click()}
                  className="w-full h-52 rounded-2xl border-3 border-dashed border-teal-300 bg-teal-50 overflow-hidden cursor-pointer transition-all hover:border-teal-500 hover:shadow-lg"
                >
                  {beforeImage ? (
                    <div className="relative w-full h-full">
                      <img src={beforeImage} alt="Before" className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 bg-teal-500 px-4 py-2 rounded-lg">
                        <span className="text-white font-bold text-sm">✅ BEFORE</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-5">
                      <div className="w-16 h-16 bg-teal-700 rounded-full flex items-center justify-center mb-3 shadow-lg">
                        <span className="text-3xl">📸</span>
                      </div>
                      <p className="text-base font-semibold text-gray-800 mb-2">Tap to take BEFORE photo</p>
                      <p className="text-sm text-gray-600">Show the bin/area before cleaning</p>
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
                    className="mt-2 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition"
                  >
                    🔄 Retake
                  </button>
                )}
              </div>

              {/* After Photo Section */}
              <div>
                <label className="block text-base font-bold text-gray-700 mb-3">
                  STEP 2: After Collection
                </label>
                <div
                  onClick={() => beforeImage && afterFileRef.current?.click()}
                  className={`w-full h-52 rounded-2xl border-3 border-dashed overflow-hidden transition-all ${
                    beforeImage 
                      ? "border-teal-300 bg-teal-50 cursor-pointer hover:border-teal-500 hover:shadow-lg" 
                      : "border-gray-300 bg-gray-100 cursor-not-allowed"
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
                    <div className="flex flex-col items-center justify-center h-full p-5">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-lg ${
                        beforeImage ? "bg-teal-700" : "bg-gray-400"
                      }`}>
                        <span className="text-3xl">📸</span>
                      </div>
                      <p className={`text-base font-semibold mb-2 ${
                        beforeImage ? "text-gray-800" : "text-gray-500"
                      }`}>
                        {beforeImage ? "Tap to take AFTER photo" : "Take BEFORE photo first"}
                      </p>
                      <p className="text-sm text-gray-600">Show the cleaned bin/area</p>
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
                    className="mt-2 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition"
                  >
                    🔄 Retake
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Instructions Card */}
          <div className="bg-white rounded-3xl p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">📋 How It Works</h3>
            <div className="space-y-3">
              {[
                "Follow the route map to reach each stop",
                "Take BEFORE photo showing the bin condition",
                "Complete collection/cleaning work",
                "Take AFTER photo from same angle",
                "Mark complete - your attendance is auto-recorded!"
              ].map((step, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="text-base font-bold text-teal-700 w-6">{index + 1}.</span>
                  <p className="text-sm text-gray-700 leading-relaxed flex-1">{step}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Bottom Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-teal-700 px-5 py-4 flex gap-3 shadow-2xl z-20">
        <button
          onClick={skipStop}
          className="flex-1 py-4 bg-white/20 border-2 border-white/30 text-white font-bold rounded-2xl hover:bg-white/30 transition-all"
        >
          ⚠️ Skip & Flag
        </button>
        <button
          onClick={handleMarkComplete}
          disabled={!beforeImage || !afterImage}
          className={`flex-1 py-4 font-bold rounded-2xl transition-all ${
            beforeImage && afterImage
              ? "bg-green-500 hover:bg-green-600 text-white shadow-lg"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          ✅ Mark Complete
        </button>
      </div>
    </div>
  );
}