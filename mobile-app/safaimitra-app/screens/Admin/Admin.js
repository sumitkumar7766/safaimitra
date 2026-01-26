// OfficeDashboard.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
  ActivityIndicator,
  StatusBar,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {
  Menu,
  Activity,
  Building2,
  Users,
  UserCog,
  Shield,
  Plus,
  Trash2,
  Settings,
  LogOut,
  User,
  Save
} from 'lucide-react-native';
import AdminPage from '../../App';
import NewOffice from "./newoffice"; // Path check kar lena apne hisaab se
import NewAdmin from "./newadmin"; // Path check kar lena apne hisaab se

// Added 'goBack' prop here to handle navigation
export default function OfficeDashboard({ goBack }) {
  const [screen, setScreen] = useState("home");
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const [offices, setOffices] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [userName, setUserName] = useState('');
  const [roleLabel, setRoleLabel] = useState('Admin');

  const [settings, setSettings] = useState({
    systemName: 'SafaiMitra',
    adminEmail: 'admin@safaimitra.in',
    supportEmail: 'support@safaimitra.in',
    supportPhone: '+91 1234567890',
    address: 'Municipal Corporation Building, Indore, MP',
    enableNotifications: true,
    enableEmailAlerts: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordExpiry: 90,
    backupFrequency: 'daily',
    maintenanceMode: false
  });

  const stats = {
    totalCities: 2,
    totalOffices: offices.length,
    totalAdmins: admins.length,
    activeCities: 2
  };

  // --- MIDDLEWARE & AUTH CHECK ---
  useEffect(() => {
    // 1. Initial Load Check
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        // Agar token nahi hai, seedha bahar (Home Page)
        if (goBack) goBack();
      } else {
        loadUserData();
        fetchOffices();
        fetchAdmins();
      }
    };
    checkAuth();

    // 2. API Interceptor (Middleware for expired sessions)
    const interceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        if (error.response && error.response.status === 401) {
          // Agar server ne kaha 401 (Unauthorized), logout karo aur home bhejo
          await AsyncStorage.multiRemove(["token", "user", "role", "userId"]);
          Alert.alert("Session Expired", "Please login again.");
          if (goBack) goBack();
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const payload = JSON.parse(atob(token.split('.')[1]));
      const name = payload.name || payload.username || 'Admin';
      setUserName(name);
      setRoleLabel(name === 'Admin' ? 'Super Admin' : 'Admin');
    } catch (e) {
      console.error('Invalid token');
    }
  };

  const fetchOffices = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get('http://10.13.177.129:5001/office', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data && res.data.offices) {
        setOffices(
          res.data.offices.map(o => ({
            id: o._id,
            cityName: o.cityName,
            officeName: o.officeName,
            adminName: o.adminName,
            adminEmail: o.adminEmail,
            status: o.status
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch offices:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get('http://10.13.177.129:5001/admin', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data && res.data.admins) {
        setAdmins(
          res.data.admins.map(a => ({
            id: a._id,
            name: a.name,
            email: a.email,
            username: a.username,
            role: a.role
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch admins:', err);
    }
  };

  const handleDeleteOffice = async (officeId) => {
    Alert.alert(
      'Delete Office',
      'Are you sure you want to delete this office?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.delete(`http://10.13.177.129:5001/office/${officeId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              setOffices(prev => prev.filter(o => o.id !== officeId));
              Alert.alert('Success', 'Office deleted successfully');
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete office');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAdmin = async (adminId) => {
    Alert.alert(
      'Delete Admin',
      'Are you sure you want to delete this admin?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.delete(`http://10.13.177.129:5001/admin/${adminId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              setAdmins(prev => prev.filter(a => a.id !== adminId));
              Alert.alert('Success', 'Admin deleted successfully');
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete admin');
            }
          }
        }
      ]
    );
  };

  if (screen === "adminPage") return <AdminPage goBack={() => setScreen("home")} />;
  // ... existing navigation logic ...
  if (screen === "newOfficeScreen") return <NewOffice goBack={() => setScreen("home")} />;
  if (screen === "newAdminScreen") return <NewAdmin goBack={() => setScreen("home")} />;

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
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


  const StatCard = ({ icon: Icon, title, value, color }) => (
    <View className={`bg-white rounded-lg shadow-md p-6 mb-3 border-l-4`} style={{ borderLeftColor: color }}>
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-gray-500 text-sm font-medium">{title}</Text>
          <Text className="text-3xl font-bold text-gray-800 mt-2">{value}</Text>
        </View>
        <View className="p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
          <Icon size={32} color={color} />
        </View>
      </View>
    </View>
  );

  const DashboardView = () => (
    <ScrollView className="flex-1 p-4">
      <View className="mb-6">
        <StatCard icon={Building2} title="Total Cities" value={stats.totalCities} color="#10b981" />
        <StatCard icon={Users} title="Total Offices" value={stats.totalOffices} color="#3b82f6" />
        <StatCard icon={UserCog} title="Total Admins" value={stats.totalAdmins} color="#f59e0b" />
        <StatCard icon={Activity} title="Active Cities" value={stats.activeCities} color="#8b5cf6" />
      </View>

      <View className="bg-white rounded-lg shadow-md p-4 mb-4 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-gray-800">City Offices</Text>
        <TouchableOpacity
          onPress={() => setScreen("newOfficeScreen")}
          className="bg-indigo-700 p-3 rounded-xl items-center flex-row bg-green-600"
        >
          <Plus size={20} color="#fff" />
          <Text className="text-white font-semibold">New Office</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" className="mt-8" />
      ) : (
        offices.map(office => (
          <View key={office.id} className="bg-white rounded-lg shadow-md p-4 mb-3">
            <View className="mb-3">
              <Text className="text-xs text-gray-500 uppercase">City Name</Text>
              <Text className="text-sm font-semibold text-gray-900">{office.cityName}</Text>
            </View>

            <View className="mb-3">
              <Text className="text-xs text-gray-500 uppercase">Office Name</Text>
              <Text className="text-sm text-gray-700">{office.officeName}</Text>
            </View>

            <View className="mb-3">
              <Text className="text-xs text-gray-500 uppercase">Assigned Admin</Text>
              <Text className="text-sm font-medium text-gray-900">{office.adminName}</Text>
              <Text className="text-sm text-gray-500">{office.adminEmail}</Text>
            </View>

            <View className="flex-row items-center justify-between">
              <View className={`px-3 py-1 rounded-full ${office.status === 'Active' ? 'bg-green-100' : 'bg-red-100'}`}>
                <Text className={`text-xs font-semibold ${office.status === 'Active' ? 'text-green-800' : 'text-red-800'}`}>
                  {office.status}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleDeleteOffice(office.id)}
                className="p-2 bg-red-50 rounded"
              >
                <Trash2 size={16} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const OfficeView = () => (
    <ScrollView className="flex-1 p-4">
      <View className="bg-white rounded-lg shadow-md p-4 mb-4 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-gray-800">City Offices</Text>
        <TouchableOpacity
          onPress={() => setScreen("newOfficeScreen")}
          className="bg-indigo-700 p-3 rounded-xl items-center flex-row bg-green-600"
        >
          <Plus size={20} color="#fff" />
          <Text className="text-white font-semibold">New Office</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" className="mt-8" />
      ) : (
        offices.map(office => (
          <View key={office.id} className="bg-white rounded-lg shadow-md p-4 mb-3">
            <View className="mb-3">
              <Text className="text-xs text-gray-500 uppercase">City Name</Text>
              <Text className="text-sm font-semibold text-gray-900">{office.cityName}</Text>
            </View>

            <View className="mb-3">
              <Text className="text-xs text-gray-500 uppercase">Office Name</Text>
              <Text className="text-sm text-gray-700">{office.officeName}</Text>
            </View>

            <View className="mb-3">
              <Text className="text-xs text-gray-500 uppercase">Assigned Admin</Text>
              <Text className="text-sm font-medium text-gray-900">{office.adminName}</Text>
              <Text className="text-sm text-gray-500">{office.adminEmail}</Text>
            </View>

            <View className="flex-row items-center justify-between">
              <View className={`px-3 py-1 rounded-full ${office.status === 'Active' ? 'bg-green-100' : 'bg-red-100'}`}>
                <Text className={`text-xs font-semibold ${office.status === 'Active' ? 'text-green-800' : 'text-red-800'}`}>
                  {office.status}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleDeleteOffice(office.id)}
                className="p-2 bg-red-50 rounded"
              >
                <Trash2 size={16} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const AdminsView = () => (
    <ScrollView className="flex-1 p-4">
      <View className="bg-white rounded-lg shadow-md p-4 mb-4 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-gray-800">City Admins</Text>
        <TouchableOpacity
          onPress={() => setScreen("newAdminScreen")}
          className="bg-indigo-700 p-3 rounded-xl items-center flex-row bg-green-600"
        >
          <Plus size={20} color="#fff" />
          <Text className="text-white font-semibold">New Admin</Text>
        </TouchableOpacity>
      </View>

      {admins.map(admin => (
        <View key={admin.id} className="bg-white rounded-lg shadow-md p-4 mb-3">
          <View className="flex-row items-center mb-3">
            <View className="w-12 h-12 bg-blue-600 rounded-full items-center justify-center mr-3">
              <Text className="text-white text-lg font-semibold">{admin.name.charAt(0)}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-900">{admin.name}</Text>
              <Text className="text-sm text-gray-500">{admin.email}</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => handleDeleteAdmin(admin.id)}
            className="p-2 bg-red-600 rounded items-center"
          >
            <Text className="text-white font-semibold">Delete</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );

  const SettingsView = () => (
    <ScrollView className="flex-1 p-4">
      <View className="bg-white rounded-lg shadow-md p-6 mb-6">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-gray-800">Settings</Text>
          <TouchableOpacity
            onPress={() => Alert.alert('Success', 'Settings saved!')}
            className="flex-row items-center gap-2 px-6 py-2 bg-green-600 rounded-lg"
          >
            <Save size={20} color="#fff" />
            <Text className="text-white font-semibold">Save</Text>
          </TouchableOpacity>
        </View>

        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-4">General Information</Text>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">System Name</Text>
            <TextInput
              value={settings.systemName}
              onChangeText={text => setSettings({ ...settings, systemName: text })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Admin Email</Text>
            <TextInput
              value={settings.adminEmail}
              onChangeText={text => setSettings({ ...settings, adminEmail: text })}
              keyboardType="email-address"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Support Email</Text>
            <TextInput
              value={settings.supportEmail}
              onChangeText={text => setSettings({ ...settings, supportEmail: text })}
              keyboardType="email-address"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Support Phone</Text>
            <TextInput
              value={settings.supportPhone}
              onChangeText={text => setSettings({ ...settings, supportPhone: text })}
              keyboardType="phone-pad"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Address</Text>
            <TextInput
              value={settings.address}
              onChangeText={text => setSettings({ ...settings, address: text })}
              multiline
              numberOfLines={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </View>
        </View>

        <View className="mb-6 border-t border-gray-200 pt-6">
          <Text className="text-lg font-semibold text-gray-800 mb-4">Notification Settings</Text>

          <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-gray-200">
            <View className="flex-1">
              <Text className="font-medium text-gray-700">Enable Notifications</Text>
              <Text className="text-sm text-gray-500">Send system notifications</Text>
            </View>
            <Switch
              value={settings.enableNotifications}
              onValueChange={value => setSettings({ ...settings, enableNotifications: value })}
              trackColor={{ false: '#d1d5db', true: '#16a34a' }}
              thumbColor="#fff"
            />
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="font-medium text-gray-700">Email Alerts</Text>
              <Text className="text-sm text-gray-500">Send critical email alerts</Text>
            </View>
            <Switch
              value={settings.enableEmailAlerts}
              onValueChange={value => setSettings({ ...settings, enableEmailAlerts: value })}
              trackColor={{ false: '#d1d5db', true: '#16a34a' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View className="border-t border-gray-200 pt-6">
          <Text className="text-lg font-semibold text-gray-800 mb-4">Security Settings</Text>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</Text>
            <TextInput
              value={String(settings.sessionTimeout)}
              onChangeText={text => setSettings({ ...settings, sessionTimeout: Number(text) })}
              keyboardType="number-pad"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Max Login Attempts</Text>
            <TextInput
              value={String(settings.maxLoginAttempts)}
              onChangeText={text => setSettings({ ...settings, maxLoginAttempts: Number(text) })}
              keyboardType="number-pad"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Password Expiry (days)</Text>
            <TextInput
              value={String(settings.passwordExpiry)}
              onChangeText={text => setSettings({ ...settings, passwordExpiry: Number(text) })}
              keyboardType="number-pad"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-900 pt-6">
      <StatusBar barStyle="light-content" backgroundColor="#15803d" />

      {/* Header */}
      <View className="bg-gradient-to-r from-green-700 to-green-900 p-4 flex-row items-center justify-between shadow-lg">

        <View className="flex-row items-center gap-2">
          <Shield size={28} color="#fff" />
          <Text className="text-xl font-bold text-white">SafaiMitra</Text>
        </View>

        <TouchableOpacity onPress={() => setShowProfileMenu(!showProfileMenu)} className="p-2">
          <View className="w-10 h-10 bg-white rounded-full items-center justify-center">
            <User size={20} color="#15803d" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Navigation Tabs */}
      <View className="bg-white flex-row border-b border-gray-200">
        <TouchableOpacity
          className={`flex-1 py-3 items-center ${currentView === 'dashboard' ? 'border-b-2 border-green-600' : ''}`}
          onPress={() => setCurrentView('dashboard')}
        >
          <Text className={`text-sm ${currentView === 'dashboard' ? 'text-green-600 font-semibold' : 'text-gray-600'}`}>
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-3 items-center ${currentView === 'offices' ? 'border-b-2 border-green-600' : ''}`}
          onPress={() => setCurrentView('offices')}
        >
          <Text className={`text-sm ${currentView === 'offices' ? 'text-green-600 font-semibold' : 'text-gray-600'}`}>
            Offices
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-3 items-center ${currentView === 'admins' ? 'border-b-2 border-green-600' : ''}`}
          onPress={() => setCurrentView('admins')}
        >
          <Text className={`text-sm ${currentView === 'admins' ? 'text-green-600 font-semibold' : 'text-gray-600'}`}>
            Admins
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-3 items-center ${currentView === 'settings' ? 'border-b-2 border-green-600' : ''}`}
          onPress={() => setCurrentView('settings')}
        >
          <Text className={`text-sm ${currentView === 'settings' ? 'text-green-600 font-semibold' : 'text-gray-600'}`}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'offices' && <OfficeView />}
      {currentView === 'admins' && <AdminsView />}
      {currentView === 'settings' && <SettingsView />}

      {/* Profile Menu Modal */}
      <Modal
        visible={showProfileMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-start items-end pt-16 pr-4"
          activeOpacity={1}
          onPress={() => setShowProfileMenu(false)}
        >
          <View className="bg-white rounded-lg w-48 shadow-xl">
            <View className="p-4 border-b border-gray-200">
              <Text className="text-base font-semibold text-gray-900">{userName}</Text>
              <Text className="text-xs text-gray-500">{roleLabel}</Text>
            </View>

            <TouchableOpacity className="p-4 flex-row items-center gap-2">
              <User size={16} color="#374151" />
              <Text className="text-sm text-gray-700">Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="p-4 flex-row items-center gap-2"
              onPress={() => {
                setShowProfileMenu(false);
                setCurrentView('settings');
              }}
            >
              <Settings size={16} color="#374151" />
              <Text className="text-sm text-gray-700">Settings</Text>
            </TouchableOpacity>

            <View className="h-px bg-gray-200" />

            <TouchableOpacity
              className="p-4 bg-red-50 rounded-b-lg flex-row items-center gap-0"
              onPress={() => {
                setShowProfileMenu(false);
                handleLogout();
              }}
            >
              <LogOut size={16} color="#dc2626" />
              <Text className="text-sm text-red-600 font-semibold">Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}