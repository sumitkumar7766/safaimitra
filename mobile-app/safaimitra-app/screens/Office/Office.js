import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, Modal, TextInput, Alert, Image, RefreshControl,
  Dimensions, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL; // Update with your backend URL

export default function App({goBack}) {
  // ===================== STATE MANAGEMENT =====================
  const [currentView, setCurrentView] = useState('dashboard');
  const [userData, setUserData] = useState(null);
  const [dustbins, setDustbins] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [staff, setStaff] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [reviews] = useState([
    { id: 1, userName: "Ramesh Verma", rating: 5, comment: "Very quick response!", time: "1 day ago", location: "Sector 4" },
    { id: 2, userName: "Priya Sharma", rating: 4, comment: "Good service overall.", time: "2 days ago", location: "Kolar Road" },
  ]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [viewMode, setViewMode] = useState('active');
  
  const [formData, setFormData] = useState({
    binName: '', binLatitude: '', binLongitude: '', binArea: '', binStatus: 'clean',
    vehicleNumber: '', type: '', active: true, routeId: '',
    staffName: '', staffRole: '', staffPhone: '', assignedVehicleId: '',
    routeName: '', routeDescription: '',
  });

  const [profile] = useState({
    name: "Admin User", email: "admin@cleanbin.com", phone: "9876543210",
    designation: "Municipal Officer", city: "Bhopal", department: "Waste Management"
  });

  // ===================== COMPUTED VALUES =====================
  const stats = useMemo(() => ({
    total: dustbins.length,
    clean: dustbins.filter(d => d.status === "clean").length,
    overflow: dustbins.filter(d => d.status === "overflow").length,
    activeVehicles: vehicles.filter(v => v.status === "active" || v.status === "Active").length,
    pendingComplaints: complaints.filter(c => c.status === "pending" || c.status === "urgent").length
  }), [dustbins, vehicles, complaints]);

  const routePaths = useMemo(() => {
    const paths = {};
    dustbins.forEach((bin) => {
      if (bin.routeId?._id && bin.latitude && bin.longitude) {
        const routeId = bin.routeId._id;
        if (!paths[routeId]) paths[routeId] = { name: bin.routeId.name, positions: [] };
        paths[routeId].positions.push({ latitude: bin.latitude, longitude: bin.longitude });
      }
    });
    return Object.values(paths);
  }, [dustbins]);

  // ===================== UTILITY FUNCTIONS =====================
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const getStatusColor = (status) => ({
    clean: '#10b981', overflow: '#f59e0b', skiped: '#ef4444',
    suspecies: '#cc760e', ideal: '#000000', missed: '#ef4444'
  }[status] || '#6b7280');

  const getPriorityColor = (priority) => ({
    critical: "#dc2626", high: "#f59e0b", low: "#10b981"
  }[priority] || "#6b7280");

  const renderStars = (rating) => "⭐".repeat(rating) + "☆".repeat(5 - rating);

  // ===================== API CALLS =====================
  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await axios.get(`${API_URL}/office/userdata`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.data.success) setUserData(res.data.user);
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const fetchData = async (endpoint, setter) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!userData?._id) return;
      const res = await axios.get(`${API_URL}/${endpoint}/${userData._id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.data.success) setter(res.data[Object.keys(res.data)[1]]);
    } catch (err) {
      console.error(`Fetch ${endpoint} Error:`, err);
    }
  };

  const fetchComplaints = async () => {
    try {
      const officeId = await AsyncStorage.getItem("userId");
      const token = await AsyncStorage.getItem("token");
      if (!officeId) return;
      const res = await axios.get(`${API_URL}/complaint/all/${officeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setComplaints(res.data.complaints);
    } catch (error) {
      console.error("Error fetching complaints:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    await Promise.all([
      fetchData('dustbin/list', setDustbins),
      fetchData('vehicle/list', setVehicles),
      fetchData('staff/list', setStaff),
      fetchData('route/list', setRoutes),
      fetchComplaints(),
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout", onPress: async () => {
          try {
            await axios.post(`${API_URL}/office/logout`);
            await AsyncStorage.multiRemove(["token", "user", "role", "userId"]);
            Alert.alert("Success", "Logged out!");
            goBack();
          } catch (error) {
            console.error("Logout error:", error);
          }
        }
      }
    ]);
  };

  const handleManualClean = (id) => {
    Alert.alert("Mark Clean", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm", onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("token");
            await axios.put(`${API_URL}/dustbin/update-status/${id}`, { status: "clean" },
              { headers: { Authorization: `Bearer ${token}` } });
            fetchData('dustbin/list', setDustbins);
            Alert.alert("Success", "Dustbin marked as CLEAN!");
          } catch (error) {
            Alert.alert("Error", "Failed to update");
          }
        }
      }
    ]);
  };

  const handleDeleteItem = (type, id) => {
    Alert.alert("Delete", `Delete this ${type}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("token");
            await axios.delete(`${API_URL}/${type}/delete/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            Alert.alert("Success", "Deleted!");
            fetchAllData();
          } catch (error) {
            Alert.alert("Error", "Failed to delete");
          }
        }
      }
    ]);
  };

  const handleSubmit = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const endpoints = {
        dustbin: { url: 'dustbin/register', data: {
          officeId: userData._id, name: formData.binName, area: formData.binArea,
          latitude: parseFloat(formData.binLatitude), longitude: parseFloat(formData.binLongitude),
          status: formData.binStatus, routeId: formData.routeId || null
        }},
        vehicle: { url: 'vehicle/register', data: {
          officeId: userData._id, vehicleNumber: formData.vehicleNumber,
          type: formData.type, active: formData.active
        }},
        staff: { url: 'staff/register', data: {
          officeId: userData._id, name: formData.staffName, role: formData.staffRole,
          phone: formData.staffPhone, assignedVehicleId: formData.staffRole === "driver" ? formData.assignedVehicleId : null
        }},
        route: { url: 'route/register', data: {
          officeId: userData._id, name: formData.routeName,
          description: formData.routeDescription, assignedVehicleId: formData.assignedVehicleId || null
        }}
      };

      const { url, data } = endpoints[modalType];
      await axios.post(`${API_URL}/${url}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert("Success", `${modalType} added!`);
      setShowAddModal(false);
      fetchAllData();
      resetForm();
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed");
    }
  };

  const resetForm = () => {
    setFormData({
      binName: '', binLatitude: '', binLongitude: '', binArea: '', binStatus: 'clean',
      vehicleNumber: '', type: '', active: true, routeId: '',
      staffName: '', staffRole: '', staffPhone: '', assignedVehicleId: '',
      routeName: '', routeDescription: '',
    });
  };

  // ===================== EFFECTS =====================
  useEffect(() => { fetchUserData(); }, []);

  useEffect(() => {
    if (userData?._id) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 5000);
      return () => clearInterval(interval);
    }
  }, [userData]);

  // ===================== UI COMPONENTS =====================
  const StatCard = ({ icon, title, value, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statCardContent}>
        <View>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={styles.statValue}>{value}</Text>
        </View>
        <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
          <Icon name={icon} size={32} color={color} />
        </View>
      </View>
    </View>
  );

  const DashboardView = () => (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      <View style={styles.statsGrid}>
        <StatCard icon="delete" title="Total Bins" value={stats.total} color="#3b82f6" />
        <StatCard icon="check-circle" title="Clean Bins" value={stats.clean} color="#10b981" />
        <StatCard icon="alert-circle" title="Overflow" value={stats.overflow} color="#f59e0b" />
        <StatCard icon="truck" title="Active Vehicles" value={stats.activeVehicles} color="#8b5cf6" />
      </View>

      <View style={styles.mapContainer}>
        <View style={styles.mapHeader}>
          <View>
            <Text style={styles.mapTitle}>🗺️ Live City Map</Text>
            <Text style={styles.mapSubtitle}>Real-time tracking across {profile.city}</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>

        <MapView style={styles.map} initialRegion={{
          latitude: userData?.latitude || 23.2599, longitude: userData?.longitude || 77.4126,
          latitudeDelta: 0.0922, longitudeDelta: 0.0421,
        }}>
          {dustbins.map((bin) => (
            <Marker key={`bin-${bin._id}`} coordinate={{ latitude: bin.latitude, longitude: bin.longitude }}
              pinColor={getStatusColor(bin.status)} title={bin.name} description={`Status: ${bin.status.toUpperCase()}`} />
          ))}
          {vehicles.filter((v) => v.isOnline && v.latitude && v.longitude).map((vehicle) => (
            <Marker key={`vehicle-${vehicle._id}`} coordinate={{ latitude: vehicle.latitude, longitude: vehicle.longitude }}
              pinColor="#8b5cf6" title={`🚛 ${vehicle.vehicleNumber}`} description={`Type: ${vehicle.type || "Truck"}`} />
          ))}
          {routePaths.map((route, idx) => (
            <Polyline key={`route-${idx}`} coordinates={route.positions}
              strokeColor="#3b82f6" strokeWidth={2} lineDashPattern={[5, 10]} />
          ))}
        </MapView>

        <View style={styles.legend}>
          {[{ color: '#10b981', label: 'Clean' }, { color: '#f59e0b', label: 'Overflow' },
            { color: '#ef4444', label: 'Skipped' }, { color: '#8b5cf6', label: 'Vehicles' }].map(({ color, label }) => (
            <View key={label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.quickActionsGrid}>
        {[{ bg: '#3b82f6', icon: 'message-alert', value: stats.pendingComplaints, label: 'Pending Complaints', view: 'complaints' },
          { bg: '#10b981', icon: 'delete', value: stats.total, label: 'Total Dustbins', view: 'dustbins' },
          { bg: '#8b5cf6', icon: 'truck', value: stats.activeVehicles, label: 'Active Vehicles', view: 'vehicles' }]
          .map(({ bg, icon, value, label, view }) => (
            <TouchableOpacity key={view} style={[styles.quickAction, { backgroundColor: bg }]}
              onPress={() => setCurrentView(view)}>
              <View style={styles.quickActionHeader}>
                <Icon name={icon} size={40} color="#fff" />
                <Text style={styles.quickActionValue}>{value}</Text>
              </View>
              <Text style={styles.quickActionLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
      </View>
    </ScrollView>
  );

  const ComplaintsView = () => {
    const filteredList = complaints.filter(c => 
      viewMode === "active" ? (c.status !== "resolved" && c.status !== "closed") : (c.status === "resolved" || c.status === "closed")
    );

    return (
      <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>📋 Complaints</Text>
            <Text style={styles.headerSubtitle}>Manage citizen reports</Text>
          </View>
          <View style={styles.toggleContainer}>
            {['active', 'resolved'].map((mode) => (
              <TouchableOpacity key={mode} style={[styles.toggleBtn, viewMode === mode && styles.toggleBtnActive]}
                onPress={() => setViewMode(mode)}>
                <Text style={[styles.toggleText, viewMode === mode && styles.toggleTextActive]}>
                  {mode === 'active' ? 'Active' : 'History'} ({complaints.filter(c => mode === 'active' ? c.status !== 'resolved' : c.status === 'resolved').length})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {filteredList.map((complaint) => (
          <TouchableOpacity key={complaint._id} style={styles.listCard}
            onPress={() => { setSelectedReport(complaint); setShowDetailModal(true); }}>
            <View style={styles.complaintHeader}>
              <View style={styles.complaintBadge}>
                <Text style={styles.complaintBadgeText}>{complaint.complaintCount} Reports</Text>
              </View>
              <View style={[styles.statusBadge, {
                backgroundColor: complaint.status === 'resolved' ? '#10b98120' : '#ef444420',
                borderColor: complaint.status === 'resolved' ? '#10b981' : '#ef4444'
              }]}>
                <Text style={[styles.statusBadgeText, { color: complaint.status === 'resolved' ? '#10b981' : '#ef4444' }]}>
                  {complaint.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.complaintTitle}>{complaint.dustbinDetails?.name || "Unknown"}</Text>
            <Text style={styles.complaintSubtitle}>{complaint.area}</Text>
            <View style={styles.complaintFooter}>
              <Text style={styles.complaintTime}>{formatDateTime(complaint.createdAt)}</Text>
              <Icon name="chevron-right" size={20} color="#9ca3af" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const DustbinsView = () => (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🗑️ Dustbins</Text>
          <Text style={styles.headerSubtitle}>{dustbins.length} total</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => { setModalType('dustbin'); setShowAddModal(true); }}>
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {dustbins.map((bin) => (
        <View key={bin._id} style={styles.listCard}>
          <View style={styles.dustbinHeader}>
            {bin.imageUrl && <Image source={{ uri: bin.imageUrl }} style={styles.dustbinImage} />}
            <View style={styles.dustbinInfo}>
              <Text style={styles.dustbinName}>{bin.name}</Text>
              <Text style={styles.dustbinArea}>{bin.area}</Text>
              <Text style={styles.dustbinRoute}>{bin.routeId ? `🛣️ ${bin.routeId.name}` : "🚫 No Route"}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(bin.status)}20` }]}>
              <Text style={[styles.statusBadgeText, { color: getStatusColor(bin.status) }]}>
                {bin.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.dustbinActions}>
            {bin.status !== 'clean' && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                onPress={() => handleManualClean(bin._id)}>
                <Icon name="check-circle" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Clean</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
              onPress={() => handleDeleteItem('dustbin', bin._id)}>
              <Icon name="delete" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const VehiclesView = () => (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🚛 Vehicles</Text>
          <Text style={styles.headerSubtitle}>{vehicles.length} total</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => { setModalType('vehicle'); setShowAddModal(true); }}>
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {vehicles.map((vehicle) => (
        <View key={vehicle._id} style={styles.listCard}>
          <View style={styles.vehicleHeader}>
            <Icon name="truck" size={40} color="#8b5cf6" />
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>{vehicle.vehicleNumber}</Text>
              <Text style={styles.vehicleType}>{vehicle.type || "Truck"}</Text>
              <View style={[styles.statusBadge, { backgroundColor: vehicle.status === "Active" ? '#10b98120' : '#6b728020' }]}>
                <Text style={[styles.statusBadgeText, { color: vehicle.status === "Active" ? '#10b981' : '#6b7280' }]}>
                  {vehicle.status}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef4444', marginTop: 12 }]}
            onPress={() => handleDeleteItem('vehicle', vehicle._id)}>
            <Icon name="delete" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );

  const StaffView = () => (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>👥 Staff</Text>
          <Text style={styles.headerSubtitle}>{staff.length} total</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => { setModalType('staff'); setShowAddModal(true); }}>
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {staff.map((member) => (
        <View key={member._id} style={styles.listCard}>
          <View style={styles.staffHeader}>
            <View style={styles.staffAvatar}>
              <Text style={styles.staffAvatarText}>{member.name.charAt(0)}</Text>
            </View>
            <View style={styles.staffInfo}>
              <Text style={styles.staffName}>{member.name}</Text>
              <Text style={styles.staffPhone}>{member.phone}</Text>
              <View style={styles.staffRoleBadge}>
                <Text style={styles.staffRoleText}>{member.role}</Text>
              </View>
            </View>
          </View>
          {member.assignedVehicleId && (
            <Text style={styles.staffVehicle}>🚛 {member.assignedVehicleId.vehicleNumber}</Text>
          )}
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef4444', marginTop: 12 }]}
            onPress={() => handleDeleteItem('staff', member._id)}>
            <Icon name="delete" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );

  const RoutesView = () => (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🛣️ Routes</Text>
          <Text style={styles.headerSubtitle}>{routes.length} total</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => { setModalType('route'); setShowAddModal(true); }}>
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {routes.map((route) => (
        <View key={route._id} style={styles.listCard}>
          <Text style={styles.routeName}>🛣️ {route.name}</Text>
          <Text style={styles.routeDescription}>{route.description || "No description"}</Text>
          {route.assignedVehicleId && (
            <Text style={styles.routeVehicle}>🚛 {route.assignedVehicleId.vehicleNumber}</Text>
          )}
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef4444', marginTop: 12 }]}
            onPress={() => handleDeleteItem('route', route._id)}>
            <Icon name="delete" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );

  const ReviewsView = () => (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>⭐ Reviews</Text>
          <Text style={styles.headerSubtitle}>{reviews.length} total</Text>
        </View>
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingValue}>4.2</Text>
          <Text style={styles.ratingLabel}>Avg</Text>
        </View>
      </View>

      {reviews.map((review) => (
        <View key={review.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewAvatar}>
              <Text style={styles.reviewAvatarText}>{review.userName.charAt(0)}</Text>
            </View>
            <View style={styles.reviewInfo}>
              <Text style={styles.reviewName}>{review.userName}</Text>
              <Text style={styles.reviewLocation}>📍 {review.location}</Text>
              <Text style={styles.reviewStars}>{renderStars(review.rating)}</Text>
            </View>
          </View>
          <Text style={styles.reviewComment}>"{review.comment}"</Text>
          <Text style={styles.reviewTime}>{review.time}</Text>
        </View>
      ))}
    </ScrollView>
  );

  const BottomNav = () => (
    <View style={styles.bottomNav}>
      {[{ view: 'dashboard', icon: 'view-dashboard', label: 'Dashboard' },
        { view: 'complaints', icon: 'message-alert', label: 'Complaints' },
        { view: 'dustbins', icon: 'delete', label: 'Dustbins' },
        { view: 'more', icon: 'dots-horizontal', label: 'More' }]
        .map(({ view, icon, label }) => (
          <TouchableOpacity key={view} style={styles.navItem}
            onPress={() => view === 'more' ? setShowProfileMenu(true) : setCurrentView(view)}>
            <Icon name={icon} size={24} color={currentView === view ? '#9333ea' : '#9ca3af'} />
            <Text style={[styles.navText, currentView === view && styles.navTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9333ea" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.topHeaderTitle}>CleanBin AI</Text>
          <Text style={styles.topHeaderSubtitle}>{userData?.officeName || "Office Dashboard"}</Text>
        </View>
        <Icon name="account-circle" size={40} color="#9333ea" />
      </View>

      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'complaints' && <ComplaintsView />}
      {currentView === 'dustbins' && <DustbinsView />}
      {currentView === 'vehicles' && <VehiclesView />}
      {currentView === 'staff' && <StaffView />}
      {currentView === 'routes' && <RoutesView />}
      {currentView === 'reviews' && <ReviewsView />}

      <BottomNav />

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>➕ Add {modalType}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {modalType === 'dustbin' && (
                <>
                  <TextInput style={styles.input} placeholder="Name" value={formData.binName}
                    onChangeText={(text) => setFormData({ ...formData, binName: text })} />
                  <TextInput style={styles.input} placeholder="Area" value={formData.binArea}
                    onChangeText={(text) => setFormData({ ...formData, binArea: text })} />
                  <TextInput style={styles.input} placeholder="Latitude" keyboardType="numeric" value={formData.binLatitude}
                    onChangeText={(text) => setFormData({ ...formData, binLatitude: text })} />
                  <TextInput style={styles.input} placeholder="Longitude" keyboardType="numeric" value={formData.binLongitude}
                    onChangeText={(text) => setFormData({ ...formData, binLongitude: text })} />
                </>
              )}
              {modalType === 'vehicle' && (
                <>
                  <TextInput style={styles.input} placeholder="Vehicle Number" value={formData.vehicleNumber}
                    onChangeText={(text) => setFormData({ ...formData, vehicleNumber: text })} />
                  <TextInput style={styles.input} placeholder="Type" value={formData.type}
                    onChangeText={(text) => setFormData({ ...formData, type: text })} />
                </>
              )}
              {modalType === 'staff' && (
                <>
                  <TextInput style={styles.input} placeholder="Name" value={formData.staffName}
                    onChangeText={(text) => setFormData({ ...formData, staffName: text })} />
                  <TextInput style={styles.input} placeholder="Phone" keyboardType="phone-pad" value={formData.staffPhone}
                    onChangeText={(text) => setFormData({ ...formData, staffPhone: text })} />
                </>
              )}
              {modalType === 'route' && (
                <>
                  <TextInput style={styles.input} placeholder="Name" value={formData.routeName}
                    onChangeText={(text) => setFormData({ ...formData, routeName: text })} />
                  <TextInput style={[styles.input, { height: 100 }]} placeholder="Description" multiline value={formData.routeDescription}
                    onChangeText={(text) => setFormData({ ...formData, routeDescription: text })} />
                </>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>✓ Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowDetailModal(false)}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
            {selectedReport?.image && <Image source={{ uri: selectedReport.image }} style={styles.complaintImage} resizeMode="cover" />}
            <ScrollView style={styles.detailContent}>
              <Text style={styles.detailTitle}>Complaint Details</Text>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{selectedReport?.dustbinDetails?.name || "Unknown"}</Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Area</Text>
                <Text style={styles.detailValue}>{selectedReport?.area}</Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Reported At</Text>
                <Text style={styles.detailValue}>{formatDateTime(selectedReport?.createdAt)}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* More Menu */}
      <Modal visible={showProfileMenu} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.moreMenuContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>More</Text>
              <TouchableOpacity onPress={() => setShowProfileMenu(false)}>
                <Icon name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            {[{ view: 'vehicles', icon: 'truck', label: 'Vehicles', color: '#8b5cf6' },
              { view: 'staff', icon: 'account-group', label: 'Staff', color: '#f59e0b' },
              { view: 'routes', icon: 'map-marker-path', label: 'Routes', color: '#3b82f6' },
              { view: 'reviews', icon: 'star', label: 'Reviews', color: '#eab308' }]
              .map(({ view, icon, label, color }) => (
                <TouchableOpacity key={view} style={styles.menuItem} onPress={() => { setShowProfileMenu(false); setCurrentView(view); }}>
                  <Icon name={icon} size={24} color={color} />
                  <Text style={styles.menuItemText}>{label}</Text>
                </TouchableOpacity>
              ))}
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowProfileMenu(false); handleLogout(); }}>
              <Icon name="logout" size={24} color="#ef4444" />
              <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f3f4f6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6b7280' },
  topHeader: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  topHeaderTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  topHeaderSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  statsGrid: { padding: 16, gap: 16 },
  statCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, borderLeftWidth: 4 },
  statCardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statTitle: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  statValue: { fontSize: 32, fontWeight: 'bold', color: '#1f2937', marginTop: 4 },
  statIconContainer: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  mapContainer: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  mapTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  mapSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#d1fae5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', marginRight: 6 },
  liveText: { fontSize: 12, fontWeight: '600', color: '#047857' },
  map: { height: 300, borderRadius: 12, marginBottom: 12 },
  legend: { flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap', backgroundColor: '#f9fafb', padding: 12, borderRadius: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
  legendText: { fontSize: 12, color: '#4b5563', fontWeight: '500' },
  quickActionsGrid: { padding: 16, gap: 12 },
  quickAction: { borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  quickActionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  quickActionValue: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  quickActionLabel: { fontSize: 16, fontWeight: '600', color: '#fff' },
  header: { backgroundColor: '#fff', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  headerSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  addButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 8, padding: 4 },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  toggleBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  toggleTextActive: { color: '#3b82f6' },
  listCard: { backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 8, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  complaintHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  complaintBadge: { backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  complaintBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  complaintTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  complaintSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  complaintFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  complaintTime: { fontSize: 12, color: '#9ca3af' },
  dustbinHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  dustbinImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  dustbinInfo: { flex: 1 },
  dustbinName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  dustbinArea: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  dustbinRoute: { fontSize: 12, color: '#3b82f6', fontWeight: '600', marginTop: 4 },
  dustbinActions: { flexDirection: 'row', gap: 8 },
  vehicleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  vehicleInfo: { marginLeft: 12, flex: 1 },
  vehicleName: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  vehicleType: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  staffHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  staffAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  staffAvatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  staffInfo: { flex: 1 },
  staffName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  staffPhone: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  staffRoleBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  staffRoleText: { fontSize: 12, color: '#1e40af', fontWeight: '600' },
  staffVehicle: { fontSize: 14, color: '#8b5cf6', fontWeight: '600', marginTop: 8 },
  routeName: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  routeDescription: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  routeVehicle: { fontSize: 14, color: '#3b82f6', fontWeight: '600' },
  reviewCard: { backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 8, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  reviewAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#a855f7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  reviewAvatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  reviewInfo: { flex: 1 },
  reviewName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  reviewLocation: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  reviewStars: { fontSize: 16, marginTop: 4 },
  reviewComment: { fontSize: 14, color: '#4b5563', fontStyle: 'italic', backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, marginBottom: 8 },
  reviewTime: { fontSize: 12, color: '#9ca3af' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 12, fontWeight: 'bold' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  ratingContainer: { alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  ratingValue: { fontSize: 24, fontWeight: 'bold', color: '#92400e' },
  ratingLabel: { fontSize: 12, color: '#92400e' },
  bottomNav: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingBottom: 5, paddingTop: 5 },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  navText: { fontSize: 12, fontWeight: '600', color: '#9ca3af', marginTop: 4 },
  navTextActive: { color: '#9333ea' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.85 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  modalBody: { padding: 20 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 16, color: '#1f2937' },
  submitButton: { backgroundColor: '#9333ea', margin: 20, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  detailModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.9 },
  modalCloseBtn: { position: 'absolute', top: 20, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  complaintImage: { width: '100%', height: 250 },
  detailContent: { padding: 20 },
  detailTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 20 },
  detailSection: { marginBottom: 16 },
  detailLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 },
  detailValue: { fontSize: 16, color: '#1f2937' },
  moreMenuContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  menuItemText: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginLeft: 16 },
  menuDivider: { height: 8, backgroundColor: '#f3f4f6' },
});