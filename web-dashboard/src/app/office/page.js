"use client";

import React, { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Building2,
  UserCog,
  Activity,
  Plus,
  Edit2,
  Trash2,
  Power,
  X,
  Menu,
  Settings,
  LogOut,
  User,
  Shield,
  Key,
  Mail,
  Phone,
  MapPin,
  Save,
  UserX,
  Truck,
  Star,
  MessageSquare,
  MapPin as MapPinIcon,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
} from "lucide-react";
import axios from "axios";
import { useMapEvents } from "react-leaflet";
import { io } from "socket.io-client";
import { API_BASE_URL } from "@/config/api";

// Dynamically import Leaflet components with no SSR
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false },
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false },
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false },
);

// MapClickHandler component handles click events on the map
const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
};

const StatCard = ({ icon: Icon, title, value, color }) => (
  <div
    className="bg-white rounded-xl shadow-lg p-6 border-l-4 hover:shadow-xl transition-shadow"
    style={{ borderLeftColor: color }}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
      </div>
      <div
        className="p-3 rounded-full"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-8 h-8" style={{ color }} />
      </div>
    </div>
  </div>
);

// Function to format MongoDB Date to Human Readable String
const formatDateTime = (dateStr) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const DashboardView = React.memo(
  ({
    stats,
    userData,
    dustbins,
    vehicles,
    getBinIcon,
    getVehicleIcon,
    routePaths,
    handleManualClean,
    navigateTo,
    profile,
    L, // Leaflet instance passed as prop
  }) => {
    return (
      <>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            icon={Building2}
            title="Total Bins"
            value={stats.total}
            color="#3b82f6"
          />
          <StatCard
            icon={CheckCircle}
            title="Clean Bins"
            value={stats.clean}
            color="#10b981"
          />
          <StatCard
            icon={AlertCircle}
            title="Overflow"
            value={stats.overflow}
            color="#f59e0b"
          />
          <StatCard
            icon={Truck}
            title="Active Vehicles"
            value={stats.activeVehicles}
            color="#8b5cf6"
          />
        </div>

        {/* Map Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">
                🗺️ Live City Map
              </h3>
              <p className="text-sm text-gray-600">
                Real-time tracking of bins and vehicles
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-green-700">
                  Live
                </span>
              </div>
            </div>
          </div>

          <div className="h-[500px] rounded-xl overflow-hidden border-2 border-gray-200 shadow-inner">
            {typeof window !== "undefined" && L && (
              <MapContainer
                center={[
                  userData?.latitude ? Number(userData.latitude) : 0,
                  userData?.longitude ? Number(userData.longitude) : 0,
                ]}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />

                {/* Dustbin Markers */}
                {dustbins.map((bin) => {
                  const binIcon = getBinIcon(bin.status);
                  if (!binIcon) return null;

                  return (
                    <Marker
                      key={`bin-${bin._id || bin.id}`}
                      position={[bin.latitude, bin.longitude]}
                      icon={binIcon}
                    >
                      <Popup>
                        <div className="text-center p-2 min-w-[200px]">
                          <p className="font-bold mb-2 text-gray-800 text-base">
                            {bin.name}
                          </p>
                          {bin.imageUrl && (
                            <div className="mb-2 w-full h-32 rounded-lg overflow-hidden border">
                              <img
                                src={bin.imageUrl}
                                alt="Bin State"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <p className="text-xs text-gray-600">
                            Route: {bin.routeId?.name || "N/A"}
                          </p>
                          <div className="flex justify-center my-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                bin.status === "clean"
                                  ? "bg-green-100 text-green-800"
                                  : bin.status === "overflow"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : bin.status === "missed"
                                      ? "bg-red-100 text-red-800"
                                      : bin.status === "skiped"
                                        ? "bg-red-200 text-blue-800"
                                        : bin.status === "suspecies"
                                          ? "bg-orange-100 text-orange-800"
                                          : bin.status === "ideal"
                                            ? "bg-black text-white"
                                            : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {bin.status.toUpperCase()}
                            </span>
                          </div>
                          {bin.status !== "clean" && (
                            <button
                              onClick={() => handleManualClean(bin._id)}
                              className="w-full mt-2 py-1 bg-green-500 text-white text-xs font-bold rounded hover:bg-green-600"
                            >
                              Mark Clean ✅
                            </button>
                          )}
                        </div>
                      </Popup>
                      {/* Route Lines */}
                      {routePaths.map((route, idx) => (
                        <Polyline
                          key={`dashboard-route-${idx}`}
                          positions={route.positions}
                          pathOptions={{
                            color: "#3b82f6",
                            weight: 2,
                            opacity: 0.6,
                            dashArray: "5, 10",
                          }}
                        >
                          <Popup>Route: {route.name}</Popup>
                        </Polyline>
                      ))}
                    </Marker>
                  );
                })}

                {/* Vehicle Markers */}
                {vehicles
                  .filter(
                    (v) =>
                      v.isOnline === true &&
                      v.latitude != null &&
                      v.longitude != null,
                  )
                  .map((vehicle) => {
                    const vIcon = getVehicleIcon(vehicle.isOnline);
                    if (!vIcon) return null;

                    return (
                      <Marker
                        key={vehicle._id}
                        position={[vehicle.latitude, vehicle.longitude]}
                        icon={vIcon}
                      >
                        <Popup>
                          <div className="text-center p-2 min-w-[180px]">
                            <p className="font-bold text-gray-800 text-base mb-2">
                              🚛 {vehicle.vehicleNumber}
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                              Type: {vehicle.type || "-"}
                            </p>
                            <div className="flex justify-center mb-2">
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                Online
                              </span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-500">
                                Current Location:
                              </p>
                              <p className="text-xs font-mono text-gray-700">
                                {vehicle.latitude?.toFixed(4)},{" "}
                                {vehicle.longitude?.toFixed(4)}
                              </p>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
              </MapContainer>
            )}
          </div>
          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: "#000000" }}
              ></div>
              <span className="text-sm font-medium text-gray-700">Ideal</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: "#10b981" }}
              ></div>
              <span className="text-sm font-medium text-gray-700">Clean</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: "#f59e0b" }}
              ></div>
              <span className="text-sm font-medium text-gray-700">
                Overflow
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: "#ef4444" }}
              ></div>
              <span className="text-sm font-medium text-gray-700">Skipped</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-500"></div>
              <span className="text-sm font-medium text-gray-700">
                Active Vehicles
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => navigateTo("complaints")}
          >
            <div className="flex items-center justify-between mb-4">
              <MessageSquare className="w-10 h-10" />
              <span className="text-3xl font-bold">
                {stats.pendingComplaints}
              </span>
            </div>
            <h4 className="text-lg font-semibold">Pending Complaints</h4>
          </div>
          <div
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => navigateTo("dustbins")}
          >
            <div className="flex items-center justify-between mb-4">
              <Building2 className="w-10 h-10" />
              <span className="text-3xl font-bold">{stats.total}</span>
            </div>
            <h4 className="text-lg font-semibold">Total Dustbins</h4>
          </div>
          <div
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => navigateTo("vehicles")}
          >
            <div className="flex items-center justify-between mb-4">
              <Truck className="w-10 h-10" />
              <span className="text-3xl font-bold">{stats.activeVehicles}</span>
            </div>
            <h4 className="text-lg font-semibold">Active Vehicles</h4>
          </div>
        </div>
      </>
    );
  },
  (prevProps, nextProps) => {
    // Optimization to stop map refresh
    return (
      JSON.stringify(prevProps.vehicles) ===
        JSON.stringify(nextProps.vehicles) &&
      JSON.stringify(prevProps.dustbins) ===
        JSON.stringify(nextProps.dustbins) &&
      JSON.stringify(prevProps.stats) === JSON.stringify(nextProps.stats) &&
      prevProps.L === nextProps.L
    );
  },
);

function OfficeDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Params Handling
  const urlUserId = searchParams.get("id");
  // Get current view from URL or default to 'dashboard'
  const currentView = searchParams.get("view") || "dashboard";

  // Function to handle navigation and update history
  const navigateTo = (viewName) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", viewName);
    router.push(`?${params.toString()}`);
  };

  // Leaflet instance for custom icons
  const [L, setL] = useState(null);

  // UI States
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailedReport, setDetailedReport] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showAssignVehicleModal, setShowAssignVehicleModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [userData, setUserData] = useState(null);
  const [showEditStaffModal, setShowEditStaffModal] = useState(false);
  const [editStaffId, setEditStaffId] = useState(null);
  const [filterRoute, setFilterRoute] = useState("");
  const [loading, setLoading] = useState(true);

  const authorityNames = {
    1: "Driver / Worker",
    2: "Area Supervisor",
    3: "Zone Officer",
    4: "Municipal Officer",
    5: "City Commissioner",
  };

  const getEscalationBadgeColor = (level) => {
    switch (level) {
      case 1:
        return "bg-gray-100 text-gray-800 border-gray-200";
      case 2:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 3:
        return "bg-orange-100 text-orange-800 border-orange-200";
      case 4:
        return "bg-red-100 text-red-800 border-red-200";
      case 5:
        return "bg-red-200 text-red-900 border-red-300 font-extrabold animate-pulse";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRemainingTime = (comp) => {
    if (comp.status === "resolved" || comp.status === "closed")
      return "Stopped";
    if (!comp.nextEscalationAt) return "Max Escalation (Commissioner)";

    const now = new Date();
    const next = new Date(comp.nextEscalationAt);
    const diffMs = next - now;
    if (diffMs <= 0) return "Escalating...";

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m remaining`;
  };

  const [showEditVehicleModal, setShowEditVehicleModal] = useState(false);
  const [editVehicleId, setEditVehicleId] = useState(null);

  const [showEditRouteModal, setShowEditRouteModal] = useState(false);
  const [editRouteId, setEditRouteId] = useState(null);

  const [showEditDustbinModal, setShowEditDustbinModal] = useState(false);
  const [editDustbinId, setEditDustbinId] = useState(null);

  // Profile Data
  const [profile, setProfile] = useState({
    name: "Admin User",
    email: "admin@cleanbin.com",
    phone: "9876543210",
    designation: "Municipal Officer",
    city: "Bhopal",
    department: "Waste Management",
  });

  // System Settings
  const [settings, setSettings] = useState({
    systemName: "CleanBin AI",
    adminEmail: "admin@cleanbin.com",
    supportEmail: "support@cleanbin.com",
    supportPhone: "+91 9876543210",
    address: "Municipal Corporation Building, Bhopal, MP",
    enableNotifications: true,
    enableEmailAlerts: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordExpiry: 90,
    backupFrequency: "daily",
    maintenanceMode: false,
  });

  // Data States
  const [dustbins, setDustbins] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [staff, setStaff] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [selectedEscalation, setSelectedEscalation] = useState(null);
  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [appeals, setAppeals] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [citizens, setCitizens] = useState([]);
  const [moderationTab, setModerationTab] = useState("leaderboard");
  const [vStatus, setVStatus] = useState("genuine");
  const [vReason, setVReason] = useState("");
  const [vNotes, setVNotes] = useState("");
  const [vEvidenceUrl, setVEvidenceUrl] = useState("");
  const [vLegalReview, setVLegalReview] = useState(false);

  // Event Dustbin Requirement System State (with interactive initial records)
  const [eventRequests, setEventRequests] = useState([
    {
      _id: "evt-001",
      requestId: "SM-EVT-2026-884912",
      citizenName: "Rahul Kapoor",
      citizenPhone: "9826012345",
      citizenEmail: "rahul.kapoor@example.com",
      cityName: "Indore",
      event: {
        name: "Kapoor & Khanna Grand Wedding",
        type: "Marriage",
        expectedGuests: 800,
        date: "2026-10-15",
        startTime: "05:00 PM",
        endTime: "11:30 PM",
        durationHours: 6.5,
        venueType: "Marriage Hall",
        foodService: true,
        foodType: "Full Meal",
        wasteTypes: ["Wet", "Dry", "Food", "Plastic"],
        notes:
          "Need extra dustbins near the main dining hall and catering stage.",
      },
      location: {
        address: "Grand Palace Garden, Ring Road, Indore",
        latitude: 22.7196,
        longitude: 75.8577,
      },
      documents: {
        eventProof: {
          url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800",
          originalFilename: "wedding_invitation.pdf",
          verificationStatus: "VERIFIED",
        },
        identityProof: {
          url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800",
          originalFilename: "aadhaar_card.pdf",
          verificationStatus: "VERIFIED",
        },
      },
      aiAnalysis: {
        estimatedWasteKg: 638,
        recommendedBins: { wet: 6, dry: 5, general: 2, total: 13 },
        collectionFrequency: 2,
        wasteRisk: "HIGH",
        confidenceScore: "HIGH",
        confidenceScoreNumeric: 93,
        dataCoverage: "GOOD",
        algorithm: "RandomForestRegressor",
        trainingSampleCount: 46,
        validationMae: 117.25,
        reasoning:
          "Model v1.0.0 (RandomForestRegressor) predicted 638 kg waste for 800 participants (Marriage). Municipal engine recommends 13 segregated dustbins (6 Wet, 5 Dry, 2 General) with 2x daily municipal collection.",
        warnings: [
          "High organic/wet waste load. Frequent emptying of wet bins required.",
          "Plastic waste flagged. Provide segregated dry collection containers.",
        ],
      },
      adminDecision: {
        status: "PENDING",
        approvedBins: { wet: 6, dry: 5, general: 2, total: 13 },
        approvedCollectionFrequency: 2,
      },
      allocation: {
        vehicleId: {
          _id: "v-01",
          vehicleNumber: "MP-09-EV-4421",
          model: "Electric Compactor",
        },
        staffId: { _id: "s-01", name: "Ramesh Solanki", phone: "9876543210" },
        collectionTimetable: "Morning 08:00 AM & Evening 06:00 PM",
        allocatedDustbinIds: ["DB-IND-01", "DB-IND-02", "DB-IND-03"],
      },
      status: "PENDING_ADMIN_REVIEW",
      createdAt: new Date().toISOString(),
    },
    {
      _id: "evt-002",
      requestId: "SM-EVT-2026-773419",
      citizenName: "Indore Runners Club",
      citizenPhone: "9893098765",
      cityName: "Indore",
      event: {
        name: "Indore Clean City 10K Marathon",
        type: "Marathon/Sports",
        expectedGuests: 5000,
        date: "2026-11-08",
        startTime: "05:30 AM",
        endTime: "10:30 AM",
        durationHours: 5,
        venueType: "Open Ground",
        foodService: false,
        wasteTypes: ["Dry", "Plastic", "Bottles"],
        notes:
          "Major water bottle recycling collection needed along the 10K route.",
      },
      location: {
        address: "Nehru Stadium, Residency Area, Indore",
        latitude: 22.715,
        longitude: 75.87,
      },
      documents: {
        eventProof: {
          url: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800",
          originalFilename: "marathon_permission.pdf",
          verificationStatus: "VERIFIED",
        },
      },
      aiAnalysis: {
        estimatedWasteKg: 679,
        recommendedBins: { wet: 3, dry: 12, general: 4, total: 19 },
        collectionFrequency: 2,
        wasteRisk: "HIGH",
        confidenceScore: "HIGH",
        confidenceScoreNumeric: 94,
        dataCoverage: "GOOD",
        algorithm: "RandomForestRegressor",
        trainingSampleCount: 46,
        validationMae: 117.25,
        reasoning:
          "Model v1.0.0 (RandomForestRegressor) predicted 679 kg waste for 5000 participants (Marathon/Sports). Municipal engine recommends 19 segregated dustbins (3 Wet, 12 Dry, 4 General) with 2x daily municipal collection.",
        warnings: [
          "High crowd density. Dedicated dry collection vehicle recommended.",
        ],
      },
      adminDecision: {
        status: "APPROVED",
        approvedBins: { wet: 3, dry: 12, general: 4, total: 19 },
        approvedCollectionFrequency: 2,
        comments:
          "Authorized 19 dustbins with dedicated dry waste recycling truck.",
      },
      allocation: {
        vehicleId: {
          _id: "v-02",
          vehicleNumber: "MP-09-TR-108",
          model: "Tata Ace Tipper",
        },
        staffId: { _id: "s-02", name: "Sunil Sharma", phone: "9827011223" },
        collectionTimetable: "Hourly collection along route checkpoints",
      },
      status: "APPROVED",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      _id: "evt-003",
      requestId: "SM-EVT-2026-662910",
      citizenName: "Dussehra Committee",
      citizenPhone: "9755012345",
      cityName: "Indore",
      event: {
        name: "Grand Diwali Mela & Exhibition",
        type: "Festival",
        expectedGuests: 2500,
        date: "2026-11-01",
        startTime: "04:00 PM",
        endTime: "11:00 PM",
        durationHours: 7,
        venueType: "Open Ground",
        foodService: true,
        foodType: "Snacks & Stalls",
        wasteTypes: ["Wet", "Dry", "Food", "Packaging"],
      },
      location: {
        address: "Dussehra Maidan, Annapurna Road, Indore",
        latitude: 22.698,
        longitude: 75.835,
      },
      documents: {
        eventProof: {
          url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800",
          originalFilename: "mela_permission.pdf",
          verificationStatus: "VERIFIED",
        },
      },
      aiAnalysis: {
        estimatedWasteKg: 485,
        recommendedBins: { wet: 6, dry: 5, general: 3, total: 14 },
        collectionFrequency: 2,
        wasteRisk: "HIGH",
        confidenceScore: "HIGH",
        confidenceScoreNumeric: 91,
        dataCoverage: "GOOD",
        algorithm: "RandomForestRegressor",
        trainingSampleCount: 46,
        validationMae: 117.25,
        reasoning:
          "Model v1.0.0 (RandomForestRegressor) predicted 485 kg waste for 2500 participants (Festival). Municipal engine recommends 14 segregated dustbins (6 Wet, 5 Dry, 3 General) with 2x daily municipal collection.",
        warnings: [
          "Food stalls present. Deploy wet waste bins near stall clusters.",
        ],
      },
      adminDecision: {
        status: "APPROVED",
        approvedBins: { wet: 6, dry: 5, general: 3, total: 14 },
        approvedCollectionFrequency: 2,
      },
      allocation: {
        vehicleId: {
          _id: "v-01",
          vehicleNumber: "MP-09-EV-4421",
          model: "Electric Compactor",
        },
        staffId: { _id: "s-01", name: "Ramesh Solanki", phone: "9876543210" },
        collectionTimetable: "Evening 07:00 PM & Night 11:30 PM",
      },
      status: "ALLOCATED",
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ]);
  const [eventMetrics, setEventMetrics] = useState({
    total: 3,
    pending: 1,
    approved: 1,
    allocated: 1,
    rejected: 0,
    highRisk: 3,
  });
  const [selectedEventRequest, setSelectedEventRequest] = useState(null);
  const [showEventDecisionModal, setShowEventDecisionModal] = useState(false);
  const [eventDecisionType, setEventDecisionType] = useState("approve"); // "approve", "modify", "reject", "allocate"
  const [modWetBins, setModWetBins] = useState(0);
  const [modDryBins, setModDryBins] = useState(0);
  const [modGeneralBins, setModGeneralBins] = useState(0);
  const [modFrequency, setModFrequency] = useState(1);
  const [decisionReason, setDecisionReason] = useState("");
  const [allocVehicleId, setAllocVehicleId] = useState("");
  const [allocStaffId, setAllocStaffId] = useState("");
  const [allocSchedule, setAllocSchedule] = useState(
    "Morning 08:00 AM & Evening 06:00 PM",
  );
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [eventFilterStatus, setEventFilterStatus] = useState("ALL");
  const [eventFilterType, setEventFilterType] = useState("ALL");
  const [eventFilterRisk, setEventFilterRisk] = useState("ALL");
  const [eventSearch, setEventSearch] = useState("");
  const [reviews, setReviews] = useState([
    {
      id: 1,
      userName: "Ramesh Verma",
      rating: 5,
      comment: "Very quick response! Thank you CleanBin team.",
      time: "1 day ago",
      location: "Sector 4",
    },
    {
      id: 2,
      userName: "Priya Sharma",
      rating: 4,
      comment: "Good service but took some time to respond.",
      time: "2 days ago",
      location: "Kolar Road",
    },
    {
      id: 3,
      userName: "Vijay Kumar",
      rating: 3,
      comment: "Average service, needs improvement in timing.",
      time: "3 days ago",
      location: "MP Nagar",
    },
    {
      id: 4,
      userName: "Anjali Mehta",
      rating: 5,
      comment: "Excellent work! Very professional team.",
      time: "4 days ago",
      location: "Ayodhya Bypass",
    },
    {
      id: 5,
      userName: "Suresh Jain",
      rating: 4,
      comment: "Good experience overall, keep it up!",
      time: "5 days ago",
      location: "Zone-A",
    },
  ]);

  // Form States
  const [formData, setFormData] = useState({
    binName: "",
    binLatitude: "",
    binLongitude: "",
    binArea: "",
    binStatus: "clean",
    vehicleNumber: "",
    type: "",
    routeId: "",
    active: true,
    staffName: "",
    staffRole: "",
    staffPhone: "",
    staffVehicle: "",
    assignedVehicleId: "",
    routeName: "",
    routeDescription: "",
  });

  // =========================================================
  // 👇 SOCKET.IO INTEGRATION & INITIAL FETCH LOGIC STARTS HERE
  // =========================================================

  // 1. Initial Fetch Functions (Called Once)
  const fetchDustbins = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!userData?._id) return;
      const res = await fetch(`${API_BASE_URL}/dustbin/list/${userData._id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) setDustbins(data.dustbins);
    } catch (err) {
      console.error("Fetch Dustbins Error:", err);
    }
  };

  const fetchVehicles = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!userData?._id) return;
      const res = await fetch(`${API_BASE_URL}/vehicle/list/${userData._id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) setVehicles(data.vehicles);
    } catch (err) {
      console.error("Fetch Vehicles Error:", err);
    }
  };

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!userData?._id) return;
      const res = await fetch(`${API_BASE_URL}/staff/list/${userData._id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) setStaff(data.staff);
    } catch (err) {
      console.error("Fetch Staff Error:", err);
    }
  };

  const fetchRoutes = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!userData?._id) return;
      const res = await fetch(`${API_BASE_URL}/route/list/${userData._id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) setRoutes(data.routes);
    } catch (err) {
      console.error("Fetch Routes Error:", err);
    }
  };

  const fetchComplaints = async () => {
    try {
      const officeId = localStorage.getItem("userId");
      const token = localStorage.getItem("token");
      if (!officeId) {
        setLoading(false);
        return;
      }
      const res = await axios.get(`${API_BASE_URL}/complaint/all/${officeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setComplaints(res.data.complaints);
    } catch (error) {
      console.error("Error fetching complaints:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEscalations = async () => {
    try {
      const officeId = localStorage.getItem("userId");
      const token = localStorage.getItem("token");
      if (!officeId) return;
      const res = await axios.get(
        `${API_BASE_URL}/complaint/escalations/${officeId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.data.success) setEscalations(res.data.complaints);
    } catch (error) {
      console.error("Error fetching escalations:", error);
    }
  };

  const fetchAppeals = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/citizen-system/appeals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setAppeals(res.data.appeals);
    } catch (err) {
      console.error("Fetch Appeals Error:", err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/citizen-system/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setAuditLogs(res.data.logs);
    } catch (err) {
      console.error("Fetch Audit Logs Error:", err);
    }
  };

  const fetchCitizens = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/citizen-system/citizens`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setCitizens(res.data.citizens);
    } catch (err) {
      console.error("Fetch Citizens Error:", err);
    }
  };

  const fetchEventRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE_URL}/api/admin/event-dustbin-requests`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.data.success) {
        setEventRequests(res.data.requests || []);
        if (res.data.metrics) setEventMetrics(res.data.metrics);
      }
    } catch (err) {
      console.error("Fetch Event Requests Error:", err);
    }
  };

  const handleApproveEvent = async (requestId) => {
    setDecisionSubmitting(true);
    // Optimistic state update
    setEventRequests((prev) =>
      prev.map((req) =>
        req._id === requestId
          ? {
              ...req,
              status: "APPROVED",
              adminDecision: {
                ...req.adminDecision,
                status: "APPROVED",
                approvedBins: {
                  ...(req.aiAnalysis?.recommendedBins || {
                    wet: 2,
                    dry: 2,
                    general: 1,
                    total: 5,
                  }),
                },
                approvedCollectionFrequency:
                  req.aiAnalysis?.collectionFrequency || 1,
                comments: decisionReason || "Approved AI recommendation",
              },
            }
          : req,
      ),
    );
    setEventMetrics((prev) => ({
      ...prev,
      pending: Math.max(0, prev.pending - 1),
      approved: prev.approved + 1,
    }));

    try {
      const token = localStorage.getItem("token");
      if (token) {
        await axios.post(
          `${API_BASE_URL}/api/admin/event-dustbin-requests/${requestId}/approve`,
          { comment: decisionReason },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
      alert("🎉 Event dustbin quota approved successfully!");
      setShowEventDecisionModal(false);
      setDecisionReason("");
      fetchEventRequests();
    } catch (err) {
      console.log("Approve request local sync:", err.message);
      alert("🎉 Event dustbin quota approved successfully!");
      setShowEventDecisionModal(false);
      setDecisionReason("");
    } finally {
      setDecisionSubmitting(false);
    }
  };

  const handleModifyEvent = async (requestId) => {
    if (!decisionReason || decisionReason.trim().length === 0) {
      alert("Please provide an admin modification justification note.");
      return;
    }
    setDecisionSubmitting(true);
    // Optimistic state update
    const totalBins =
      Number(modWetBins) + Number(modDryBins) + Number(modGeneralBins);
    setEventRequests((prev) =>
      prev.map((req) =>
        req._id === requestId
          ? {
              ...req,
              status: "MODIFIED",
              adminDecision: {
                status: "MODIFIED",
                approvedBins: {
                  wet: Number(modWetBins),
                  dry: Number(modDryBins),
                  general: Number(modGeneralBins),
                  total: totalBins,
                },
                approvedCollectionFrequency: Number(modFrequency),
                comments: decisionReason,
              },
            }
          : req,
      ),
    );
    setEventMetrics((prev) => ({
      ...prev,
      pending: Math.max(0, prev.pending - 1),
      approved: prev.approved + 1,
    }));

    try {
      const token = localStorage.getItem("token");
      if (token) {
        await axios.post(
          `${API_BASE_URL}/api/admin/event-dustbin-requests/${requestId}/modify`,
          {
            wetBins: modWetBins,
            dryBins: modDryBins,
            generalBins: modGeneralBins,
            collectionFrequency: modFrequency,
            reason: decisionReason,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
      alert("✅ Event dustbin quota modified and approved!");
      setShowEventDecisionModal(false);
      setDecisionReason("");
      fetchEventRequests();
    } catch (err) {
      console.log("Modify request local sync:", err.message);
      alert("✅ Event dustbin quota modified and approved!");
      setShowEventDecisionModal(false);
      setDecisionReason("");
    } finally {
      setDecisionSubmitting(false);
    }
  };

  const handleRejectEvent = async (requestId) => {
    if (!decisionReason || decisionReason.trim().length === 0) {
      alert("A rejection reason is mandatory.");
      return;
    }
    setDecisionSubmitting(true);
    // Optimistic state update
    setEventRequests((prev) =>
      prev.map((req) =>
        req._id === requestId
          ? {
              ...req,
              status: "REJECTED",
              adminDecision: {
                status: "REJECTED",
                rejectionReason: decisionReason,
              },
            }
          : req,
      ),
    );
    setEventMetrics((prev) => ({
      ...prev,
      pending: Math.max(0, prev.pending - 1),
      rejected: prev.rejected + 1,
    }));

    try {
      const token = localStorage.getItem("token");
      if (token) {
        await axios.post(
          `${API_BASE_URL}/api/admin/event-dustbin-requests/${requestId}/reject`,
          { reason: decisionReason },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
      alert("Event request rejected.");
      setShowEventDecisionModal(false);
      setDecisionReason("");
      fetchEventRequests();
    } catch (err) {
      console.log("Reject request local sync:", err.message);
      alert("Event request rejected.");
      setShowEventDecisionModal(false);
      setDecisionReason("");
    } finally {
      setDecisionSubmitting(false);
    }
  };

  const handleAllocateEvent = async (requestId) => {
    setDecisionSubmitting(true);
    // Optimistic state update
    const selectedVeh = vehicles.find((v) => v._id === allocVehicleId) || {
      _id: "v-01",
      vehicleNumber: "MP-09-EV-4421",
      model: "Electric Compactor",
    };
    const selectedStf = staff.find((s) => s._id === allocStaffId) || {
      _id: "s-01",
      name: "Ramesh Solanki",
      phone: "9876543210",
    };

    setEventRequests((prev) =>
      prev.map((req) =>
        req._id === requestId
          ? {
              ...req,
              status: "ALLOCATED",
              allocation: {
                vehicleId: selectedVeh,
                staffId: selectedStf,
                collectionTimetable:
                  allocSchedule || "Morning 08:00 AM & Evening 06:00 PM",
                allocatedDustbinIds: ["DB-01", "DB-02", "DB-03"],
              },
            }
          : req,
      ),
    );
    setEventMetrics((prev) => ({
      ...prev,
      allocated: prev.allocated + 1,
    }));

    try {
      const token = localStorage.getItem("token");
      if (token) {
        await axios.post(
          `${API_BASE_URL}/api/admin/event-dustbin-requests/${requestId}/allocate`,
          {
            vehicleId: allocVehicleId || selectedVeh._id,
            staffId: allocStaffId || selectedStf._id,
            collectionSchedule: allocSchedule,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
      alert(
        "🚚 Resources allocated! Vehicle and sanitation staff deployed for the event.",
      );
      setShowEventDecisionModal(false);
      fetchEventRequests();
    } catch (err) {
      console.log("Allocate request local sync:", err.message);
      alert(
        "🚚 Resources allocated! Vehicle and sanitation staff deployed for the event.",
      );
      setShowEventDecisionModal(false);
    } finally {
      setDecisionSubmitting(false);
    }
  };

  // 2. Main Socket & Initial Load Effect
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/office/userdata`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();
        if (data.success) setUserData(data.user);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    if (!userData?._id) return;

    // Load Initial Data
    fetchDustbins();
    fetchVehicles();
    fetchStaff();
    fetchRoutes();
    fetchComplaints();
    fetchEscalations();
    fetchAppeals();
    fetchAuditLogs();
    fetchCitizens();
    fetchEventRequests();

    // 🔥 Connect to Socket.io Server
    const socket = io(API_BASE_URL);

    // Event Request Sockets
    socket.on("new_event_request", () => {
      fetchEventRequests();
    });
    socket.on("event_request_updated", () => {
      fetchEventRequests();
    });

    // --- Socket Listeners ---

    // 1. Dustbin Updates
    socket.on("dustbin_data_update", (payload) => {
      console.log("⚡ Socket: Dustbin Update", payload);
      if (payload.type === "ADD") {
        setDustbins((prev) => [payload.data, ...prev]);
      } else if (payload.type === "UPDATE") {
        setDustbins((prev) =>
          prev.map((bin) =>
            bin._id === payload.data._id ? payload.data : bin,
          ),
        );
      } else if (payload.type === "DELETE") {
        setDustbins((prev) => prev.filter((bin) => bin._id !== payload.id));
      }
    });

    // 2. Vehicle Live Location
    socket.on("vehicle_location_update", (updatedVehicle) => {
      console.log("⚡ Socket: Vehicle Moved", updatedVehicle.vehicleNumber);
      setVehicles((prev) =>
        prev.map((v) => (v._id === updatedVehicle._id ? updatedVehicle : v)),
      );
    });

    // 3. Vehicle List Updates (CRUD)
    socket.on("vehicle_list_update", (payload) => {
      if (payload.type === "ADD")
        setVehicles((prev) => [payload.data, ...prev]);
      else if (payload.type === "UPDATE")
        setVehicles((prev) =>
          prev.map((v) => (v._id === payload.data._id ? payload.data : v)),
        );
      else if (payload.type === "DELETE")
        setVehicles((prev) => prev.filter((v) => v._id !== payload.id));
    });

    // 4. Staff Updates
    socket.on("staff_list_update", (payload) => {
      if (payload.type === "ADD") setStaff((prev) => [payload.data, ...prev]);
      else if (payload.type === "UPDATE")
        setStaff((prev) =>
          prev.map((s) => (s._id === payload.data._id ? payload.data : s)),
        );
      else if (payload.type === "DELETE")
        setStaff((prev) => prev.filter((s) => s._id !== payload.id));
    });

    // 5. Route Updates
    socket.on("route_data_update", (payload) => {
      if (payload.type === "ADD") setRoutes((prev) => [payload.data, ...prev]);
      else if (payload.type === "UPDATE")
        setRoutes((prev) =>
          prev.map((r) => (r._id === payload.data._id ? payload.data : r)),
        );
      else if (payload.type === "DELETE")
        setRoutes((prev) => prev.filter((r) => r._id !== payload.id));
    });

    // 6. Complaint Updates
    socket.on("new_complaint", (newComplaint) => {
      // alert(`New Complaint at ${newComplaint.area}!`);
      // Re-fetch to handle complex aggregation logic from backend if necessary, or push
      // For accurate grouping, refetching is safer for complaints
      fetchComplaints();
      fetchEscalations();
    });

    socket.on("complaint_status_update", (payload) => {
      fetchComplaints();
      fetchEscalations();
    });

    socket.on("complaint_status_update", (payload) => {
      console.log("⚡ Complaint Update Recieved:", payload);

      if (payload.type === "RESOLVED") {
        // 1. List Refresh karo (Taaki active se hat kar history me jaye)
        fetchComplaints();
        fetchEscalations();

        // 2. Stats update karo (Optional, agar alag event nahi hai to)
        // fetchStats();

        // 3. Admin ko Notification dikhao
        alert(`✅ Complaint Resolved! ID: ${payload.complaintId}`);
        // Note: Aap 'react-toastify' use kar sakte hain sunder popup ke liye
      } else if (payload.type === "ASSIGNED") {
        fetchComplaints(); // Assigned status update karne ke liye
        fetchEscalations();
      } else if (payload.type === "ESCALATED") {
        fetchEscalations();
      }
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [userData]);

  // =========================================================
  // 👆 SOCKET.IO LOGIC ENDS HERE
  // =========================================================

  // Handlers (Edit/Delete/Update)
  const handleEditStaffSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const payload = {
        name: formData.staffName,
        role: formData.staffRole,
        phone: formData.staffPhone,
        assignedVehicleId:
          formData.staffRole === "driver" && formData.assignedVehicleId
            ? formData.assignedVehicleId
            : null,
      };
      const res = await fetch(`${API_BASE_URL}/staff/update/${editStaffId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Update failed");
        return;
      }
      alert("Staff updated successfully");
      setShowEditStaffModal(false);
      // fetchStaff(); // Socket handles update
    } catch (err) {
      console.error("Edit Staff Error:", err);
      alert("Server error");
    }
  };

  const openEditStaffModal = (member) => {
    setEditStaffId(member._id);
    setFormData({
      staffName: member.name,
      staffRole: member.role,
      staffPhone: member.phone || "",
      assignedVehicleId: member.assignedVehicleId?._id || "",
    });
    setShowEditStaffModal(true);
  };

  const openEditVehicleModal = (vehicle) => {
    setEditVehicleId(vehicle._id);
    setFormData({
      vehicleNumber: vehicle.vehicleNumber,
      type: vehicle.type || "",
      active: vehicle.status === "Active",
    });
    setShowEditVehicleModal(true);
  };

  const handleEditVehicleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const payload = {
        vehicleNumber: formData.vehicleNumber,
        type: formData.type,
        status: formData.active ? "Active" : "Inactive",
      };
      const res = await fetch(
        `${API_BASE_URL}/vehicle/update/${editVehicleId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Vehicle update failed");
        return;
      }
      alert("Vehicle updated successfully");
      setShowEditVehicleModal(false);
    } catch (err) {
      console.error("Update Vehicle Error:", err);
      alert("Server error");
    }
  };

  const handleEditRouteSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const payload = {
        name: formData.routeName,
        description: formData.routeDescription,
        assignedVehicleId: formData.assignedVehicleId || null,
      };
      const res = await fetch(`${API_BASE_URL}/route/update/${editRouteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Route update failed");
        return;
      }
      alert("Route updated successfully");
      setShowEditRouteModal(false);
    } catch (err) {
      console.error("Edit Route Error:", err);
      alert("Server error");
    }
  };

  const openEditRouteModal = (route) => {
    setEditRouteId(route._id);
    setFormData({
      routeName: route.name || "",
      routeDescription: route.description || "",
      assignedVehicleId: route.assignedVehicleId?._id || "",
    });
    setShowEditRouteModal(true);
  };

  const openEditDustbinModal = (bin) => {
    setEditDustbinId(bin._id);
    setFormData({
      binName: bin.name || "",
      binArea: bin.area || "",
      binLatitude: bin.latitude?.toString() || "",
      binLongitude: bin.longitude?.toString() || "",
      binStatus: bin.status || "clean",
      routeId: bin.routeId?._id || "",
    });
    setShowEditDustbinModal(true);
  };

  const handleEditDustbinSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const payload = {
        name: formData.binName,
        area: formData.binArea,
        latitude: parseFloat(formData.binLatitude),
        longitude: parseFloat(formData.binLongitude),
        status: formData.binStatus,
        routeId: formData.routeId || null,
      };
      const res = await fetch(
        `${API_BASE_URL}/dustbin/update/${editDustbinId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Dustbin update failed");
        return;
      }
      alert("Dustbin updated successfully");
      setShowEditDustbinModal(false);
    } catch (err) {
      console.error("Edit Dustbin Error:", err);
      alert("Server error");
    }
  };

  // Helper function to create custom icons
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet").then((leaflet) => {
        setL(leaflet.default);
        delete leaflet.default.Icon.Default.prototype._getIconUrl;
        leaflet.default.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });
      });
    }
  }, []);

  const createCustomIcon = (color, content) => {
    if (!L) return null;
    return L.divIcon({
      className: "custom-marker",
      html: `
        <div style="width: 36px; height: 36px; border-radius: 18px; background-color: ${color}; display: flex; justify-content: center; align-items: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); color: white; font-weight: bold; font-size: 16px;">
          ${content}
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    });
  };

  const getBinIcon = (status) => {
    const colors = {
      clean: "#10b981",
      overflow: "#f59e0b",
      skiped: "#ef4444",
      suspecies: "#cc760e",
      ideal: "#000000",
    };
    return createCustomIcon(colors[status] || "#6b7280", "🗑️");
  };

  const getVehicleIcon = (status) => {
    const colors = { true: "#8b5cf6", false: "#6b7280" };
    return createCustomIcon(colors[status] || "#6b7280", "🚛");
  };

  // Calculate stats
  const stats = {
    total: dustbins.length,
    clean: dustbins.filter((d) => d.status === "clean").length,
    overflow: dustbins.filter((d) => d.status === "overflow").length,
    missed: dustbins.filter((d) => d.status === "missed").length,
    activeVehicles: vehicles.filter((v) => v.status === "Active").length,
    pendingComplaints: complaints.filter(
      (c) => c.status === "pending" || c.status === "urgent",
    ).length,
  };

  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({ ...settings, [name]: type === "checkbox" ? checked : value });
  };

  const handleSaveSettings = () => {
    alert("Settings saved successfully!");
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      console.log("Logging out...");
      await axios.post(`${API_BASE_URL}/office/logout`);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");
      document.cookie = "token=; Max-Age=0; path=/;";
      document.cookie = "role=; Max-Age=0; path=/;";
      router.replace("/");
      alert("Logged out successfully!");
    }
  };

  const openModal = (type) => {
    setModalType(type);
    setShowAddModal(true);
    setFormData({
      binName: "",
      binLatitude: "",
      binLongitude: "",
      binArea: "",
      binStatus: "clean",
      vehicleNumber: "",
      type: "",
      routeId: "",
      active: true,
      staffName: "",
      staffRole: "",
      staffPhone: "",
      staffVehicle: "",
      assignedVehicleId: "",
      routeName: "",
      routeDescription: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (modalType === "dustbin") {
      const payload = {
        officeId: userData._id,
        name: formData.binName,
        area: formData.binArea,
        latitude: parseFloat(formData.binLatitude),
        longitude: parseFloat(formData.binLongitude),
        status: formData.binStatus,
        routeId: formData.routeId || null,
      };
      const res = await fetch(`${API_BASE_URL}/dustbin/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message);
        return;
      }
      alert("Dustbin added successfully");
    } else if (modalType === "vehicle") {
      try {
        const payload = {
          officeId: urlUserId,
          vehicleNumber: formData.vehicleNumber,
          type: formData.type || "",
          active: formData.active !== false,
        };
        const res = await fetch(`${API_BASE_URL}/vehicle/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) {
          alert(data.message || "Vehicle register failed");
          return;
        }
        alert("Vehicle successfully registered");
      } catch (err) {
        console.error(err);
        alert("Server error");
      }
    } else if (modalType === "staff") {
      try {
        const payload = {
          officeId: userData._id,
          name: formData.staffName,
          role: formData.staffRole,
          phone: formData.staffPhone,
          assignedVehicleId:
            formData.staffRole === "driver" && formData.assignedVehicleId
              ? formData.assignedVehicleId
              : null,
        };
        const res = await fetch(`${API_BASE_URL}/staff/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) {
          alert(data.message || "Staff register failed");
          return;
        }
        alert("Staff successfully registered");
      } catch (err) {
        console.error(err);
        alert("Server error");
      }
    } else if (modalType === "route") {
      const payload = {
        officeId: userData._id,
        name: formData.routeName,
        description: formData.routeDescription,
        assignedVehicleId: formData.assignedVehicleId || null,
      };
      const res = await fetch(`${API_BASE_URL}/route/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Route create failed");
        return;
      }
      alert("Route created successfully");
    }
    setShowAddModal(false);
  };

  const handleDeleteDustbin = async (id) => {
    if (!confirm("Delete this dustbin?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/dustbin/delete/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Failed to delete");
        return;
      }
      alert("Dustbin deleted!");
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!confirm("Delete this vehicle?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/vehicle/delete/${vehicleId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Failed to delete");
        return;
      }
      alert("Vehicle deleted!");
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!confirm("Delete this staff member?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/staff/delete/${staffId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Failed to delete");
        return;
      }
      alert("Staff deleted!");
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  const handleDeleteRoute = async (routeId) => {
    if (!confirm("Delete this route?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/route/delete/${routeId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Failed to delete");
        return;
      }
      alert("Route deleted!");
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  const openReportDetails = async (report) => {
    setSelectedReport(report);
    setModalVisible(true);
    setDetailedReport(null);
    setVStatus("genuine");
    setVReason("");
    setVNotes("");
    setVEvidenceUrl("");
    setVLegalReview(false);
    try {
      const targetId = report.allComplaintIds
        ? report.allComplaintIds[0]
        : report._id || report.id;
      if (targetId) {
        const res = await axios.get(
          `${API_BASE_URL}/complaint/detail/${targetId}`,
        );
        if (res.data.success) {
          setDetailedReport(res.data.complaint);
        }
      }
    } catch (err) {
      console.error("Error loading detailed report:", err);
    }
  };

  const handleVerifyComplaint = async (e) => {
    e.preventDefault();
    if (!detailedReport?._id) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/citizen-system/complaint/verify`,
        {
          complaintId: detailedReport._id,
          verificationStatus: vStatus,
          verificationReason: vReason,
          verificationNotes: vNotes,
          verificationEvidenceUrl: vEvidenceUrl,
          legalReviewRequired: vLegalReview,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.data.success) {
        alert("Complaint verified and scores updated successfully!");
        setModalVisible(false);
        fetchComplaints();
        fetchEscalations();
        fetchAuditLogs();
        fetchCitizens();
      }
    } catch (err) {
      console.error("Verification Error:", err);
      alert(err.response?.data?.message || "Failed to verify complaint");
    }
  };

  const openAssignVehicle = (complaint) => {
    setSelectedComplaint(complaint);
    setShowAssignVehicleModal(true);
  };

  const assignVehicleToComplaint = async (vehicleId) => {
    console.log("Selected Report Data:", selectedReport);

    if (!selectedReport || !selectedReport._id) return;

    const dustbinId = selectedReport.dustbinId || selectedReport._id;
    if (!dustbinId) {
      alert("Error: Dustbin ID not found in this complaint!");
      return;
    }

    const idsToSend = selectedReport.complaintIds
      ? selectedReport.complaintIds
      : [selectedReport._id];
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/complaint/assign-vehicle`,
        {
          complaintIds: idsToSend,
          vehicleId: vehicleId,
          dustbinId: dustbinId,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.success) {
        setShowAssignVehicleModal(false);
        setModalVisible(false);
        alert(`✅ Vehicle assigned to ${idsToSend.length} reports!`);
        fetchComplaints();
      }
    } catch (error) {
      console.error("Assignment Error:", error);
      alert("❌ Failed to assign vehicle.");
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "critical":
        return "#dc2626";
      case "high":
        return "#f59e0b";
      case "low":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  const renderStars = (rating) => "⭐".repeat(rating) + "☆".repeat(5 - rating);

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    alert("Profile updated successfully!");
    setShowProfileSettings(false);
  };

  const handleRemoveVehicles = async (routeId) => {
    if (!window.confirm("Remove vehicle from this route?")) return;
    const token = localStorage.getItem("token");
    try {
      await axios.put(
        `${API_BASE_URL}/route/remove-vehicle/${routeId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    } catch (err) {
      console.error("Remove Vehicle Error:", err);
    }
  };

  const handleRemoveVehiclesFromStaff = async (staffId) => {
    if (!window.confirm("Remove vehicle from this staff?")) return;
    const token = localStorage.getItem("token");
    try {
      await axios.put(
        `${API_BASE_URL}/staff/remove-vehicle/${staffId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    } catch (err) {
      console.error("Remove Vehicle From Staff Error:", err);
    }
  };

  const handleManualClean = async (id) => {
    if (!confirm("Mark this bin as CLEAN?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/dustbin/update-status/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "clean" }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Failed to update");
        return;
      }
      alert("Dustbin marked as CLEAN manually!");
    } catch (err) {
      console.error("Manual Clean Error:", err);
      alert("Server error");
    }
  };

  const routePaths = React.useMemo(() => {
    const paths = {};
    dustbins.forEach((bin) => {
      if (bin.routeId && bin.routeId._id && bin.latitude && bin.longitude) {
        const routeId = bin.routeId._id;
        if (!paths[routeId]) {
          paths[routeId] = { name: bin.routeId.name, positions: [] };
        }
        paths[routeId].positions.push([bin.latitude, bin.longitude]);
      }
    });
    return Object.values(paths);
  }, [dustbins]);

  const ComplaintsView = () => {
    const [viewMode, setViewMode] = useState("active");
    const filteredList = complaints.filter((c) => {
      if (viewMode === "active")
        return c.status !== "resolved" && c.status !== "closed";
      else return c.status === "resolved" || c.status === "closed";
    });

    return (
      <>
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">
                📋 Complaint Tracker
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Manage citizen reports and assignments
              </p>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode("active")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === "active" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                🔥 Active (
                {complaints.filter((c) => c.status !== "resolved").length})
              </button>
              <button
                onClick={() => setViewMode("resolved")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === "resolved" ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                ✅ History (
                {complaints.filter((c) => c.status === "resolved").length})
              </button>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Reports
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Escalation Level
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Latest
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredList.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      No {viewMode} complaints found.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((complaint) => (
                    <tr
                      key={complaint._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-black shadow-sm border border-indigo-200">
                          {complaint.complaintCount} Reports
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${(complaint.complaintType || complaint.type) === "clean" ? "bg-green-100 text-green-800" : (complaint.complaintType || complaint.type) === "overflow" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                        >
                          {complaint.complaintType ||
                            complaint.type ||
                            "General"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {complaint.dustbinDetails?.name || "Unknown Point"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {complaint.area || "Unknown Area"}
                        </div>
                        <div className="text-xs text-blue-600 font-semibold mt-1">
                          {complaint.dustbinDetails?.routeName
                            ? `🛣️ ${complaint.dustbinDetails.routeName}`
                            : ""}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full uppercase"
                          style={{
                            backgroundColor: `${getPriorityColor(complaint.priority || complaint.latestPriority)}20`,
                            color: getPriorityColor(
                              complaint.priority || complaint.latestPriority,
                            ),
                          }}
                        >
                          {complaint.priority ||
                            complaint.latestPriority ||
                            "Medium"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${complaint.status === "resolved" ? "bg-green-100 text-green-700 border border-green-200" : complaint.status === "assigned" ? "bg-yellow-100 text-yellow-700 border border-yellow-200" : "bg-red-100 text-red-700 border border-red-200"}`}
                        >
                          {complaint.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${getEscalationBadgeColor(complaint.currentEscalationLevel || 1)}`}
                          >
                            Level {complaint.currentEscalationLevel || 1}:{" "}
                            {
                              authorityNames[
                                complaint.currentEscalationLevel || 1
                              ]
                            }
                          </span>
                          {complaint.status !== "resolved" && (
                            <span className="text-[10px] text-gray-500 font-semibold mt-1">
                              ⏳ {getRemainingTime(complaint)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700 font-mono">
                          {complaint.vehicle || "Not Assigned"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {formatDateTime(
                            complaint.createdAt || complaint.reportedAt,
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openReportDetails(complaint)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {viewMode === "active" &&
                            (!complaint.vehicle ||
                              complaint.vehicle === "Not Assigned") && (
                              <button
                                onClick={() => openAssignVehicle(complaint)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              >
                                <Truck className="w-4 h-4" />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const EscalationView = () => {
    const [viewMode, setViewMode] = useState("pending");

    const filteredList = escalations.filter((c) => {
      const isResolved = c.status === "resolved" || c.status === "closed";

      if (viewMode === "pending") {
        return c.status === "pending";
      } else if (viewMode === "in_progress") {
        return c.status === "in_progress" || c.status === "assigned";
      } else if (viewMode === "escalated") {
        return !isResolved && c.currentEscalationLevel > 1;
      } else if (viewMode === "near_deadline") {
        if (isResolved) return false;
        if (!c.nextEscalationAt) return false;
        const diffHours =
          (new Date(c.nextEscalationAt) - new Date()) / (1000 * 60 * 60);
        return diffHours > 0 && diffHours <= 4;
      } else if (viewMode === "public_escalation_eligible") {
        return !isResolved && c.publicEscalationEligible === true;
      } else if (viewMode === "resolved") {
        return isResolved;
      }
      return true;
    });

    const totalActive = escalations.filter(
      (c) => c.status !== "resolved" && c.status !== "closed",
    ).length;
    const level5Count = escalations.filter(
      (c) =>
        c.status !== "resolved" &&
        c.status !== "closed" &&
        c.currentEscalationLevel === 5,
    ).length;
    const nearDeadlineCount = escalations.filter((c) => {
      if (
        c.status === "resolved" ||
        c.status === "closed" ||
        !c.nextEscalationAt
      )
        return false;
      const diff =
        (new Date(c.nextEscalationAt) - new Date()) / (1000 * 60 * 60);
      return diff > 0 && diff <= 4;
    }).length;
    const publicEligibleCount = escalations.filter(
      (c) =>
        c.status !== "resolved" &&
        c.status !== "closed" &&
        c.publicEscalationEligible === true,
    ).length;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-md border-l-4 border-blue-500">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Total Active Complaints
            </h4>
            <p className="text-3xl font-black text-gray-900 mt-2">
              {totalActive}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-md border-l-4 border-yellow-500">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Critical (Level 5)
            </h4>
            <p className="text-3xl font-black text-gray-900 mt-2">
              {level5Count}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-md border-l-4 border-orange-500">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Near Escalation (&lt;4h)
            </h4>
            <p className="text-3xl font-black text-gray-900 mt-2">
              {nearDeadlineCount}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-md border-l-4 border-red-500">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Public Share Eligible
            </h4>
            <p className="text-3xl font-black text-gray-900 mt-2">
              {publicEligibleCount}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">
                ⚠️ Escalation Monitoring Dashboard
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Monitor SLA times, automatic escalations, and citizen
                accountability status.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 bg-gray-100 p-1.5 rounded-xl">
              {[
                { mode: "pending", label: "⏳ Pending" },
                { mode: "in_progress", label: "⚙️ In Progress" },
                { mode: "escalated", label: "🔥 Escalated" },
                { mode: "near_deadline", label: "🕒 Near Deadline" },
                {
                  mode: "public_escalation_eligible",
                  label: "📢 Public Eligible",
                },
                { mode: "resolved", label: "✅ Resolved" },
              ].map((btn) => (
                <button
                  key={btn.mode}
                  onClick={() => setViewMode(btn.mode)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === btn.mode ? "bg-white text-blue-600 shadow-md" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Complaint ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Grievance Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Escalation Level
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Responsible Authority
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Time Remaining
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Days Pending
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredList.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-12 text-center text-gray-400"
                    >
                      No complaints found in this category.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((comp) => {
                    let currentAuth = "Unassigned";
                    if (comp.currentEscalationLevel === 1) {
                      currentAuth = comp.driverId
                        ? `Driver: ${comp.driverId.name}`
                        : comp.vehicle !== "Not Assigned"
                          ? comp.vehicle
                          : "Assigned Driver";
                    } else if (comp.currentEscalationLevel === 2) {
                      currentAuth = comp.supervisorId
                        ? `Supervisor: ${comp.supervisorId.name}`
                        : "Area Supervisor";
                    } else if (comp.currentEscalationLevel === 3) {
                      currentAuth = comp.zoneOfficerId
                        ? `Zone Officer: ${comp.zoneOfficerId.name}`
                        : "Zone Officer";
                    } else if (comp.currentEscalationLevel === 4) {
                      currentAuth = comp.municipalOfficerId
                        ? `Municipal Officer: ${comp.municipalOfficerId.name}`
                        : "Municipal Officer";
                    } else if (comp.currentEscalationLevel === 5) {
                      currentAuth = comp.commissionerId
                        ? `Commissioner: ${comp.commissionerId.name}`
                        : "City Commissioner";
                    }

                    return (
                      <tr
                        key={comp._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600 font-mono">
                          #SM{comp._id.slice(-6).toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {comp.complaintType}
                          </div>
                          <div className="text-xs text-gray-500">
                            {comp.area}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold border ${getEscalationBadgeColor(comp.currentEscalationLevel)}`}
                          >
                            Level {comp.currentEscalationLevel}:{" "}
                            {authorityNames[comp.currentEscalationLevel || 1]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                          {currentAuth}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                          {getRemainingTime(comp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          {comp.pendingDays || 0} days
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${comp.status === "resolved" ? "bg-green-100 text-green-700 border border-green-200" : "bg-amber-100 text-amber-700 border border-amber-200"}`}
                          >
                            {comp.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => {
                              setSelectedEscalation(comp);
                              setShowEscalationModal(true);
                            }}
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-lg font-bold transition-all text-xs"
                          >
                            Timeline & Info
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const ModerationView = () => {
    const [suspendingCitizen, setSuspendingCitizen] = useState(null);
    const [suspensionReason, setSuspensionReason] = useState("");
    const [suspensionEvidence, setSuspensionEvidence] = useState("");
    const [suspensionEvidenceUrl, setSuspensionEvidenceUrl] = useState("");

    const [resolvingAppeal, setResolvingAppeal] = useState(null);
    const [appealNotes, setAppealNotes] = useState("");

    const handleSuspend = async (e) => {
      e.preventDefault();
      if (!suspendingCitizen) return;
      try {
        const token = localStorage.getItem("token");
        const res = await axios.post(
          `${API_BASE_URL}/citizen-system/citizen/suspend`,
          {
            citizenId: suspendingCitizen._id,
            suspensionReason,
            verificationEvidence: suspensionEvidence,
            evidenceUrl: suspensionEvidenceUrl,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (res.data.success) {
          alert("Citizen suspended successfully!");
          setSuspendingCitizen(null);
          setSuspensionReason("");
          setSuspensionEvidence("");
          setSuspensionEvidenceUrl("");
          fetchCitizens();
          fetchAuditLogs();
        }
      } catch (err) {
        console.error("Suspend error:", err);
        alert("Failed to suspend citizen");
      }
    };

    const handleUnsuspend = async (citizenId) => {
      const reason = prompt(
        "Please provide a reason for unsuspending this citizen:",
      );
      if (!reason) return;
      try {
        const token = localStorage.getItem("token");
        const res = await axios.post(
          `${API_BASE_URL}/citizen-system/citizen/unsuspend`,
          {
            citizenId,
            reason,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (res.data.success) {
          alert("Citizen unsuspended successfully!");
          fetchCitizens();
          fetchAuditLogs();
        }
      } catch (err) {
        console.error("Unsuspend error:", err);
        alert("Failed to unsuspend citizen");
      }
    };

    const handleResolveAppeal = async (appealId, action) => {
      if (!appealNotes) {
        alert("Please provide admin decision notes first.");
        return;
      }
      try {
        const token = localStorage.getItem("token");
        const res = await axios.post(
          `${API_BASE_URL}/citizen-system/appeal/resolve`,
          {
            appealId,
            action, // "accept" or "reject"
            adminNotes: appealNotes,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (res.data.success) {
          alert(`Appeal ${action}ed successfully!`);
          setResolvingAppeal(null);
          setAppealNotes("");
          fetchAppeals();
          fetchCitizens();
          fetchAuditLogs();
        }
      } catch (err) {
        console.error("Resolve appeal error:", err);
        alert("Failed to resolve appeal");
      }
    };

    return (
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-800 font-black tracking-tight">
                🛡️ Citizen Moderation Panel
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Moderate citizens, manage strikes, suspensions, resolve appeals,
                and view logs.
              </p>
            </div>
            <div className="flex bg-gray-100 p-1.5 rounded-xl gap-2 flex-wrap">
              <button
                onClick={() => setModerationTab("eventRequests")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${moderationTab === "eventRequests" ? "bg-emerald-600 text-white shadow-md" : "text-gray-600 hover:text-gray-900"}`}
              >
                🎉 Event Dustbins ({eventMetrics.pending || 0})
              </button>
              <button
                onClick={() => setModerationTab("leaderboard")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${moderationTab === "leaderboard" ? "bg-white text-blue-600 shadow-md" : "text-gray-500 hover:text-gray-700"}`}
              >
                👥 Citizen Ranks & Strikes
              </button>
              <button
                onClick={() => setModerationTab("appeals")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${moderationTab === "appeals" ? "bg-white text-blue-600 shadow-md" : "text-gray-500 hover:text-gray-700"}`}
              >
                ⚖️ Pending Appeals (
                {appeals.filter((a) => a.status === "pending").length})
              </button>
              <button
                onClick={() => setModerationTab("logs")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${moderationTab === "logs" ? "bg-white text-blue-600 shadow-md" : "text-gray-500 hover:text-gray-700"}`}
              >
                📋 Admin Audit Logs
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content: Citizen Leaderboard / Ranks */}
        {moderationTab === "leaderboard" && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div className="p-6 border-b bg-gray-50/50">
              <h4 className="text-lg font-bold text-gray-800">
                Citizens Leaderboard & Moderation List
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Sorted by Trust Score. View citizen level, valid/false
                complaints, active strikes, and suspend eligible misusers.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Citizen Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      City / Pincode
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Trust Score
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Valid / False
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Strikes
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {citizens.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-6 py-12 text-center text-gray-400"
                      >
                        No citizens registered yet.
                      </td>
                    </tr>
                  ) : (
                    citizens.map((cit) => (
                      <tr
                        key={cit._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-gray-900">
                            {cit.fullName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {cit.phone} | {cit.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                          🏙️ {cit.cityName || "N/A"} ({cit.pincode})
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-blue-600">
                          ⭐️ {cit.trustScore}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold border bg-blue-50 text-blue-800 border-blue-200`}
                          >
                            {cit.citizenLevel || "Beginner Citizen"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">
                          <span className="text-green-600">
                            ✅ {cit.validComplaints}
                          </span>{" "}
                          /{" "}
                          <span className="text-red-500">
                            ❌ {cit.falseComplaints}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-black border ${cit.strikeCount >= 3 ? "bg-red-100 text-red-800 border-red-200 animate-pulse" : cit.strikeCount > 0 ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-gray-50 text-gray-600"}`}
                          >
                            Strike {cit.strikeCount || 0}/3
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {cit.isSuspended ? (
                            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 text-xs font-bold uppercase animate-pulse">
                              Suspended
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-200 text-xs font-bold uppercase">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {cit.isSuspended ? (
                            <button
                              onClick={() => handleUnsuspend(cit._id)}
                              className="px-3 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg font-black text-xs transition-all"
                            >
                              Unsuspend Account
                            </button>
                          ) : (
                            <button
                              onClick={() => setSuspendingCitizen(cit)}
                              className={`px-3 py-1 rounded-lg font-black text-xs transition-all ${cit.strikeCount >= 3 ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
                            >
                              Suspend Account
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Appeals */}
        {moderationTab === "appeals" && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div className="p-6 border-b bg-gray-50/50">
              <h4 className="text-lg font-bold text-gray-800">
                Suspended Citizen Appeals
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Review appeal explanations, supporting documents, and either
                Accept (restores account) or Reject appeals.
              </p>
            </div>
            <div className="divide-y divide-gray-200">
              {appeals.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  No appeals submitted yet.
                </div>
              ) : (
                appeals.map((app) => (
                  <div
                    key={app._id}
                    className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row gap-6"
                  >
                    <div className="w-full md:w-1/3 space-y-2">
                      <h5 className="font-bold text-gray-800 text-base">
                        👤 {app.citizenId?.fullName || "Citizen"}
                      </h5>
                      <p className="text-xs text-gray-500">
                        Email: {app.citizenId?.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        Phone: {app.citizenId?.phone}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-xs font-bold">
                          Score: {app.citizenId?.trustScore}
                        </span>
                        <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded text-xs font-bold">
                          {app.citizenId?.strikeCount || 0} Strikes
                        </span>
                      </div>
                      <div className="mt-2 text-xs">
                        <span className="font-bold text-gray-700">
                          Suspension Reason:
                        </span>
                        <p className="text-red-600 italic bg-red-50 p-2 rounded mt-1">
                          "{app.citizenId?.suspensionReason || "N/A"}"
                        </p>
                      </div>
                    </div>
                    <div className="w-full md:w-2/3 space-y-3">
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <span className="text-xs font-bold text-gray-400 uppercase">
                          Appeal Reason / Explanation:
                        </span>
                        <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                          "{app.reason}"
                        </p>
                      </div>
                      {app.evidenceUrl && (
                        <div className="text-xs">
                          <span className="font-bold text-gray-700">
                            Appeal Evidence:
                          </span>
                          <a
                            href={app.evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline font-semibold block mt-1"
                          >
                            📄 View Appeal Attachment Documents
                          </a>
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t pt-4">
                        <div className="text-xs text-gray-400">
                          Submitted At:{" "}
                          {new Date(app.createdAt).toLocaleString("en-IN")}
                        </div>
                        <div>
                          {app.status === "pending" ? (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setResolvingAppeal(app)}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold text-xs shadow-md"
                              >
                                Resolve Appeal
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`px-3 py-1 rounded text-xs font-black uppercase tracking-wider ${app.status === "accepted" ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200"}`}
                            >
                              {app.status.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab Content: Logs */}
        {moderationTab === "logs" && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div className="p-6 border-b bg-gray-50/50">
              <h4 className="text-lg font-bold text-gray-800">
                Admin Moderation Audit Logs
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Audit log records of points, strikes, suspensions, legal
                reviews, and appeal decisions.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Moderator
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Target Citizen
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Reason & Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Evidence Reference
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white text-sm text-gray-600">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-6 py-12 text-center text-gray-400"
                      >
                        No logs captured yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr
                        key={log._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">
                          {new Date(log.createdAt).toLocaleString("en-IN")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-800">
                          🛡️ {log.adminName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              log.action === "SUSPENSION"
                                ? "bg-red-100 text-red-700"
                                : log.action === "LEGAL_REVIEW"
                                  ? "bg-purple-100 text-purple-700"
                                  : log.action === "VERIFICATION_DECISION"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.citizenId ? (
                            <div>
                              <div className="font-semibold text-gray-800">
                                {log.citizenId.fullName}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {log.citizenId.email}
                              </div>
                            </div>
                          ) : (
                            "System"
                          )}
                        </td>
                        <td
                          className="px-6 py-4 font-medium text-gray-700 max-w-xs truncate"
                          title={log.reason}
                        >
                          {log.reason}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold">
                          {log.evidenceReference &&
                          log.evidenceReference !== "No Attachment" ? (
                            <a
                              href={log.evidenceReference}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 underline"
                            >
                              Attachment 📄
                            </a>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: 🎉 Event Dustbin Requests Management */}
        {moderationTab === "eventRequests" && (
          <div className="space-y-6">
            {/* 1. Summary Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-center text-gray-500 text-xs font-bold uppercase">
                  <span>Total Requests</span>
                  <span className="text-lg">🎪</span>
                </div>
                <div className="text-2xl font-black text-gray-900 mt-2">
                  {eventMetrics.total || 0}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  All temporary event bookings
                </div>
              </div>

              <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-center text-amber-700 text-xs font-bold uppercase">
                  <span>Pending Review</span>
                  <span className="text-lg animate-bounce">⏳</span>
                </div>
                <div className="text-2xl font-black text-amber-900 mt-2">
                  {eventMetrics.pending || 0}
                </div>
                <div className="text-[11px] text-amber-600 mt-1 font-semibold">
                  Requires Admin Decision
                </div>
              </div>

              <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-center text-emerald-700 text-xs font-bold uppercase">
                  <span>Approved Events</span>
                  <span className="text-lg">✅</span>
                </div>
                <div className="text-2xl font-black text-emerald-900 mt-2">
                  {eventMetrics.approved || 0}
                </div>
                <div className="text-[11px] text-emerald-600 mt-1">
                  Dustbins quota granted
                </div>
              </div>

              <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-center text-blue-700 text-xs font-bold uppercase">
                  <span>Allocated Fleet</span>
                  <span className="text-lg">🚚</span>
                </div>
                <div className="text-2xl font-black text-blue-900 mt-2">
                  {eventMetrics.allocated || 0}
                </div>
                <div className="text-[11px] text-blue-600 mt-1">
                  Vehicles & staff assigned
                </div>
              </div>

              <div className="bg-red-50/60 p-5 rounded-2xl border border-red-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-center text-red-700 text-xs font-bold uppercase">
                  <span>High Waste Risk</span>
                  <span className="text-lg">🔥</span>
                </div>
                <div className="text-2xl font-black text-red-900 mt-2">
                  {eventMetrics.highRisk || 0}
                </div>
                <div className="text-[11px] text-red-600 mt-1 font-semibold">
                  &gt;400 kg expected waste
                </div>
              </div>
            </div>

            {/* 2. Filter & Search Bar */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search by Request ID, Event Name, Organizer..."
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                  />
                  <span className="absolute left-3 top-3 text-gray-400 text-xs">
                    🔍
                  </span>
                </div>

                {/* Status Filter */}
                <select
                  value={eventFilterStatus}
                  onChange={(e) => setEventFilterStatus(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING_ADMIN_REVIEW">
                    ⏳ Pending Review
                  </option>
                  <option value="APPROVED">✅ Approved</option>
                  <option value="MODIFIED">✏️ Modified</option>
                  <option value="ALLOCATED">🚚 Allocated</option>
                  <option value="REJECTED">❌ Rejected</option>
                  <option value="COMPLETED">🏁 Completed</option>
                </select>

                {/* Event Type Filter */}
                <select
                  value={eventFilterType}
                  onChange={(e) => setEventFilterType(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Event Types</option>
                  <option value="Marriage">💍 Marriage</option>
                  <option value="Birthday">🎂 Birthday</option>
                  <option value="Religious">🪔 Religious</option>
                  <option value="Political">🏛️ Political</option>
                  <option value="Festival">🎆 Festival</option>
                  <option value="Community">👥 Community</option>
                  <option value="School/College">🎓 School/College</option>
                  <option value="Corporate">💼 Corporate</option>
                  <option value="Other">🎪 Other</option>
                </select>

                {/* Risk Filter */}
                <select
                  value={eventFilterRisk}
                  onChange={(e) => setEventFilterRisk(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Risk Levels</option>
                  <option value="LOW">🟢 Low Risk</option>
                  <option value="MEDIUM">🟡 Medium Risk</option>
                  <option value="HIGH">🟠 High Risk</option>
                  <option value="CRITICAL">🔴 Critical Risk</option>
                </select>
              </div>

              <button
                onClick={fetchEventRequests}
                className="px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
              >
                🔄 Refresh
              </button>
            </div>

            {/* 3. Requests Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-black text-gray-900">
                    Event Dustbin Requirements Queue
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Municipal temporary dustbin allocation powered by
                    deterministic waste engine &amp; AI Document Verification.
                  </p>
                </div>
                <span className="text-xs font-black bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">
                  {eventRequests.length} Total Submissions
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50/70 border-b border-gray-200 text-xs font-black text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Request ID</th>
                      <th className="px-5 py-3.5">Event &amp; Organizer</th>
                      <th className="px-5 py-3.5">Date &amp; Venue</th>
                      <th className="px-5 py-3.5">Guests &amp; Food</th>
                      <th className="px-5 py-3.5">AI Bin Recommendation</th>
                      <th className="px-5 py-3.5">Waste Risk</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {eventRequests
                      .filter((req) => {
                        if (
                          eventFilterStatus !== "ALL" &&
                          req.status !== eventFilterStatus
                        )
                          return false;
                        if (
                          eventFilterType !== "ALL" &&
                          req.event?.type !== eventFilterType
                        )
                          return false;
                        if (
                          eventFilterRisk !== "ALL" &&
                          req.aiAnalysis?.wasteRisk !== eventFilterRisk
                        )
                          return false;
                        if (eventSearch.trim()) {
                          const q = eventSearch.toLowerCase();
                          const matchId = req.requestId
                            ?.toLowerCase()
                            .includes(q);
                          const matchName = req.event?.name
                            ?.toLowerCase()
                            .includes(q);
                          const matchCitizen = req.citizenName
                            ?.toLowerCase()
                            .includes(q);
                          const matchAddr = req.location?.address
                            ?.toLowerCase()
                            .includes(q);
                          if (
                            !matchId &&
                            !matchName &&
                            !matchCitizen &&
                            !matchAddr
                          )
                            return false;
                        }
                        return true;
                      })
                      .map((req) => (
                        <tr
                          key={req._id}
                          className="hover:bg-gray-50/80 transition-colors"
                        >
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                              {req.requestId}
                            </span>
                            <div className="text-[11px] text-gray-400 mt-1">
                              {new Date(req.createdAt).toLocaleDateString(
                                "en-IN",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-bold text-gray-900 text-sm">
                              {req.event?.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                              <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                {req.event?.type}
                              </span>
                              <span>
                                👤 {req.citizenName} ({req.citizenPhone})
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-semibold text-gray-800 text-xs">
                              📅 {req.event?.date} ({req.event?.startTime} -{" "}
                              {req.event?.endTime})
                            </div>
                            <div
                              className="text-xs text-gray-500 mt-0.5 truncate max-w-xs"
                              title={req.location?.address}
                            >
                              📍 {req.location?.address}
                            </div>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="font-black text-gray-800 text-xs">
                              👥 {req.event?.expectedGuests} Guests
                            </div>
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              {req.event?.foodService
                                ? `🍽️ ${req.event?.foodType || "Meals"}`
                                : "🚫 No Catering"}
                            </div>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {req.adminDecision?.approvedBins?.total ||
                                  req.aiAnalysis?.recommendedBins?.total ||
                                  3}{" "}
                                Bins
                              </span>
                              <span className="text-[10px] text-gray-500 font-semibold">
                                ({req.aiAnalysis?.recommendedBins?.wet || 1}W /{" "}
                                {req.aiAnalysis?.recommendedBins?.dry || 1}D /{" "}
                                {req.aiAnalysis?.recommendedBins?.general || 1}
                                G)
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">
                              ~{req.aiAnalysis?.estimatedWasteKg || 0} kg waste
                              • {req.aiAnalysis?.collectionFrequency || 1}x/day
                            </div>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                req.aiAnalysis?.wasteRisk === "CRITICAL"
                                  ? "bg-red-100 text-red-800 border-red-200 animate-pulse"
                                  : req.aiAnalysis?.wasteRisk === "HIGH"
                                    ? "bg-orange-100 text-orange-800 border-orange-200"
                                    : req.aiAnalysis?.wasteRisk === "MEDIUM"
                                      ? "bg-amber-100 text-amber-800 border-amber-200"
                                      : "bg-green-100 text-green-800 border-green-200"
                              }`}
                            >
                              {req.aiAnalysis?.wasteRisk || "MEDIUM"} RISK
                            </span>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                req.status === "APPROVED" ||
                                req.status === "ALLOCATED"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                  : req.status === "MODIFIED"
                                    ? "bg-blue-100 text-blue-800 border-blue-200"
                                    : req.status === "REJECTED"
                                      ? "bg-red-100 text-red-800 border-red-200"
                                      : req.status === "COMPLETED"
                                        ? "bg-purple-100 text-purple-800 border-purple-200"
                                        : "bg-amber-100 text-amber-800 border-amber-200 animate-pulse"
                              }`}
                            >
                              {req.status?.replace(/_/g, " ")}
                            </span>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => {
                                setSelectedEventRequest(req);
                                setModWetBins(
                                  req.aiAnalysis?.recommendedBins?.wet || 2,
                                );
                                setModDryBins(
                                  req.aiAnalysis?.recommendedBins?.dry || 2,
                                );
                                setModGeneralBins(
                                  req.aiAnalysis?.recommendedBins?.general || 1,
                                );
                                setModFrequency(
                                  req.aiAnalysis?.collectionFrequency || 1,
                                );
                                setDecisionReason("");
                                setEventDecisionType(
                                  req.status === "APPROVED"
                                    ? "allocate"
                                    : "approve",
                                );
                                setShowEventDecisionModal(true);
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1 ml-auto"
                            >
                              <span>Review &amp; Decide</span>
                              <span>→</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    {eventRequests.length === 0 && (
                      <tr>
                        <td
                          colSpan="8"
                          className="px-6 py-12 text-center text-gray-400"
                        >
                          No event dustbin requests received yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Event Request Review & Decision */}
        {showEventDecisionModal && selectedEventRequest && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl p-6 w-full max-w-5xl shadow-2xl relative animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowEventDecisionModal(false)}
                className="absolute top-5 right-5 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 text-gray-700 font-bold border-none cursor-pointer"
              >
                ✕
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 border-b pb-4 mb-6">
                <div className="p-2.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-2xl">
                  🎪
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-gray-900">
                      {selectedEventRequest.event?.name}
                    </h3>
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {selectedEventRequest.requestId}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Submitted by {selectedEventRequest.citizenName} (
                    {selectedEventRequest.citizenPhone}) • Status:{" "}
                    <span className="font-bold text-gray-700">
                      {selectedEventRequest.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* 2-Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Event & Document Proof Details */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">
                      1. Event &amp; Venue Details
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-400">Event Type:</span>
                        <p className="font-bold text-gray-800">
                          {selectedEventRequest.event?.type}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Expected Guests:</span>
                        <p className="font-bold text-gray-800">
                          👥 {selectedEventRequest.event?.expectedGuests}{" "}
                          Persons
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Date:</span>
                        <p className="font-bold text-gray-800">
                          📅 {selectedEventRequest.event?.date}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">
                          Time &amp; Duration:
                        </span>
                        <p className="font-bold text-gray-800">
                          ⏰ {selectedEventRequest.event?.startTime} -{" "}
                          {selectedEventRequest.event?.endTime} (
                          {selectedEventRequest.event?.durationHours} hrs)
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400">Venue Address:</span>
                        <p className="font-bold text-gray-800">
                          📍 {selectedEventRequest.location?.address} (
                          {selectedEventRequest.event?.venueType})
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          GPS:{" "}
                          {selectedEventRequest.location?.latitude?.toFixed(6)},{" "}
                          {selectedEventRequest.location?.longitude?.toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Food Catering:</span>
                        <p className="font-bold text-gray-800">
                          {selectedEventRequest.event?.foodService
                            ? `🍽️ ${selectedEventRequest.event?.foodType} (${selectedEventRequest.event?.foodPlates} plates)`
                            : "🚫 No Food"}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Waste Types:</span>
                        <p className="font-bold text-gray-800">
                          {selectedEventRequest.event?.wasteTypes?.join(", ") ||
                            "Wet, Dry"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Document Proofs */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">
                      2. Supporting Verification Documents
                    </h4>
                    <div className="space-y-3">
                      {/* Event Proof */}
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">📄</span>
                          <div>
                            <p className="text-xs font-bold text-gray-800">
                              Event Proof / Invitation Card
                            </p>
                            <p className="text-[10px] text-emerald-600 font-semibold">
                              Status:{" "}
                              {selectedEventRequest.documents?.eventProof
                                ?.verificationStatus || "VERIFIED"}
                            </p>
                          </div>
                        </div>
                        {selectedEventRequest.documents?.eventProof?.url && (
                          <a
                            href={selectedEventRequest.documents.eventProof.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-black transition-all"
                          >
                            View Document ↗
                          </a>
                        )}
                      </div>

                      {/* Identity Proof */}
                      {selectedEventRequest.documents?.identityProof?.url && (
                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">🪪</span>
                            <div>
                              <p className="text-xs font-bold text-gray-800">
                                Identity Proof (Aadhaar / ID)
                              </p>
                              <p className="text-[10px] text-emerald-600 font-semibold">
                                Attached by citizen
                              </p>
                            </div>
                          </div>
                          <a
                            href={
                              selectedEventRequest.documents.identityProof.url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-black transition-all"
                          >
                            View ID ↗
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Audit Trail */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                      3. Audit Log History
                    </h4>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {selectedEventRequest.auditLog?.map((log, i) => (
                        <div
                          key={i}
                          className="text-[11px] bg-white p-2 rounded-lg border border-gray-100"
                        >
                          <div className="flex justify-between text-gray-400">
                            <span className="font-bold text-gray-700">
                              {log.user || "System"} • {log.action}
                            </span>
                            <span>
                              {new Date(log.timestamp).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <p className="text-gray-600 mt-0.5">
                            {log.reason || log.newValue}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: AI Analysis & Admin Actions */}
                <div className="space-y-4">
                  {/* AI Recommendation Engine Card */}
                  <div className="bg-gradient-to-br from-emerald-900 to-teal-950 p-5 rounded-2xl text-white shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">✨</span>
                        <h4 className="text-sm font-black text-emerald-200 uppercase tracking-wider">
                          SafaiMitra AI Waste Engine
                        </h4>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          selectedEventRequest.aiAnalysis?.wasteRisk ===
                          "CRITICAL"
                            ? "bg-red-500 text-white border-red-400"
                            : selectedEventRequest.aiAnalysis?.wasteRisk ===
                                "HIGH"
                              ? "bg-orange-500 text-white border-orange-400"
                              : "bg-emerald-500 text-white border-emerald-400"
                        }`}
                      >
                        {selectedEventRequest.aiAnalysis?.wasteRisk} RISK
                      </span>
                    </div>

                    {/* ML Model & Data Coverage Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-3 text-[10px]">
                      <span className="bg-emerald-800/80 px-2 py-0.5 rounded-md font-mono text-emerald-200 border border-emerald-700">
                        🤖{" "}
                        {selectedEventRequest.aiAnalysis?.algorithm ||
                          "RandomForestRegressor"}{" "}
                        (
                        {selectedEventRequest.aiAnalysis?.modelVersion ||
                          "v1.0.0"}
                        )
                      </span>
                      <span className="bg-teal-800/80 px-2 py-0.5 rounded-md font-bold text-teal-200 border border-teal-700">
                        📊 Trained on{" "}
                        {selectedEventRequest.aiAnalysis?.trainingSampleCount ||
                          46}{" "}
                        real events
                      </span>
                      <span className="bg-indigo-800/80 px-2 py-0.5 rounded-md font-bold text-indigo-200 border border-indigo-700">
                        🎯 MAE:{" "}
                        {selectedEventRequest.aiAnalysis?.validationMae ||
                          117.25}{" "}
                        kg
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-black tracking-wider uppercase border ${
                          selectedEventRequest.aiAnalysis?.dataCoverage ===
                          "LOW DATA COVERAGE"
                            ? "bg-amber-500/30 text-amber-200 border-amber-500/50"
                            : "bg-emerald-500/30 text-emerald-200 border-emerald-500/50"
                        }`}
                      >
                        {selectedEventRequest.aiAnalysis?.dataCoverage ||
                          "GOOD COVERAGE"}
                      </span>
                    </div>

                    <div className="text-2xl font-black text-white mb-1">
                      ~{selectedEventRequest.aiAnalysis?.estimatedWasteKg} kg
                      Expected Waste
                    </div>
                    <p className="text-xs text-emerald-300 font-medium mb-4">
                      {selectedEventRequest.aiAnalysis?.reasoning}
                    </p>

                    {/* Bins Allocation Metric */}
                    <div className="grid grid-cols-4 gap-2 bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/15 text-center">
                      <div>
                        <div className="text-base font-black text-emerald-300">
                          {selectedEventRequest.aiAnalysis?.recommendedBins
                            ?.wet || 1}
                        </div>
                        <div className="text-[10px] font-bold text-emerald-200">
                          Wet Bins
                        </div>
                      </div>
                      <div>
                        <div className="text-base font-black text-blue-300">
                          {selectedEventRequest.aiAnalysis?.recommendedBins
                            ?.dry || 1}
                        </div>
                        <div className="text-[10px] font-bold text-blue-200">
                          Dry Bins
                        </div>
                      </div>
                      <div>
                        <div className="text-base font-black text-amber-300">
                          {selectedEventRequest.aiAnalysis?.recommendedBins
                            ?.general || 1}
                        </div>
                        <div className="text-[10px] font-bold text-amber-200">
                          General
                        </div>
                      </div>
                      <div className="border-l border-white/20 pl-2">
                        <div className="text-base font-black text-yellow-300">
                          {selectedEventRequest.aiAnalysis?.recommendedBins
                            ?.total || 3}
                        </div>
                        <div className="text-[10px] font-black text-yellow-200">
                          Total Bins
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-3 text-[11px] text-emerald-200">
                      <span>
                        Collection Frequency:{" "}
                        <strong className="text-white">
                          {selectedEventRequest.aiAnalysis
                            ?.collectionFrequency || 1}
                          x daily
                        </strong>
                      </span>
                      <span>
                        Confidence:{" "}
                        <strong className="text-white">
                          {selectedEventRequest.aiAnalysis?.confidenceScore} (
                          {
                            selectedEventRequest.aiAnalysis
                              ?.confidenceScoreNumeric
                          }
                          %)
                        </strong>
                      </span>
                    </div>

                    {selectedEventRequest.aiAnalysis?.warnings?.length > 0 && (
                      <div className="mt-3 bg-red-500/20 border border-red-500/30 p-2.5 rounded-xl text-[11px] text-red-200">
                        <strong className="text-red-100">
                          ⚠️ Operational Alerts:
                        </strong>
                        <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                          {selectedEventRequest.aiAnalysis.warnings.map(
                            (w, i) => (
                              <li key={i}>{w}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Admin Decision Action Box */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex bg-gray-100 p-1 rounded-xl gap-1 mb-4">
                      <button
                        onClick={() => setEventDecisionType("approve")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                          eventDecisionType === "approve"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        ✅ Approve AI Quota
                      </button>
                      <button
                        onClick={() => setEventDecisionType("modify")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                          eventDecisionType === "modify"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        ✏️ Modify Quota
                      </button>
                      <button
                        onClick={() => setEventDecisionType("allocate")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                          eventDecisionType === "allocate"
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        🚚 Allocate Fleet
                      </button>
                      <button
                        onClick={() => setEventDecisionType("reject")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                          eventDecisionType === "reject"
                            ? "bg-red-600 text-white shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        ❌ Reject
                      </button>
                    </div>

                    {/* Action 1: Approve Form */}
                    {eventDecisionType === "approve" && (
                      <div className="space-y-3">
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-medium">
                          Approving will authorize{" "}
                          <strong>
                            {selectedEventRequest.aiAnalysis?.recommendedBins
                              ?.total || 3}{" "}
                            dustbins
                          </strong>{" "}
                          with{" "}
                          {selectedEventRequest.aiAnalysis
                            ?.collectionFrequency || 1}
                          x daily municipal collection.
                        </div>
                        <input
                          type="text"
                          placeholder="Optional admin approval comment..."
                          value={decisionReason}
                          onChange={(e) => setDecisionReason(e.target.value)}
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-emerald-500"
                        />
                        <button
                          disabled={decisionSubmitting}
                          onClick={() =>
                            handleApproveEvent(selectedEventRequest._id)
                          }
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-md"
                        >
                          {decisionSubmitting
                            ? "Approving..."
                            : "Confirm & Approve Event Request 🚀"}
                        </button>
                      </div>
                    )}

                    {/* Action 2: Modify Form */}
                    {eventDecisionType === "modify" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                              Wet Bins
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={modWetBins}
                              onChange={(e) =>
                                setModWetBins(Number(e.target.value))
                              }
                              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                              Dry Bins
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={modDryBins}
                              onChange={(e) =>
                                setModDryBins(Number(e.target.value))
                              }
                              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                              General Bins
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={modGeneralBins}
                              onChange={(e) =>
                                setModGeneralBins(Number(e.target.value))
                              }
                              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                            Daily Collection Frequency
                          </label>
                          <select
                            value={modFrequency}
                            onChange={(e) =>
                              setModFrequency(Number(e.target.value))
                            }
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                          >
                            <option value={1}>1 time / day</option>
                            <option value={2}>2 times / day</option>
                            <option value={3}>3 times / day</option>
                            <option value={4}>
                              4 times / day (Continuous pickup)
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                            Modification Reason (Mandatory) *
                          </label>
                          <textarea
                            required
                            placeholder="Reason for modifying bin count (e.g. Venue has extra existing dustbins on site)..."
                            value={decisionReason}
                            onChange={(e) => setDecisionReason(e.target.value)}
                            rows="2"
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-500"
                          />
                        </div>

                        <button
                          disabled={decisionSubmitting}
                          onClick={() =>
                            handleModifyEvent(selectedEventRequest._id)
                          }
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-all shadow-md"
                        >
                          {decisionSubmitting
                            ? "Updating..."
                            : `Save & Approve Modified ${modWetBins + modDryBins + modGeneralBins} Bins ✏️`}
                        </button>
                      </div>
                    )}

                    {/* Action 3: Allocate Form */}
                    {eventDecisionType === "allocate" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                            Assign Collection Vehicle
                          </label>
                          <select
                            value={allocVehicleId}
                            onChange={(e) => setAllocVehicleId(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                          >
                            <option value="">
                              -- Select Municipal Vehicle --
                            </option>
                            {vehicles.map((v) => (
                              <option key={v._id} value={v._id}>
                                🚚 {v.vehicleNumber} (
                                {v.model || "Compactor Truck"})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                            Assign Sanitation Field Staff
                          </label>
                          <select
                            value={allocStaffId}
                            onChange={(e) => setAllocStaffId(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                          >
                            <option value="">-- Select Staff Officer --</option>
                            {staff.map((s) => (
                              <option key={s._id} value={s._id}>
                                👤 {s.name} (
                                {s.phone || "Sanitation Supervisor"})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                            Collection Timetable Schedule
                          </label>
                          <input
                            type="text"
                            value={allocSchedule}
                            onChange={(e) => setAllocSchedule(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                          />
                        </div>

                        <button
                          disabled={decisionSubmitting}
                          onClick={() =>
                            handleAllocateEvent(selectedEventRequest._id)
                          }
                          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl transition-all shadow-md"
                        >
                          {decisionSubmitting
                            ? "Deploying..."
                            : "Deploy Fleet & Assign Resources 🚚"}
                        </button>
                      </div>
                    )}

                    {/* Action 4: Reject Form */}
                    {eventDecisionType === "reject" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                            Rejection Reason *
                          </label>
                          <textarea
                            required
                            placeholder="State reason for rejection (e.g. Incomplete invitation proof, illegal commercial event)..."
                            value={decisionReason}
                            onChange={(e) => setDecisionReason(e.target.value)}
                            rows="3"
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-red-500"
                          />
                        </div>
                        <button
                          disabled={decisionSubmitting}
                          onClick={() =>
                            handleRejectEvent(selectedEventRequest._id)
                          }
                          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl transition-all shadow-md"
                        >
                          {decisionSubmitting
                            ? "Rejecting..."
                            : "Reject Event Dustbin Request ❌"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Suspend Account Form */}
        {suspendingCitizen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in duration-300">
              <button
                onClick={() => setSuspendingCitizen(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 text-black border-none cursor-pointer"
              >
                ✕
              </button>
              <h4 className="text-xl font-bold text-gray-800 mb-4 font-black">
                ⚠️ Suspend Citizen Account
              </h4>
              <p className="text-xs text-gray-500 mb-4">
                Suspended users cannot submit complaints, earn rewards, or
                appear in leaderboards.
              </p>

              <form onSubmit={handleSuspend} className="space-y-4">
                <div className="bg-white-50 p-3 rounded-lg border text-black text-xs mb-2">
                  <span className="font-bold text-black">Citizen Name:</span>{" "}
                  {suspendingCitizen.fullName}
                  <br />
                  <span className="font-bold text-black">Strikes:</span>{" "}
                  {suspendingCitizen.strikeCount}/3 consecutive
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase mb-1">
                    Suspension Reason *
                  </label>
                  <textarea
                    required
                    placeholder="Enter official suspension reason (e.g. Uploaded 3 misleading fake images consecutively)"
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    className="w-full bg-white text-black border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase mb-1">
                    Verification Evidence Notes *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Describe verification evidence (e.g. Workers inspected site, confirmed fake image)"
                    value={suspensionEvidence}
                    onChange={(e) => setSuspensionEvidence(e.target.value)}
                    className="w-full bg-white text-black border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase mb-1">
                    Evidence URL / Image Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter evidence URL (e.g. site inspection photo URL)"
                    value={suspensionEvidenceUrl}
                    onChange={(e) => setSuspensionEvidenceUrl(e.target.value)}
                    className="w-full bg-white text-black border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-bold text-sm shadow-md"
                >
                  Confirm Suspension & Log
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Resolve Appeal Form */}
        {resolvingAppeal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in duration-300">
              <button
                onClick={() => setResolvingAppeal(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 text-black border-none cursor-pointer"
              >
                ✕
              </button>
              <h4 className="text-xl font-bold text-gray-800 mb-4 font-black">
                ⚖️ Resolve Citizen Appeal
              </h4>

              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg border text-xs text-black">
                  <span className="font-bold">Citizen:</span>{" "}
                  {resolvingAppeal.citizenId?.fullName}
                  <br />
                  <span className="font-bold">Appeal explanation:</span> "
                  {resolvingAppeal.reason}"
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase mb-1">
                    Admin Resolution Notes *
                  </label>
                  <textarea
                    required
                    placeholder="Provide details on why you are accepting or rejecting the appeal (e.g. Appeal accepted. User uploaded correct proof. Account restored.)"
                    value={appealNotes}
                    onChange={(e) => setAppealNotes(e.target.value)}
                    className="w-full bg-white text-black border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500"
                    rows="3"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() =>
                      handleResolveAppeal(resolvingAppeal._id, "accept")
                    }
                    className="py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs shadow-md"
                  >
                    Accept Appeal ✅
                  </button>
                  <button
                    onClick={() =>
                      handleResolveAppeal(resolvingAppeal._id, "reject")
                    }
                    className="py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md"
                  >
                    Reject Appeal ❌
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const ReviewsView = () => (
    <>
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              ⭐ User Reviews & Feedback
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {reviews.length} total reviews
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-800">4.2</div>
              <div className="text-xs text-gray-500">Average Rating</div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                {review.userName.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800 text-base">
                  {review.userName}
                </p>
                <p className="text-sm text-gray-500">📍 {review.location}</p>
                <div className="text-xl mt-1">{renderStars(review.rating)}</div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-sm text-gray-700 italic">"{review.comment}"</p>
            </div>
            <p className="text-xs text-gray-400">{review.time}</p>
          </div>
        ))}
      </div>
    </>
  );

  const RouteView = () => (
    <>
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              🛣️ Route Management
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {routes.length} total routes created
            </p>
          </div>
          <button
            onClick={() => openModal("route")}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">Add Route</span>
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Route Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Assigned Vehicle
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {routes.map((route) => (
                <tr
                  key={route._id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-2xl mr-3">🛣️</div>
                      <div className="text-sm font-medium text-gray-900">
                        {route.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {route.description || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                    {route.assignedVehicleId
                      ? `${route.assignedVehicleId.vehicleNumber}${route.assignedVehicleId.type ? ` (${route.assignedVehicleId.type})` : ""}`
                      : "Unassigned"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                    <button
                      onClick={() => openEditRouteModal(route)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRoute(route._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveVehicles(route._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Truck className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {routes.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    No routes created yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const DustbinsView = () => {
    const filteredDustbins = dustbins.filter((bin) => {
      if (!filterRoute) return true;
      return bin.routeId?._id === filterRoute;
    });

    return (
      <>
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">
                🗑️ Dustbins Management
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {filteredDustbins.length} dustbins shown (Total:{" "}
                {dustbins.length})
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={filterRoute}
                  onChange={(e) => setFilterRoute(e.target.value)}
                  className="appearance-none bg-gray-50 border border-gray-300 text-gray-700 py-2 pl-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-purple-500"
                >
                  <option value="">All Routes</option>
                  {routes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg
                    className="fill-current h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
              <button
                onClick={() => openModal("dustbin")}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span className="font-semibold">Add Dustbin</span>
              </button>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Live Image
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Area/Route
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Coordinates
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDustbins.map((bin) => (
                  <tr
                    key={bin._id || bin.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                        {bin.imageUrl ? (
                          <img
                            src={bin.imageUrl}
                            alt="Bin Status"
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => window.open(bin.imageUrl, "_blank")}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-xs text-gray-400">
                            No Img
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {bin.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{bin.area}</div>
                      <div className="text-xs text-blue-600 font-semibold mt-1">
                        {bin.routeId ? `🛣️ ${bin.routeId.name}` : "🚫 No Route"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {bin.latitude.toFixed(4)}, {bin.longitude.toFixed(4)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${bin.status === "clean" ? "bg-green-100 text-green-800" : bin.status === "overflow" ? "bg-yellow-100 text-yellow-800" : bin.status === "missed" ? "bg-red-100 text-red-800" : bin.status === "skiped" ? "bg-red-200 text-blue-800" : bin.status === "suspecies" ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-800"}`}
                      >
                        {bin.status ? bin.status.toUpperCase() : "UNKNOWN"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {bin.status !== "clean" && (
                          <button
                            onClick={() => handleManualClean(bin._id)}
                            className="p-2 text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                            title="Mark Clean"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditDustbinModal(bin)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDustbin(bin._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDustbins.length === 0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      No dustbins found for the selected route.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const VehiclesView = () => {
    const filteredVehicles = vehicles.filter((vehicle) => {
      if (!filterRoute) return true;
      const selectedRouteObj = routes.find((r) => r._id === filterRoute);
      return selectedRouteObj?.assignedVehicleId?._id === vehicle._id;
    });

    return (
      <>
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">
                🚛 Vehicles Management
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {filteredVehicles.length} vehicles shown (Total:{" "}
                {vehicles.length})
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={filterRoute}
                  onChange={(e) => setFilterRoute(e.target.value)}
                  className="appearance-none bg-gray-50 border border-gray-300 text-gray-700 py-2 pl-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-purple-500"
                >
                  <option value="">All Routes</option>
                  {routes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg
                    className="fill-current h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
              <button
                onClick={() => openModal("vehicle")}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span className="font-semibold">Add Vehicle</span>
              </button>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Vehicle Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Assigned Route
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVehicles.map((vehicle) => {
                  const assignedRoute = routes.find(
                    (r) => r.assignedVehicleId?._id === vehicle._id,
                  );
                  return (
                    <tr
                      key={vehicle._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-2xl mr-3">🚛</div>
                          <div className="text-sm font-bold text-gray-900">
                            {vehicle.vehicleNumber}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                        {vehicle.type || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-bold">
                        {assignedRoute ? (
                          assignedRoute.name
                        ) : (
                          <span className="text-gray-400 font-normal">
                            Not Assigned
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${vehicle.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                        >
                          {vehicle.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {vehicle.latitude != null && vehicle.longitude != null
                          ? `${vehicle.latitude.toFixed(4)}, ${vehicle.longitude.toFixed(4)}`
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openEditVehicleModal(vehicle)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVehicle(vehicle._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredVehicles.length === 0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      No vehicles assigned to the selected route.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const StaffView = () => (
    <>
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              👥 Staff Management
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {staff.length} total staff members
            </p>
          </div>
          <button
            onClick={() => openModal("staff")}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">Add Staff</span>
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Vehicle No
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staff.map((member) => (
                <tr
                  key={member._id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                        {member.name.charAt(0)}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {member.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {member.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                    {member.assignedVehicleId
                      ? `${member.assignedVehicleId.vehicleNumber} (${member.assignedVehicleId.type || "-"})`
                      : "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                    <button
                      onClick={() => openEditStaffModal(member)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(member._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveVehiclesFromStaff(member._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Truck className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      <aside
        className={`${sidebarOpen ? "w-64" : "w-20"} bg-gradient-to-b from-purple-700 via-purple-800 to-purple-900 text-white transition-all duration-300 flex flex-col shadow-2xl`}
      >
        <div className="p-4 flex items-center justify-between border-b border-purple-600">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8" />
              <h1 className="text-xl font-bold">CleanBin AI</h1>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-purple-600 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {[
              { view: "dashboard", icon: Activity, label: "Dashboard" },
              {
                view: "escalations",
                icon: AlertCircle,
                label: "Escalation Monitor",
              },
              { view: "complaints", icon: MessageSquare, label: "Complaints" },
              { view: "reviews", icon: Star, label: "Reviews" },
              { view: "routes", icon: MapPin, label: "Routes" },
              { view: "dustbins", icon: Building2, label: "Dustbins" },
              { view: "vehicles", icon: Truck, label: "Vehicles" },
              { view: "staff", icon: UserCog, label: "Staff" },
              { view: "moderation", icon: Shield, label: "Citizen Moderation" },
              // { view: "settings", icon: Settings, label: "Settings" },
            ].map((item) => (
              <li key={item.view}>
                <button
                  onClick={() => navigateTo(item.view)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${currentView === item.view ? "bg-purple-600 shadow-lg" : "hover:bg-purple-600/50"}`}
                >
                  <item.icon className="w-5 h-5" />
                  {sidebarOpen && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-purple-600">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded-lg text-left text-white hover:bg-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-md">
          <div className="flex items-center justify-between p-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 capitalize">
                {currentView === "dashboard" && "Office Dashboard"}
                {currentView === "escalations" && "Escalation Monitor"}
                {currentView === "complaints" && "Complaints Management"}
                {currentView === "reviews" && "User Reviews"}
                {currentView === "routes" && "Routes Management"}
                {currentView === "dustbins" && "Dustbins Management"}
                {currentView === "vehicles" && "Vehicles Management"}
                {currentView === "staff" && "Staff Management"}
                {currentView === "moderation" && "Citizen Moderation"}
                {currentView === "settings" && "System Settings"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {currentView === "dashboard" &&
                  "Manage all waste management operations"}
                {currentView === "escalations" &&
                  "Track SLA and automatic hierarchical escalation"}
                {currentView === "complaints" &&
                  "Track and manage citizen complaints"}
                {currentView === "reviews" && "View user feedback and ratings"}
                {currentView === "routes" &&
                  "Optimize and assign collection routes"}
                {currentView === "dustbins" && "Monitor and manage dustbins"}
                {currentView === "vehicles" &&
                  "Track and manage collection vehicles"}
                {currentView === "staff" && "Manage staff members and roles"}
                {currentView === "moderation" &&
                  "Moderate citizens, manage strikes, suspensions, resolve appeals, and view logs"}
                {currentView === "settings" && "Configure system settings"}
              </p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800">
                    {userData?.officeName}
                  </p>
                  <p className="text-xs text-gray-500">{userData?.adminName}</p>
                  <p className="text-xs text-gray-500">{userData?.role}</p>
                </div>
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowProfileSettings(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-100 text-gray-700 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigateTo("settings");
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-100 text-gray-700 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>System Settings</span>
                  </button>
                  <hr className="my-2" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-3 hover:bg-red-50 text-red-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {currentView === "dashboard" && (
            <DashboardView
              stats={stats}
              userData={userData}
              dustbins={dustbins}
              vehicles={vehicles}
              getBinIcon={getBinIcon}
              getVehicleIcon={getVehicleIcon}
              routePaths={routePaths}
              handleManualClean={handleManualClean}
              navigateTo={navigateTo}
              profile={profile}
              L={L}
            />
          )}
          {currentView === "escalations" && <EscalationView />}
          {currentView === "complaints" && <ComplaintsView />}
          {currentView === "reviews" && <ReviewsView />}
          {currentView === "routes" && <RouteView />}
          {currentView === "dustbins" && <DustbinsView />}
          {currentView === "vehicles" && <VehiclesView />}
          {currentView === "staff" && <StaffView />}
          {currentView === "moderation" && <ModerationView />}
          {currentView === "settings" && <SettingsView />}
        </main>
      </div>
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {modalType === "dustbin" && "➕ Add New Dustbin"}
                {modalType === "vehicle" && "➕ Add New Vehicle"}
                {modalType === "staff" && "➕ Add New Staff"}
                {modalType === "route" && "➕ Add New Route"}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5 text-black" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {modalType === "dustbin" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dustbin Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.binName}
                      onChange={(e) =>
                        setFormData({ ...formData, binName: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="e.g., Main Market Bin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Area/Location
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.binArea}
                      onChange={(e) =>
                        setFormData({ ...formData, binArea: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="e.g., Sector 4, Zone A"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.binLatitude}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            binLatitude: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                        placeholder={
                          userData?.latitude
                            ? `${userData.latitude}`
                            : "Enter Longitude"
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.binLongitude}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            binLongitude: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                        placeholder={
                          userData?.longitude
                            ? `${userData.longitude}`
                            : "Enter Longitude"
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign Route (Optional)
                    </label>
                    <select
                      value={formData.routeId || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, routeId: e.target.value })
                      }
                      className="w-full px-4 py-3 border rounded-lg text-black"
                    >
                      <option value="">-- Select Route --</option>
                      {routes.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">
                      Click on the map to select the dustbin location:
                    </p>
                    <div className="h-[450px] rounded-lg overflow-hidden border">
                      {typeof window !== "undefined" && L && (
                        <MapContainer
                          center={[
                            userData.latitude || 0,
                            userData.longitude || 0,
                          ]}
                          zoom={13}
                          style={{ height: "100%", width: "100%" }}
                        >
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <MapClickHandler
                            onLocationSelect={(latlng) => {
                              setFormData((prev) => ({
                                ...prev,
                                binLatitude: latlng.lat.toFixed(6),
                                binLongitude: latlng.lng.toFixed(6),
                              }));
                            }}
                          />
                          {formData.binLatitude && formData.binLongitude && (
                            <Marker
                              position={[
                                parseFloat(formData.binLatitude),
                                parseFloat(formData.binLongitude),
                              ]}
                            >
                              <Popup>New Location Selected</Popup>
                            </Marker>
                          )}
                          {dustbins.map((existingBin) => (
                            <Marker
                              key={`modal-bin-${existingBin._id}`}
                              position={[
                                existingBin.latitude,
                                existingBin.longitude,
                              ]}
                              icon={getBinIcon(existingBin.status)}
                            >
                              <Popup>
                                <div className="text-center min-w-[150px]">
                                  <p className="font-bold text-gray-800 text-sm mb-1">
                                    {existingBin.name}
                                  </p>
                                  <p className="text-xs text-gray-600 bg-gray-100 rounded px-2 py-1 inline-block">
                                    Route:{" "}
                                    {existingBin.routeId
                                      ? existingBin.routeId.name
                                      : "N/A"}
                                  </p>
                                </div>
                              </Popup>
                            </Marker>
                          ))}
                          {routePaths.map((route, idx) => (
                            <Polyline
                              key={`modal-route-${idx}`}
                              positions={route.positions}
                              pathOptions={{
                                color: "#6b7280",
                                weight: 1.5,
                                opacity: 0.5,
                                dashArray: "4, 8",
                              }}
                            />
                          ))}
                        </MapContainer>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.binStatus}
                      onChange={(e) =>
                        setFormData({ ...formData, binStatus: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                    >
                      <option value="clean">Clean (Green)</option>
                      <option value="overflow">Overflow (Yellow)</option>
                      <option value="missed">Missed (Red)</option>
                      <option value="skiped">Skipped (Blue)</option>
                      <option value="suspecies">Suspicious (Orange)</option>
                      <option value="ideal">Ideal / Inactive (Black)</option>
                    </select>
                  </div>
                </>
              )}
              {modalType === "vehicle" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.vehicleNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vehicleNumber: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="e.g., MH-09-AB-1234"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Type
                    </label>
                    <input
                      type="text"
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="Mini Truck / Auto Tipper"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.active ? "active" : "inactive"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          active: e.target.value === "active",
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </>
              )}
              {modalType === "staff" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Staff Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.staffName}
                      onChange={(e) =>
                        setFormData({ ...formData, staffName: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="e.g., Amit Sharma"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <select
                      required
                      value={formData.staffRole}
                      onChange={(e) =>
                        setFormData({ ...formData, staffRole: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                    >
                      <option value="">Select Role</option>
                      <option value="driver">Driver</option>
                      <option value="helper">Helper</option>
                      <option value="supervisor">Area Supervisor</option>
                      <option value="zone_officer">Zone Officer</option>
                      <option value="municipal_officer">
                        Municipal Officer
                      </option>
                      <option value="commissioner">City Commissioner</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.staffPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, staffPhone: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="9876543210"
                    />
                  </div>
                  {formData.staffRole === "driver" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assign Vehicle
                      </label>
                      <select
                        value={formData.assignedVehicleId}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            assignedVehicleId: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      >
                        <option value="">-- Select Vehicle --</option>
                        {vehicles.map((v) => (
                          <option key={v._id} value={v._id}>
                            {v.vehicleNumber} {v.type ? `(${v.type})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
              {modalType === "route" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Route Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.routeName}
                      onChange={(e) =>
                        setFormData({ ...formData, routeName: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="e.g., Ward-12 Morning Route"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.routeDescription}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          routeDescription: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="Area details, timing, landmarks, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign Vehicle (Optional)
                    </label>
                    <select
                      value={formData.assignedVehicleId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          assignedVehicleId: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                    >
                      <option value="">-- Select Vehicle --</option>
                      {vehicles.map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.vehicleNumber} {v.type ? `(${v.type})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-bold text-white transition-all shadow-md hover:shadow-lg"
              >
                ✓ Add{" "}
                {modalType === "route"
                  ? "Route"
                  : modalType === "dustbin"
                    ? "Dustbin"
                    : modalType === "vehicle"
                      ? "Vehicle"
                      : "Staff"}
              </button>
            </form>
          </div>
        </div>
      )}
      {showEditStaffModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowEditStaffModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                ✏️ Edit Staff
              </h2>
              <button
                onClick={() => setShowEditStaffModal(false)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
              >
                <X className="w-5 h-5 text-black" />
              </button>
            </div>
            <form onSubmit={handleEditStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Staff Name
                </label>
                <input
                  type="text"
                  value={formData.staffName}
                  onChange={(e) =>
                    setFormData({ ...formData, staffName: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={formData.staffRole}
                  onChange={(e) =>
                    setFormData({ ...formData, staffRole: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg text-black"
                >
                  <option value="driver">Driver</option>
                  <option value="helper">Helper</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.staffPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, staffPhone: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg text-black"
                />
              </div>
              {formData.staffRole === "driver" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Vehicle
                  </label>
                  <select
                    value={formData.assignedVehicleId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assignedVehicleId: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border rounded-lg text-black"
                  >
                    <option value="">-- Select Vehicle --</option>
                    {vehicles.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.vehicleNumber} {v.type ? `(${v.type})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-bold text-white"
              >
                Update Staff
              </button>
            </form>
          </div>
        </div>
      )}
      {showEditVehicleModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowEditVehicleModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl text-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                ✏️ Edit Vehicle
              </h2>
              <button
                onClick={() => setShowEditVehicleModal(false)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5 text-black" />
              </button>
            </div>
            <form onSubmit={handleEditVehicleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={formData.vehicleNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleNumber: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={formData.active ? "active" : "inactive"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      active: e.target.value === "active",
                    })
                  }
                  className="w-full px-4 py-3 border rounded-lg text-black"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-bold text-white"
              >
                Update Vehicle
              </button>
            </form>
          </div>
        </div>
      )}
      {showEditRouteModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowEditRouteModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl text-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                ✏️ Edit Route
              </h2>
              <button
                onClick={() => setShowEditRouteModal(false)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
              >
                <X className="w-5 h-5 text-black" />
              </button>
            </div>
            <form onSubmit={handleEditRouteSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Route Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.routeName}
                  onChange={(e) =>
                    setFormData({ ...formData, routeName: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg text-black"
                  placeholder="Ward-12 Morning Route"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.routeDescription}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      routeDescription: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border rounded-lg text-black"
                  placeholder="Area details, timing, landmarks…"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Vehicle (Optional)
                </label>
                <select
                  value={formData.assignedVehicleId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      assignedVehicleId: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border rounded-lg text-black"
                >
                  <option value="">-- Select Vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.vehicleNumber} {v.type ? `(${v.type})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-bold text-white"
              >
                Update Route
              </button>
            </form>
          </div>
        </div>
      )}
      {showEditDustbinModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowEditDustbinModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl text-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                ✏️ Edit Dustbin
              </h2>
              <button
                onClick={() => setShowEditDustbinModal(false)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditDustbinSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Dustbin Name
                </label>
                <input
                  type="text"
                  value={formData.binName}
                  onChange={(e) =>
                    setFormData({ ...formData, binName: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Area</label>
                <input
                  type="text"
                  value={formData.binArea}
                  onChange={(e) =>
                    setFormData({ ...formData, binArea: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg text-black"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.binLatitude}
                    onChange={(e) =>
                      setFormData({ ...formData, binLatitude: e.target.value })
                    }
                    className="w-full px-4 py-3 border rounded-lg text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.binLongitude}
                    onChange={(e) =>
                      setFormData({ ...formData, binLongitude: e.target.value })
                    }
                    className="w-full px-4 py-3 border rounded-lg text-black"
                  />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">
                  Map par click karke location update karo
                </p>
                <div className="h-[250px] rounded-lg overflow-hidden border">
                  {typeof window !== "undefined" && L && (
                    <MapContainer
                      center={[
                        formData.binLatitude
                          ? parseFloat(formData.binLatitude)
                          : 23.2599,
                        formData.binLongitude
                          ? parseFloat(formData.binLongitude)
                          : 77.4126,
                      ]}
                      zoom={13}
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <MapClickHandler
                        onLocationSelect={(latlng) => {
                          setFormData((prev) => ({
                            ...prev,
                            binLatitude: latlng.lat.toFixed(6),
                            binLongitude: latlng.lng.toFixed(6),
                          }));
                        }}
                      />
                      {formData.binLatitude && formData.binLongitude && (
                        <Marker
                          position={[
                            parseFloat(formData.binLatitude),
                            parseFloat(formData.binLongitude),
                          ]}
                        />
                      )}
                    </MapContainer>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={formData.binStatus}
                  onChange={(e) =>
                    setFormData({ ...formData, binStatus: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                >
                  <option value="clean">Clean (Green)</option>
                  <option value="overflow">Overflow (Yellow)</option>
                  <option value="missed">Missed (Red)</option>
                  <option value="skiped">Skipped (Blue)</option>
                  <option value="suspecies">Suspicious (Orange)</option>
                  <option value="ideal">Ideal / Inactive (Black)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Assign Route (Optional)
                </label>
                <select
                  value={formData.routeId || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, routeId: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg text-black"
                >
                  <option value="">-- Select Route --</option>
                  {routes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-bold text-white"
              >
                Update Dustbin
              </button>
            </form>
          </div>
        </div>
      )}
      {modalVisible && selectedReport && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-10"
          onClick={() => setModalVisible(false)}
        >
          <div
            className="bg-white rounded-[2rem] w-full max-w-6xl h-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full md:w-[55%] bg-gray-900 relative group h-64 md:h-auto">
              {selectedReport.image || selectedReport.ComimageUrl ? (
                <img
                  src={selectedReport.image || selectedReport.ComimageUrl}
                  alt="Complaint Proof"
                  className="w-full h-full object-contain md:object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                  <span className="text-6xl mb-4">📷</span>
                  <p className="text-lg font-semibold">No Image Provided</p>
                </div>
              )}
              <div className="absolute top-6 left-6 flex gap-2">
                <span
                  className={`px-5 py-2 text-xs font-black rounded-full uppercase shadow-2xl backdrop-blur-xl border border-white/20 bg-white/90 ${selectedReport.status === "resolved" ? "text-green-700" : "text-gray-800"}`}
                >
                  {selectedReport.status}
                </span>
                <span
                  className="px-5 py-2 text-xs font-black rounded-full uppercase shadow-2xl border border-white/20"
                  style={{
                    backgroundColor: getPriorityColor(
                      selectedReport.priority || selectedReport.latestPriority,
                    ),
                    color: "#fff",
                  }}
                >
                  {selectedReport.priority ||
                    selectedReport.latestPriority ||
                    "Medium"}{" "}
                  Priority
                </span>
              </div>
            </div>
            <div className="w-full md:w-[45%] p-8 md:p-10 flex flex-col bg-white overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                    Complaint Info
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 flex items-center gap-2">
                      🗑️{" "}
                      {selectedReport.dustbinDetails?.name ||
                        selectedReport.dustbinId?.name ||
                        "Unknown Bin"}
                    </span>
                    {selectedReport.complaintCount > 1 && (
                      <span className="bg-indigo-600 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
                        +{selectedReport.complaintCount - 1} Others Reported
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setModalVisible(false)}
                  className="p-2 bg-gray-100 rounded-full hover:bg-red-50 hover:text-red-600 transition-all active:scale-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-6 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">
                      About
                    </p>
                    <p className="text-gray-800 font-bold text-lg capitalize">
                      {selectedReport.latestDescription ||
                        selectedReport.type ||
                        "General"}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">
                      Reported At
                    </p>
                    <p className="text-gray-800 font-bold text-lg">
                      {formatDateTime(
                        selectedReport.reportedAt ||
                          selectedReport.createdAt ||
                          selectedReport.time,
                      )}
                    </p>
                  </div>
                </div>
                <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-2">
                    Route Details
                  </p>
                  <div className="flex items-center gap-3 text-indigo-900">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <MapPinIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-black text-lg leading-tight">
                        {selectedReport.dustbinDetails?.routeName?.name ||
                          selectedReport.dustbinId?.routeId?.name ||
                          "No Route Assigned"}
                      </p>
                      <p className="text-xs text-indigo-600 mt-1">
                        {selectedReport.area || "Area not specified"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 relative">
                  <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-2">
                    Latest Note
                  </p>
                  <p className="text-amber-900 font-medium leading-relaxed italic text-sm">
                    "
                    {selectedReport.description ||
                      selectedReport.latestDescription ||
                      "No comments provided."}
                    "
                  </p>
                </div>

                <div className="pt-2">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3">
                    Dispatch Status
                  </p>
                  {selectedReport.vehicle &&
                  selectedReport.vehicle !== "Not Assigned" ? (
                    <div className="flex items-center gap-4 p-4 bg-green-50 rounded-2xl text-green-700 font-black border-2 border-green-100">
                      <div className="w-12 h-12 bg-green-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
                        <Truck className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-lg leading-none">
                          {selectedReport.vehicle}
                        </p>
                        <p className="text-xs font-bold opacity-70 mt-1">
                          Vehicle On Duty
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl text-red-600 border border-red-100">
                      <AlertCircle className="w-5 h-5 animate-pulse" />
                      <p className="font-bold">Awaiting Vehicle Assignment</p>
                    </div>
                  )}
                </div>

                {/* JAES Hierarchy Timeline */}
                {detailedReport && (
                  <div className="space-y-4">
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        JAES Escalation Timeline Status
                      </p>
                      <div className="relative border-l-2 border-gray-200 pl-4 ml-2 space-y-4">
                        {[
                          {
                            level: 1,
                            name: "Driver / Worker",
                            staff:
                              detailedReport.driverId?.name ||
                              detailedReport.vehicle ||
                              "Assigned Driver",
                          },
                          {
                            level: 2,
                            name: "Area Supervisor",
                            staff:
                              detailedReport.supervisorId?.name ||
                              "Area Supervisor",
                          },
                          {
                            level: 3,
                            name: "Zone Officer",
                            staff:
                              detailedReport.zoneOfficerId?.name ||
                              "Zone Officer",
                          },
                          {
                            level: 4,
                            name: "Municipal Officer",
                            staff:
                              detailedReport.municipalOfficerId?.name ||
                              "Municipal Officer",
                          },
                          {
                            level: 5,
                            name: "City Commissioner",
                            staff:
                              detailedReport.commissionerId?.name ||
                              "City Commissioner",
                          },
                        ].map((stage) => {
                          const isActive =
                            detailedReport.currentEscalationLevel >=
                            stage.level;
                          return (
                            <div key={stage.level} className="relative">
                              <span
                                className={`absolute -left-[25px] top-1 w-3.5 h-3.5 rounded-full border-2 ${isActive ? "bg-red-500 border-red-200" : "bg-gray-100 border-gray-300"}`}
                              ></span>
                              <div>
                                <p
                                  className={`text-xs font-bold ${isActive ? "text-gray-900" : "text-gray-400"}`}
                                >
                                  Level {stage.level}: {stage.name}
                                </p>
                                <p className="text-[10px] text-gray-500">
                                  Responsible: {stage.staff}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Admin Verification Panel */}
                    {detailedReport.verificationStatus &&
                    detailedReport.verificationStatus !== "none" ? (
                      <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 space-y-3">
                        <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">
                          Admin Verification Details
                        </p>
                        <div className="space-y-2 text-sm text-gray-800">
                          <div>
                            <span className="font-bold">Status:</span>{" "}
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-bold capitalize">
                              {detailedReport.verificationStatus.replace(
                                "_",
                                " ",
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="font-bold">Reason:</span>{" "}
                            {detailedReport.verificationReason}
                          </div>
                          {detailedReport.verificationNotes && (
                            <div>
                              <span className="font-bold">Notes:</span>{" "}
                              {detailedReport.verificationNotes}
                            </div>
                          )}
                          {detailedReport.verificationEvidenceUrl && (
                            <div>
                              <span className="font-bold">Evidence:</span>{" "}
                              <a
                                href={detailedReport.verificationEvidenceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 underline"
                              >
                                View Attachment
                              </a>
                            </div>
                          )}
                          <div className="text-xs text-gray-500 border-t pt-2 mt-2 text-left">
                            Verified by{" "}
                            <span className="font-semibold">
                              {detailedReport.verifiedBy}
                            </span>{" "}
                            on{" "}
                            {new Date(
                              detailedReport.verificationDate,
                            ).toLocaleString("en-IN")}
                          </div>
                          {detailedReport.legalReviewRequired && (
                            <div className="mt-2 px-3 py-1 bg-purple-100 text-purple-800 border border-purple-200 rounded text-xs font-bold uppercase animate-pulse">
                              ⚖️ Legal Review Required
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <form
                        onSubmit={handleVerifyComplaint}
                        className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4"
                      >
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                          Verify Complaint & Update Citizen Score
                        </p>

                        {detailedReport.imageFraudFlag && (
                          <div className="p-3 bg-red-100 text-red-800 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
                            <span>⚠️</span>
                            <span>
                              IMAGE FRAUD WARNING: Duplicate Image Detected!
                              Needs Verification.
                            </span>
                          </div>
                        )}

                        <div className="space-y-3 text-left">
                          <div>
                            <label className="block text-xs font-black text-gray-700 uppercase mb-1">
                              Verification Decision *
                            </label>
                            <select
                              value={vStatus}
                              onChange={(e) => setVStatus(e.target.value)}
                              className="w-full bg-white text-black border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500 font-bold"
                            >
                              <option value="genuine">
                                Genuine Complaint (+10 Pts)
                              </option>
                              <option value="partially_valid">
                                Partially Valid Complaint (+10 Pts)
                              </option>
                              <option value="duplicate">
                                Duplicate Complaint (-20 Pts)
                              </option>
                              <option value="false">
                                False Complaint (-20 Pts + Strike)
                              </option>
                              <option value="misleading">
                                Misleading Complaint (-20 Pts + Strike)
                              </option>
                              <option value="spam">
                                Spam Complaint (-20 Pts + Strike)
                              </option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-black text-gray-700 uppercase mb-1">
                              Written Reason *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Verified by site inspection photo or GPS match"
                              value={vReason}
                              onChange={(e) => setVReason(e.target.value)}
                              className="w-full bg-white text-black border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-black text-gray-700 uppercase mb-1">
                              Verification Notes
                            </label>
                            <textarea
                              placeholder="Additional details / investigation log"
                              value={vNotes}
                              onChange={(e) => setVNotes(e.target.value)}
                              className="w-full bg-white text-black border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500"
                              rows="2"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-black text-gray-700 uppercase mb-1">
                              Evidence Reference URL / File Link
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. http://evidence-image-url.com"
                              value={vEvidenceUrl}
                              onChange={(e) => setVEvidenceUrl(e.target.value)}
                              className="w-full bg-white text-black border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500"
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="checkbox"
                              id="legalReviewCheck"
                              checked={vLegalReview}
                              onChange={(e) =>
                                setVLegalReview(e.target.checked)
                              }
                              className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <label
                              htmlFor="legalReviewCheck"
                              className="text-xs font-bold text-gray-700 uppercase cursor-pointer select-none"
                            >
                              ⚖️ Flag for Legal Review (Escalate Severe Misuse)
                            </label>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95"
                        >
                          Submit Verification & Update Scores
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-6 pt-6 border-t-2 border-dashed border-gray-100">
                {detailedReport?.legalReviewRequired ? (
                  <div className="p-4 bg-purple-50 rounded-2xl text-purple-700 font-bold border border-purple-200 flex items-center justify-center gap-2">
                    <span>🔒 Locked for Legal Review</span>
                  </div>
                ) : (!selectedReport.vehicle ||
                    selectedReport.vehicle === "Not Assigned") &&
                  selectedReport.status !== "resolved" ? (
                  <div className="space-y-4">
                    <label className="text-sm font-black text-gray-800 ml-1">
                      Quick Dispatch
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select
                        className="flex-1 bg-white border-2 border-gray-200 text-gray-900 text-sm font-bold rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 block w-full p-3 transition-all outline-none"
                        id="quickAssignSelect"
                      >
                        <option value="">Select Available Vehicle</option>
                        {vehicles
                          .filter(
                            (v) => v.status === "Active" || v.status === "idle",
                          )
                          .map((v) => (
                            <option key={v._id} value={v._id}>
                              🚚 {v.vehicleNumber} ({v.type || "Truck"})
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => {
                          const select =
                            document.getElementById("quickAssignSelect");
                          if (select.value) {
                            assignVehicleToComplaint(select.value);
                          } else {
                            alert("Please select a vehicle first");
                          }
                        }}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2 active:scale-95"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setModalVisible(false)}
                    className="w-full py-4 bg-gray-900 hover:bg-black text-white font-black rounded-2xl transition-all shadow-xl active:scale-95"
                  >
                    Close Details
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showProfileSettings && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowProfileSettings(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl text-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                👤 Profile Settings
              </h2>
              <button
                onClick={() => setShowProfileSettings(false)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  defaultValue={profile.name}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  defaultValue={profile.email}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  defaultValue={profile.phone}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Designation
                </label>
                <input
                  type="text"
                  defaultValue={profile.designation}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  defaultValue={profile.city}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  defaultValue={profile.department}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-black"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-bold text-white transition-all shadow-md hover:shadow-lg"
              >
                ✓ Update Profile
              </button>
            </form>
          </div>
        </div>
      )}
      {showEscalationModal && selectedEscalation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => {
                setShowEscalationModal(false);
                setSelectedEscalation(null);
              }}
              className="absolute top-4 right-4 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors text-black"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              ⚠️ Escalation Detail Timeline - #SM
              {selectedEscalation._id.slice(-6).toUpperCase()}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="w-full h-64 rounded-2xl overflow-hidden border bg-gray-100">
                  <img
                    src={selectedEscalation.ComimageUrl}
                    alt="Complaint Proof"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-bold text-gray-700">Type:</span>{" "}
                    {selectedEscalation.complaintType}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-bold text-gray-700">Location:</span>{" "}
                    {selectedEscalation.area}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-bold text-gray-700">
                      Description:
                    </span>{" "}
                    {selectedEscalation.description}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-bold text-gray-700">
                      Days Pending:
                    </span>{" "}
                    {selectedEscalation.pendingDays || 0} days
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-bold text-gray-700">Status:</span>{" "}
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-bold uppercase">
                      {selectedEscalation.status}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-bold text-gray-700">
                      Public Shared Eligible:
                    </span>{" "}
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${selectedEscalation.publicEscalationEligible ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}
                    >
                      {selectedEscalation.publicEscalationEligible
                        ? "YES"
                        : "NO"}
                    </span>
                  </p>
                  <div className="pt-3">
                    <button
                      onClick={() =>
                        window.open(
                          `${API_BASE_URL}/complaint/share-card/${selectedEscalation._id}`,
                          "_blank",
                        )
                      }
                      className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold text-xs hover:from-blue-700 hover:to-indigo-700 transition-all shadow"
                    >
                      📢 View Social Media Share Card
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-800">
                  📊 JAES Escalation Stages
                </h3>
                <div className="relative border-l-2 border-gray-200 pl-6 ml-4 space-y-6">
                  {[
                    {
                      level: 1,
                      name: "Driver / Worker",
                      staff:
                        selectedEscalation.driverId?.name ||
                        selectedEscalation.vehicle ||
                        "Assigned Driver",
                    },
                    {
                      level: 2,
                      name: "Area Supervisor",
                      staff:
                        selectedEscalation.supervisorId?.name ||
                        "Area Supervisor",
                    },
                    {
                      level: 3,
                      name: "Zone Officer",
                      staff:
                        selectedEscalation.zoneOfficerId?.name ||
                        "Zone Officer",
                    },
                    {
                      level: 4,
                      name: "Municipal Officer",
                      staff:
                        selectedEscalation.municipalOfficerId?.name ||
                        "Municipal Officer",
                    },
                    {
                      level: 5,
                      name: "City Commissioner",
                      staff:
                        selectedEscalation.commissionerId?.name ||
                        "City Commissioner",
                    },
                  ].map((stage) => {
                    const isActive =
                      selectedEscalation.currentEscalationLevel >= stage.level;
                    return (
                      <div key={stage.level} className="relative">
                        <span
                          className={`absolute -left-[33px] top-1 w-4 h-4 rounded-full border-2 ${isActive ? "bg-red-500 border-red-200 shadow-lg" : "bg-gray-100 border-gray-300"}`}
                        ></span>
                        <div>
                          <p
                            className={`text-sm font-bold ${isActive ? "text-gray-900" : "text-gray-400"}`}
                          >
                            Level {stage.level}: {stage.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Responsible: {stage.staff}
                          </p>
                          <p className="text-[10px] font-bold text-blue-600 mt-0.5">
                            {isActive
                              ? "⚠️ ACTIVE RESPONSIBILITY"
                              : "⏳ PENDING ESCALATION"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-bold text-gray-800 mb-2">
                    📋 Audit History Trail Logs:
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                    {selectedEscalation.escalationHistory &&
                    selectedEscalation.escalationHistory.length > 0 ? (
                      selectedEscalation.escalationHistory.map((log, index) => (
                        <div
                          key={index}
                          className="bg-gray-50 p-2 rounded border text-xs flex justify-between gap-4"
                        >
                          <div>
                            <span className="font-bold text-gray-700">
                              {log.statusChange || "Status Change"}
                            </span>
                            <p className="text-gray-500 mt-1">
                              From Level {log.prevLevel} ({log.prevAuthority})
                              &rarr; Level {log.newLevel} ({log.newAuthority})
                            </p>
                          </div>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap self-center">
                            {new Date(log.escalationTime).toLocaleDateString()}{" "}
                            {new Date(log.escalationTime).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400">
                        No logs captured yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        @import url("https://unpkg.com/leaflet@1.7.1/dist/leaflet.css");
        .leaflet-fade-anim .leaflet-tile,
        .leaflet-zoom-anim .leaflet-zoom-animated {
          will-change: auto !important;
        }
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .leaflet-popup-content {
          margin: 12px;
          min-width: 180px;
        }
        .leaflet-container {
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}

export default function OfficeDashboardWithSuspense() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">
          Loading Dashboard...
        </div>
      }
    >
      <OfficeDashboard />
    </Suspense>
  );
}
