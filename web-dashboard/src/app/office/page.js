'use client';

import React, { useState, useEffect } from "react";
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users, Building2, UserCog, Activity, Plus, Edit2, Trash2,
  Power, X, Menu, Settings, LogOut, User, Shield, Key, Mail,
  Phone, MapPin, Save, UserX, Truck, Star, MessageSquare,
  MapPin as MapPinIcon, AlertCircle, CheckCircle, Clock, Eye
} from 'lucide-react';
import axios from "axios";
import { useMapEvents } from "react-leaflet";

// Dynamically import Leaflet components with no SSR
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
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
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

export default function OfficeDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Params Handling
  const urlUserId = searchParams.get('id');
  // Get current view from URL or default to 'dashboard'
  const currentView = searchParams.get('view') || 'dashboard';

  // Function to handle navigation and update history
  const navigateTo = (viewName) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', viewName);
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
  const [modalVisible, setModalVisible] = useState(false);
  const [showAssignVehicleModal, setShowAssignVehicleModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [userData, setUserData] = useState(null);
  const [showEditStaffModal, setShowEditStaffModal] = useState(false);
  const [editStaffId, setEditStaffId] = useState(null);

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
        }
      );

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Update failed");
        return;
      }

      alert("Staff updated successfully");

      setShowEditStaffModal(false);
      fetchStaff(); // refresh list
    } catch (err) {
      console.error("Edit Staff Error:", err);
      alert("Server error while updating staff");
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

  //update the Vehicle list when staff is edited
  const [showEditVehicleModal, setShowEditVehicleModal] = useState(false);
  const [editVehicleId, setEditVehicleId] = useState(null);

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
        }
      );

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Vehicle update failed");
        return;
      }

      // UI update
      setVehicles((prev) =>
        prev.map((v) =>
          v._id === editVehicleId ? { ...v, ...data.vehicle } : v
        )
      );

      alert("Vehicle updated successfully");
      setShowEditVehicleModal(false);
    } catch (err) {
      console.error("Update Vehicle Error:", err);
      alert("Server error while updating vehicle");
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch("http://localhost:5001/office/userdata", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`, // Token bhejna zaroori hai
            "Content-Type": "application/json"
          }
        });

        const data = await res.json();
        if (data.success) {
          setUserData(data.user);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUserData();
  }, []);

  // Profile Data
  const [profile, setProfile] = useState({
    name: "Admin User",
    email: "admin@cleanbin.com",
    phone: "9876543210",
    designation: "Municipal Officer",
    city: "Bhopal",
    department: "Waste Management"
  });

  // System Settings
  const [settings, setSettings] = useState({
    systemName: 'CleanBin AI',
    adminEmail: 'admin@cleanbin.com',
    supportEmail: 'support@cleanbin.com',
    supportPhone: '+91 9876543210',
    address: 'Municipal Corporation Building, Bhopal, MP',
    enableNotifications: true,
    enableEmailAlerts: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordExpiry: 90,
    backupFrequency: 'daily',
    maintenanceMode: false
  });

  // Data States
  const [dustbins, setDustbins] = useState([]);

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
        }
      );

      const data = await res.json();
      if (data.success) {
        setDustbins(data.dustbins);
      }
    } catch (err) {
      console.error("Fetch Dustbins Error:", err);
    }
  };

  useEffect(() => {
    if (userData?._id) {
      fetchDustbins();
    }
  }, [userData]);

  const [vehicles, setVehicles] = useState([]);
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
        }
      );

      const data = await res.json();

      if (data.success) {
        setVehicles(data.vehicles);
      }
    } catch (err) {
      console.error("Fetch Vehicles Error:", err);
    }
  };

  useEffect(() => {
    if (userData?._id) {
      fetchVehicles();
    }
  }, [userData]);

  const [staff, setStaff] = useState([]);

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
        }
      );

      const data = await res.json();

      if (data.success) {
        setStaff(data.staff);
      }
    } catch (err) {
      console.error("Fetch Staff Error:", err);
    }
  };

  useEffect(() => {
    if (userData?._id) {
      fetchStaff();
    }
  }, [userData]);

  const [routes, setRoutes] = useState([]);

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
        }
      );

      const data = await res.json();

      if (data.success) {
        setRoutes(data.routes);
      }
    } catch (err) {
      console.error("Fetch Routes Error:", err);
    }
  };

  useEffect(() => {
    if (userData?._id) {
      fetchRoutes();
    }
  }, [userData]);

  const [showEditRouteModal, setShowEditRouteModal] = useState(false);
  const [editRouteId, setEditRouteId] = useState(null);

  const openEditRouteModal = (route) => {
    setEditRouteId(route._id);
    setFormData({
      routeName: route.name || "",
      routeDescription: route.description || "",
      assignedVehicleId: route.assignedVehicleId?._id || "",
    });
    setShowEditRouteModal(true);
  };


  const [complaints, setComplaints] = useState([
    {
      id: 1,
      type: "overflow",
      location: "Sector 4, Main Market",
      coordinates: [23.2599, 77.4126],
      time: "2 hours ago",
      priority: "high",
      status: "pending",
      reportedBy: "Citizen - Ramesh Verma",
      vehicle: "Not Assigned",
      description: "Dustbin is overflowing, garbage spilling on road",
      phone: "9876543210"
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
      vehicle: "MH-09-AB-1234",
      description: "Bin cleaned successfully",
    },
    {
      id: 3,
      type: "missed",
      location: "Kolar Road, Block-3",
      coordinates: [23.2520, 77.4050],
      time: "4 hours ago",
      priority: "high",
      status: "flagged",
      reportedBy: "Citizen - Priya Sharma",
      vehicle: "Not Assigned",
      description: "Collection missed for 2 days",
      phone: "9876543211"
    },
    {
      id: 4,
      type: "overflow",
      location: "MP Nagar, Zone-1",
      coordinates: [23.2315, 77.4245],
      time: "1 hour ago",
      priority: "critical",
      status: "urgent",
      reportedBy: "Citizen - Ankit Gupta",
      vehicle: "Not Assigned",
      description: "Emergency - Bin overflowing near school",
      phone: "9876543214"
    },
  ]);

  const [reviews, setReviews] = useState([
    {
      id: 1,
      userName: "Ramesh Verma",
      rating: 5,
      comment: "Very quick response! Thank you CleanBin team.",
      time: "1 day ago",
      location: "Sector 4"
    },
    {
      id: 2,
      userName: "Priya Sharma",
      rating: 4,
      comment: "Good service but took some time to respond.",
      time: "2 days ago",
      location: "Kolar Road"
    },
    {
      id: 3,
      userName: "Vijay Kumar",
      rating: 3,
      comment: "Average service, needs improvement in timing.",
      time: "3 days ago",
      location: "MP Nagar"
    },
    {
      id: 4,
      userName: "Anjali Mehta",
      rating: 5,
      comment: "Excellent work! Very professional team.",
      time: "4 days ago",
      location: "Ayodhya Bypass"
    },
    {
      id: 5,
      userName: "Suresh Jain",
      rating: 4,
      comment: "Good experience overall, keep it up!",
      time: "5 days ago",
      location: "Zone-A"
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

  // Load Leaflet on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((leaflet) => {
        setL(leaflet.default);

        // Fix for default marker icons
        delete leaflet.default.Icon.Default.prototype._getIconUrl;
        leaflet.default.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
      });
    }
  }, []);

  // Helper function to create custom icons
  const createCustomIcon = (color, content) => {
    if (!L) return null;

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

  const getBinIcon = (status) => {
    const colors = {
      clean: '#10b981',
      overflow: '#f59e0b',
      missed: '#ef4444'
    };
    return createCustomIcon(colors[status] || '#6b7280', '🗑️');
  };

  const getVehicleIcon = (status) => {
    const colors = {
      active: '#8b5cf6',
      idle: '#6b7280'
    };
    return createCustomIcon(colors[status] || '#6b7280', '🚛');
  };

  // Calculate stats
  const stats = {
    total: dustbins.length,
    clean: dustbins.filter(d => d.status === "clean").length,
    overflow: dustbins.filter(d => d.status === "overflow").length,
    missed: dustbins.filter(d => d.status === "missed").length,
    activeVehicles: vehicles.filter(v => v.status === "active").length,
    pendingComplaints: complaints.filter(c => c.status === "pending" || c.status === "urgent").length
  };

  // Event Handlers
  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSaveSettings = () => {
    alert('Settings saved successfully!');
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      console.log("Logging out...");
      await axios.post("http://localhost:5001/office/logout");

      // Clear client-side data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");

      // Cookie bhi manually clear kar do (safe side)
      document.cookie = "token=; Max-Age=0; path=/;";
      document.cookie = "role=; Max-Age=0; path=/;";

      router.replace("/"); // back to home/login
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
      active: true,

      staffName: "",
      staffRole: "",
      staffPhone: "",
      assignedVehicleId: "",

      routeName: "",
      routeDescription: "",
    });

  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (modalType === "dustbin") {
      const token = localStorage.getItem("token");

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
      fetchDustbins(); // backend se reload
    } else if (modalType === "vehicle") {
      try {
        const token = localStorage.getItem("token");

        const payload = {
          officeId: urlUserId,
          vehicleNumber: formData.vehicleNumber,
          type: formData.type || "",
          active: formData.active !== false,
          // routeId intentionally NOT sent on create
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

        setFormData({
          vehicleNumber: "",
          type: "",
          routeId: "",   // future use (edit ke time)
          active: true,
        });
      } catch (err) {
        console.error("Vehicle Register Error:", err);
        alert("Server error while registering vehicle");
      }
    } else if (modalType === "staff") {
      try {
        const token = localStorage.getItem("token");
        if (!token || !urlUserId) {
          alert("Login required");
          return;
        }

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

        console.log("Selected Vehicle:", formData.assignedVehicleId);
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

        // Optional: staff list refresh karo
        // fetchStaff();

        // Form reset
        setFormData({
          ...formData,
          staffName: "",
          staffRole: "",
          staffPhone: "",
          assignedVehicleId: "",
        });

        setShowAddModal(false);
        router.push(`/office?id=${userData._id}`);
      } catch (err) {
        console.error("Staff Register Error:", err);
        alert("Server error while registering staff");
      }
    } else if (modalType === "route") {
      const token = localStorage.getItem("token");

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
      fetchRoutes();
    }

    setShowAddModal(false);
    alert(`${modalType === "dustbin" ? "Dustbin" : modalType === "vehicle" ? "Vehicle" : "Staff"} added successfully!`);
  };

  const handleDeleteDustbin = async (id) => {
    if (!confirm("Are you sure you want to delete this dustbin?")) return;

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
        alert(data.message || "Failed to delete dustbin");
        return;
      }

      setDustbins((prev) => prev.filter((d) => d._id !== id));
      alert("Dustbin deleted successfully!");
    } catch (err) {
      console.error("Delete Dustbin Error:", err);
      alert("Server error while deleting dustbin");
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;

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
        }
      );

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Failed to delete vehicle");
        return;
      }

      // UI se bhi remove kar do
      setVehicles((prev) => prev.filter((v) => v._id !== vehicleId));

      alert("Vehicle deleted successfully");
    } catch (err) {
      console.error("Delete Vehicle Error:", err);
      alert("Server error while deleting vehicle");
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!confirm("Are you sure you want to delete this staff member?")) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `http://localhost:5001/staff/delete/${staffId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Failed to delete staff");
        return;
      }

      // UI se bhi remove kar do
      setStaff((prev) => prev.filter((s) => s._id !== staffId));

      alert("Staff deleted successfully");
    } catch (err) {
      console.error("Delete Staff Error:", err);
      alert("Server error while deleting staff");
    }
  };

  const handleDeleteRoute = async (routeId) => {
    if (!confirm("Are you sure you want to delete this route?")) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `http://localhost:5001/route/delete/${routeId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Failed to delete route");
        return;
      }

      // UI se bhi route hata do
      setRoutes((prev) => prev.filter((r) => r._id !== routeId));

      alert("Route deleted successfully");
    } catch (err) {
      console.error("Delete Route Error:", err);
      alert("Server error while deleting route");
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
        }
      );

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Route update failed");
        return;
      }

      alert("Route updated successfully");

      setShowEditRouteModal(false);
      fetchRoutes(); // list refresh
    } catch (err) {
      console.error("Edit Route Error:", err);
      alert("Server error while updating route");
    }
  };

  const [showEditDustbinModal, setShowEditDustbinModal] = useState(false);
  const [editDustbinId, setEditDustbinId] = useState(null);

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
        }
      );

      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Dustbin update failed");
        return;
      }

      alert("Dustbin updated successfully");
      setShowEditDustbinModal(false);
      fetchDustbins(); // list refresh
    } catch (err) {
      console.error("Edit Dustbin Error:", err);
      alert("Server error while updating dustbin");
    }
  };

  const openReportDetails = (report) => {
    setSelectedReport(report);
    setModalVisible(true);
  };

  const openAssignVehicle = (complaint) => {
    setSelectedComplaint(complaint);
    setShowAssignVehicleModal(true);
  };

  const assignVehicleToComplaint = (vehicleNumber) => {
    setComplaints(complaints.map(c =>
      c.id === selectedComplaint.id
        ? { ...c, vehicle: vehicleNumber, status: "assigned" }
        : c
    ));
    setShowAssignVehicleModal(false);
    alert(`Vehicle ${vehicleNumber} assigned successfully!`);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "critical": return "#dc2626";
      case "high": return "#f59e0b";
      case "low": return "#10b981";
      default: return "#6b7280";
    }
  };

  const renderStars = (rating) => {
    return "⭐".repeat(rating) + "☆".repeat(5 - rating);
  };

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    alert("Profile updated successfully!");
    setShowProfileSettings(false);
  };

  const handleRemoveVehicles = async (routeId) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to remove the vehicle from this route?"
    );

    if (!isConfirmed) return; // user ne Cancel kiya

    const token = localStorage.getItem("token"); // 👈 yahan se token lo

    try {
      await axios.put(
        `http://localhost:5001/route/remove-vehicle/${routeId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // UI update (local state refresh)
      setRoutes((prev) =>
        prev.map((r) =>
          r._id === routeId ? { ...r, assignedVehicleId: null } : r
        )
      );
    } catch (err) {
      console.error("Remove Vehicle Error:", err);
    }
  };

  const handleRemoveVehiclesFromStaff = async (staffId) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to remove the vehicle from this staff?"
    );

    if (!isConfirmed) return;

    const token = localStorage.getItem("token");

    try {
      await axios.put(
        `http://localhost:5001/staff/remove-vehicle/${staffId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // UI update
      setStaff((prev) =>
        prev.map((s) =>
          s._id === staffId ? { ...s, assignedVehicleId: null } : s
        )
      );
    } catch (err) {
      console.error("Remove Vehicle From Staff Error:", err);
    }
  };

  // Component: Stat Card
  const StatCard = ({ icon: Icon, title, value, color }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 hover:shadow-xl transition-shadow" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
        </div>
        <div className="p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-8 h-8" style={{ color }} />
        </div>
      </div>
    </div>
  );

  // View: Dashboard
  const DashboardView = () => (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard icon={Building2} title="Total Bins" value={stats.total} color="#3b82f6" />
        <StatCard icon={CheckCircle} title="Clean Bins" value={stats.clean} color="#10b981" />
        <StatCard icon={AlertCircle} title="Overflow" value={stats.overflow} color="#f59e0b" />
        <StatCard icon={Truck} title="Active Vehicles" value={stats.activeVehicles} color="#8b5cf6" />
      </div>

      {/* Map Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">🗺️ Live City Map</h3>
            <p className="text-sm text-gray-600">Real-time tracking of bins and vehicles across {profile.city}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold text-green-700">Live</span>
            </div>
          </div>
        </div>

        <div className="h-[500px] rounded-xl overflow-hidden border-2 border-gray-200 shadow-inner">
          {typeof window !== 'undefined' && L && (
            <MapContainer
              center={[
                userData?.latitude ? Number(userData.latitude) : 0,
                userData?.longitude ? Number(userData.longitude) : 0,
              ]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />

              {/* Dustbin Markers */}
              {dustbins.map((bin) => (
                <Marker
                  key={`bin-${bin._id || bin.id}`}
                  position={[bin.latitude, bin.longitude]}
                  icon={getBinIcon(bin.status)}
                >
                  <Popup>
                    <div className="text-center p-2 min-w-[150px]">
                      <p className="font-bold mb-2 text-gray-800 text-base">{bin.name}</p>
                      <p className="text-xs text-gray-600">📍Area:  {bin.area}</p>
                      <p className="text-xs text-gray-600">
                        Route Name: {bin.routeId ? bin.routeId.name : "Not Assigned"}
                      </p>
                      <div className="flex justify-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${bin.status === 'clean' ? 'bg-green-100 text-green-800' :
                          bin.status === 'overflow' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                          {bin.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500">Coordinates:</p>
                        <p className="text-xs font-mono text-gray-700">
                          {bin.latitude.toFixed(4)}, {bin.longitude.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Vehicle Markers */}
              {vehicles
                .filter(
                  (v) =>
                    v.status === "online" &&        // 👈 sirf online vehicles
                    v.latitude != null &&
                    v.longitude != null
                )
                .map((vehicle) => (
                  <Marker
                    key={`vehicle-${vehicle._id}`}
                    position={[vehicle.latitude, vehicle.longitude]}
                    icon={getVehicleIcon(vehicle.status)}
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
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${vehicle.status === "online"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                              }`}
                          >
                            {vehicle.status}
                          </span>
                        </div>

                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500">Current Location:</p>
                          <p className="text-xs font-mono text-gray-700">
                            {vehicle.latitude?.toFixed(4)}, {vehicle.longitude?.toFixed(4)}
                          </p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          )}
        </div>

        {/* Map Legend */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium text-gray-700">Clean Bins</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span className="text-sm font-medium text-gray-700">Overflow</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-sm font-medium text-gray-700">Missed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-500"></div>
            <span className="text-sm font-medium text-gray-700">Active Vehicles</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-500"></div>
            <span className="text-sm font-medium text-gray-700">Idle Vehicles</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => navigateTo('complaints')}>
          <div className="flex items-center justify-between mb-4">
            <MessageSquare className="w-10 h-10" />
            <span className="text-3xl font-bold">{stats.pendingComplaints}</span>
          </div>
          <h4 className="text-lg font-semibold">Pending Complaints</h4>
          <p className="text-sm opacity-90">Click to view and manage</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => navigateTo('dustbins')}>
          <div className="flex items-center justify-between mb-4">
            <Building2 className="w-10 h-10" />
            <span className="text-3xl font-bold">{stats.total}</span>
          </div>
          <h4 className="text-lg font-semibold">Total Dustbins</h4>
          <p className="text-sm opacity-90">Manage bin locations</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => navigateTo('vehicles')}>
          <div className="flex items-center justify-between mb-4">
            <Truck className="w-10 h-10" />
            <span className="text-3xl font-bold">{stats.activeVehicles}</span>
          </div>
          <h4 className="text-lg font-semibold">Active Vehicles</h4>
          <p className="text-sm opacity-90">Track fleet in real-time</p>
        </div>
      </div>
    </>
  );

  // View: Complaints
  const ComplaintsView = () => (
    <>
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">📋 Complaint Tracker</h3>
            <p className="text-sm text-gray-600 mt-1">{complaints.length} total complaints • {stats.pendingComplaints} pending</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold">
              {stats.pendingComplaints} Urgent
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {complaints.map((complaint) => (
                <tr key={complaint.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${complaint.type === 'clean' ? 'bg-green-100 text-green-800' :
                      complaint.type === 'overflow' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                      {complaint.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{complaint.location}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full uppercase"
                      style={{
                        backgroundColor: `${getPriorityColor(complaint.priority)}20`,
                        color: getPriorityColor(complaint.priority)
                      }}
                    >
                      {complaint.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700 font-medium">{complaint.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700">{complaint.vehicle}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{complaint.time}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openReportDetails(complaint)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {complaint.vehicle === "Not Assigned" && (
                        <button
                          onClick={() => openAssignVehicle(complaint)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Assign Vehicle"
                        >
                          <Truck className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  // View: Reviews
  const ReviewsView = () => (
    <>
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">⭐ User Reviews & Feedback</h3>
            <p className="text-sm text-gray-600 mt-1">{reviews.length} total reviews</p>
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
          <div key={review.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                {review.userName.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800 text-base">{review.userName}</p>
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
                <tr key={route._id} className="hover:bg-gray-50 transition-colors">
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
                      ? `${route.assignedVehicleId.vehicleNumber}${route.assignedVehicleId.type
                        ? ` (${route.assignedVehicleId.type})`
                        : ""
                      }`
                      : "Unassigned"}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                    <button
                      onClick={() => openEditRouteModal(route)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteRoute(route._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleRemoveVehicles(route._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
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


  // View: Dustbins
  const DustbinsView = () => (
    <>
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">🗑️ Dustbins Management</h3>
            <p className="text-sm text-gray-600 mt-1">{dustbins.length} total dustbins registered</p>
          </div>
          <button
            onClick={() => openModal("dustbin")}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">Add Dustbin</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Area</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Coordinates</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dustbins.map((bin) => (
                <tr key={bin._id || bin.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-2xl mr-3">🗑️</div>
                      <div className="text-sm font-medium text-gray-900">{bin.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{bin.area}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                    {bin.latitude.toFixed(4)}, {bin.longitude.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${bin.status === 'clean' ? 'bg-green-100 text-green-800' :
                      bin.status === 'overflow' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                      {bin.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openEditDustbinModal(bin)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDustbin(bin._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
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

  // View: Vehicles
  const VehiclesView = () => (
    <>
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">🚛 Vehicles Management</h3>
            <p className="text-sm text-gray-600 mt-1">{vehicles.length} total vehicles • {stats.activeVehicles} active</p>
          </div>
          <button
            onClick={() => openModal("vehicle")}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">Add Vehicle</span>
          </button>
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
              {vehicles.map((vehicle) => (
                <tr key={vehicle._id} className="hover:bg-gray-50 transition-colors">
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

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${vehicle.status === "Active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                        }`}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  // View: Staff
  const StaffView = () => (
    <>
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">👥 Staff Management</h3>
            <p className="text-sm text-gray-600 mt-1">{staff.length} total staff members</p>
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
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Vehicle No</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staff.map((member) => (
                <tr key={member._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                        {member.name.charAt(0)}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{member.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{member.assignedVehicleId
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

  // View: Settings
  const SettingsView = () => (
    <>
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800">⚙️ System Settings</h3>
          <button
            onClick={handleSaveSettings}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg"
          >
            <Save className="w-5 h-5" />
            <span className="font-semibold">Save Settings</span>
          </button>
        </div>

        <div className="space-y-6">
          {/* General Information */}
          <div className="border-b pb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              General Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">System Name</label>
                <input
                  type="text"
                  name="systemName"
                  value={settings.systemName}
                  onChange={handleSettingsChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
                <input
                  type="email"
                  name="adminEmail"
                  value={settings.adminEmail}
                  onChange={handleSettingsChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
                <input
                  type="email"
                  name="supportEmail"
                  value={settings.supportEmail}
                  onChange={handleSettingsChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Support Phone</label>
                <input
                  type="tel"
                  name="supportPhone"
                  value={settings.supportPhone}
                  onChange={handleSettingsChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  name="address"
                  value={settings.address}
                  onChange={handleSettingsChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                />
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="border-b pb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Notification Settings
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-700">Enable Notifications</p>
                  <p className="text-sm text-gray-500">Send system notifications to users</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="enableNotifications"
                    checked={settings.enableNotifications}
                    onChange={handleSettingsChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-700">Email Alerts</p>
                  <p className="text-sm text-gray-500">Send email alerts for critical events</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="enableEmailAlerts"
                    checked={settings.enableEmailAlerts}
                    onChange={handleSettingsChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security Settings
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                <input
                  type="number"
                  name="sessionTimeout"
                  value={settings.sessionTimeout}
                  onChange={handleSettingsChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Login Attempts</label>
                <input
                  type="number"
                  name="maxLoginAttempts"
                  value={settings.maxLoginAttempts}
                  onChange={handleSettingsChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-purple-700 via-purple-800 to-purple-900 text-white transition-all duration-300 flex flex-col shadow-2xl`}>
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
              { view: 'dashboard', icon: Activity, label: 'Dashboard' },
              { view: 'complaints', icon: MessageSquare, label: 'Complaints' },
              { view: 'reviews', icon: Star, label: 'Reviews' },
              { view: 'routes', icon: MapPin, label: 'Routes' },
              { view: 'dustbins', icon: Building2, label: 'Dustbins' },
              { view: 'vehicles', icon: Truck, label: 'Vehicles' },
              { view: 'staff', icon: UserCog, label: 'Staff' },
              { view: 'settings', icon: Settings, label: 'Settings' },
            ].map((item) => (
              <li key={item.view}>
                <button
                  onClick={() => navigateTo(item.view)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${currentView === item.view
                    ? 'bg-purple-600 shadow-lg'
                    : 'hover:bg-purple-600/50'
                    }`}
                >
                  <item.icon className="w-5 h-5" />
                  {sidebarOpen && <span className="font-medium">{item.label}</span>}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-md">
          <div className="flex items-center justify-between p-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 capitalize">
                {currentView === 'dashboard' && 'Office Dashboard'}
                {currentView === 'complaints' && 'Complaints Management'}
                {currentView === 'reviews' && 'User Reviews'}
                {currentView === 'routes' && 'Routes Management'}
                {currentView === 'dustbins' && 'Dustbins Management'}
                {currentView === 'vehicles' && 'Vehicles Management'}
                {currentView === 'staff' && 'Staff Management'}
                {currentView === 'settings' && 'System Settings'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {currentView === 'dashboard' && 'Manage all waste management operations'}
                {currentView === 'complaints' && 'Track and manage citizen complaints'}
                {currentView === 'reviews' && 'View user feedback and ratings'}
                {currentView === 'routes' && 'Optimize and assign collection routes'}
                {currentView === 'dustbins' && 'Monitor and manage dustbins'}
                {currentView === 'vehicles' && 'Track and manage collection vehicles'}
                {currentView === 'staff' && 'Manage staff members and roles'}
                {currentView === 'settings' && 'Configure system settings'}
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
                  <p className="text-sm font-semibold text-gray-800">{userData?.officeName}</p>
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
                      navigateTo('settings');
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

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {currentView === 'dashboard' && <DashboardView />}
          {currentView === 'complaints' && <ComplaintsView />}
          {currentView === 'reviews' && <ReviewsView />}
          {currentView === 'routes' && <RouteView />}
          {currentView === 'dustbins' && <DustbinsView />}
          {currentView === 'vehicles' && <VehiclesView />}
          {currentView === 'staff' && <StaffView />}
          {currentView === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Add Modal */}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dustbin Name</label>
                    <input
                      type="text"
                      required
                      value={formData.binName}
                      onChange={(e) => setFormData({ ...formData, binName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="e.g., Main Market Bin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Area/Location</label>
                    <input
                      type="text"
                      required
                      value={formData.binArea}
                      onChange={(e) => setFormData({ ...formData, binArea: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      placeholder="e.g., Sector 4, Zone A"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.binLatitude}
                        onChange={(e) => setFormData({ ...formData, binLatitude: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                        placeholder={userData?.latitude ? `${userData.latitude}` : "Enter Longitude"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.binLongitude}
                        onChange={(e) => setFormData({ ...formData, binLongitude: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                        placeholder={userData?.longitude ? `${userData.longitude}` : "Enter Longitude"}
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
                      Map par click karke location select karo
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
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />

                          {/* Click handler */}
                          <MapClickHandler
                            onLocationSelect={(latlng) => {
                              setFormData(prev => ({
                                ...prev,
                                binLatitude: latlng.lat.toFixed(6),
                                binLongitude: latlng.lng.toFixed(6)
                              }))
                            }}
                          />

                          {/* Agar already select ho chuka hai to marker dikhao */}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={formData.binStatus}
                      onChange={(e) => setFormData({ ...formData, binStatus: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                    >
                      <option value="clean">Clean</option>
                      <option value="overflow">Overflow</option>
                      <option value="missed">Missed</option>
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
                        setFormData({ ...formData, vehicleNumber: e.target.value })
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
                        setFormData({ ...formData, active: e.target.value === "active" })
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
                      <option value="supervisor">Supervisor</option>
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

                  {/* Sirf Driver ke liye Vehicle Assign */}
                  {formData.staffRole === "driver" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assign Vehicle
                      </label>
                      <select
                        value={formData.assignedVehicleId}
                        onChange={(e) =>
                          setFormData({ ...formData, assignedVehicleId: e.target.value })
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
                      value={formData.routeName || ""}
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
                      value={formData.routeDescription || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, routeDescription: e.target.value })
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
                      value={formData.assignedVehicleId || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, assignedVehicleId: e.target.value })
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
                ✓ Add {modalType === "route" ? "Route" : modalType === "dustbin" ? "Dustbin" : modalType === "vehicle" ? "Vehicle" : "Staff"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* edit model */}
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
              <h2 className="text-2xl font-bold text-gray-800">✏️ Edit Staff</h2>
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
                      setFormData({ ...formData, assignedVehicleId: e.target.value })
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
      {/* edit the vehicles model */}
      {showEditVehicleModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl text-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">✏️ Edit Vehicle</h2>
              <button
                onClick={() => setShowEditVehicleModal(false)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5 text-black" />
              </button>
            </div>

            <form onSubmit={handleEditVehicleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Vehicle Number</label>
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
                    setFormData({ ...formData, active: e.target.value === "active" })
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
              <h2 className="text-2xl font-bold text-gray-800">✏️ Edit Route</h2>
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
                    setFormData({ ...formData, routeDescription: e.target.value })
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
                    setFormData({ ...formData, assignedVehicleId: e.target.value })
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
      {/* Dustbin Edit Modal */}
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
              <h2 className="text-2xl font-bold text-gray-800">✏️ Edit Dustbin</h2>
              <button
                onClick={() => setShowEditDustbinModal(false)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditDustbinSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Dustbin Name</label>
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
                  <label className="block text-sm font-medium mb-2">Latitude</label>
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
                  <label className="block text-sm font-medium mb-2">Longitude</label>
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

                      {/* Click handler */}
                      <MapClickHandler
                        onLocationSelect={(latlng) => {
                          setFormData(prev => ({
                            ...prev,
                            binLatitude: latlng.lat.toFixed(6),
                            binLongitude: latlng.lng.toFixed(6)
                          }))
                        }}
                      />

                      {/* Selected marker */}
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
                  className="w-full px-4 py-3 border rounded-lg text-black"
                >
                  <option value="clean">Clean</option>
                  <option value="overflow">Overflow</option>
                  <option value="missed">Missed</option>
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

      {/* Report Detail Modal */}
      {modalVisible && selectedReport && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setModalVisible(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">📋 Complaint Details</h2>
              <button
                onClick={() => setModalVisible(false)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b">
                <span className="font-semibold text-gray-600">Location:</span>
                <span className="font-bold text-gray-800">{selectedReport.location}</span>
              </div>
              <div className="flex justify-between py-3 border-b">
                <span className="font-semibold text-gray-600">Type:</span>
                <span className="font-bold text-gray-800 capitalize">{selectedReport.type}</span>
              </div>
              <div className="flex justify-between py-3 border-b">
                <span className="font-semibold text-gray-600">Priority:</span>
                <span
                  className="font-bold uppercase"
                  style={{ color: getPriorityColor(selectedReport.priority) }}
                >
                  {selectedReport.priority}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b">
                <span className="font-semibold text-gray-600">Reported By:</span>
                <span className="font-bold text-gray-800">{selectedReport.reportedBy}</span>
              </div>
              {selectedReport.phone && (
                <div className="flex justify-between py-3 border-b">
                  <span className="font-semibold text-gray-600">Phone:</span>
                  <span className="font-bold text-gray-800">{selectedReport.phone}</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-b">
                <span className="font-semibold text-gray-600">Vehicle:</span>
                <span className="font-bold text-gray-800">{selectedReport.vehicle}</span>
              </div>
              <div className="flex justify-between py-3 border-b">
                <span className="font-semibold text-gray-600">Time:</span>
                <span className="font-bold text-gray-800">{selectedReport.time}</span>
              </div>
              <div className="py-3">
                <span className="font-semibold text-gray-600">Description:</span>
                <p className="text-gray-800 mt-2 bg-gray-50 p-3 rounded-lg">{selectedReport.description}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {selectedReport.phone && (
                <button className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-white transition-colors">
                  📞 Call Citizen
                </button>
              )}
              {selectedReport.vehicle === "Not Assigned" && (
                <button
                  onClick={() => {
                    setModalVisible(false);
                    openAssignVehicle(selectedReport);
                  }}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-white transition-colors"
                >
                  🚛 Assign Vehicle
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Vehicle Modal */}
      {showAssignVehicleModal && selectedComplaint && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAssignVehicleModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">🚛 Assign Vehicle</h2>
              <button
                onClick={() => setShowAssignVehicleModal(false)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-purple-50 rounded-xl">
              <p className="text-sm font-semibold text-gray-700">Complaint Location:</p>
              <p className="text-base font-bold text-purple-600">{selectedComplaint.location}</p>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm font-bold text-gray-700">Select Available Vehicle:</p>
              {vehicles.filter(v => v.status === "idle" || v.status === "Inactive").map((vehicle) => (
                <button
                  key={vehicle._id}
                  onClick={() => assignVehicleToComplaint(vehicle.vehicleNumber)}
                  className="w-full p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl text-left"
                >
                  <p className="font-bold text-gray-800">🚛 {vehicle.vehicleNumber}</p>
                  <p className="text-xs text-green-600 font-semibold mt-1">✓ Available</p>
                </button>
              ))}
              {vehicles.filter(v => v.status === "idle").length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No vehicles available at the moment</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Settings Modal */}
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
              <h2 className="text-2xl font-bold text-gray-800">👤 Profile Settings</h2>
              <button
                onClick={() => setShowProfileSettings(false)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  defaultValue={profile.name}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  defaultValue={profile.email}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  defaultValue={profile.phone}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                <input
                  type="text"
                  defaultValue={profile.designation}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  defaultValue={profile.city}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
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

      {/* Custom CSS for Leaflet */}
      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.7.1/dist/leaflet.css');
        
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }

        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
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