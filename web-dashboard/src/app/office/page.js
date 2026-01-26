'use client';

import React, { useState, useEffect } from "react";
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

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
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

export default function AdminPage() {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // Mock data for demonstration
  const stats = {
    total: 156,
    clean: 98,
    overflow: 42,
    missed: 16,
    activeVehicles: 12,
    pendingComplaints: 23
  };

  // Mock report data with locations
  const reports = [
    {
      id: 1,
      type: "overflow",
      location: "Sector 4, Main Market",
      coordinates: [23.2599, 77.4126],
      time: "2 hours ago",
      priority: "high",
      status: "pending",
      reportedBy: "Citizen",
      vehicle: "Not Assigned"
    },
    {
      id: 2,
      type: "clean",
      location: "Zone-A, Ward-12",
      coordinates: [23.2645, 77.4186],
      time: "30 mins ago",
      priority: "low",
      status: "completed",
      reportedBy: "Vehicle MH-09-AB-1234",
      vehicle: "MH-09-AB-1234"
    },
    {
      id: 3,
      type: "missed",
      location: "Kolar Road, Block-3",
      coordinates: [23.2520, 77.4050],
      time: "4 hours ago",
      priority: "high",
      status: "flagged",
      reportedBy: "Auto-Detection",
      vehicle: "MH-09-AB-5678"
    },
    {
      id: 4,
      type: "overflow",
      location: "MP Nagar Zone 1",
      coordinates: [23.2315, 77.4245],
      time: "1 hour ago",
      priority: "critical",
      status: "urgent",
      reportedBy: "Citizen",
      vehicle: "Not Assigned"
    },
    {
      id: 5,
      type: "clean",
      location: "New Market Area",
      coordinates: [23.2688, 77.4068],
      time: "15 mins ago",
      priority: "low",
      status: "completed",
      reportedBy: "Vehicle MH-09-AB-9012",
      vehicle: "MH-09-AB-9012"
    },
  ];

  useEffect(() => {
    setIsMapReady(true);
  }, []);

  const getFilteredReports = () => {
    if (selectedFilter === "all") return reports;
    return reports.filter(r => r.type === selectedFilter);
  };

  const getMarkerColor = (type) => {
    switch(type) {
      case "clean": return "#10b981";
      case "overflow": return "#f59e0b";
      case "missed": return "#ef4444";
      default: return "#6b7280";
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case "critical": return "#dc2626";
      case "high": return "#f59e0b";
      case "low": return "#10b981";
      default: return "#6b7280";
    }
  };

  const openReportDetails = (report) => {
    setSelectedReport(report);
    setModalVisible(true);
  };

  return (
    <div className="min-h-screen bg-purple-600 flex flex-col">
      {/* Header */}
      <header className="bg-purple-600 text-white px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-all hover:scale-105"
            >
              <span className="text-2xl font-bold">←</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold">CleanBin AI</h1>
              <p className="text-sm text-purple-200">Municipal Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold">LIVE</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-gray-100 overflow-y-auto">
        <div className="px-5 py-6 space-y-6">
          
          {/* Stats Overview */}
          <div className="space-y-3">
            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-100 rounded-2xl p-4 text-center shadow-md">
                <div className="text-3xl font-bold text-gray-800">{stats.total}</div>
                <div className="text-sm font-semibold text-gray-600">Total Bins</div>
              </div>
              <div className="bg-green-100 rounded-2xl p-4 text-center shadow-md">
                <div className="text-3xl font-bold text-green-600">{stats.clean}</div>
                <div className="text-sm font-semibold text-gray-600">Clean ✅</div>
              </div>
              <div className="bg-yellow-100 rounded-2xl p-4 text-center shadow-md">
                <div className="text-3xl font-bold text-amber-600">{stats.overflow}</div>
                <div className="text-sm font-semibold text-gray-600">Overflow ⚠️</div>
              </div>
              <div className="bg-red-100 rounded-2xl p-4 text-center shadow-md">
                <div className="text-3xl font-bold text-red-600">{stats.missed}</div>
                <div className="text-sm font-semibold text-gray-600">Missed 🚨</div>
              </div>
            </div>

            {/* Active Info Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-md">
                <span className="text-3xl">🚛</span>
                <div>
                  <div className="text-xl font-bold text-purple-600">{stats.activeVehicles}</div>
                  <div className="text-xs text-gray-600">Active Vehicles</div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-md">
                <span className="text-3xl">📋</span>
                <div>
                  <div className="text-xl font-bold text-purple-600">{stats.pendingComplaints}</div>
                  <div className="text-xs text-gray-600">Pending Actions</div>
                </div>
              </div>
            </div>
          </div>

          {/* Map View */}
          <div className="bg-white rounded-3xl p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800 mb-1">🗺️ Live City Map</h2>
              <p className="text-sm text-gray-600">Real-time bin status across Bhopal</p>
            </div>
            
            <div className="h-80 rounded-2xl overflow-hidden border-2 border-gray-200 mb-4">
              {isMapReady && typeof window !== 'undefined' && (
                <MapContainer
                  center={[23.2599, 77.4126]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />

                  {reports.map((report) => (
                    <Marker 
                      key={report.id} 
                      position={report.coordinates}
                      eventHandlers={{
                        click: () => openReportDetails(report)
                      }}
                    >
                      <Popup>
                        <div className="text-center">
                          <p className="font-bold mb-1">{report.location}</p>
                          <p className="text-xs text-gray-600">
                            {report.type === "clean" ? "✓ Clean" : 
                             report.type === "overflow" ? "! Overflow" : "✕ Missed"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{report.time}</p>
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
                <span className="text-sm font-semibold text-gray-600">Clean</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-sm font-semibold text-gray-600">Overflow</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-semibold text-gray-600">Missed</span>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {["all", "overflow", "missed", "clean"].map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-5 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${
                  selectedFilter === filter
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {filter === "all" ? "All Reports" : 
                 filter === "overflow" ? "⚠️ Overflow" :
                 filter === "missed" ? "🚨 Missed" : "✅ Clean"}
              </button>
            ))}
          </div>

          {/* Reports List */}
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Recent Reports ({getFilteredReports().length})
            </h3>
            
            <div className="space-y-3">
              {getFilteredReports().map((report) => (
                <div
                  key={report.id}
                  onClick={() => openReportDetails(report)}
                  className="bg-white rounded-2xl p-4 shadow-md cursor-pointer hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      report.type === "clean" ? "bg-green-100" :
                      report.type === "overflow" ? "bg-yellow-100" : "bg-red-100"
                    }`}>
                      <span className="text-2xl">
                        {report.type === "clean" ? "✅" :
                         report.type === "overflow" ? "⚠️" : "🚨"}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 truncate">{report.location}</p>
                      <p className="text-sm text-gray-600">{report.time}</p>
                    </div>

                    <div 
                      className="px-3 py-1.5 rounded-lg"
                      style={{ 
                        backgroundColor: `${getPriorityColor(report.priority)}20`,
                      }}
                    >
                      <span 
                        className="text-xs font-bold uppercase"
                        style={{ color: getPriorityColor(report.priority) }}
                      >
                        {report.priority}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-600">📍 {report.reportedBy}</span>
                    <span className="text-xs text-gray-600">🚛 {report.vehicle}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Report Detail Modal */}
      {modalVisible && selectedReport && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setModalVisible(false)}
        >
          <div 
            className="bg-white rounded-t-3xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Report Details</h2>
              <button
                onClick={() => setModalVisible(false)}
                className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition"
              >
                <span className="text-xl text-gray-600">✕</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-base font-semibold text-gray-600">Location:</span>
                <span className="text-base font-bold text-gray-800">{selectedReport.location}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-base font-semibold text-gray-600">Status:</span>
                <span 
                  className="text-base font-bold uppercase"
                  style={{ color: getMarkerColor(selectedReport.type) }}
                >
                  {selectedReport.type}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-base font-semibold text-gray-600">Priority:</span>
                <span 
                  className="text-base font-bold uppercase"
                  style={{ color: getPriorityColor(selectedReport.priority) }}
                >
                  {selectedReport.priority}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-base font-semibold text-gray-600">Reported By:</span>
                <span className="text-base font-bold text-gray-800">{selectedReport.reportedBy}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-base font-semibold text-gray-600">Vehicle:</span>
                <span className="text-base font-bold text-gray-800">{selectedReport.vehicle}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-base font-semibold text-gray-600">Time:</span>
                <span className="text-base font-bold text-gray-800">{selectedReport.time}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3">
              <button className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-800 transition">
                📞 Call Vehicle
              </button>
              <button className="flex-1 py-4 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold text-white transition">
                🚛 Assign Vehicle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}