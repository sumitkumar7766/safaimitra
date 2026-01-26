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
  ActivityIndicator // Added for loading state
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import UserRegister from "./screens/userRegister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import AdminPage from "./screens/Admin/Admin";

// --- CONFIGURATION ---
const API_BASE_URL = "http://10.13.177.129:5001";

// --- ANIMATION COMPONENTS ---
const AnimatedCard = ({ children, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      {children}
    </Animated.View>
  );
};

// --- CORE LOGIN FUNCTION (Strict Security) ---
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

      if (user.role !== expectedRole && !(expectedRole === 'admin' && user.role === 'office')) {
        Alert.alert(
          "Access Denied",
          `You cannot login here. This portal is for ${expectedRole.toUpperCase()} only.`
        );
        return;
      }

      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("user", JSON.stringify(user));

      Alert.alert("Success", `Welcome back, ${user.username || "User"}`);

      if (expectedRole === "admin" || expectedRole === "office") onSuccess("adminPage");
      else if (expectedRole === "vehicle") onSuccess("vehicle");
      else onSuccess("citizen");

    } else {
      Alert.alert("Login Failed", res.data.message || "Invalid Credentials");
    }
  } catch (err) {
    console.log("LOGIN ERROR:", err);
    if (err.response) {
      Alert.alert("Login Failed", err.response.data.message || "Server rejected request");
    } else {
      Alert.alert("Connection Error", "Check your internet or server IP.");
    }
  }
};

// --- 1. CITIZEN LOGIN SCREEN ---
const CitizenLogin = ({ goBack, onLoginSuccess, onRegisterPress }) => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    processStrictLogin(id, password, "/citizen/login", "citizen", onLoginSuccess);
  };

  return (
    <SafeAreaView className="flex-1 bg-green-600">
      <StatusBar barStyle="light-content" backgroundColor="#166534" />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="pt-10 pb-8 px-6 bg-green-600 items-center">
          <TouchableOpacity onPress={goBack} className="self-start mb-4 bg-green-700 px-4 py-2 rounded-full">
            <Text className="text-white text-sm font-semibold">← Back</Text>
          </TouchableOpacity>
          <View className="w-20 h-20 bg-green-100 rounded-full justify-center items-center mb-4 shadow-lg">
            <Text className="text-4xl">👤</Text>
          </View>
          <Text className="text-white text-3xl font-bold">Citizen Login</Text>
        </View>

        <View className="flex-1 bg-white rounded-t-[40px] px-8 pt-10 pb-10 h-screen shadow-2xl">
          <Text className="text-gray-500 font-semibold mb-2 ml-1">Mobile / User ID</Text>
          <TextInput
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-gray-800 mb-5 text-lg"
            placeholder="Enter Citizen ID"
            value={id}
            onChangeText={setId}
            autoCapitalize="none"
          />
          <Text className="text-gray-500 font-semibold mb-2 ml-1">Password</Text>
          <TextInput
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-gray-800 mb-8 text-lg"
            placeholder="Enter Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity
            className="bg-green-600 rounded-2xl py-4 items-center shadow-lg shadow-green-300"
            onPress={handleLogin}
          >
            <Text className="text-white text-lg font-bold">Secure Login</Text>
          </TouchableOpacity>
          <View className="flex-row justify-center mt-8">
            <Text className="text-gray-500">New here? </Text>
            <TouchableOpacity onPress={onRegisterPress}>
              <Text className="text-green-700 font-bold">Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- 2. VEHICLE LOGIN SCREEN ---
const VehicleLogin = ({ goBack, onLoginSuccess }) => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    processStrictLogin(id, password, "/vehicle/login", "vehicle", onLoginSuccess);
  };

  return (
    <SafeAreaView className="flex-1 bg-amber-500">
      <StatusBar barStyle="light-content" backgroundColor="#B45309" />
      <ScrollView className="flex-1">
        <View className="pt-10 pb-8 px-6 bg-amber-500 items-center">
          <TouchableOpacity onPress={goBack} className="self-start mb-4 bg-amber-600 px-4 py-2 rounded-full">
            <Text className="text-white text-sm font-semibold">← Back</Text>
          </TouchableOpacity>
          <View className="w-20 h-20 bg-amber-100 rounded-2xl justify-center items-center mb-4 rotate-3">
            <Text className="text-4xl">🚛</Text>
          </View>
          <Text className="text-white text-3xl font-bold">Vehicle Staff</Text>
        </View>

        <View className="flex-1 bg-gray-50 rounded-t-[40px] px-8 pt-10 pb-10 h-screen">
          <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <Text className="text-gray-800 font-bold text-lg mb-6 text-center">Driver Authentication</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 mb-4 text-lg"
              placeholder="Driver ID"
              value={id}
              onChangeText={setId}
              autoCapitalize="none"
            />
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 mb-6 text-lg"
              placeholder="PIN / Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              className="bg-amber-500 rounded-xl py-4 items-center"
              onPress={handleLogin}
            >
              <Text className="text-white text-lg font-bold">Start Duty</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- 3. ADMIN / OFFICE LOGIN SCREEN ---
const AdminLogin = ({ goBack, onLoginSuccess, isOffice }) => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  const themeColor = isOffice ? "bg-indigo-600" : "bg-slate-800";
  const btnColor = isOffice ? "bg-indigo-600" : "bg-slate-900";
  const title = isOffice ? "Office Staff" : "System Admin";

  const handleLogin = () => {
    const specificEndpoint = isOffice ? "/office/login" : "/admin/login";
    const specificRole = isOffice ? "office" : "admin";
    processStrictLogin(id, password, specificEndpoint, specificRole, onLoginSuccess);
  };

  return (
    <SafeAreaView className={`flex-1 ${themeColor}`}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />
      <ScrollView className="flex-1">
        <View className={`pt-12 pb-10 px-6 ${themeColor} items-center`}>
          <TouchableOpacity onPress={goBack} className="self-start mb-6 bg-white/20 px-4 py-2 rounded-lg">
            <Text className="text-white text-sm">← Return</Text>
          </TouchableOpacity>
          <Text className="text-white text-3xl font-extrabold tracking-widest uppercase">{title}</Text>
        </View>

        <View className="flex-1 bg-white rounded-t-3xl px-8 pt-12 pb-10 h-screen">
          <View className="mb-6">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Username</Text>
            <TextInput
              className="border-b-2 border-gray-300 py-3 text-xl text-gray-800 font-medium"
              placeholder="Username"
              value={id}
              onChangeText={setId}
              autoCapitalize="none"
            />
          </View>
          <View className="mb-10">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Password</Text>
            <TextInput
              className="border-b-2 border-gray-300 py-3 text-xl text-gray-800 font-medium"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          <TouchableOpacity
            className={`${btnColor} rounded-lg py-5 items-center shadow-xl`}
            onPress={handleLogin}
          >
            <Text className="text-white text-base font-bold tracking-widest">AUTHENTICATE</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- DASHBOARDS ---
const Citizen = ({ goBack }) => (
  <SafeAreaView className="flex-1 bg-green-50 justify-center items-center">
    <Text className="text-2xl font-bold text-green-800">Citizen Dashboard</Text>
    <TouchableOpacity onPress={goBack} className="mt-5 bg-green-600 px-6 py-3 rounded-xl"><Text className="text-white">Logout</Text></TouchableOpacity>
  </SafeAreaView>
);
const Vehicle = ({ goBack }) => (
  <SafeAreaView className="flex-1 bg-amber-50 justify-center items-center">
    <Text className="text-2xl font-bold text-amber-800">Vehicle Dashboard</Text>
    <TouchableOpacity onPress={goBack} className="mt-5 bg-amber-600 px-6 py-3 rounded-xl"><Text className="text-white">Logout</Text></TouchableOpacity>
  </SafeAreaView>
);
const Admin = ({ goBack }) => (
  <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
    <Text className="text-2xl font-bold text-slate-800">Admin/Office Dashboard</Text>
    <TouchableOpacity onPress={goBack} className="mt-5 bg-slate-800 px-6 py-3 rounded-xl"><Text className="text-white">Logout</Text></TouchableOpacity>
  </SafeAreaView>
);

// --- MAIN APP ---
export default function App() {
  const [screen, setScreen] = useState("home");
  const [loading, setLoading] = useState(false);

  // ---------------------------------------------------------
  // 🔥 MIDDLEWARE LOGIC (ADDED HERE)
  // ---------------------------------------------------------
  const navigateWithGuard = async (targetDashboard, targetLogin) => {
    // 1. Token Check: Kya user pehle se login hai?
    const token = await AsyncStorage.getItem("token");
    const userStr = await AsyncStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;

    if (token && user) {
      // 2. Already Logged In: Role Check Karo
      const role = user.role;

      // -- Middleware: Protect Admin --
      if (targetDashboard === "adminPage" && role !== "admin" && role !== "office") {
        Alert.alert("Access Denied", "You are logged in, but not as Admin/Office.");
        return;
      }

      // -- Middleware: Protect Vehicle --
      if (targetDashboard === "vehicle" && role !== "vehicle") {
        Alert.alert("Access Denied", "You are logged in, but not as Vehicle Staff.");
        return;
      }

      // -- Middleware: Protect Citizen --
      if (targetDashboard === "citizen" && role !== "citizen") {
        // Optional: Allow or deny based on preference
      }

      // Role match ho gaya -> Direct Dashboard
      setScreen(targetDashboard);
    } else {
      // 3. Not Logged In -> Go to Login Page
      setScreen(targetLogin);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    setScreen("home");
  };

  if (loading) return <View className="flex-1 bg-white justify-center items-center"><ActivityIndicator /></View>;

  // --- NAVIGATION LOGIC ---
  if (screen === "citizen") return <Citizen goBack={handleLogout} />;
  if (screen === "vehicle") return <Vehicle goBack={handleLogout} />;
  if (screen === "adminPage") return <AdminPage goBack={handleLogout} />;
  if (screen === "admin") return <Admin goBack={handleLogout} />;
  if (screen === "register") return <UserRegister goBack={() => setScreen("citizenLogin")} />;

  // Login Screens
  if (screen === "citizenLogin") {
    return <CitizenLogin goBack={() => setScreen("home")} onLoginSuccess={(next) => setScreen(next)} onRegisterPress={() => setScreen("register")} />;
  }
  if (screen === "vehicleLogin") {
    return <VehicleLogin goBack={() => setScreen("home")} onLoginSuccess={(next) => setScreen(next)} />;
  }
  if (screen === "officeLogin") {
    return <AdminLogin isOffice={true} goBack={() => setScreen("home")} onLoginSuccess={(next) => setScreen(next)} />;
  }
  if (screen === "adminLogin") {
    return <AdminLogin isOffice={false} goBack={() => setScreen("home")} onLoginSuccess={(next) => setScreen(next)} />;
  }

  // --- HOME SCREEN ---
  const RoleButton = ({ title, icon, color, description, delay, targetDashboard, targetLogin }) => {
    return (
      <AnimatedCard delay={delay}>
        <TouchableOpacity
          // 🔥 UPDATED: Using Middleware on Press
          onPress={() => navigateWithGuard(targetDashboard, targetLogin)}
          activeOpacity={0.9}
          className="flex-row items-center bg-white p-4 rounded-2xl mb-4 shadow-sm border border-gray-100"
        >
          <View className={`w-14 h-14 rounded-2xl justify-center items-center mr-4 ${color}`}>
            <Text className="text-3xl">{icon}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-gray-900 text-lg font-bold">{title}</Text>
            <Text className="text-gray-500 text-xs mt-1">{description}</Text>
          </View>
          <View className="bg-gray-50 rounded-full p-2">
            <Text className="text-gray-400 font-bold">➔</Text>
          </View>
        </TouchableOpacity>
      </AnimatedCard>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-green-600">
      <StatusBar barStyle="light-content" backgroundColor="#166534" />
      <View className="pt-16 pb-10 px-6 bg-green-600">
        <View className="bg-white/20 self-start px-4 py-1 rounded-full mb-4">
          <Text className="text-white text-xs font-bold tracking-wider">SMART CITY INITIATIVE</Text>
        </View>
        <Text className="text-white text-4xl font-bold">SafaiMitra</Text>
        <Text className="text-green-100 text-base mt-2">Select your role to continue</Text>
      </View>

      <View className="flex-1 bg-gray-50 rounded-t-[40px] px-6 pt-10 shadow-2xl">
        <Text className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-6 ml-2">Public Access</Text>

        {/* 🔥 UPDATED BUTTONS TO PASS DASHBOARD AND LOGIN TARGETS */}
        <RoleButton
          title="Citizen"
          description="Complaints & Status"
          icon="👤"
          color="bg-green-100"
          targetDashboard="citizen"
          targetLogin="citizenLogin"
          delay={100}
        />

        <Text className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-6 mt-4 ml-2">Staff Access</Text>

        <RoleButton
          title="Vehicle Staff"
          description="Drivers & Helpers"
          icon="🚛"
          color="bg-amber-100"
          targetDashboard="vehicle"
          targetLogin="vehicleLogin"
          delay={200}
        />
        <RoleButton
          title="Office"
          description="Staff Ops"
          icon="🏢"
          color="bg-indigo-100"
          targetDashboard="adminPage"
          targetLogin="officeLogin"
          delay={300}
        />
        <RoleButton
          title="Admin"
          description="Control"
          icon="🔐"
          color="bg-slate-200"
          targetDashboard="adminPage"
          targetLogin="adminLogin"
          delay={400}
        />

        <TouchableOpacity onPress={handleLogout} className="mt-auto mb-6 items-center">
          <Text className="text-gray-400 text-xs">Reset / Logout All Sessions</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}