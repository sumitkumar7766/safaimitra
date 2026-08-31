import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Image,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MapView, { Marker, Polyline, Callout } from "react-native-maps";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import tw from "twrnc";
import { io } from "socket.io-client";

const { width, height } = Dimensions.get("window");
const API_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || "https://api.safaimitra.online").replace(/\/+$/, "");

// --- HELPER: Status Styles ---
// --- HELPER: Web Style Status Colors ---
const getWebStatusStyles = (status) => {
  switch (status) {
    case "clean":
      return { bg: "bg-green-100", text: "text-green-800", dot: "#10b981" };
    case "overflow":
      return { bg: "bg-yellow-100", text: "text-yellow-800", dot: "#f59e0b" };
    case "missed":
      return { bg: "bg-red-100", text: "text-red-800", dot: "#ef4444" };
    case "skiped":
      return { bg: "bg-red-200", text: "text-blue-800", dot: "#ef4444" }; // Special Web Style
    case "suspecies":
      return { bg: "bg-orange-100", text: "text-orange-800", dot: "#cc760e" };
    case "ideal":
      return { bg: "bg-black", text: "text-white", dot: "#000000" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-800", dot: "#6b7280" };
  }
};

const VehicleMarker = React.memo(({ vehicle }) => {
  return (
    <Marker
      coordinate={{
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
      }}
      title={vehicle.vehicleNumber}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      {/* Icon */}
      <View
        style={tw`bg-white p-1.5 rounded-full shadow-md border border-blue-200`}
      >
        <Text style={{ fontSize: 20 }}>🚛</Text>
      </View>

      {/* Popup / Callout */}
      <Callout tooltip>
        <View>
          <View
            style={tw`bg-white w-48 p-3 rounded-xl shadow-lg border border-gray-200`}
          >
            <Text
              style={tw`font-bold text-gray-800 text-base mb-1 text-center`}
            >
              🚛 {vehicle.vehicleNumber}
            </Text>
            <Text style={tw`text-xs text-gray-600 mb-2 text-center`}>
              Type: {vehicle.type || "-"}
            </Text>

            {/* Online Badge */}
            <View
              style={tw`self-center px-3 py-1 rounded-full bg-green-100 mb-2`}
            >
              <Text style={tw`text-green-800 text-[10px] font-bold uppercase`}>
                Online
              </Text>
            </View>

            {/* Coordinates Footer */}
            <View style={tw`border-t border-gray-100 pt-2 mt-1`}>
              <Text style={tw`text-[10px] text-gray-400 text-center`}>
                Current Location:
              </Text>
              <Text
                style={tw`text-[10px] font-mono text-gray-600 text-center mt-0.5`}
              >
                {vehicle.latitude?.toFixed(4)}, {vehicle.longitude?.toFixed(4)}
              </Text>
            </View>
          </View>
          {/* Arrow */}
          <View style={tw`h-3 w-full items-center`}>
            <View
              style={tw`w-3 h-3 bg-white rotate-45 transform -translate-y-2 border-r border-b border-gray-200`}
            />
          </View>
        </View>
      </Callout>
    </Marker>
  );
});

// --- OPTIMIZED DUSTBIN MARKER (Prevent Blinking + Show Details) ---
// --- OPTIMIZED DUSTBIN MARKER ---
const OfficeBinMarker = React.memo(
  ({ bin, handleManualClean }) => {
    const styles = getWebStatusStyles(bin.status);

    // Blinking Fix
    const [tracksViewChanges, setTracksViewChanges] = useState(true);
    useEffect(() => {
      const timer = setTimeout(() => setTracksViewChanges(false), 200);
      return () => clearTimeout(timer);
    }, [bin.status]);

    return (
      <Marker
        coordinate={{ latitude: bin.latitude, longitude: bin.longitude }}
        tracksViewChanges={tracksViewChanges}
        calloutOffset={{ x: 0, y: -10 }}
        calloutAnchor={{ x: 0.5, y: 0 }}
        onCalloutPress={() => {
          // Mobile map me button click direct callout press se handle hota hai
          if (bin.status !== "clean") handleManualClean(bin._id);
        }}
      >
        {/* Icon on Map */}
        <View style={tw`items-center`}>
          <View
            style={[
              tw`bg-white p-1.5 rounded-full border-2 shadow-sm`,
              { borderColor: styles.dot },
            ]}
          >
            <Text style={{ fontSize: 16 }}>🗑️</Text>
          </View>
        </View>

        {/* Detail Popup */}
        <Callout tooltip>
          <View>
            <View
              style={tw`bg-white w-60 rounded-xl shadow-lg border border-gray-200 overflow-hidden`}
            >
              {/* Title */}
              <View style={tw`p-3 pb-2`}>
                <Text style={tw`font-bold text-gray-800 text-base text-center`}>
                  {bin.name}
                </Text>
              </View>

              {/* Image (Visible only if URL exists) */}
              {bin.imageUrl && (
                <View
                  style={tw`w-full h-32 bg-gray-100 border-t border-b border-gray-100`}
                >
                  <Image
                    source={{ uri: bin.imageUrl }}
                    style={tw`w-full h-full`}
                    resizeMode="cover"
                  />
                </View>
              )}

              <View style={tw`p-3 items-center`}>
                {/* Route */}
                <Text style={tw`text-xs text-gray-600 mb-2`}>
                  Route: {bin.routeId?.name || "N/A"}
                </Text>

                {/* Status Badge (Web Style) */}
                <View style={tw`px-3 py-1 rounded-full ${styles.bg} mb-2`}>
                  <Text
                    style={tw`text-[10px] font-bold uppercase ${styles.text}`}
                  >
                    {bin.status}
                  </Text>
                </View>

                {/* Action Button (Visual Only - Press handled by Callout) */}
                {bin.status !== "clean" && (
                  <View
                    style={tw`w-full bg-green-500 py-2 rounded-lg items-center mt-1 shadow-sm`}
                  >
                    <Text style={tw`text-white text-xs font-bold`}>
                      Mark Clean ✅
                    </Text>
                  </View>
                )}

                {/* Interaction Hint */}
                {bin.status !== "clean" && Platform.OS === "ios" && (
                  <Text style={tw`text-[9px] text-gray-400 mt-1`}>
                    Tap to confirm
                  </Text>
                )}
              </View>
            </View>
            {/* Arrow */}
            <View style={tw`h-3 w-full items-center`}>
              <View
                style={tw`w-3 h-3 bg-white rotate-45 transform -translate-y-2 border-r border-b border-gray-200`}
              />
            </View>
          </View>
        </Callout>
      </Marker>
    );
  },
  (prev, next) =>
    prev?.bin?._id === next?.bin?._id &&
    prev?.bin?.status === next?.bin?.status,
);

export default function App({ goBack }) {
  // ===================== STATE MANAGEMENT =====================
  const [currentView, setCurrentView] = useState("dashboard");
  const [userData, setUserData] = useState(null);

  // Data States
  const [dustbins, setDustbins] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [staff, setStaff] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [complaints, setComplaints] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals & UI
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [viewMode, setViewMode] = useState("active");

  // --- FIX 1: Missing States Added Here ---
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  // ... baaki states ke saath isko bhi add karein
  const [editId, setEditId] = useState(null);
  const [filterRoute, setFilterRoute] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    binName: "",
    binLatitude: "",
    binLongitude: "",
    binArea: "",
    binStatus: "clean",
    vehicleNumber: "",
    type: "",
    active: true,
    routeId: "",
    staffName: "",
    staffRole: "",
    staffPhone: "",
    assignedVehicleId: "",
    routeName: "",
    routeDescription: "",
  });

  // Socket Reference
  const socketRef = useRef(null);

  // ===================== COMPUTED VALUES =====================
  const stats = useMemo(
    () => ({
      total: dustbins.length,
      clean: dustbins.filter((d) => d.status === "clean").length,
      overflow: dustbins.filter((d) => d.status === "overflow").length,
      activeVehicles: vehicles.filter(
        (v) => v.status === "active" || v.status === "Active" || v.isOnline,
      ).length,
      pendingComplaints: complaints.filter(
        (c) => c.status === "pending" || c.status === "urgent",
      ).length,
    }),
    [dustbins, vehicles, complaints],
  );

  const routePaths = useMemo(() => {
    const paths = {};
    dustbins.forEach((bin) => {
      if (bin.routeId?._id && bin.latitude && bin.longitude) {
        const routeId = bin.routeId._id;
        if (!paths[routeId])
          paths[routeId] = { name: bin.routeId.name, positions: [] };
        paths[routeId].positions.push({
          latitude: bin.latitude,
          longitude: bin.longitude,
        });
      }
    });
    return Object.values(paths);
  }, [dustbins]);

  // ===================== UTILITY FUNCTIONS =====================
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusColor = (status) =>
    ({
      clean: "#10b981",
      overflow: "#f59e0b",
      missed: "#ef4444",
      skiped: "#ef4444",
      suspecies: "#cc760e",
      ideal: "#000000",
    })[status] || "#6b7280";

  // --- FIX 2: Missing Helper Functions Added Here ---
  const openAddModal = (type) => {
    setModalType(type);
    setEditId(null); // <--- YEH SABSE ZAROORI HAI (ID clear karein)

    // Form ko poora khali kar rahe hain
    setFormData({
      binName: "",
      binLatitude: "",
      binLongitude: "",
      binArea: "",
      binStatus: "clean",
      vehicleNumber: "",
      type: "",
      active: true,
      routeId: "",
      staffName: "",
      staffRole: "",
      staffPhone: "",
      staffVehicle: "",
      assignedVehicleId: "",
      routeName: "",
      routeDescription: "",
    });
    setShowAddModal(true);
  };

  const openEditModal = (type, data) => {
    setModalType(type);
    setEditId(data._id); // ID save kar rahe hain taaki update ho sake

    // Form ko data se bhar rahe hain
    if (type === "staff") {
      setFormData({
        ...formData,
        staffName: data.name,
        staffRole: data.role,
        staffPhone: data.phone,
        // Agar vehicle assigned hai to uska ID nikal rahe hain, nahi to empty
        assignedVehicleId: data.assignedVehicleId
          ? data.assignedVehicleId._id
          : "",
      });
    } else if (type === "route") {
      setFormData({
        ...formData,
        routeName: data.name,
        routeDescription: data.description,
        assignedVehicleId: data.assignedVehicleId
          ? data.assignedVehicleId._id
          : "",
      });
    } else if (type === "vehicle") {
      setFormData({
        ...formData,
        vehicleNumber: data.vehicleNumber,
        type: data.type || "Truck",
        active: data.active !== undefined ? data.active : true,
      });
    } else if (type === "dustbin") {
      setFormData({
        ...formData,
        binName: data.name,
        binArea: data.area,
        binLatitude: String(data.latitude), // String convert kar rahe hain input ke liye
        binLongitude: String(data.longitude),
        binStatus: data.status,
      });
    }

    setShowAddModal(true); // Modal khol do
  };

  // ===================== API & SOCKET CALLS =====================
  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await axios.get(`${API_URL}/office/userdata`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setUserData(res.data.user);
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  // --- REFRESH LOGIC FIX ---
  const handleRefresh = async () => {
    setRefreshing(true); // Sirf refreshing true karein, loading nahi
    await loadInitialData(); // Data load hone ka wait karein
    setRefreshing(false); // Data aane ke baad spinner band karein
  };

  // --- DATA LOADING FIX ---
  const loadInitialData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!userData?._id || !token) return;

      const [binsRes, vehiclesRes, staffRes, routesRes, complaintsRes] =
        await Promise.all([
          axios.get(`${API_URL}/dustbin/list/${userData._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/vehicle/list/${userData._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/staff/list/${userData._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/route/list/${userData._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/complaint/all/${userData._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      if (binsRes.data.success) setDustbins(binsRes.data.dustbins);
      if (vehiclesRes.data.success) setVehicles(vehiclesRes.data.vehicles);
      if (staffRes.data.success) setStaff(staffRes.data.staff);
      if (routesRes.data.success) setRoutes(routesRes.data.routes);
      if (complaintsRes.data.success)
        setComplaints(complaintsRes.data.complaints);
    } catch (err) {
      console.error("Initial Data Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 1. DATA LOADING EFFECT (Sirf ek baar chalega jab User ID milegi)
  useEffect(() => {
    if (userData?._id) {
      loadInitialData();
    }
  }, [userData?._id]); // Sirf ID change hone par chalega, poore object par nahi

  // 2. SOCKET CONNECTION EFFECT (Ye Data reload nahi karega, bas updates sunega)
  useEffect(() => {
    if (!userData?._id) return;

    // Socket initialize
    socketRef.current = io(API_URL);
    const socket = socketRef.current;

    console.log("🟢 Socket Connected");

    // --- Listeners ---
    // --- Listeners ---
    socket.on("dustbin_data_update", (payload) => {
      // SAFETY CHECK: If payload or data is null, ignore
      if (!payload || !payload.data) return;

      setDustbins((prev) => {
        switch (payload.type) {
          case "ADD":
            const exists = prev.some((b) => b._id === payload.data._id);
            if (exists) return prev;
            return [payload.data, ...prev];
          case "UPDATE":
            return prev.map((b) =>
              b._id === payload.data._id ? { ...b, ...payload.data } : b,
            );
          case "DELETE":
            return prev.filter((b) => b._id !== payload.id);
          default:
            return prev;
        }
      });
    });

    socket.on("vehicle_location_update", (updatedVehicle) => {
      if (!updatedVehicle || !updatedVehicle._id) return; // SAFETY CHECK
      setVehicles((prev) =>
        prev.map((v) => (v._id === updatedVehicle._id ? updatedVehicle : v)),
      );
    });

    socket.on("vehicle_list_update", (payload) => {
      if (!payload) return;
      if (payload.type === "ADD" && payload.data)
        setVehicles((prev) => [payload.data, ...prev]);
      else if (payload.type === "UPDATE" && payload.data)
        // Check payload.data
        setVehicles((prev) =>
          prev.map((v) => (v._id === payload.data._id ? payload.data : v)),
        );
      else if (payload.type === "DELETE")
        setVehicles((prev) => prev.filter((v) => v._id !== payload.id));
    });

    socket.on("staff_list_update", (payload) => {
      if (!payload) return;
      if (payload.type === "ADD" && payload.data)
        setStaff((prev) => [payload.data, ...prev]);
      else if (payload.type === "UPDATE" && payload.data)
        setStaff((prev) =>
          prev.map((s) => (s._id === payload.data._id ? payload.data : s)),
        );
      else if (payload.type === "DELETE")
        setStaff((prev) => prev.filter((s) => s._id !== payload.id));
    });

    socket.on("route_data_update", (payload) => {
      if (!payload) return;
      if (payload.type === "ADD" && payload.data)
        setRoutes((prev) => [payload.data, ...prev]);
      else if (payload.type === "UPDATE" && payload.data)
        setRoutes((prev) =>
          prev.map((r) => (r._id === payload.data._id ? payload.data : r)),
        );
      else if (payload.type === "DELETE")
        setRoutes((prev) => prev.filter((r) => r._id !== payload.id));
    });

    // Cleanup
    return () => {
      console.log("🔴 Socket Disconnected");
      socket.disconnect();
    };
  }, [userData?._id]); // Dependency fix ki gayi hai

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.post(`${API_URL}/office/logout`);
            await AsyncStorage.multiRemove(["token", "user", "role", "userId"]);
            Alert.alert("Success", "Logged out successfully");

            // Checking if goBack exists before calling to avoid crash
            if (goBack) {
              goBack();
            } else {
              console.warn("goBack prop not passed to OfficeDashboard");
            }
          } catch (error) {
            console.error("Logout Error", error);
          }
        },
      },
    ]);
  };

  const handleManualClean = (id) => {
    Alert.alert("Mark Clean", "Confirm?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        onPress: async () => {
          const token = await AsyncStorage.getItem("token");
          await axios.put(
            `${API_URL}/dustbin/update-status/${id}`,
            { status: "clean" },
            { headers: { Authorization: `Bearer ${token}` } },
          );
        },
      },
    ]);
  };

  const handleDeleteItem = (type, id) => {
    Alert.alert("Delete", `Delete this ${type}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const token = await AsyncStorage.getItem("token");
          await axios.delete(`${API_URL}/${type}/delete/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        },
      },
    ]);
  };

  const handleSubmit = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const method = editId ? axios.put : axios.post;

      // Agar editId hai to URL me ID add karo
      const baseUrl = `${API_URL}/${modalType}`;
      const url = editId
        ? `${baseUrl}/update/${editId}`
        : `${baseUrl}/register`;

      let payload = {};

      if (modalType === "dustbin") {
        payload = {
          officeId: userData._id,
          name: formData.binName,
          area: formData.binArea,
          latitude: parseFloat(formData.binLatitude),
          longitude: parseFloat(formData.binLongitude),
          status: formData.binStatus,
          routeId: formData.routeId || null,
        };
      } else if (modalType === "vehicle") {
        payload = {
          officeId: userData._id,
          vehicleNumber: formData.vehicleNumber,
          type: formData.type,
          active: formData.active,
        };
      } else if (modalType === "staff") {
        payload = {
          officeId: userData._id,
          name: formData.staffName,
          role: formData.staffRole,
          phone: formData.staffPhone,
          assignedVehicleId:
            formData.staffRole === "driver" ? formData.assignedVehicleId : null,
        };
      } else if (modalType === "route") {
        payload = {
          officeId: userData._id,
          name: formData.routeName,
          description: formData.routeDescription,
          assignedVehicleId: formData.assignedVehicleId || null,
        };
      }

      // API Call
      await method(url, payload, { headers });

      Alert.alert("Success", `${modalType} ${editId ? "updated" : "added"}!`);
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      if (error.response) {
        console.log("Error Data:", error.response.data);
        console.log("Error Status:", error.response.status);
      }
      Alert.alert("Error", error.response?.data?.message || "Failed");
    }
  };

  const resetForm = () => {
    setEditId(null); // Edit mode hatane ke liye
    setFormData({
      binName: "",
      binLatitude: "",
      binLongitude: "",
      binArea: "",
      binStatus: "clean",
      vehicleNumber: "",
      type: "",
      active: true,
      routeId: "",
      staffName: "",
      staffRole: "",
      staffPhone: "",
      assignedVehicleId: "",
      routeName: "",
      routeDescription: "",
    });
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleAssignComplaint = async (vehicleId) => {
    // Check if complaint is selected
    if (!selectedComplaint || !selectedComplaint._id) {
      Alert.alert("Error", "No complaint selected");
      return;
    }

    // Backend compatibility: grouping IDs or single ID
    const idsToSend =
      selectedComplaint.complaintIds &&
      selectedComplaint.complaintIds.length > 0
        ? selectedComplaint.complaintIds
        : [selectedComplaint._id];

    try {
      // React Native uses AsyncStorage, not localStorage
      const token = await AsyncStorage.getItem("token");

      const res = await axios.post(
        `${API_URL}/complaint/assign-vehicle`,
        {
          complaintIds: idsToSend,
          vehicleId: vehicleId,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data.success) {
        // Close modals
        setShowComplaintModal(false);

        Alert.alert(
          "Success",
          `✅ Vehicle assigned to ${idsToSend.length} reports!`,
          [{ text: "OK", onPress: () => loadInitialData() }], // Refresh data
        );
      }
    } catch (error) {
      console.error("Assignment Error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "❌ Failed to assign vehicle.",
      );
    }
  };

  // ===================== UI COMPONENTS =====================
  const StatCard = ({ icon, title, value, color }) => (
    <View
      style={[
        tw`bg-white rounded-xl p-4 mb-3 shadow-sm border-l-4`,
        { borderLeftColor: color },
      ]}
    >
      <View style={tw`flex-row justify-between items-center`}>
        <View>
          <Text
            style={tw`text-gray-500 text-xs font-bold uppercase tracking-wider`}
          >
            {title}
          </Text>
          <Text style={tw`text-3xl font-extrabold text-gray-800 mt-2`}>
            {value}
          </Text>
        </View>
        <View
          style={[
            tw`w-14 h-14 rounded-full justify-center items-center`,
            { backgroundColor: `${color}20` },
          ]}
        >
          <MaterialCommunityIcons name={icon} size={28} color={color} />
        </View>
      </View>
    </View>
  );

  const renderDashboard = () => (
    <ScrollView
      style={tw`flex-1 bg-gray-50`}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={tw`p-4`}>
        <StatCard
          icon="delete"
          title="Total Bins"
          value={stats.total}
          color="#3b82f6"
        />
        <StatCard
          icon="check-circle"
          title="Clean Bins"
          value={stats.clean}
          color="#10b981"
        />
        <StatCard
          icon="alert-circle"
          title="Overflow"
          value={stats.overflow}
          color="#f59e0b"
        />
        <StatCard
          icon="truck"
          title="Active Vehicles"
          value={stats.activeVehicles}
          color="#8b5cf6"
        />
      </View>

      <View style={tw`bg-white mx-4 rounded-2xl p-4 mb-4 shadow-sm`}>
        <View style={tw`flex-row justify-between items-center mb-3`}>
          <View>
            <Text style={tw`text-lg font-bold text-gray-800`}>
              🗺️ Live City Map
            </Text>
          </View>
          <View
            style={tw`flex-row items-center bg-green-100 px-3 py-1 rounded-full`}
          >
            <View style={tw`w-2 h-2 rounded-full bg-green-600 mr-2`} />
            <Text style={tw`text-xs font-bold text-green-700`}>LIVE</Text>
          </View>
        </View>
        <MapView
          style={tw`h-80 rounded-xl mb-3`}
          initialRegion={{
            latitude: userData?.latitude || 0,
            longitude: userData?.longitude || 0,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          {dustbins.map((bin) => (
            <OfficeBinMarker
              key={`bin-${bin._id}`}
              bin={bin}
              handleManualClean={handleManualClean}
            />
          ))}

          {vehicles
            .filter((v) => v.isOnline && v.latitude && v.longitude)
            .map((vehicle) => (
              <VehicleMarker key={`v-${vehicle._id}`} vehicle={vehicle} />
            ))}

          {/* --- 3. ROUTES (Lines) --- */}
          {routePaths.map((route, idx) => (
            <Polyline
              key={`r-${idx}`}
              coordinates={route.positions}
              strokeColor="#3b82f6"
              strokeWidth={3}
              lineDashPattern={[5, 5]}
            />
          ))}
        </MapView>
        <View
          style={tw`mt-4 flex-row flex-wrap justify-center gap-6 p-4 bg-gray-50 rounded-xl`}
        >
          {/* Clean Indicator */}
          <View style={tw`flex-row items-center gap-2`}>
            <View
              style={[tw`w-4 h-4 rounded-full`, { backgroundColor: "#10b981" }]}
            />
            <Text style={tw`text-sm font-medium text-gray-700`}>Clean</Text>
          </View>

          <View style={tw`flex-row items-center gap-2`}>
            <View
              style={[tw`w-4 h-4 rounded-full`, { backgroundColor: "#000000" }]}
            />
            <Text style={tw`text-sm font-medium text-gray-700`}>Ideal</Text>
          </View>

          {/* Overflow Indicator */}
          <View style={tw`flex-row items-center gap-2`}>
            <View
              style={[tw`w-4 h-4 rounded-full`, { backgroundColor: "#f59e0b" }]}
            />
            <Text style={tw`text-sm font-medium text-gray-700`}>Overflow</Text>
          </View>

          {/* Skipped Indicator */}
          <View style={tw`flex-row items-center gap-2`}>
            <View
              style={[tw`w-4 h-4 rounded-full`, { backgroundColor: "#ef4444" }]}
            />
            <Text style={tw`text-sm font-medium text-gray-700`}>Skipped</Text>
          </View>

          {/* Active Vehicles Indicator */}
          <View style={tw`flex-row items-center gap-2`}>
            <View style={tw`w-4 h-4 rounded-full bg-purple-500`} />
            <Text style={tw`text-sm font-medium text-gray-700`}>
              Active Vehicles
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderComplaints = () => {
    // Filter logic
    const filteredComplaints = complaints.filter((c) =>
      viewMode === "active" ? c.status !== "resolved" : c.status === "resolved",
    );

    return (
      <ScrollView
        style={tw`flex-1 bg-gray-50`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header with Toggle */}
        <View
          style={tw`px-5 py-4 bg-white border-b border-gray-200 flex-row justify-between items-center shadow-sm`}
        >
          <Text style={tw`text-2xl font-extrabold text-gray-800`}>
            📋 Complaints
          </Text>

          {/* Toggle Buttons */}
          <View style={tw`flex-row bg-gray-100 p-1 rounded-lg`}>
            <TouchableOpacity
              onPress={() => setViewMode("active")}
              style={[
                tw`px-4 py-2 rounded-md`,
                viewMode === "active" && tw`bg-white shadow-sm`,
              ]}
            >
              <Text
                style={[
                  tw`text-xs font-bold`,
                  viewMode === "active" ? tw`text-blue-600` : tw`text-gray-500`,
                ]}
              >
                🔥 Active
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode("resolved")}
              style={[
                tw`px-4 py-2 rounded-md`,
                viewMode === "resolved" && tw`bg-white shadow-sm`,
              ]}
            >
              <Text
                style={[
                  tw`text-xs font-bold`,
                  viewMode === "resolved"
                    ? tw`text-green-600`
                    : tw`text-gray-500`,
                ]}
              >
                ✅ History
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* List */}
        <View style={tw`pb-20`}>
          {filteredComplaints.length === 0 ? (
            <View style={tw`items-center justify-center mt-10`}>
              <Text style={tw`text-gray-400 font-medium`}>
                No {viewMode} complaints found.
              </Text>
            </View>
          ) : (
            filteredComplaints.map((c) => (
              <TouchableOpacity
                key={c._id}
                activeOpacity={0.7}
                style={tw`bg-white mx-4 my-2 p-4 rounded-2xl shadow-sm border border-gray-100`}
                onPress={() => {
                  setSelectedComplaint(c);
                  console.log("Selected Complaint:", c);
                  setShowComplaintModal(true);
                }}
              >
                {/* Card Header: Type & Priority */}
                <View style={tw`flex-row justify-between mb-2`}>
                  <View style={tw`bg-gray-100 px-2 py-1 rounded-md`}>
                    <Text
                      style={tw`text-[10px] font-bold text-gray-600 uppercase`}
                    >
                      {c.type || "General"}
                    </Text>
                  </View>
                  <Text
                    style={[
                      tw`text-[10px] font-bold uppercase`,
                      c.priority === "high" || c.priority === "critical"
                        ? tw`text-red-500`
                        : tw`text-blue-500`,
                    ]}
                  >
                    {c.priority || "Medium"} Priority
                  </Text>
                </View>

                {/* Main Content */}
                <Text style={tw`text-lg font-bold text-gray-800 mb-1`}>
                  🗑️ {c.dustbinDetails?.name || "Unknown Point"}
                </Text>
                <Text style={tw`text-sm text-gray-500 mb-3`} numberOfLines={1}>
                  📍 {c.area || "No location provided"}
                </Text>

                {/* Footer: Time & Status Badge */}
                <View
                  style={tw`flex-row justify-between items-center border-t border-gray-100 pt-3`}
                >
                  <Text style={tw`text-xs text-gray-400 font-medium`}>
                    🕒 {formatDateTime(c.createdAt)}
                  </Text>

                  <View
                    style={[
                      tw`px-3 py-1 rounded-full`,
                      c.status === "resolved"
                        ? tw`bg-green-100`
                        : c.status === "assigned"
                          ? tw`bg-yellow-100`
                          : tw`bg-red-100`,
                    ]}
                  >
                    <Text
                      style={[
                        tw`text-[10px] font-bold uppercase`,
                        c.status === "resolved"
                          ? tw`text-green-700`
                          : c.status === "assigned"
                            ? tw`text-yellow-700`
                            : tw`text-red-700`,
                      ]}
                    >
                      {c.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    );
  };

  const renderDustbins = () => {
    const filteredDustbins = dustbins.filter((bin) => {
      if (!filterRoute) return true;
      return bin.routeId?._id === filterRoute;
    });

    return (
      <View style={tw`flex-1`}>
        <ScrollView
          style={tw`flex-1 bg-gray-50`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* 1. HEADER SECTION */}
          <View style={tw`bg-white p-6 shadow-sm border-b border-gray-200`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <View>
                <Text style={tw`text-2xl font-black text-gray-800`}>
                  🗑️ Dustbins
                </Text>
                <Text
                  style={tw`text-xs text-gray-500 font-bold uppercase tracking-wider mt-1`}
                >
                  {filteredDustbins.length} Shown • Total: {dustbins.length}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => openAddModal("dustbin")}
                style={tw`bg-green-600 px-5 py-3 rounded-2xl flex-row items-center shadow-lg shadow-green-100`}
              >
                <MaterialCommunityIcons name="plus" size={20} color="white" />
                <Text style={tw`text-white font-bold ml-1`}>Add Bin</Text>
              </TouchableOpacity>
            </View>

            {/* 2. ROUTE FILTER */}
            <Text
              style={tw`text-[10px] font-black text-gray-400 mb-2 uppercase`}
            >
              Filter by Route
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={tw`flex-row`}
            >
              <TouchableOpacity
                onPress={() => setFilterRoute("")}
                style={tw`px-4 py-2 rounded-full mr-2 border ${!filterRoute ? "bg-purple-600 border-purple-600" : "bg-white border-gray-300"}`}
              >
                <Text
                  style={tw`text-xs font-bold ${!filterRoute ? "text-white" : "text-gray-600"}`}
                >
                  All Routes
                </Text>
              </TouchableOpacity>
              {routes.map((r) => (
                <TouchableOpacity
                  key={r._id}
                  onPress={() => setFilterRoute(r._id)}
                  style={tw`px-4 py-2 rounded-full mr-2 border ${filterRoute === r._id ? "bg-purple-600 border-purple-600" : "bg-white border-gray-300"}`}
                >
                  <Text
                    style={tw`text-xs font-bold ${filterRoute === r._id ? "text-white" : "text-gray-600"}`}
                  >
                    {r.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 3. DUSTBIN CARDS LIST */}
          <View style={tw`p-4`}>
            {filteredDustbins.length === 0 ? (
              <View style={tw`py-20 items-center`}>
                <MaterialCommunityIcons
                  name="delete-empty-outline"
                  size={60}
                  color="#cbd5e1"
                />
                <Text style={tw`text-gray-400 font-bold mt-2`}>
                  No bins found
                </Text>
              </View>
            ) : (
              filteredDustbins.map((bin) => (
                <View
                  key={bin._id}
                  style={tw`bg-white rounded-[2rem] p-4 mb-4 shadow-sm border border-gray-100`}
                >
                  <View style={tw`flex-row`}>
                    {/* LIVE IMAGE THUMBNAIL - Click to open Modal */}
                    <TouchableOpacity
                      onPress={() => {
                        if (bin.imageUrl) {
                          setSelectedImage(bin.imageUrl);
                          setShowImageModal(true);
                        }
                      }}
                      style={tw`w-20 h-20 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200`}
                    >
                      {bin.imageUrl ? (
                        <Image
                          source={{ uri: bin.imageUrl }}
                          style={tw`w-full h-full`}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={tw`flex-1 justify-center items-center`}>
                          <MaterialCommunityIcons
                            name="image-off"
                            size={24}
                            color="#cbd5e1"
                          />
                        </View>
                      )}
                    </TouchableOpacity>

                    <View style={tw`flex-1 ml-4 justify-center`}>
                      <View style={tw`flex-row justify-between items-start`}>
                        <Text style={tw`text-lg font-black text-gray-900`}>
                          {bin.name}
                        </Text>
                        <View
                          style={[
                            tw`px-2 py-0.5 rounded-md`,
                            {
                              backgroundColor:
                                getStatusColor(bin.status) + "20",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              tw`text-[9px] font-black uppercase`,
                              { color: getStatusColor(bin.status) },
                            ]}
                          >
                            {bin.status || "Unknown"}
                          </Text>
                        </View>
                      </View>
                      <Text style={tw`text-xs text-gray-500 font-medium`}>
                        📍 {bin.area}
                      </Text>
                      <View style={tw`flex-row items-center mt-1`}>
                        <MaterialCommunityIcons
                          name="map-marker-path"
                          size={14}
                          color="#3b82f6"
                        />
                        <Text
                          style={tw`text-[11px] text-blue-600 font-bold ml-1`}
                        >
                          {bin.routeId ? bin.routeId.name : "No Route"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Actions Row */}
                  <View
                    style={tw`flex-row items-center justify-between mt-4 pt-3 border-t border-gray-50`}
                  >
                    <Text style={tw`text-[10px] font-mono text-gray-400`}>
                      {bin.latitude.toFixed(4)}, {bin.longitude.toFixed(4)}
                    </Text>
                    <View style={tw`flex-row gap-2`}>
                      {bin.status !== "clean" && (
                        <TouchableOpacity
                          onPress={() => handleManualClean(bin._id)}
                          style={tw`bg-green-500 p-2 rounded-xl`}
                        >
                          <MaterialCommunityIcons
                            name="check-circle-outline"
                            size={18}
                            color="white"
                          />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => openEditModal("dustbin", bin)}
                        style={tw`bg-blue-50 p-2 rounded-xl`}
                      >
                        <MaterialCommunityIcons
                          name="pencil"
                          size={18}
                          color="#2563eb"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteItem("dustbin", bin._id)}
                        style={tw`bg-red-50 p-2 rounded-xl`}
                      >
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={18}
                          color="#ef4444"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
          <View style={tw`h-20`} />
        </ScrollView>

        {/* --- IMAGE PREVIEW MODAL --- */}
        <Modal
          visible={showImageModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowImageModal(false)}
        >
          <View style={tw`flex-1 bg-black/95 justify-center items-center`}>
            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setShowImageModal(false)}
              style={tw`absolute top-12 right-6 z-50 bg-white/10 p-2 rounded-full border border-white/20`}
            >
              <MaterialCommunityIcons name="close" size={30} color="white" />
            </TouchableOpacity>

            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={{ width: width, height: height * 0.8 }}
                resizeMode="contain"
              />
            )}

            <Text style={tw`text-white/40 absolute bottom-10 text-xs`}>
              Tap cross or outside to close
            </Text>
          </View>
        </Modal>
      </View>
    );
  };

  const renderVehicles = () => {
    // Logic same rahega
    const filteredVehicles = vehicles.filter((vehicle) => {
      if (!filterRoute) return true;
      const selectedRouteObj = routes.find((r) => r._id === filterRoute);
      return selectedRouteObj?.assignedVehicleId?._id === vehicle._id;
    });

    return (
      <ScrollView
        style={tw`flex-1 bg-gray-50`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* 1. Header & Stats Section */}
        <View style={tw`bg-white p-5 shadow-sm border-b border-gray-200`}>
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <View>
              <Text style={tw`text-2xl font-black text-gray-800`}>
                🚛 Fleet
              </Text>
              <Text
                style={tw`text-xs text-gray-500 font-bold uppercase tracking-wider`}
              >
                {filteredVehicles.length} Shown • Total: {vehicles.length}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => openAddModal("vehicle")}
              style={tw`bg-green-600 px-4 py-2 rounded-xl flex-row items-center shadow-md`}
            >
              <MaterialCommunityIcons name="plus" size={20} color="white" />
              <Text style={tw`text-white font-bold ml-1`}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* 2. Route Filter (Horizontal Scroll) */}
          <Text style={tw`text-[10px] font-black text-gray-400 mb-2 uppercase`}>
            Filter by Route
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={tw`flex-row`}
          >
            <TouchableOpacity
              onPress={() => setFilterRoute("")}
              style={tw`px-4 py-2 rounded-full mr-2 border ${!filterRoute ? "bg-purple-600 border-purple-600" : "bg-white border-gray-300"}`}
            >
              <Text
                style={tw`text-xs font-bold ${!filterRoute ? "text-white" : "text-gray-600"}`}
              >
                All Routes
              </Text>
            </TouchableOpacity>
            {routes.map((r) => (
              <TouchableOpacity
                key={r._id}
                onPress={() => setFilterRoute(r._id)}
                style={tw`px-4 py-2 rounded-full mr-2 border ${filterRoute === r._id ? "bg-purple-600 border-purple-600" : "bg-white border-gray-300"}`}
              >
                <Text
                  style={tw`text-xs font-bold ${filterRoute === r._id ? "text-white" : "text-gray-600"}`}
                >
                  {r.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 3. Vehicles List (Cards) */}
        <View style={tw`p-4`}>
          {filteredVehicles.length === 0 ? (
            <View style={tw`py-20 items-center`}>
              <MaterialCommunityIcons
                name="truck-outline"
                size={60}
                color="#cbd5e1"
              />
              <Text style={tw`text-gray-400 font-bold mt-2`}>
                No vehicles found for this route
              </Text>
            </View>
          ) : (
            filteredVehicles.map((vehicle) => {
              const assignedRoute = routes.find(
                (r) => r?.assignedVehicleId?._id === vehicle._id,
              );
              const isActive = vehicle.status === "Active" || vehicle.isOnline;

              return (
                <View
                  key={vehicle._id}
                  style={tw`bg-white rounded-3xl p-4 mb-4 shadow-sm border border-gray-100`}
                >
                  <View style={tw`flex-row justify-between items-start mb-3`}>
                    <View style={tw`flex-row items-center`}>
                      <View
                        style={tw`w-12 h-12 bg-gray-100 rounded-2xl items-center justify-center mr-3`}
                      >
                        <Text style={{ fontSize: 24 }}>🚛</Text>
                      </View>
                      <View>
                        <Text style={tw`text-lg font-black text-gray-900`}>
                          {vehicle.vehicleNumber}
                        </Text>
                        <Text style={tw`text-xs text-gray-500 font-bold`}>
                          {vehicle.type || "Heavy Truck"}
                        </Text>
                      </View>
                    </View>

                    {/* Status Badge */}
                    <View
                      style={tw`${isActive ? "bg-green-100" : "bg-gray-100"} px-3 py-1 rounded-full`}
                    >
                      <Text
                        style={tw`${isActive ? "text-green-700" : "text-gray-600"} text-[10px] font-black uppercase`}
                      >
                        {isActive ? "Online" : "Offline"}
                      </Text>
                    </View>
                  </View>

                  {/* Info Row */}
                  <View style={tw`flex-row border-t border-gray-50 pt-3 mt-1`}>
                    <View style={tw`flex-1`}>
                      <Text
                        style={tw`text-[10px] text-gray-400 font-bold uppercase`}
                      >
                        Current Route
                      </Text>
                      <Text
                        style={tw`text-sm font-bold ${assignedRoute ? "text-blue-600" : "text-gray-400"}`}
                      >
                        {assignedRoute ? assignedRoute.name : "Unassigned"}
                      </Text>
                    </View>
                    <View style={tw`flex-1`}>
                      <Text
                        style={tw`text-[10px] text-gray-400 font-bold uppercase text-right`}
                      >
                        Last Known GPS
                      </Text>
                      <Text
                        style={tw`text-[11px] font-mono text-gray-600 text-right`}
                      >
                        {vehicle.latitude?.toFixed(4)},{" "}
                        {vehicle.longitude?.toFixed(4)}
                      </Text>
                    </View>
                  </View>

                  {/* Actions Row */}
                  <View
                    style={tw`flex-row justify-end gap-2 mt-4 pt-3 border-t border-gray-50`}
                  >
                    <TouchableOpacity
                      onPress={() => openEditModal("vehicle", vehicle)}
                      style={tw`p-2 bg-blue-50 rounded-xl`}
                    >
                      <MaterialCommunityIcons
                        name="pencil"
                        size={20}
                        color="#2563eb"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteItem("vehicle", vehicle._id)}
                      style={tw`p-2 bg-red-50 rounded-xl`}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={20}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
        <View style={tw`h-20`} />
      </ScrollView>
    );
  };

  const handleRemoveVehicles = async (routeId) => {
    // 1. Native Confirmation Dialog
    Alert.alert(
      "Remove Vehicle",
      "Are you sure you want to unassign the vehicle from this route?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive", // iOS par button red ho jayega
          onPress: async () => {
            try {
              // 2. AsyncStorage for Token
              const token = await AsyncStorage.getItem("token");

              // 3. API Call using your API_URL constant
              const res = await axios.put(
                `${API_URL}/route/remove-vehicle/${routeId}`,
                {},
                {
                  headers: { Authorization: `Bearer ${token}` },
                },
              );

              if (res.data.success) {
                Alert.alert(
                  "Success",
                  "Vehicle removed from route successfully!",
                );
                loadInitialData(); // Dashboard update karne ke liye
              }
            } catch (err) {
              console.error("Remove Vehicle Error:", err);
              Alert.alert("Error", "Failed to remove vehicle from route.");
            }
          },
        },
      ],
    );
  };

  const renderStaff = () => (
    <ScrollView
      style={tw`flex-1 bg-gray-50`}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* 1. HEADER SECTION */}
      <View style={tw`bg-white p-6 shadow-sm border-b border-gray-200`}>
        <View style={tw`flex-row justify-between items-center`}>
          <View>
            <Text style={tw`text-2xl font-black text-gray-800`}>👥 Staff</Text>
            <Text
              style={tw`text-xs text-gray-500 font-bold uppercase tracking-wider mt-1`}
            >
              {staff.length} total staff members
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => openAddModal("staff")}
            style={tw`bg-green-600 px-5 py-3 rounded-2xl flex-row items-center shadow-lg shadow-green-200`}
          >
            <MaterialCommunityIcons
              name="account-plus"
              size={20}
              color="white"
            />
            <Text style={tw`text-white font-bold ml-1`}>Add Staff</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. STAFF LIST (Modern Cards) */}
      <View style={tw`p-4`}>
        {staff.length === 0 ? (
          <View style={tw`py-20 items-center`}>
            <MaterialCommunityIcons
              name="account-group-outline"
              size={60}
              color="#cbd5e1"
            />
            <Text style={tw`text-gray-400 font-bold mt-2`}>
              No staff members found
            </Text>
          </View>
        ) : (
          staff.map((member) => (
            <View
              key={member._id}
              style={tw`bg-white rounded-[2rem] p-5 mb-4 shadow-sm border border-gray-100`}
            >
              {/* Profile Row */}
              <View style={tw`flex-row items-center mb-4`}>
                <View
                  style={[
                    tw`w-14 h-14 rounded-2xl items-center justify-center shadow-md`,
                    { backgroundColor: "#4f46e5" }, // Purple-Blue Gradient equivalent
                  ]}
                >
                  <Text style={tw`text-white text-xl font-black`}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={tw`ml-4 flex-1`}>
                  <Text style={tw`text-lg font-black text-gray-900`}>
                    {member.name}
                  </Text>
                  <View style={tw`flex-row items-center mt-1`}>
                    <View style={tw`bg-blue-100 px-2 py-0.5 rounded-md`}>
                      <Text
                        style={tw`text-blue-700 text-[10px] font-black uppercase`}
                      >
                        {member.role}
                      </Text>
                    </View>
                    <Text style={tw`text-gray-400 text-xs ml-2 font-bold`}>
                      📞 {member.phone}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Assigned Vehicle Box */}
              <View
                style={tw`bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100`}
              >
                <Text
                  style={tw`text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2`}
                >
                  Assigned Fleet
                </Text>
                <View style={tw`flex-row items-center justify-between`}>
                  <View style={tw`flex-row items-center`}>
                    <MaterialCommunityIcons
                      name="truck-outline"
                      size={20}
                      color={member.assignedVehicleId ? "#10b981" : "#9ca3af"}
                    />
                    <Text
                      style={[
                        tw`ml-2 font-bold`,
                        member.assignedVehicleId
                          ? tw`text-gray-800`
                          : tw`text-gray-400`,
                      ]}
                    >
                      {member.assignedVehicleId
                        ? `${member.assignedVehicleId.vehicleNumber} (${member.assignedVehicleId.type || "-"})`
                        : "No Vehicle Assigned"}
                    </Text>
                  </View>

                  {/* Remove Vehicle Action */}
                  {member.assignedVehicleId && (
                    <TouchableOpacity
                      onPress={() => handleRemoveVehiclesFromStaff(member._id)}
                      style={tw`bg-red-50 p-2 rounded-xl`}
                    >
                      <MaterialCommunityIcons
                        name="truck-remove"
                        size={18}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Buttons Row */}
              <View style={tw`flex-row gap-3 pt-3 border-t border-gray-50`}>
                <TouchableOpacity
                  onPress={() => openEditModal("staff", member)}
                  style={tw`flex-1 bg-blue-50 py-3 rounded-xl flex-row justify-center items-center`}
                >
                  <MaterialCommunityIcons
                    name="account-edit-outline"
                    size={18}
                    color="#2563eb"
                  />
                  <Text style={tw`text-blue-700 font-bold ml-2`}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteItem("staff", member._id)}
                  style={tw`flex-1 bg-red-50 py-3 rounded-xl flex-row justify-center items-center`}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={18}
                    color="#dc2626"
                  />
                  <Text style={tw`text-red-700 font-bold ml-2`}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
      <View style={tw`h-20`} />
    </ScrollView>
  );

  const renderRoutes = () => (
    <ScrollView
      style={tw`flex-1 bg-gray-50`}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* 1. HEADER SECTION */}
      <View style={tw`bg-white p-6 shadow-sm border-b border-gray-200`}>
        <View style={tw`flex-row justify-between items-center`}>
          <View>
            <Text style={tw`text-2xl font-black text-gray-800`}>🛣️ Routes</Text>
            <Text
              style={tw`text-xs text-gray-500 font-bold uppercase tracking-wider mt-1`}
            >
              {routes.length} total routes created
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => openAddModal("route")}
            style={tw`bg-green-600 px-5 py-3 rounded-2xl flex-row items-center shadow-lg shadow-green-200`}
          >
            <MaterialCommunityIcons name="plus" size={20} color="white" />
            <Text style={tw`text-white font-bold ml-1`}>Add Route</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. ROUTES LIST (Cards) */}
      <View style={tw`p-4`}>
        {routes.length === 0 ? (
          <View style={tw`py-20 items-center`}>
            <MaterialCommunityIcons
              name="map-marker-path"
              size={60}
              color="#cbd5e1"
            />
            <Text style={tw`text-gray-400 font-bold mt-2`}>
              No routes created yet
            </Text>
          </View>
        ) : (
          routes.map((route) => (
            <View
              key={route._id}
              style={tw`bg-white rounded-[2rem] p-5 mb-4 shadow-sm border border-gray-100`}
            >
              {/* Route Title Row */}
              <View style={tw`flex-row items-center mb-3`}>
                <View
                  style={tw`w-12 h-12 bg-orange-50 rounded-2xl items-center justify-center mr-4`}
                >
                  <Text style={{ fontSize: 24 }}>🛣️</Text>
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-lg font-black text-gray-900`}>
                    {route.name}
                  </Text>
                  <Text
                    style={tw`text-xs text-gray-500 italic`}
                    numberOfLines={1}
                  >
                    {route.description || "No description provided"}
                  </Text>
                </View>
              </View>

              {/* Assignment Status Card */}
              <View
                style={tw`bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100`}
              >
                <Text
                  style={tw`text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2`}
                >
                  Assigned Vehicle
                </Text>
                <View style={tw`flex-row items-center justify-between`}>
                  <View style={tw`flex-row items-center`}>
                    <MaterialCommunityIcons
                      name="truck-outline"
                      size={20}
                      color={route.assignedVehicleId ? "#4f46e5" : "#9ca3af"}
                    />
                    <Text
                      style={[
                        tw`ml-2 font-bold`,
                        route.assignedVehicleId
                          ? tw`text-indigo-900`
                          : tw`text-gray-400`,
                      ]}
                    >
                      {route.assignedVehicleId
                        ? `${route.assignedVehicleId.vehicleNumber} ${route.assignedVehicleId.type ? `(${route.assignedVehicleId.type})` : ""}`
                        : "Unassigned"}
                    </Text>
                  </View>

                  {/* Remove Vehicle Button (Only if vehicle is assigned) */}
                  {route.assignedVehicleId && (
                    <TouchableOpacity
                      onPress={() => handleRemoveVehicles(route._id)}
                      style={tw`bg-red-50 p-2 rounded-xl`}
                    >
                      <MaterialCommunityIcons
                        name="truck-remove"
                        size={18}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Main Action Buttons */}
              <View style={tw`flex-row gap-3 pt-3 border-t border-gray-50`}>
                <TouchableOpacity
                  onPress={() => openEditModal("route", route)}
                  style={tw`flex-1 bg-blue-50 py-3 rounded-xl flex-row justify-center items-center`}
                >
                  <MaterialCommunityIcons
                    name="pencil"
                    size={18}
                    color="#2563eb"
                  />
                  <Text style={tw`text-blue-700 font-bold ml-2`}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteItem("route", route._id)}
                  style={tw`flex-1 bg-red-50 py-3 rounded-xl flex-row justify-center items-center`}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={18}
                    color="#dc2626"
                  />
                  <Text style={tw`text-red-700 font-bold ml-2`}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
      <View style={tw`h-20`} />
    </ScrollView>
  );

  const BottomNav = () => (
    <View
      style={tw`bg-white flex-row justify-around py-3 border-t border-gray-200 shadow-lg`}
    >
      {[
        { id: "dashboard", icon: "view-dashboard", label: "Home" },
        { id: "complaints", icon: "message-alert", label: "Reports" },
        { id: "staff", icon: "account-group", label: "Staff" },
        { id: "routes", icon: "map-marker-path", label: "Routes" },
        { id: "vehicles", icon: "truck", label: "Vehicles" },
        { id: "dustbins", icon: "delete", label: "Bins" },
      ].map((item) => (
        <TouchableOpacity
          key={item.id}
          onPress={() => setCurrentView(item.id)}
          style={tw`items-center`}
        >
          <MaterialCommunityIcons
            name={item.icon}
            size={24}
            color={currentView === item.id ? "#9333ea" : "#9ca3af"}
          />
          <Text
            style={[
              tw`text-[10px] mt-1 font-medium`,
              { color: currentView === item.id ? "#9333ea" : "#9ca3af" },
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading)
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
        <ActivityIndicator size="large" color="#9333ea" />
        <Text style={tw`mt-4 text-gray-500 font-medium`}>
          Loading CleanBin AI...
        </Text>
      </View>
    );

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View
        style={[tw`bg-white px-5 py-4 flex-row justify-between items-center border-b border-gray-200 shadow-sm`, { paddingTop: 35 }]}
      >
        <View style={tw`flex-row items-center gap-3`}>
          <View style={tw`w-10 h-10 bg-white rounded-xl items-center justify-center shadow-sm p-1 border border-gray-100`}>
            <Image
              source={require("../../assets/logoapp.png")}
              style={{ width: "100%", height: "100%", borderRadius: 6 }}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={tw`text-xl font-bold text-gray-900`}>Safaimitra</Text>
            <Text style={tw`text-xs text-gray-500`}>
              {userData?.officeName || "Office Operations"}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setShowProfileMenu(true)}>
          <MaterialCommunityIcons
            name="account-circle"
            size={36}
            color="#9333ea"
          />
        </TouchableOpacity>
      </View>

      {currentView === "dashboard" && renderDashboard()}
      {currentView === "complaints" && renderComplaints()}
      {currentView === "dustbins" && renderDustbins()}
      {currentView === "vehicles" && renderVehicles()}
      {currentView === "staff" && renderStaff()}
      {currentView === "routes" && renderRoutes()}

      <BottomNav />

      {/* ADD MODAL */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={tw`flex-1 bg-black/50 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl h-[85%]`}>
            <View
              style={tw`p-5 border-b border-gray-100 flex-row justify-between items-center`}
            >
              <Text style={tw`text-xl font-bold text-gray-800`}>
                Add {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <MaterialCommunityIcons name="close" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={tw`p-5`}>
              {/* === STAFF FORM === */}
              {modalType === "staff" && (
                <>
                  <Text style={tw`text-xs font-bold text-gray-500 mb-1 ml-1`}>
                    STAFF NAME
                  </Text>
                  <TextInput
                    style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 text-gray-800`}
                    placeholder="e.g. Amit Sharma"
                    value={formData.staffName}
                    onChangeText={(t) =>
                      setFormData({ ...formData, staffName: t })
                    }
                  />

                  <Text style={tw`text-xs font-bold text-gray-500 mb-1 ml-1`}>
                    PHONE NUMBER
                  </Text>
                  <TextInput
                    style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 text-gray-800`}
                    placeholder="9876543210"
                    keyboardType="phone-pad"
                    value={formData.staffPhone}
                    onChangeText={(t) =>
                      setFormData({ ...formData, staffPhone: t })
                    }
                  />

                  {/* ROLE SELECTION (Dropdown Style) */}
                  <Text style={tw`text-xs font-bold text-gray-500 mb-2 ml-1`}>
                    SELECT ROLE
                  </Text>
                  <View style={tw`flex-row gap-2 mb-4`}>
                    {["driver", "helper", "supervisor"].map((role) => (
                      <TouchableOpacity
                        key={role}
                        onPress={() =>
                          setFormData({ ...formData, staffRole: role })
                        }
                        style={[
                          tw`px-4 py-2 rounded-lg border`,
                          formData.staffRole === role
                            ? tw`bg-blue-600 border-blue-600`
                            : tw`bg-white border-gray-300`,
                        ]}
                      >
                        <Text
                          style={[
                            tw`text-xs font-bold capitalize`,
                            formData.staffRole === role
                              ? tw`text-white`
                              : tw`text-gray-600`,
                          ]}
                        >
                          {role}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* VEHICLE ASSIGNMENT (Only if Driver) */}
                  {formData.staffRole.toLowerCase() === "driver" && (
                    <View
                      style={tw`bg-gray-50 p-3 rounded-xl border border-gray-200`}
                    >
                      <Text
                        style={tw`text-xs font-bold text-gray-500 mb-2 ml-1`}
                      >
                        ASSIGN VEHICLE
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={tw`flex-row`}
                      >
                        {/* Option: None */}
                        <TouchableOpacity
                          onPress={() =>
                            setFormData({ ...formData, assignedVehicleId: "" })
                          }
                          style={[
                            tw`p-3 rounded-lg mr-2 border min-w-[80px] items-center justify-center`,
                            !formData.assignedVehicleId
                              ? tw`bg-gray-800 border-gray-800`
                              : tw`bg-white border-gray-300`,
                          ]}
                        >
                          <Text
                            style={
                              !formData.assignedVehicleId
                                ? tw`text-white font-bold`
                                : tw`text-gray-500`
                            }
                          >
                            None
                          </Text>
                        </TouchableOpacity>

                        {/* Vehicle List */}
                        {vehicles.map((v) => (
                          <TouchableOpacity
                            key={v._id}
                            onPress={() =>
                              setFormData({
                                ...formData,
                                assignedVehicleId: v._id,
                              })
                            }
                            style={[
                              tw`p-3 rounded-lg mr-2 border min-w-[100px]`,
                              formData.assignedVehicleId === v._id
                                ? tw`bg-blue-100 border-blue-500`
                                : tw`bg-white border-gray-300`,
                            ]}
                          >
                            <View style={tw`flex-row items-center mb-1`}>
                              <MaterialCommunityIcons
                                name="truck"
                                size={16}
                                color={
                                  formData.assignedVehicleId === v._id
                                    ? "#2563eb"
                                    : "#6b7280"
                                }
                              />
                              <Text
                                style={tw`text-xs ml-1 font-bold ${formData.assignedVehicleId === v._id ? "text-blue-700" : "text-gray-600"}`}
                              >
                                {v.type || "Truck"}
                              </Text>
                            </View>
                            <Text
                              style={tw`font-bold text-sm ${formData.assignedVehicleId === v._id ? "text-blue-900" : "text-gray-800"}`}
                            >
                              {v.vehicleNumber}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </>
              )}

              {/* ROUTE FORM */}
              {modalType === "route" && (
                <>
                  <TextInput
                    style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3`}
                    placeholder="Route Name"
                    value={formData.routeName}
                    onChangeText={(t) =>
                      setFormData({ ...formData, routeName: t })
                    }
                  />
                  <TextInput
                    style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3`}
                    placeholder="Description"
                    value={formData.routeDescription}
                    onChangeText={(t) =>
                      setFormData({ ...formData, routeDescription: t })
                    }
                  />

                  <Text style={tw`text-xs font-bold text-gray-500 mb-2`}>
                    ASSIGN VEHICLE (OPTIONAL)
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={tw`flex-row mb-4`}
                  >
                    {vehicles.map((v) => (
                      <TouchableOpacity
                        key={v._id}
                        onPress={() =>
                          setFormData({ ...formData, assignedVehicleId: v._id })
                        }
                        style={[
                          tw`p-3 rounded-lg mr-2 border`,
                          formData.assignedVehicleId === v._id
                            ? tw`bg-orange-100 border-orange-500`
                            : tw`bg-gray-50 border-gray-200`,
                        ]}
                      >
                        <Text
                          style={
                            formData.assignedVehicleId === v._id
                              ? tw`text-orange-700 font-bold`
                              : tw`text-gray-600`
                          }
                        >
                          {v.vehicleNumber}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* VEHICLE FORM */}
              {modalType === "vehicle" && (
                <>
                  <TextInput
                    style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3`}
                    placeholder="Vehicle Number"
                    value={formData.vehicleNumber}
                    onChangeText={(t) =>
                      setFormData({ ...formData, vehicleNumber: t })
                    }
                  />
                  <TextInput
                    style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3`}
                    placeholder="Vehicle Type"
                    value={formData.type}
                    onChangeText={(t) => setFormData({ ...formData, type: t })}
                  />
                </>
              )}

              {/* DUSTBIN FORM */}
              {modalType === "dustbin" && (
                <>
                  {/* 1. BIN NAME INPUT */}
                  <Text style={tw`text-xs font-bold text-gray-500 mb-1 ml-1`}>
                    DUSTBIN NAME
                  </Text>
                  <TextInput
                    style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 text-gray-800`}
                    placeholder="e.g. Main Market Bin"
                    value={formData.binName}
                    onChangeText={(t) =>
                      setFormData({ ...formData, binName: t })
                    }
                  />

                  {/* 2. AREA/LOCATION INPUT */}
                  <Text style={tw`text-xs font-bold text-gray-500 mb-1 ml-1`}>
                    AREA / LOCATION
                  </Text>
                  <TextInput
                    style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 text-gray-800`}
                    placeholder="e.g. Sector 4, Zone A"
                    value={formData.binArea}
                    onChangeText={(t) =>
                      setFormData({ ...formData, binArea: t })
                    }
                  />

                  {/* 3. LATITUDE & LONGITUDE (Read-only or Manual) */}
                  <View style={tw`flex-row gap-3 mb-4`}>
                    <View style={tw`flex-1`}>
                      <Text
                        style={tw`text-[10px] font-bold text-gray-400 mb-1 ml-1`}
                      >
                        LATITUDE
                      </Text>
                      <TextInput
                        style={tw`bg-gray-100 border border-gray-200 rounded-xl p-2 text-gray-600 text-xs`}
                        value={String(formData.binLatitude)}
                        keyboardType="numeric"
                        onChangeText={(t) =>
                          setFormData({ ...formData, binLatitude: t })
                        }
                      />
                    </View>
                    <View style={tw`flex-1`}>
                      <Text
                        style={tw`text-[10px] font-bold text-gray-400 mb-1 ml-1`}
                      >
                        LONGITUDE
                      </Text>
                      <TextInput
                        style={tw`bg-gray-100 border border-gray-200 rounded-xl p-2 text-gray-600 text-xs`}
                        value={String(formData.binLongitude)}
                        keyboardType="numeric"
                        onChangeText={(t) =>
                          setFormData({ ...formData, binLongitude: t })
                        }
                      />
                    </View>
                  </View>

                  {/* 4. MAP SECTION (Google Maps) */}
                  <Text style={tw`text-xs font-bold text-gray-500 mb-2 ml-1`}>
                    TAP TO SELECT LOCATION
                  </Text>
                  <View
                    style={tw`h-72 w-full rounded-2xl overflow-hidden mb-4 border border-gray-200 shadow-sm relative`}
                  >
                    <MapView
                      provider="google" // Forces Google Maps
                      style={tw`w-full h-full`}
                      initialRegion={{
                        latitude: userData?.latitude || 23.2599,
                        longitude: userData?.longitude || 77.4126,
                        latitudeDelta: 0.015,
                        longitudeDelta: 0.015,
                      }}
                      onPress={(e) => {
                        const { latitude, longitude } =
                          e.nativeEvent.coordinate;
                        setFormData({
                          ...formData,
                          binLatitude: latitude.toFixed(6),
                          binLongitude: longitude.toFixed(6),
                        });
                      }}
                    >
                      {/* Selected Location Marker */}
                      {formData.binLatitude && (
                        <Marker
                          coordinate={{
                            latitude: parseFloat(formData.binLatitude),
                            longitude: parseFloat(formData.binLongitude),
                          }}
                          title="New Location"
                          pinColor="#9333ea"
                        />
                      )}

                      {/* Show Existing Bins for Reference */}
                      {dustbins.map((bin) => (
                        <Marker
                          key={`ref-bin-${bin._id}`}
                          coordinate={{
                            latitude: bin.latitude,
                            longitude: bin.longitude,
                          }}
                          opacity={0.5}
                        >
                          <View style={tw`items-center`}>
                            <Text style={{ fontSize: 16 }}>🗑️</Text>
                          </View>
                        </Marker>
                      ))}

                      {/* Route Paths Reference */}
                      {routePaths.map((route, idx) => (
                        <Polyline
                          key={`modal-r-${idx}`}
                          coordinates={route.positions}
                          strokeColor="#9ca3af"
                          strokeWidth={1}
                          lineDashPattern={[5, 5]}
                        />
                      ))}
                    </MapView>
                    <View
                      style={tw`absolute bottom-2 right-2 bg-white/80 px-2 py-1 rounded-md`}
                    >
                      <Text style={tw`text-[10px] font-bold text-gray-600`}>
                        📍 Precision: High
                      </Text>
                    </View>
                  </View>

                  {/* 5. ROUTE ASSIGNMENT (Horizontal Scroll Selection) */}
                  <Text style={tw`text-xs font-bold text-gray-500 mb-2 ml-1`}>
                    ASSIGN ROUTE (OPTIONAL)
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={tw`flex-row mb-4`}
                  >
                    <TouchableOpacity
                      onPress={() => setFormData({ ...formData, routeId: "" })}
                      style={[
                        tw`px-4 py-2 rounded-xl border mr-2`,
                        !formData.routeId
                          ? tw`bg-gray-800 border-gray-800`
                          : tw`bg-white border-gray-200`,
                      ]}
                    >
                      <Text
                        style={[
                          tw`text-xs font-bold`,
                          !formData.routeId
                            ? tw`text-white`
                            : tw`text-gray-500`,
                        ]}
                      >
                        None
                      </Text>
                    </TouchableOpacity>
                    {routes.map((r) => (
                      <TouchableOpacity
                        key={r._id}
                        onPress={() =>
                          setFormData({ ...formData, routeId: r._id })
                        }
                        style={[
                          tw`px-4 py-2 rounded-xl border mr-2`,
                          formData.routeId === r._id
                            ? tw`bg-purple-100 border-purple-500`
                            : tw`bg-white border-gray-200`,
                        ]}
                      >
                        <Text
                          style={[
                            tw`text-xs font-bold`,
                            formData.routeId === r._id
                              ? tw`text-purple-700`
                              : tw`text-gray-600`,
                          ]}
                        >
                          {r.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* 6. STATUS SELECTION */}
                  <Text style={tw`text-xs font-bold text-gray-500 mb-2 ml-1`}>
                    INITIAL STATUS
                  </Text>
                  <View style={tw`flex-row flex-wrap gap-2 mb-6`}>
                    {[{ id: "clean", label: "Clean", color: "#10b981" }].map(
                      (s) => (
                        <TouchableOpacity
                          key={s.id}
                          onPress={() =>
                            setFormData({ ...formData, binStatus: s.id })
                          }
                          style={[
                            tw`px-4 py-2 rounded-xl border`,
                            formData.binStatus === s.id
                              ? {
                                  backgroundColor: s.color,
                                  borderColor: s.color,
                                }
                              : tw`bg-white border-gray-200`,
                          ]}
                        >
                          <Text
                            style={[
                              tw`text-xs font-bold`,
                              formData.binStatus === s.id
                                ? tw`text-white`
                                : { color: s.color },
                            ]}
                          >
                            {s.label}
                          </Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>
                </>
              )}
            </ScrollView>
            <View style={tw`p-5 border-t border-gray-100`}>
              <TouchableOpacity
                onPress={handleSubmit}
                style={tw`bg-purple-600 py-4 rounded-xl items-center`}
              >
                <Text style={tw`text-white font-bold text-lg`}>
                  Save {modalType}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* COMPLAINT DETAIL MODAL (Enhanced with Image & Assignment) */}
      <Modal visible={showComplaintModal} animationType="slide" transparent>
        <View style={tw`flex-1 bg-black/60 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl h-[90%] p-5`}>
            <ScrollView showsVerticalScrollIndicator={false} style={tw`flex-1`}>
              {/* 1. TOP IMAGE SECTION (Modern Layout) */}
              <View style={tw`w-full h-96 bg-gray-900 relative`}>
                {selectedComplaint?.ComimageUrl ? (
                  <Image
                    source={{ uri: selectedComplaint.ComimageUrl }}
                    style={tw`w-full h-full`}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={tw`flex-1 justify-center items-center`}>
                    <MaterialCommunityIcons
                      name="camera-off"
                      size={60}
                      color="#4b5563"
                    />
                    <Text style={tw`text-gray-500 font-bold mt-2`}>
                      No Image Provided
                    </Text>
                  </View>
                )}

                {/* Floating Header Actions inside Image */}
                <SafeAreaView
                  style={tw`absolute top-4 left-4 right-4 flex-row justify-between items-start`}
                >
                  <View style={tw`flex-row gap-2`}>
                    <View
                      style={tw`bg-white/90 px-4 py-2 rounded-full border border-white/20 shadow-lg`}
                    >
                      <Text
                        style={tw`text-[10px] font-black uppercase text-gray-800`}
                      >
                        {selectedComplaint?.status}
                      </Text>
                    </View>
                    <View
                      style={[
                        tw`px-4 py-2 rounded-full border border-white/20 shadow-lg`,
                        {
                          backgroundColor:
                            selectedComplaint?.latestPriority === "high"
                              ? "#ef4444"
                              : "#f59e0b",
                        },
                      ]}
                    >
                      <Text
                        style={tw`text-[10px] font-black uppercase text-white`}
                      >
                        {selectedComplaint?.latestPriority || "Medium"} Priority
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => setShowComplaintModal(false)}
                    style={tw`bg-black/50 p-2 rounded-full border border-white/20`}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={24}
                      color="white"
                    />
                  </TouchableOpacity>
                </SafeAreaView>
              </View>

              {/* 2. CONTENT SECTION (White Card Overlay) */}
              <View
                style={[
                  tw`bg-white rounded-t-[2.5rem] -mt-10 p-6`,
                  { minHeight: height * 0.6 },
                ]}
              >
                {/* Title & Stats */}
                <View style={tw`flex-row justify-between items-start mb-6`}>
                  <View>
                    <Text
                      style={tw`text-3xl font-black text-gray-900 tracking-tighter`}
                    >
                      Complaint Info
                    </Text>
                    <View style={tw`flex-row items-center mt-2`}>
                      <View
                        style={tw`bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 flex-row items-center`}
                      >
                        <Text style={tw`text-blue-600 font-bold`}>
                          🗑️{" "}
                          {selectedComplaint?.dustbinDetails?.name || "BIN-X"}
                        </Text>
                      </View>
                      {selectedComplaint?.totalReports > 1 && (
                        <View
                          style={tw`bg-indigo-600 px-2 py-1 rounded-lg ml-2 shadow-sm`}
                        >
                          <Text style={tw`text-white text-[10px] font-bold`}>
                            +{selectedComplaint.totalReports - 1} Others
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Grid Stats */}
                <View style={tw`flex-row gap-4 mb-6`}>
                  <View
                    style={tw`flex-1 p-4 bg-gray-50 rounded-2xl border border-gray-100`}
                  >
                    <Text
                      style={tw`text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1`}
                    >
                      ABOUT
                    </Text>
                    <Text
                      style={tw`text-gray-800 font-bold text-base capitalize`}
                    >
                      {selectedComplaint?.latestDescription || "General"}
                    </Text>
                  </View>
                  <View
                    style={tw`flex-1 p-4 bg-gray-50 rounded-2xl border border-gray-100`}
                  >
                    <Text
                      style={tw`text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1`}
                    >
                      REPORTED AT
                    </Text>
                    <Text style={tw`text-gray-800 font-bold text-sm`}>
                      {formatDateTime(selectedComplaint?.createdAt)}
                    </Text>
                  </View>
                </View>

                {/* Route Card (Gradient Look) */}
                <View
                  style={tw`p-5 bg-blue-50 rounded-3xl border border-blue-100 mb-6 flex-row items-center`}
                >
                  <View
                    style={tw`w-12 h-12 bg-white rounded-2xl items-center justify-center shadow-sm mr-4`}
                  >
                    <MaterialCommunityIcons
                      name="map-marker-radius"
                      size={24}
                      color="#2563eb"
                    />
                  </View>
                  <View style={tw`flex-1`}>
                    <Text
                      style={tw`font-black text-lg text-blue-900 leading-tight`}
                    >
                      {selectedComplaint?.dustbinDetails?.routeName ||
                        "No Route Assigned"}
                    </Text>
                    <Text style={tw`text-xs text-blue-600 font-medium mt-1`}>
                      📍 {selectedComplaint?.area}
                    </Text>
                  </View>
                </View>

                {/* Note/Comment */}
                <View
                  style={tw`p-5 bg-amber-50 rounded-3xl border border-amber-100 mb-6`}
                >
                  <Text
                    style={tw`text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-2`}
                  >
                    LATEST NOTE
                  </Text>
                  <Text
                    style={tw`text-amber-900 font-medium italic text-sm leading-5`}
                  >
                    "
                    {selectedComplaint?.latestDescription ||
                      "No comments provided."}
                    "
                  </Text>
                </View>

                {/* Dispatch Status */}
                <View style={tw`mb-8`}>
                  <Text
                    style={tw`text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3 ml-1`}
                  >
                    DISPATCH STATUS
                  </Text>

                  {selectedComplaint?.vehicle &&
                  selectedComplaint?.vehicle !== "Not Assigned" ? (
                    <View
                      style={tw`flex-row items-center p-4 bg-green-50 rounded-3xl border-2 border-green-100`}
                    >
                      <View
                        style={tw`w-12 h-12 bg-green-500 rounded-2xl items-center justify-center shadow-lg shadow-green-200`}
                      >
                        <MaterialCommunityIcons
                          name="truck-fast"
                          size={26}
                          color="white"
                        />
                      </View>
                      <View style={tw`ml-4 flex-1`}>
                        <Text
                          style={tw`text-lg font-black text-green-700 leading-none`}
                        >
                          {selectedComplaint.vehicle}
                        </Text>
                        <Text
                          style={tw`text-xs font-bold text-green-600 opacity-70 mt-1`}
                        >
                          Vehicle On Duty
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View
                      style={tw`flex-row items-center p-4 bg-red-50 rounded-3xl border border-red-100`}
                    >
                      <MaterialCommunityIcons
                        name="alert-circle-outline"
                        size={24}
                        color="#ef4444"
                        style={tw`mr-3`}
                      />
                      <Text style={tw`font-black text-red-600`}>
                        Awaiting Vehicle Assignment
                      </Text>
                    </View>
                  )}
                </View>

                {/* Quick Dispatch Section */}
                {(!selectedComplaint?.vehicle ||
                  selectedComplaint?.vehicle === "Not Assigned") && (
                  <View style={tw`mb-10`}>
                    <Text
                      style={tw`text-sm font-black text-gray-800 mb-4 ml-1`}
                    >
                      Quick Dispatch Fleet
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      {vehicles
                        .filter(
                          (v) => v.status === "Active" || v.status === "idle",
                        )
                        .map((v) => (
                          <TouchableOpacity
                            key={v._id}
                            onPress={() => {
                              Alert.alert(
                                "Confirm Dispatch",
                                `Deploy ${v.vehicleNumber} to this location?`,
                                [
                                  { text: "Cancel" },
                                  {
                                    text: "Assign",
                                    onPress: () => handleAssignComplaint(v._id),
                                  },
                                ],
                              );
                            }}
                            style={tw`bg-white border-2 border-gray-100 p-4 rounded-3xl mr-3 w-40 shadow-sm`}
                          >
                            <View
                              style={tw`bg-gray-50 w-10 h-10 rounded-xl items-center justify-center mb-3`}
                            >
                              <MaterialCommunityIcons
                                name="truck-delivery"
                                size={22}
                                color="#4b5563"
                              />
                            </View>
                            <Text style={tw`font-black text-gray-900`}>
                              {v.vehicleNumber}
                            </Text>
                            <Text
                              style={tw`text-[10px] text-gray-500 font-bold uppercase mt-1`}
                            >
                              {v.type || "Heavy Truck"}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  </View>
                )}

                {/* Close Button */}
                <TouchableOpacity
                  onPress={() => setShowComplaintModal(false)}
                  style={tw`w-full py-5 bg-gray-900 rounded-3xl items-center shadow-xl mb-10`}
                >
                  <Text style={tw`text-white font-black text-lg`}>
                    Close Details
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PROFILE MENU */}
      <Modal visible={showProfileMenu} animationType="fade" transparent>
        <TouchableOpacity
          style={tw`flex-1 bg-black/20`}
          onPress={() => setShowProfileMenu(false)}
        >
          <View
            style={tw`absolute top-20 right-5 bg-white w-48 rounded-xl shadow-xl p-2`}
          >
            <TouchableOpacity
              onPress={handleLogout}
              style={tw`p-3 flex-row items-center`}
            >
              <MaterialCommunityIcons name="logout" size={20} color="#ef4444" />
              <Text style={tw`ml-3 text-red-500 font-medium`}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
