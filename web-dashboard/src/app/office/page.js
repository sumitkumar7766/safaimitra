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
// 👇 IMPORT SOCKET CLIENT
import { io } from "socket.io-client";

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
    5: "City Commissioner"
  };

  const getEscalationBadgeColor = (level) => {
    switch (level) {
      case 1: return "bg-gray-100 text-gray-800 border-gray-200";
      case 2: return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 3: return "bg-orange-100 text-orange-800 border-orange-200";
      case 4: return "bg-red-100 text-red-800 border-red-200";
      case 5: return "bg-red-200 text-red-900 border-red-300 font-extrabold animate-pulse";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getRemainingTime = (comp) => {
    if (comp.status === "resolved" || comp.status === "closed") return "Stopped";
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
      const res = await fetch(
        `http://localhost:5001/dustbin/list/${userData._id}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
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
      const res = await fetch(
        `http://localhost:5001/vehicle/list/${userData._id}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
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
      const res = await fetch(
        `http://localhost:5001/staff/list/${userData._id}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
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
      const res = await fetch(
        `http://localhost:5001/route/list/${userData._id}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
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
      const res = await axios.get(
        `http://localhost:5001/complaint/all/${officeId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
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
        `http://localhost:5001/complaint/escalations/${officeId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.data.success) setEscalations(res.data.complaints);
    } catch (error) {
      console.error("Error fetching escalations:", error);
    }
  };

  // 2. Main Socket & Initial Load Effect
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch("http://localhost:5001/office/userdata", {
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

    // 🔥 Connect to Socket.io Server
    const socket = io("http://localhost:5001");

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
      const res = await fetch(
        `http://localhost:5001/staff/update/${editStaffId}`,
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
        `http://localhost:5001/vehicle/update/${editVehicleId}`,
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
      const res = await fetch(
        `http://localhost:5001/route/update/${editRouteId}`,
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
        `http://localhost:5001/dustbin/update/${editDustbinId}`,
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
      await axios.post("http://localhost:5001/office/logout");
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
      const res = await fetch("http://localhost:5001/dustbin/register", {
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
        const res = await fetch("http://localhost:5001/vehicle/register", {
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
        const res = await fetch("http://localhost:5001/staff/register", {
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
      const res = await fetch("http://localhost:5001/route/register", {
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
      const res = await fetch(`http://localhost:5001/dustbin/delete/${id}`, {
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
      const res = await fetch(
        `http://localhost:5001/vehicle/delete/${vehicleId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
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
      const res = await fetch(`http://localhost:5001/staff/delete/${staffId}`, {
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
      const res = await fetch(`http://localhost:5001/route/delete/${routeId}`, {
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
    try {
      const targetId = report.allComplaintIds ? report.allComplaintIds[0] : (report._id || report.id);
      if (targetId) {
        const res = await axios.get(`http://localhost:5001/complaint/detail/${targetId}`);
        if (res.data.success) {
          setDetailedReport(res.data.complaint);
        }
      }
    } catch (err) {
      console.error("Error loading detailed report:", err);
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
        "http://localhost:5001/complaint/assign-vehicle",
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
        `http://localhost:5001/route/remove-vehicle/${routeId}`,
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
        `http://localhost:5001/staff/remove-vehicle/${staffId}`,
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
      const res = await fetch(
        `http://localhost:5001/dustbin/update-status/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "clean" }),
        },
      );
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
                            Level {complaint.currentEscalationLevel || 1}: {authorityNames[complaint.currentEscalationLevel || 1]}
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
        const diffHours = (new Date(c.nextEscalationAt) - new Date()) / (1000 * 60 * 60);
        return diffHours > 0 && diffHours <= 4;
      } else if (viewMode === "public_escalation_eligible") {
        return !isResolved && c.publicEscalationEligible === true;
      } else if (viewMode === "resolved") {
        return isResolved;
      }
      return true;
    });

    const totalActive = escalations.filter(c => c.status !== "resolved" && c.status !== "closed").length;
    const level5Count = escalations.filter(c => c.status !== "resolved" && c.status !== "closed" && c.currentEscalationLevel === 5).length;
    const nearDeadlineCount = escalations.filter(c => {
      if (c.status === "resolved" || c.status === "closed" || !c.nextEscalationAt) return false;
      const diff = (new Date(c.nextEscalationAt) - new Date()) / (1000 * 60 * 60);
      return diff > 0 && diff <= 4;
    }).length;
    const publicEligibleCount = escalations.filter(c => c.status !== "resolved" && c.status !== "closed" && c.publicEscalationEligible === true).length;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-md border-l-4 border-blue-500">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Active Complaints</h4>
            <p className="text-3xl font-black text-gray-900 mt-2">{totalActive}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-md border-l-4 border-yellow-500">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Critical (Level 5)</h4>
            <p className="text-3xl font-black text-gray-900 mt-2">{level5Count}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-md border-l-4 border-orange-500">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Near Escalation (&lt;4h)</h4>
            <p className="text-3xl font-black text-gray-900 mt-2">{nearDeadlineCount}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-md border-l-4 border-red-500">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Public Share Eligible</h4>
            <p className="text-3xl font-black text-gray-900 mt-2">{publicEligibleCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">⚠️ Escalation Monitoring Dashboard</h3>
              <p className="text-sm text-gray-600 mt-1">Monitor SLA times, automatic escalations, and citizen accountability status.</p>
            </div>
            <div className="flex flex-wrap gap-2 bg-gray-100 p-1.5 rounded-xl">
              {[
                { mode: "pending", label: "⏳ Pending" },
                { mode: "in_progress", label: "⚙️ In Progress" },
                { mode: "escalated", label: "🔥 Escalated" },
                { mode: "near_deadline", label: "🕒 Near Deadline" },
                { mode: "public_escalation_eligible", label: "📢 Public Eligible" },
                { mode: "resolved", label: "✅ Resolved" }
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
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Complaint ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Grievance Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Escalation Level</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Responsible Authority</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Time Remaining</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Days Pending</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                      No complaints found in this category.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((comp) => {
                    let currentAuth = "Unassigned";
                    if (comp.currentEscalationLevel === 1) {
                      currentAuth = comp.driverId ? `Driver: ${comp.driverId.name}` : (comp.vehicle !== "Not Assigned" ? comp.vehicle : "Assigned Driver");
                    } else if (comp.currentEscalationLevel === 2) {
                      currentAuth = comp.supervisorId ? `Supervisor: ${comp.supervisorId.name}` : "Area Supervisor";
                    } else if (comp.currentEscalationLevel === 3) {
                      currentAuth = comp.zoneOfficerId ? `Zone Officer: ${comp.zoneOfficerId.name}` : "Zone Officer";
                    } else if (comp.currentEscalationLevel === 4) {
                      currentAuth = comp.municipalOfficerId ? `Municipal Officer: ${comp.municipalOfficerId.name}` : "Municipal Officer";
                    } else if (comp.currentEscalationLevel === 5) {
                      currentAuth = comp.commissionerId ? `Commissioner: ${comp.commissionerId.name}` : "City Commissioner";
                    }

                    return (
                      <tr key={comp._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600 font-mono">
                          #SM{comp._id.slice(-6).toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{comp.complaintType}</div>
                          <div className="text-xs text-gray-500">{comp.area}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getEscalationBadgeColor(comp.currentEscalationLevel)}`}>
                            Level {comp.currentEscalationLevel}: {authorityNames[comp.currentEscalationLevel || 1]}
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
                          <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${comp.status === "resolved" ? "bg-green-100 text-green-700 border border-green-200" : "bg-amber-100 text-amber-700 border border-amber-200"}`}>
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
              { view: "escalations", icon: AlertCircle, label: "Escalation Monitor" },
              { view: "complaints", icon: MessageSquare, label: "Complaints" },
              { view: "reviews", icon: Star, label: "Reviews" },
              { view: "routes", icon: MapPin, label: "Routes" },
              { view: "dustbins", icon: Building2, label: "Dustbins" },
              { view: "vehicles", icon: Truck, label: "Vehicles" },
              { view: "staff", icon: UserCog, label: "Staff" },
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
                      <option value="municipal_officer">Municipal Officer</option>
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
                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      JAES Escalation Timeline Status
                    </p>
                    <div className="relative border-l-2 border-gray-200 pl-4 ml-2 space-y-4">
                      {[
                        { level: 1, name: "Driver / Worker", staff: detailedReport.driverId?.name || detailedReport.vehicle || "Assigned Driver" },
                        { level: 2, name: "Area Supervisor", staff: detailedReport.supervisorId?.name || "Area Supervisor" },
                        { level: 3, name: "Zone Officer", staff: detailedReport.zoneOfficerId?.name || "Zone Officer" },
                        { level: 4, name: "Municipal Officer", staff: detailedReport.municipalOfficerId?.name || "Municipal Officer" },
                        { level: 5, name: "City Commissioner", staff: detailedReport.commissionerId?.name || "City Commissioner" }
                      ].map((stage) => {
                        const isActive = detailedReport.currentEscalationLevel >= stage.level;
                        return (
                          <div key={stage.level} className="relative">
                            <span className={`absolute -left-[25px] top-1 w-3.5 h-3.5 rounded-full border-2 ${isActive ? 'bg-red-500 border-red-200' : 'bg-gray-100 border-gray-300'}`}></span>
                            <div>
                              <p className={`text-xs font-bold ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>Level {stage.level}: {stage.name}</p>
                              <p className="text-[10px] text-gray-500">Responsible: {stage.staff}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-6 pt-6 border-t-2 border-dashed border-gray-100">
                {(!selectedReport.vehicle ||
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
              ⚠️ Escalation Detail Timeline - #SM{selectedEscalation._id.slice(-6).toUpperCase()}
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
                  <p className="text-sm text-gray-600"><span className="font-bold text-gray-700">Type:</span> {selectedEscalation.complaintType}</p>
                  <p className="text-sm text-gray-600"><span className="font-bold text-gray-700">Location:</span> {selectedEscalation.area}</p>
                  <p className="text-sm text-gray-600"><span className="font-bold text-gray-700">Description:</span> {selectedEscalation.description}</p>
                  <p className="text-sm text-gray-600"><span className="font-bold text-gray-700">Days Pending:</span> {selectedEscalation.pendingDays || 0} days</p>
                  <p className="text-sm text-gray-600">
                    <span className="font-bold text-gray-700">Status:</span>{" "}
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-bold uppercase">{selectedEscalation.status}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-bold text-gray-700">Public Shared Eligible:</span>{" "}
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${selectedEscalation.publicEscalationEligible ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {selectedEscalation.publicEscalationEligible ? "YES" : "NO"}
                    </span>
                  </p>
                  <div className="pt-3">
                    <button 
                      onClick={() => window.open(`http://localhost:5001/complaint/share-card/${selectedEscalation._id}`, '_blank')}
                      className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold text-xs hover:from-blue-700 hover:to-indigo-700 transition-all shadow"
                    >
                      📢 View Social Media Share Card
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-800">📊 JAES Escalation Stages</h3>
                <div className="relative border-l-2 border-gray-200 pl-6 ml-4 space-y-6">
                  
                  {[
                    { level: 1, name: "Driver / Worker", staff: selectedEscalation.driverId?.name || selectedEscalation.vehicle || "Assigned Driver" },
                    { level: 2, name: "Area Supervisor", staff: selectedEscalation.supervisorId?.name || "Area Supervisor" },
                    { level: 3, name: "Zone Officer", staff: selectedEscalation.zoneOfficerId?.name || "Zone Officer" },
                    { level: 4, name: "Municipal Officer", staff: selectedEscalation.municipalOfficerId?.name || "Municipal Officer" },
                    { level: 5, name: "City Commissioner", staff: selectedEscalation.commissionerId?.name || "City Commissioner" }
                  ].map((stage) => {
                    const isActive = selectedEscalation.currentEscalationLevel >= stage.level;
                    return (
                      <div key={stage.level} className="relative">
                        <span className={`absolute -left-[33px] top-1 w-4 h-4 rounded-full border-2 ${isActive ? 'bg-red-500 border-red-200 shadow-lg' : 'bg-gray-100 border-gray-300'}`}></span>
                        <div>
                          <p className={`text-sm font-bold ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>Level {stage.level}: {stage.name}</p>
                          <p className="text-xs text-gray-500">Responsible: {stage.staff}</p>
                          <p className="text-[10px] font-bold text-blue-600 mt-0.5">
                            {isActive ? "⚠️ ACTIVE RESPONSIBILITY" : "⏳ PENDING ESCALATION"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-bold text-gray-800 mb-2">📋 Audit History Trail Logs:</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                    {selectedEscalation.escalationHistory && selectedEscalation.escalationHistory.length > 0 ? (
                      selectedEscalation.escalationHistory.map((log, index) => (
                        <div key={index} className="bg-gray-50 p-2 rounded border text-xs flex justify-between gap-4">
                          <div>
                            <span className="font-bold text-gray-700">{log.statusChange || "Status Change"}</span>
                            <p className="text-gray-500 mt-1">
                              From Level {log.prevLevel} ({log.prevAuthority}) &rarr; Level {log.newLevel} ({log.newAuthority})
                            </p>
                          </div>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap self-center">
                            {new Date(log.escalationTime).toLocaleDateString()} {new Date(log.escalationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400">No logs captured yet.</p>
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">Loading Dashboard...</div>}>
      <OfficeDashboard />
    </Suspense>
  );
}
