import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  Animated,
  ScrollView,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import UserRegister from "./screens/userRegister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
// Agar aapka Office Page alag file me hai to yahan import karein, 
// abhi ke liye main AdminPage ko hi reuse kar raha hu props ke sath.
import AdminPage from "./screens/Admin/Admin"; 
import OfficeDashboard from "./screens/Office/Office";
import StaffDashboard from "./screens/Staff/Staff";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// --- ANIMATION COMPONENTS ---
const AnimatedCard = ({ children, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, delay, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

// --- CORE LOGIN FUNCTION (SEPARATE DESTINATIONS FIXED) ---
const processStrictLogin = async (username, password, endpoint, expectedRole, onSuccess) => {
  if (!username || !password) {
    Alert.alert("Missing Info", "Please enter ID and Password");
    return;
  }

  const fullUrl = `${API_BASE_URL}${endpoint}`;
  console.log(`Attempting Login at: ${fullUrl} for Role: ${expectedRole}`);

  try {
    const res = await axios.post(
      fullUrl,
      { username, password },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    );

    if (res.data.success) {
      const { token, user } = res.data;
      const actualRole = user.role ? user.role.toLowerCase() : "";

      // --- SECURITY CHECK ---
      let isAuthorized = false;
      if (expectedRole === 'admin' && actualRole === 'admin') isAuthorized = true;
      else if (expectedRole === 'office' && actualRole === 'office') isAuthorized = true;
      else if (expectedRole === 'citizen' && actualRole === 'citizen') isAuthorized = true;
      else if (expectedRole === 'vehicle' && ['driver', 'helper', 'supervisor'].includes(actualRole)) isAuthorized = true;

      // Admin Override (Admin can login to Office portal if needed)
      if (actualRole === 'admin' && expectedRole === 'office') isAuthorized = true;

      if (!isAuthorized) {
        Alert.alert("Access Denied", `You cannot login as ${expectedRole} with role ${actualRole}`);
        return;
      }

      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("user", JSON.stringify(user));

      Alert.alert("Success", `Welcome back, ${user.name || "User"}`);

      // --- 🔥 YAHAN HUA CHANGE: DESTINATIONS ALAG KIYE 🔥 ---
      if (expectedRole === "admin") {
        onSuccess("adminDashboard"); // Admin ke liye alag screen name
      } else if (expectedRole === "office") {
        onSuccess("officeDashboard"); // Office ke liye alag screen name
      } else if (expectedRole === "vehicle") {
        onSuccess("vehicle");
      } else {
        onSuccess("citizen");
      }

    } else {
      Alert.alert("Login Failed", res.data.message || "Invalid Credentials");
    }
  } catch (err) {
    console.log("LOGIN ERROR:", err);
    Alert.alert("Login Error", err.response?.data?.message || "Connection Failed");
  }
};

// --- LOGIN SCREENS (UNCHANGED UI) ---
const CitizenLogin = ({ goBack, onLoginSuccess, onRegisterPress }) => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  return (
    <SafeAreaView className="flex-1 bg-green-600">
      {/* ... (Same UI Code as before) ... */}
      <ScrollView className="flex-1">
        <View className="pt-10 pb-8 px-6 bg-green-600 items-center">
             <TouchableOpacity onPress={goBack} className="self-start mb-4 bg-green-700 px-4 py-2 rounded-full"><Text className="text-white">← Back</Text></TouchableOpacity>
             <Text className="text-white text-3xl font-bold">Citizen Login</Text>
        </View>
        <View className="flex-1 bg-white rounded-t-[40px] px-8 pt-10 h-screen shadow-2xl">
          <TextInput className="bg-gray-50 border p-4 rounded-xl mb-4" placeholder="Citizen ID" value={id} onChangeText={setId} />
          <TextInput className="bg-gray-50 border p-4 rounded-xl mb-6" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
          <TouchableOpacity className="bg-green-600 p-4 rounded-xl items-center" onPress={() => processStrictLogin(id, password, "/citizen/login", "citizen", onLoginSuccess)}>
            <Text className="text-white font-bold">Login</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRegisterPress} className="mt-4 items-center"><Text className="text-green-700 font-bold">Create Account</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const VehicleLogin = ({ goBack, onLoginSuccess }) => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  return (
    <SafeAreaView className="flex-1 bg-amber-500">
       <ScrollView className="flex-1">
        <View className="pt-10 pb-8 px-6 bg-amber-500 items-center">
             <TouchableOpacity onPress={goBack} className="self-start mb-4 bg-amber-600 px-4 py-2 rounded-full"><Text className="text-white">← Back</Text></TouchableOpacity>
             <Text className="text-white text-3xl font-bold">Vehicle Staff</Text>
        </View>
        <View className="flex-1 bg-gray-50 rounded-t-[40px] px-8 pt-10 h-screen">
          <View className="bg-white p-6 rounded-3xl">
            <TextInput className="bg-gray-50 border p-4 rounded-xl mb-4" placeholder="Driver ID" value={id} onChangeText={setId} keyboardType="numeric"/>
            <TextInput className="bg-gray-50 border p-4 rounded-xl mb-6" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry keyboardType="numeric"/>
            <TouchableOpacity className="bg-amber-500 p-4 rounded-xl items-center" onPress={() => processStrictLogin(id, password, "/staff/login", "vehicle", onLoginSuccess)}>
                <Text className="text-white font-bold">Start Duty</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const AdminLogin = ({ goBack, onLoginSuccess, isOffice }) => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const theme = isOffice ? "bg-indigo-600" : "bg-slate-800";
  const title = isOffice ? "Office Staff" : "System Admin";

  const handleLogin = () => {
    // Determine strict endpoints and roles
    const endpoint = isOffice ? "/office/login" : "/admin/login";
    const role = isOffice ? "office" : "admin";
    processStrictLogin(id, password, endpoint, role, onLoginSuccess);
  };

  return (
    <SafeAreaView className={`flex-1 ${theme}`}>
      <ScrollView className="flex-1">
        <View className={`pt-12 pb-10 px-6 ${theme} items-center`}>
            <TouchableOpacity onPress={goBack} className="self-start mb-6 bg-white/20 px-4 py-2 rounded-lg"><Text className="text-white">← Return</Text></TouchableOpacity>
            <Text className="text-white text-3xl font-extrabold">{title}</Text>
        </View>
        <View className="flex-1 bg-white rounded-t-3xl px-8 pt-12 h-screen">
            <TextInput className="border-b-2 py-3 text-xl mb-6" placeholder="Username" value={id} onChangeText={setId} />
            <TextInput className="border-b-2 py-3 text-xl mb-10" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
            <TouchableOpacity className={`${isOffice ? "bg-indigo-600" : "bg-slate-900"} py-5 rounded-lg items-center`} onPress={handleLogin}>
                <Text className="text-white font-bold">AUTHENTICATE</Text>
            </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- PLACEHOLDER DASHBOARDS ---
const Citizen = ({ goBack }) => (
  <SafeAreaView className="flex-1 bg-green-50 justify-center items-center"><Text className="text-2xl font-bold">Citizen Dashboard</Text><TouchableOpacity onPress={goBack} className="mt-4 bg-red-500 p-3 rounded"><Text className="text-white">Logout</Text></TouchableOpacity></SafeAreaView>
);
const Vehicle = ({ goBack }) => (
  <SafeAreaView className="flex-1 bg-amber-50 justify-center items-center"><Text className="text-2xl font-bold">Vehicle Dashboard</Text><TouchableOpacity onPress={goBack} className="mt-4 bg-red-500 p-3 rounded"><Text className="text-white">Logout</Text></TouchableOpacity></SafeAreaView>
);

// --- MAIN APP ---
export default function App() {
  const [screen, setScreen] = useState("home");
  const [loading, setLoading] = useState(false);

  const navigateWithGuard = async (targetDashboard, targetLogin) => {
    const token = await AsyncStorage.getItem("token");
    const userStr = await AsyncStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;

    if (token && user) {
      const role = user.role ? user.role.toLowerCase() : "";
      const isAdmin = role === "admin";

      // --- 🔥 MIDDLEWARE PROTECTION ALAG ALAG 🔥 ---
      
      // 1. Admin Page Protection
      if (targetDashboard === "adminDashboard") {
        if (!isAdmin) {
          Alert.alert("Access Denied", "Only for System Administrators.");
          return;
        }
      }

      // 2. Office Page Protection
      if (targetDashboard === "officeDashboard") {
        if (role !== "office" && !isAdmin) { // Admin ko allow kiya hai
          Alert.alert("Access Denied", "Only for Office Staff.");
          return;
        }
      }

      // 3. Vehicle Protection
      if (targetDashboard === "vehicle") {
        if (!['driver', 'helper', 'supervisor'].includes(role) && !isAdmin) {
           Alert.alert("Access Denied", "Only for Vehicle Staff.");
           return;
        }
      }

      setScreen(targetDashboard);
    } else {
      setScreen(targetLogin);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    setScreen("home");
  };

  if (loading) return <View className="flex-1 justify-center items-center"><ActivityIndicator /></View>;

  // --- 🔥 NAVIGATION ROUTING FIXED 🔥 ---
  
  // 1. Admin ka route
  if (screen === "adminDashboard") {
    // 'isOffice={false}' pass kar rahe hain taaki Admin power mile
    return <AdminPage isOffice={false} goBack={handleLogout} />;
  }

  // 2. Office ka route
  if (screen === "officeDashboard") {
    // 'isOffice={true}' pass kar rahe hain taaki limited access mile
    // Agar aapke paas separate <OfficePage /> hai toh wo yahan lagayein
    return <OfficeDashboard isOffice={true} goBack={handleLogout} />;
  }

  if (screen === "citizen") return <Citizen goBack={handleLogout} />;
  if (screen === "vehicle") return <StaffDashboard goBack={handleLogout} />;
  
  if (screen === "register") return <UserRegister goBack={() => setScreen("citizenLogin")} />;

  // Login Screens
  if (screen === "citizenLogin") return <CitizenLogin goBack={() => setScreen("home")} onLoginSuccess={(next) => setScreen(next)} onRegisterPress={() => setScreen("register")} />;
  if (screen === "vehicleLogin") return <VehicleLogin goBack={() => setScreen("home")} onLoginSuccess={(next) => setScreen(next)} />;
  if (screen === "officeLogin") return <AdminLogin isOffice={true} goBack={() => setScreen("home")} onLoginSuccess={(next) => setScreen(next)} />;
  if (screen === "adminLogin") return <AdminLogin isOffice={false} goBack={() => setScreen("home")} onLoginSuccess={(next) => setScreen(next)} />;

  // Home Logic (Buttons)
  const RoleButton = ({ title, icon, color, description, delay, targetDashboard, targetLogin }) => (
    <AnimatedCard delay={delay}>
      <TouchableOpacity onPress={() => navigateWithGuard(targetDashboard, targetLogin)} className="flex-row items-center bg-white p-4 rounded-2xl mb-4 shadow-sm border border-gray-100">
        <View className={`w-14 h-14 rounded-2xl justify-center items-center mr-4 ${color}`}><Text className="text-3xl">{icon}</Text></View>
        <View className="flex-1"><Text className="text-gray-900 text-lg font-bold">{title}</Text><Text className="text-gray-500 text-xs mt-1">{description}</Text></View>
        <View className="bg-gray-50 rounded-full p-2"><Text className="text-gray-400 font-bold">➔</Text></View>
      </TouchableOpacity>
    </AnimatedCard>
  );

  return (
    <SafeAreaView className="flex-1 bg-green-600">
      <StatusBar barStyle="light-content" backgroundColor="#166534" />
      <View className="pt-16 pb-10 px-6"><Text className="text-white text-4xl font-bold">SafaiMitra</Text><Text className="text-green-100 mt-2">Select your role</Text></View>
      <View className="flex-1 bg-gray-50 rounded-t-[40px] px-6 pt-10 shadow-2xl">
        
        {/* 🔥 TARGETS AB ALAG ALAG HAIN 🔥 */}
        <RoleButton title="Citizen" description="Complaints" icon="👤" color="bg-green-100" 
          targetDashboard="citizen" 
          targetLogin="citizenLogin" delay={100} />

        <RoleButton title="Vehicle Staff" description="Drivers" icon="🚛" color="bg-amber-100" 
          targetDashboard="vehicle" 
          targetLogin="vehicleLogin" delay={200} />
        
        <RoleButton title="Office" description="Staff Ops" icon="🏢" color="bg-indigo-100" 
          targetDashboard="officeDashboard" // Ye ab officeDashboard par jayega
          targetLogin="officeLogin" delay={300} />
        
        <RoleButton title="Admin" description="Control" icon="🔐" color="bg-slate-200" 
          targetDashboard="adminDashboard" // Ye ab adminDashboard par jayega
          targetLogin="adminLogin" delay={400} />

        <TouchableOpacity onPress={handleLogout} className="mt-auto mb-6 items-center"><Text className="text-gray-400 text-xs">Reset Session</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}