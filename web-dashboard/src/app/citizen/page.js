'use client';
import "leaflet/dist/leaflet.css";

import React, { useState, useEffect, useRef } from "react";
import dynamic from 'next/dynamic';

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

export default function CitizenPage() {
  const [image, setImage] = useState(null);
  const [status, setStatus] = useState("waiting");
  const [address, setAddress] = useState("Fetching your location...");
  const [selectedTab, setSelectedTab] = useState("report");
  const [isMapReady, setIsMapReady] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showNotification, setShowNotification] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setIsMapReady(true);
    setTimeout(() => setAddress("Sector 4, Main Market, Bhopal"), 1500);
  }, []);

  const nearbyBins = [
    {
      id: 1,
      name: "Sector 4 Market",
      coordinates: [23.2599, 77.4126],
      status: "clean",
      cleanedAt: "8:30 AM Today",
      vehicle: "MH-09-AB-1234"
    },
    {
      id: 2,
      name: "Main Road Junction",
      coordinates: [23.2620, 77.4150],
      status: "overflow",
      reportedAt: "2 hours ago",
      vehicle: "Not cleaned yet"
    },
    {
      id: 3,
      name: "New Market Area",
      coordinates: [23.2580, 77.4100],
      status: "clean",
      cleanedAt: "9:15 AM Today",
      vehicle: "MH-09-AB-5678"
    },
    {
      id: 4,
      name: "Your Location",
      coordinates: [23.2599, 77.4126],
      status: "pending",
      reportedAt: "Waiting",
      vehicle: "On the way"
    },
  ];

  const activeVehicles = [
    {
      id: 1,
      number: "MH-09-AB-1234",
      coordinates: [23.2645, 77.4186],
      status: "active",
      lastStop: "Zone-A Ward-12",
      stopsCompleted: 3
    },
    {
      id: 2,
      number: "MH-09-AB-5678",
      coordinates: [23.2520, 77.4050],
      status: "active",
      lastStop: "Kolar Road",
      stopsCompleted: 4
    },
  ];

  const filteredBins = filterStatus === "all" 
    ? nearbyBins 
    : nearbyBins.filter(bin => bin.status === filterStatus);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        setStatus("ready");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!image) {
      alert("📸 Please take a photo of the issue first!");
      return;
    }
    setStatus("submitted");
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleRetake = () => {
    setImage(null);
    setStatus("waiting");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getMarkerColor = (status) => {
    switch(status) {
      case "clean": return "#10b981";
      case "overflow": return "#f59e0b";
      case "pending": return "#6b7280";
      default: return "#9ca3af";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Success Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl animate-slide-in-right flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-bold">Success!</p>
            <p className="text-sm">Complaint registered successfully</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-blue-800 text-white shadow-lg">
        <div className="container mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-all hover:scale-105 active:scale-95">
                <span className="text-2xl font-bold">←</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold">SafaiMitra Citizen</h1>
                <p className="text-sm text-blue-200">Report & Track Cleanliness</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold">LIVE</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="container mx-auto px-5 pb-4">
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedTab("report")}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all transform ${
                selectedTab === "report"
                  ? "bg-white text-blue-800 shadow-lg scale-105"
                  : "bg-white/10 text-white/70 hover:bg-white/20 hover:scale-102"
              }`}
            >
              📸 Report Issue
            </button>
            <button
              onClick={() => setSelectedTab("track")}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all transform ${
                selectedTab === "track"
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
      <main className="container mx-auto px-5 py-6 pb-32">
        {selectedTab === "report" ? (
          <>
            {/* Step 1: Photo Card */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6 transform transition-all hover:shadow-2xl">
              <div className="bg-amber-500 p-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                  <span className="text-lg font-bold text-gray-800">1</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Take a Photo</h2>
                  <p className="text-sm text-white/90">Click a clear picture of the problem</p>
                </div>
              </div>

              <div className="p-6">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full h-60 rounded-2xl border-3 border-dashed ${
                    image ? 'border-blue-300' : 'border-blue-300 bg-blue-50'
                  } overflow-hidden cursor-pointer transition-all hover:border-blue-500 hover:shadow-lg group`}
                >
                  {image ? (
                    <img src={image} alt="Uploaded" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-5 group-hover:scale-105 transition-transform">
                      <div className="w-20 h-20 bg-blue-800 rounded-full flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-all">
                        <span className="text-4xl">📸</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">Tap to Upload Photo</h3>
                      <p className="text-sm text-gray-600 text-center">Take a photo of the overflowing bin or dirty area</p>
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

            {/* Step 2: Details Card */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6 transform transition-all hover:shadow-2xl">
              <div className="bg-green-500 p-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                  <span className="text-lg font-bold text-gray-800">2</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Review Details</h2>
                  <p className="text-sm text-white/90">Check location and status</p>
                </div>
              </div>

              <div className="p-6 space-y-3">
                {/* Location Info */}
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl transition-all hover:bg-blue-100">
                  <div className="w-12 h-12 bg-blue-800 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                    <span className="text-2xl">📍</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Your Location</p>
                    <p className="text-base font-bold text-gray-800">{address}</p>
                  </div>
                </div>

                {/* Status Info */}
                <div className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                  status === "submitted" ? "bg-green-100" :
                  status === "ready" ? "bg-amber-100" : "bg-gray-100"
                }`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 ${
                    status === "submitted" ? "bg-green-500" :
                    status === "ready" ? "bg-amber-500" : "bg-gray-400"
                  }`}>
                    <span className="text-2xl">
                      {status === "submitted" ? "✅" : status === "ready" ? "⚡" : "⏳"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Status</p>
                    <p className={`text-base font-bold ${
                      status === "submitted" ? "text-green-600" :
                      status === "ready" ? "text-amber-600" : "text-gray-600"
                    }`}>
                      {status === "submitted" ? "Successfully Submitted!" :
                       status === "ready" ? "Ready to Submit" : "Waiting for Photo"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips Card */}
            <div className="bg-blue-50 rounded-3xl p-6 border-2 border-blue-200 mb-6">
              <h3 className="text-lg font-bold text-blue-800 mb-4">💡 Quick Tips</h3>
              <ul className="space-y-3">
                {[
                  "Take a clear photo showing the problem",
                  "Your location is automatically detected",
                  "Track cleaning status in real-time",
                  "Get SMS updates on your complaint"
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
            {/* Filter Buttons */}
            <div className="bg-white rounded-2xl p-4 mb-6 shadow-lg">
              <p className="text-sm font-semibold text-gray-600 mb-3">Filter by Status:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "All", value: "all", icon: "🔍" },
                  { label: "Clean", value: "clean", icon: "✅" },
                  { label: "Overflow", value: "overflow", icon: "⚠️" },
                  { label: "Pending", value: "pending", icon: "⏳" }
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setFilterStatus(filter.value)}
                    className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all transform hover:scale-105 ${
                      filterStatus === filter.value
                        ? "bg-blue-800 text-white shadow-lg"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {filter.icon} {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Map View */}
            <div className="bg-white rounded-3xl p-6 shadow-xl mb-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-800 mb-1">🗺️ Live Area Status</h2>
                <p className="text-sm text-gray-600">See cleaned bins and active vehicles in your area</p>
              </div>
              
              <div className="h-80 rounded-2xl overflow-hidden mb-4 border-2 border-gray-200">
                {isMapReady && typeof window !== 'undefined' && (
                  <MapContainer
                    center={[23.2599, 77.4126]}
                    zoom={14}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    
                    <Circle
                      center={[23.2599, 77.4126]}
                      radius={500}
                      pathOptions={{
                        color: 'rgba(59, 130, 246, 0.5)',
                        fillColor: 'rgba(59, 130, 246, 0.1)',
                        fillOpacity: 0.3
                      }}
                    />

                    {nearbyBins.map((bin) => (
                      <Marker key={bin.id} position={bin.coordinates}>
                        <Popup>
                          <div className="text-center">
                            <p className="font-bold">{bin.name}</p>
                            <p className="text-sm">
                              {bin.status === "clean" 
                                ? `✅ Cleaned at ${bin.cleanedAt}` 
                                : bin.status === "overflow"
                                ? `⚠️ Overflow - ${bin.reportedAt}`
                                : "⏳ Pending"}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}

                    {activeVehicles.map((vehicle) => (
                      <Marker key={vehicle.id} position={vehicle.coordinates}>
                        <Popup>
                          <div className="text-center">
                            <p className="font-bold">🚛 {vehicle.number}</p>
                            <p className="text-sm">Active • {vehicle.stopsCompleted} stops completed</p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                )}
              </div>

              {/* Map Legend */}
              <div className="flex justify-center gap-6 flex-wrap">
                {[
                  { color: "bg-green-500", label: "Clean" },
                  { color: "bg-amber-500", label: "Overflow" },
                  { icon: "🚛", label: "Vehicle" }
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {item.icon ? (
                      <span className="text-lg">{item.icon}</span>
                    ) : (
                      <div className={`w-3 h-3 ${item.color} rounded-full`}></div>
                    )}
                    <span className="text-sm font-semibold text-gray-600">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Status Card */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 shadow-xl mb-6 text-white">
              <h2 className="text-xl font-bold mb-5">📊 Today's Status in Your Area</h2>
              
              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: "✅", number: "3", label: "Cleaned Today" },
                  { icon: "🚛", number: "2", label: "Vehicles Active" },
                  { icon: "⚠️", number: "1", label: "Pending" }
                ].map((stat, index) => (
                  <div key={index} className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center transform transition-all hover:scale-105 hover:bg-white/30">
                    <div className="text-3xl mb-2">{stat.icon}</div>
                    <div className="text-2xl font-bold mb-1">{stat.number}</div>
                    <div className="text-xs font-semibold opacity-90">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nearby Bins List */}
            <div className="bg-white rounded-3xl p-6 shadow-xl mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📍 Nearby Collection Points</h2>
              
              <div className="space-y-3">
                {filteredBins.map((bin) => (
                  <div key={bin.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl transition-all hover:bg-gray-100 hover:shadow-md">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      bin.status === "clean" ? "bg-green-100" :
                      bin.status === "overflow" ? "bg-amber-100" : "bg-gray-200"
                    }`}>
                      <span className="text-xl">
                        {bin.status === "clean" ? "✅" :
                         bin.status === "overflow" ? "⚠️" : "⏳"}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 mb-1">{bin.name}</p>
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

            {/* Active Vehicles List */}
            <div className="bg-white rounded-3xl p-6 shadow-xl mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">🚛 Active Vehicles Near You</h2>
              
              <div className="space-y-3">
                {activeVehicles.map((vehicle) => (
                  <div key={vehicle.id} className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl transition-all hover:bg-blue-100 hover:shadow-md">
                    <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">🚛</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 mb-1">{vehicle.number}</p>
                      <p className="text-xs text-gray-600 truncate">
                        Last: {vehicle.lastStop} • {vehicle.stopsCompleted} stops done
                      </p>
                    </div>

                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transparency Card */}
            <div className="bg-green-50 rounded-3xl p-6 border-2 border-green-200 text-center">
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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-5 shadow-2xl">
          <div className="container mx-auto max-w-2xl">
            <button
              onClick={handleSubmit}
              disabled={!image || status === "submitted"}
              className={`w-full py-4 rounded-xl font-bold text-base transition-all transform ${
                image && status !== "submitted"
                  ? "bg-green-500 hover:bg-green-600 text-white shadow-lg hover:scale-105 active:scale-95"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {status === "submitted" ? "✅ Submitted Successfully" : "Submit Your Complaint"}
            </button>
            {!image && (
              <p className="text-center text-sm text-gray-500 mt-3">📸 Please take a photo to continue</p>
            )}
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
        .leaflet-container {
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}