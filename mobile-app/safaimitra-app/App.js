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
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Location from "expo-location";
import {
  User,
  Lock,
  Phone,
  Mail,
  MapPin,
  Building2,
  Truck,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  ChevronLeft,
  Sparkles,
  Navigation,
  Compass,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  UserPlus,
  Shield,
} from "lucide-react-native";

import AdminPage from "./screens/Admin/Admin";
import OfficeDashboard from "./screens/Office/Office";
import StaffDashboard from "./screens/Staff/Staff";
import CitizenDashboard from "./screens/Citizen/Citizen";
import UserRegister from "./screens/userRegister";

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || "https://api.safaimitra.online").replace(/\/+$/, "");

// =========================================================================
// 🌟 FLUID SPRING ANIMATION & TOUCH FEEDBACK
// =========================================================================
const FadeInView = ({ children, delay = 0, style }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
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
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

const FloatingBadge = ({ children, delay = 0 }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -4,
          duration: 1500,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
      {children}
    </Animated.View>
  );
};

const ScalePressable = ({ onPress, children, style, disabled = false, activeOpacity = 0.88 }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 100,
      friction: 6,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 5,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={activeOpacity}
        disabled={disabled}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// =========================================================================
// 🔐 CORE STRICT LOGIN LOGIC
// =========================================================================
const processStrictLogin = async (
  username,
  password,
  endpoint,
  expectedRole,
  onSuccess
) => {
  if (!username || !password) {
    Alert.alert("Missing Information", "Please enter your ID/Username and Password");
    return;
  }

  const fullUrl = `${API_BASE_URL}${endpoint}`;

  try {
    const res = await axios.post(
      fullUrl,
      { username, password },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    );

    if (res.data.success) {
      const { token, user } = res.data;
      const actualRole = user.role ? user.role.toLowerCase() : "";

      let isAuthorized = false;
      if (expectedRole === "admin" && actualRole === "admin") isAuthorized = true;
      else if (expectedRole === "office" && actualRole === "office") isAuthorized = true;
      else if (expectedRole === "citizen" && actualRole === "citizen") isAuthorized = true;
      else if (
        expectedRole === "vehicle" &&
        ["driver", "helper", "supervisor"].includes(actualRole)
      ) {
        isAuthorized = true;
      }

      if (actualRole === "admin" && expectedRole === "office") isAuthorized = true;

      if (!isAuthorized) {
        Alert.alert(
          "Access Denied",
          `You cannot login as ${expectedRole.toUpperCase()} with role: ${actualRole}`
        );
        return;
      }

      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("user", JSON.stringify(user));
      await AsyncStorage.setItem("role", user.role || expectedRole);
      if (user.id || user._id) {
        await AsyncStorage.setItem("userId", (user.id || user._id).toString());
      }
      if (user.officeId) {
        await AsyncStorage.setItem("officeId", user.officeId.toString());
      }

      Alert.alert("Welcome Back! 🎉", `Logged in as ${user.name || user.fullName || "User"}`);

      if (expectedRole === "admin") {
        onSuccess("adminDashboard");
      } else if (expectedRole === "office") {
        onSuccess("officeDashboard");
      } else if (expectedRole === "vehicle") {
        onSuccess("vehicle");
      } else {
        onSuccess("citizen");
      }
    } else {
      Alert.alert("Login Failed", res.data.message || "Invalid credentials.");
    }
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    Alert.alert(
      "Connection Error",
      err.response?.data?.message || "Could not reach SafaiMitra server. Please verify network."
    );
  }
};

// =========================================================================
// 🚛 VEHICLE STAFF LOGIN VIEW
// =========================================================================
const VehicleLoginScreen = ({ goBack, onLoginSuccess }) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const containerMaxWidth = isTablet ? 500 : "100%";

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    await processStrictLogin(id, password, "/staff/login", "vehicle", onLoginSuccess);
    setLoading(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFDF7" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFDF7" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40, alignItems: "center" }}
        >
          <View style={{ width: "100%", maxWidth: containerMaxWidth }}>
            {/* Navigation */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
              <ScalePressable
                onPress={goBack}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 14,
                  backgroundColor: "#FFFFFF",
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1.5,
                  borderColor: "#FDE68A",
                  shadowColor: "#D97706",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <ChevronLeft size={18} color="#D97706" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#D97706" }}>Citizen Portal</Text>
              </ScalePressable>

              <View style={{ backgroundColor: "#FEF3C7", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "#FCD34D" }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#B45309" }}>FIELD CREW</Text>
              </View>
            </View>

            {/* Hero */}
            <FadeInView delay={100} style={{ paddingHorizontal: 24, marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <FloatingBadge delay={150}>
                  <LinearGradient
                    colors={["#F97316", "#EA580C"]}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 18,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 14,
                      shadowColor: "#EA580C",
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.35,
                      shadowRadius: 12,
                      elevation: 6,
                    }}
                  >
                    <Truck size={28} color="#FFFFFF" />
                  </LinearGradient>
                </FloatingBadge>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 24, fontWeight: "900", color: "#7C2D12", letterSpacing: -0.4 }}>
                    Vehicle Staff Portal
                  </Text>
                  <Text style={{ fontSize: 13, color: "#9A3412", fontWeight: "600", marginTop: 2 }}>
                    Driver navigation & route pickups
                  </Text>
                </View>
              </View>
            </FadeInView>

            {/* Form Card */}
            <FadeInView delay={200} style={{ paddingHorizontal: 20 }}>
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 24,
                  padding: 22,
                  borderWidth: 1.5,
                  borderColor: "#FDE68A",
                  shadowColor: "#B45309",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.08,
                  shadowRadius: 20,
                  elevation: 4,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 6 }}>
                  Staff ID / Phone Number
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 3, marginBottom: 16 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#FEF3C7", justifyContent: "center", alignItems: "center", marginRight: 10 }}>
                    <Phone size={17} color="#D97706" />
                  </View>
                  <TextInput
                    style={{ flex: 1, fontSize: 15, fontWeight: "600", color: "#0F172A" }}
                    placeholder="Enter registered staff ID"
                    placeholderTextColor="#94A3B8"
                    value={id}
                    onChangeText={setId}
                    keyboardType="numeric"
                  />
                </View>

                <Text style={{ fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 6 }}>
                  Password
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 3, marginBottom: 20 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#FEF3C7", justifyContent: "center", alignItems: "center", marginRight: 10 }}>
                    <Lock size={17} color="#D97706" />
                  </View>
                  <TextInput
                    style={{ flex: 1, fontSize: 15, fontWeight: "600", color: "#0F172A" }}
                    placeholder="Enter password"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                    {showPassword ? <EyeOff size={18} color="#64748B" /> : <Eye size={18} color="#64748B" />}
                  </TouchableOpacity>
                </View>

                <ScalePressable onPress={handleLogin} disabled={loading}>
                  <LinearGradient
                    colors={["#F97316", "#EA580C"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      borderRadius: 18,
                      paddingVertical: 15,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      shadowColor: "#EA580C",
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.35,
                      shadowRadius: 12,
                      elevation: 5,
                    }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: "#FFFFFF", marginRight: 8 }}>
                          Start Collection Duty
                        </Text>
                        <ArrowRight size={18} color="#FFFFFF" />
                      </>
                    )}
                  </LinearGradient>
                </ScalePressable>
              </View>
            </FadeInView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// =========================================================================
// 🏢 OFFICE / ADMIN UNIFIED PORTAL LOGIN VIEW
// =========================================================================
const OfficeAdminLoginScreen = ({ goBack, onLoginSuccess }) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const containerMaxWidth = isTablet ? 500 : "100%";

  const [roleTab, setRoleTab] = useState("office"); // "office" or "admin"
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const endpoint = roleTab === "office" ? "/office/login" : "/admin/login";
    await processStrictLogin(id, password, endpoint, roleTab, onLoginSuccess);
    setLoading(false);
  };

  const isOffice = roleTab === "office";
  const accentGradient = isOffice ? ["#6366F1", "#4F46E5"] : ["#334155", "#0F172A"];
  const accentColor = isOffice ? "#4F46E5" : "#0F172A";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAFAFF" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFF" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40, alignItems: "center" }}
        >
          <View style={{ width: "100%", maxWidth: containerMaxWidth }}>
            {/* Navigation */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
              <ScalePressable
                onPress={goBack}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 14,
                  backgroundColor: "#FFFFFF",
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1.5,
                  borderColor: "#E0E7FF",
                  shadowColor: "#4F46E5",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <ChevronLeft size={18} color="#4F46E5" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#4F46E5" }}>Citizen Portal</Text>
              </ScalePressable>

              <View style={{ backgroundColor: "#EEF2FF", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "#C7D2FE" }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#4338CA" }}>ADMIN / MUNICIPAL</Text>
              </View>
            </View>

            {/* Hero Title */}
            <FadeInView delay={100} style={{ paddingHorizontal: 24, marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <FloatingBadge delay={200}>
                  <LinearGradient
                    colors={accentGradient}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 18,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 14,
                      shadowColor: accentColor,
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.35,
                      shadowRadius: 12,
                      elevation: 6,
                    }}
                  >
                    {isOffice ? <Building2 size={28} color="#FFFFFF" /> : <ShieldCheck size={28} color="#FFFFFF" />}
                  </LinearGradient>
                </FloatingBadge>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 24, fontWeight: "900", color: "#1E1B4B", letterSpacing: -0.4 }}>
                    Office / Admin Portal
                  </Text>
                  <Text style={{ fontSize: 13, color: "#4338CA", fontWeight: "600", marginTop: 2 }}>
                    Management & monitoring dashboard
                  </Text>
                </View>
              </View>
            </FadeInView>

            {/* Role Segment Switcher */}
            <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
              <View style={{ flexDirection: "row", backgroundColor: "#E0E7FF", borderRadius: 16, padding: 4 }}>
                <TouchableOpacity
                  onPress={() => setRoleTab("office")}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: isOffice ? "#FFFFFF" : "transparent",
                    alignItems: "center",
                    shadowColor: isOffice ? "#000" : "transparent",
                    shadowOpacity: isOffice ? 0.08 : 0,
                    shadowRadius: 4,
                    elevation: isOffice ? 2 : 0,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "800", color: isOffice ? "#4338CA" : "#6366F1" }}>
                    🏢 Office Staff
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setRoleTab("admin")}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: !isOffice ? "#FFFFFF" : "transparent",
                    alignItems: "center",
                    shadowColor: !isOffice ? "#000" : "transparent",
                    shadowOpacity: !isOffice ? 0.08 : 0,
                    shadowRadius: 4,
                    elevation: !isOffice ? 2 : 0,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "800", color: !isOffice ? "#0F172A" : "#6366F1" }}>
                    🔐 System Admin
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Form Card */}
            <FadeInView delay={200} style={{ paddingHorizontal: 20 }}>
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 24,
                  padding: 22,
                  borderWidth: 1.5,
                  borderColor: isOffice ? "#C7D2FE" : "#CBD5E1",
                  shadowColor: accentColor,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.08,
                  shadowRadius: 20,
                  elevation: 4,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 6 }}>
                  {isOffice ? "Official Username / Email" : "Admin ID / Username"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 3, marginBottom: 16 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isOffice ? "#EEF2FF" : "#F1F5F9", justifyContent: "center", alignItems: "center", marginRight: 10 }}>
                    <User size={17} color={accentColor} />
                  </View>
                  <TextInput
                    style={{ flex: 1, fontSize: 15, fontWeight: "600", color: "#0F172A" }}
                    placeholder="Enter credentials"
                    placeholderTextColor="#94A3B8"
                    value={id}
                    onChangeText={setId}
                  />
                </View>

                <Text style={{ fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 6 }}>
                  Security Password
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 3, marginBottom: 20 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isOffice ? "#EEF2FF" : "#F1F5F9", justifyContent: "center", alignItems: "center", marginRight: 10 }}>
                    <Lock size={17} color={accentColor} />
                  </View>
                  <TextInput
                    style={{ flex: 1, fontSize: 15, fontWeight: "600", color: "#0F172A" }}
                    placeholder="Enter secret password"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                    {showPassword ? <EyeOff size={18} color="#64748B" /> : <Eye size={18} color="#64748B" />}
                  </TouchableOpacity>
                </View>

                <ScalePressable onPress={handleLogin} disabled={loading}>
                  <LinearGradient
                    colors={accentGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      borderRadius: 18,
                      paddingVertical: 15,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      shadowColor: accentColor,
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.35,
                      shadowRadius: 12,
                      elevation: 5,
                    }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: "#FFFFFF", marginRight: 8 }}>
                          Authenticate Session
                        </Text>
                        <ArrowRight size={18} color="#FFFFFF" />
                      </>
                    )}
                  </LinearGradient>
                </ScalePressable>
              </View>
            </FadeInView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// =========================================================================
// 🌿 MAIN HOME SCREEN - DEFAULT CITIZEN LOGIN (EXACT MATCH TO REFERENCE)
// =========================================================================
export default function App() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const containerMaxWidth = isTablet ? 500 : "100%";
  const heroArtWidth = Math.min(width * 0.4, 150);

  const [screen, setScreen] = useState("home");
  const [loading, setLoading] = useState(false);

  // Citizen Login / Register Tab
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [citizenPhone, setCitizenPhone] = useState("7488308179");
  const [citizenPassword, setCitizenPassword] = useState("123456789012");
  const [showCitizenPassword, setShowCitizenPassword] = useState(false);
  const [citizenLoading, setCitizenLoading] = useState(false);

  // Registration States
  const [officeList, setOfficeList] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [regData, setRegData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    address: "",
    latitude: "",
    longitude: "",
    city: "",
    pincode: "",
    officeId: "",
    cityName: "",
  });

  const fetchOffices = async () => {
    setLoadingCities(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/public-list`);
      if (res.data && res.data.success) {
        setOfficeList(res.data.cities || []);
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
    } finally {
      setLoadingCities(false);
    }
  };

  useEffect(() => {
    if (!isLoginTab && officeList.length === 0) {
      fetchOffices();
      if (!regData.latitude && !regData.longitude) {
        fetchCurrentLocation();
      }
    }
  }, [isLoginTab]);

  const fetchCurrentLocation = async () => {
    setLocationLoading(true);
    setLocationError("");
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("GPS permission was denied.");
        setLocationLoading(false);
        return;
      }
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setRegData((prev) => ({
        ...prev,
        latitude: location.coords.latitude.toFixed(6),
        longitude: location.coords.longitude.toFixed(6),
      }));
    } catch (error) {
      console.error("Location Error:", error);
      setLocationError("Enable GPS and retry.");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleCitizenLogin = async () => {
    if (!citizenPhone || !citizenPassword) {
      Alert.alert("Missing Details", "Please enter Phone Number and Password.");
      return;
    }
    setCitizenLoading(true);
    const fullUrl = `${API_BASE_URL}/citizen/login`;

    try {
      const res = await axios.post(
        fullUrl,
        { username: citizenPhone, password: citizenPassword },
        { headers: { "Content-Type": "application/json" }, timeout: 10000 }
      );

      if (res.data.success) {
        const { token, user } = res.data;
        await AsyncStorage.setItem("token", token);
        await AsyncStorage.setItem("user", JSON.stringify(user));
        await AsyncStorage.setItem("userId", (user.id || user._id).toString());
        await AsyncStorage.setItem("role", "Citizen");
        if (user.officeId) {
          await AsyncStorage.setItem("officeId", user.officeId.toString());
        }

        Alert.alert("Welcome! 🎉", `Signed in as ${user.name || user.fullName || "Citizen"}`);
        setScreen("citizen");
      } else {
        Alert.alert("Authentication Failed", res.data.message || "Invalid credentials.");
      }
    } catch (err) {
      console.error("Citizen Login Error:", err);
      Alert.alert("Login Error", err.response?.data?.message || "Could not connect to SafaiMitra server.");
    } finally {
      setCitizenLoading(false);
    }
  };

  const handleCitizenRegister = async () => {
    if (regData.password !== regData.confirmPassword) {
      Alert.alert("Validation Error", "Passwords do not match!");
      return;
    }
    if (!regData.latitude || !regData.longitude) {
      Alert.alert("Location Required", "Please allow GPS location detection.");
      return;
    }
    if (!regData.officeId) {
      Alert.alert("City Required", "Please select your city jurisdiction.");
      return;
    }
    if (
      !regData.fullName ||
      !regData.email ||
      !regData.phone ||
      !regData.password ||
      !regData.address ||
      !regData.pincode
    ) {
      Alert.alert("Required Fields", "Please complete all mandatory fields marked with *");
      return;
    }

    setCitizenLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/citizen/register`, {
        fullName: regData.fullName,
        email: regData.email,
        phone: regData.phone,
        password: regData.password,
        address: regData.address,
        latitude: parseFloat(regData.latitude),
        longitude: parseFloat(regData.longitude),
        city: regData.cityName,
        pincode: regData.pincode,
        officeId: regData.officeId,
        cityName: regData.cityName,
      });

      if (res.data && res.data.success) {
        Alert.alert("Account Created! 🎉", "Your citizen profile is registered. Please sign in.");
        setIsLoginTab(true);
        setCitizenPhone(regData.phone);
        setRegData({
          fullName: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
          address: "",
          latitude: "",
          longitude: "",
          city: "",
          pincode: "",
          officeId: "",
          cityName: "",
        });
      } else {
        Alert.alert("Registration Failed", res.data?.message || "Failed to register.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert("Registration Error", error.response?.data?.message || "Server communication failed.");
    } finally {
      setCitizenLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    setScreen("home");
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  // Dashboard Routers
  if (screen === "adminDashboard") return <AdminPage isOffice={false} goBack={handleLogout} />;
  if (screen === "officeDashboard") return <OfficeDashboard isOffice={true} goBack={handleLogout} />;
  if (screen === "citizen") return <CitizenDashboard goBack={handleLogout} />;
  if (screen === "vehicle") return <StaffDashboard goBack={handleLogout} />;
  if (screen === "register") return <UserRegister goBack={() => setScreen("home")} />;

  // Specialized Login Screens
  if (screen === "vehicleLogin") {
    return <VehicleLoginScreen goBack={() => setScreen("home")} onLoginSuccess={(next) => setScreen(next)} />;
  }
  if (screen === "officeAdminLogin") {
    return <OfficeAdminLoginScreen goBack={() => setScreen("home")} onLoginSuccess={(next) => setScreen(next)} />;
  }

  // =========================================================================
  // 🌟 MAIN SCREEN: FULL RESPONSIVE PIXEL-PERFECT LAYOUT
  // =========================================================================
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FBFC" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FBFC" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 36, alignItems: "center" }}
        >
          <View style={{ width: "100%", maxWidth: containerMaxWidth }}>
            {/* 1. TOP STATUS BADGES */}
            <FadeInView delay={30} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 }}>
              {/* Live Network Active Pill */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#ECFDF5",
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  borderWidth: 1.2,
                  borderColor: "#A7F3D0",
                }}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981", marginRight: 7 }} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#065F46" }}>
                  Live Network Active
                </Text>
              </View>

              {/* Swachh Bharat 2.0 Pill */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#F5F3FF",
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  borderWidth: 1.2,
                  borderColor: "#DDD6FE",
                }}
              >
                <Sparkles size={13} color="#7C3AED" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#6D28D9" }}>
                  Swachh Bharat 2.0
                </Text>
              </View>
            </FadeInView>

            {/* 2. HERO BRANDING & ILLUSTRATION HEADER */}
            <FadeInView delay={80} style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                {/* Left Brand Details */}
                <View style={{ flex: 1, paddingRight: 8 }}>
                  {/* Floating Elevated Logo */}
                  <FloatingBadge delay={0}>
                    <View
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: 18,
                        backgroundColor: "#FFFFFF",
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: 12,
                        shadowColor: "#059669",
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.15,
                        shadowRadius: 12,
                        elevation: 5,
                        borderWidth: 1,
                        borderColor: "#ECFDF5",
                        overflow: "hidden",
                      }}
                    >
                      <Image
                        source={require("./assets/logoapp.png")}
                        style={{ width: 52, height: 52, borderRadius: 14 }}
                        resizeMode="contain"
                      />
                    </View>
                  </FloatingBadge>

                  {/* Brand Title */}
                  <Text style={{ fontSize: 32, fontWeight: "900", letterSpacing: -0.8, lineHeight: 38 }}>
                    <Text style={{ color: "#059669" }}>Safai</Text>
                    <Text style={{ color: "#0F172A" }}>mitra</Text>
                  </Text>

                  {/* Subtitle */}
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#334155", marginTop: 4, lineHeight: 20 }}>
                    Smart Civic Waste &{"\n"}Sanitation Platform
                  </Text>

                  {/* Tagline */}
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#059669", flexShrink: 1 }}>
                      🍃 Cleaner City • Better Tomorrow
                    </Text>
                  </View>
                </View>

                {/* Right Hero Visual Representation (City & Crew Artwork) */}
                <View
                  style={{
                    width: heroArtWidth,
                    height: 140,
                    borderRadius: 24,
                    overflow: "hidden",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <LinearGradient
                    colors={["#D1FAE5", "#ECFDF5", "#E0F2FE"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 24,
                      padding: 12,
                      justifyContent: "center",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#A7F3D0",
                    }}
                  >
                    <Text style={{ fontSize: 34, marginBottom: 4 }}>👥 🗑️</Text>
                    <View style={{ backgroundColor: "#FFFFFF", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: "#047857" }}>Clean City Team</Text>
                    </View>
                  </LinearGradient>
                </View>
              </View>
            </FadeInView>

            {/* 3. MAIN CITIZEN PORTAL CARD */}
            <FadeInView delay={140} style={{ paddingHorizontal: 18, marginBottom: 20 }}>
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 28,
                  padding: 20,
                  borderWidth: 1.2,
                  borderColor: "#F1F5F9",
                  shadowColor: "#0F172A",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.07,
                  shadowRadius: 24,
                  elevation: 5,
                }}
              >
                {/* Card Header */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
                    <LinearGradient
                      colors={["#059669", "#10B981"]}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                      }}
                    >
                      <User size={22} color="#FFFFFF" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>
                        Citizen Portal
                      </Text>
                      <Text style={{ fontSize: 12, color: "#059669", fontWeight: "700" }}>
                        Default Public Access
                      </Text>
                    </View>
                  </View>

                  {/* PUBLIC Badge */}
                  <View
                    style={{
                      backgroundColor: "#DCFCE7",
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#166534", letterSpacing: 0.5 }}>
                      PUBLIC
                    </Text>
                  </View>
                </View>

                {/* Segmented Tab Switcher */}
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: "#F1F5F9",
                    borderRadius: 16,
                    padding: 4,
                    marginBottom: 18,
                  }}
                >
                  {/* Active Sign In Tab */}
                  <TouchableOpacity
                    onPress={() => setIsLoginTab(true)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 13,
                      backgroundColor: isLoginTab ? "#FFFFFF" : "transparent",
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      shadowColor: isLoginTab ? "#000" : "transparent",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isLoginTab ? 0.08 : 0,
                      shadowRadius: 4,
                      elevation: isLoginTab ? 2 : 0,
                    }}
                  >
                    <Text style={{ fontSize: 14, marginRight: 6 }}>🌿</Text>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: isLoginTab ? "#065F46" : "#64748B" }}>
                      Sign In
                    </Text>
                  </TouchableOpacity>

                  {/* Create Account Tab */}
                  <TouchableOpacity
                    onPress={() => setIsLoginTab(false)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 13,
                      backgroundColor: !isLoginTab ? "#FFFFFF" : "transparent",
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      shadowColor: !isLoginTab ? "#000" : "transparent",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: !isLoginTab ? 0.08 : 0,
                      shadowRadius: 4,
                      elevation: !isLoginTab ? 2 : 0,
                    }}
                  >
                    <UserPlus size={15} color={!isLoginTab ? "#065F46" : "#64748B"} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 13, fontWeight: "800", color: !isLoginTab ? "#065F46" : "#64748B" }}>
                      Create Account
                    </Text>
                  </TouchableOpacity>
                </View>

                {isLoginTab ? (
                  /* ================= SIGN IN TAB ================= */
                  <View>
                    {/* Phone Number Field */}
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 6 }}>
                      Phone Number
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#FFFFFF",
                        borderRadius: 18,
                        borderWidth: 1.5,
                        borderColor: "#E2E8F0",
                        paddingHorizontal: 12,
                        paddingVertical: Platform.OS === "ios" ? 11 : 3,
                        marginBottom: 16,
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: "#ECFDF5",
                          justifyContent: "center",
                          alignItems: "center",
                          marginRight: 10,
                        }}
                      >
                        <Phone size={17} color="#059669" />
                      </View>
                      <TextInput
                        style={{ flex: 1, fontSize: 15, fontWeight: "700", color: "#0F172A" }}
                        placeholder="Enter 10-digit phone"
                        placeholderTextColor="#94A3B8"
                        value={citizenPhone}
                        onChangeText={setCitizenPhone}
                        keyboardType="phone-pad"
                      />
                      <CheckCircle2 size={19} color="#10B981" />
                    </View>

                    {/* Password Field */}
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 6 }}>
                      Password
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#FFFFFF",
                        borderRadius: 18,
                        borderWidth: 1.5,
                        borderColor: "#E2E8F0",
                        paddingHorizontal: 12,
                        paddingVertical: Platform.OS === "ios" ? 11 : 3,
                        marginBottom: 8,
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: "#ECFDF5",
                          justifyContent: "center",
                          alignItems: "center",
                          marginRight: 10,
                        }}
                      >
                        <Lock size={17} color="#059669" />
                      </View>
                      <TextInput
                        style={{ flex: 1, fontSize: 16, fontWeight: "700", color: "#0F172A", letterSpacing: 2 }}
                        placeholder="Enter password"
                        placeholderTextColor="#94A3B8"
                        value={citizenPassword}
                        onChangeText={setCitizenPassword}
                        secureTextEntry={!showCitizenPassword}
                      />
                      <TouchableOpacity onPress={() => setShowCitizenPassword(!showCitizenPassword)} style={{ padding: 4 }}>
                        {showCitizenPassword ? <EyeOff size={19} color="#64748B" /> : <Eye size={19} color="#64748B" />}
                      </TouchableOpacity>
                    </View>

                    {/* Forgot Password Link */}
                    <TouchableOpacity
                      onPress={() => Alert.alert("Password Reset", "Please contact your Municipal Administrator or use registered OTP.")}
                      style={{ alignSelf: "flex-end", marginBottom: 18 }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#059669" }}>
                        Forgot Password?
                      </Text>
                    </TouchableOpacity>

                    {/* Sign In as Citizen CTA Button */}
                    <ScalePressable onPress={handleCitizenLogin} disabled={citizenLoading}>
                      <LinearGradient
                        colors={["#059669", "#0D9488"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          borderRadius: 20,
                          paddingVertical: 16,
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "row",
                          shadowColor: "#059669",
                          shadowOffset: { width: 0, height: 8 },
                          shadowOpacity: 0.35,
                          shadowRadius: 14,
                          elevation: 5,
                        }}
                      >
                        {citizenLoading ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            <Text style={{ fontSize: 16, fontWeight: "800", color: "#FFFFFF", marginRight: 8 }}>
                              Sign In as Citizen
                            </Text>
                            <ArrowRight size={18} color="#FFFFFF" />
                          </>
                        )}
                      </LinearGradient>
                    </ScalePressable>
                  </View>
                ) : (
                  /* ================= CREATE ACCOUNT TAB ================= */
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 6 }}>Full Name *</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 11 : 3, marginBottom: 12 }}>
                      <User size={18} color="#059669" style={{ marginRight: 8 }} />
                      <TextInput
                        style={{ flex: 1, fontSize: 14, fontWeight: "600", color: "#0F172A" }}
                        placeholder="e.g. Rahul Sharma"
                        placeholderTextColor="#94A3B8"
                        value={regData.fullName}
                        onChangeText={(val) => setRegData({ ...regData, fullName: val })}
                        autoCapitalize="words"
                      />
                    </View>

                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 6 }}>Phone Number *</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 11 : 3, marginBottom: 12 }}>
                      <Phone size={18} color="#059669" style={{ marginRight: 8 }} />
                      <TextInput
                        style={{ flex: 1, fontSize: 14, fontWeight: "600", color: "#0F172A" }}
                        placeholder="10-digit mobile number"
                        placeholderTextColor="#94A3B8"
                        value={regData.phone}
                        onChangeText={(val) => setRegData({ ...regData, phone: val })}
                        keyboardType="phone-pad"
                      />
                    </View>

                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 6 }}>Email Address *</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 11 : 3, marginBottom: 12 }}>
                      <Mail size={18} color="#059669" style={{ marginRight: 8 }} />
                      <TextInput
                        style={{ flex: 1, fontSize: 14, fontWeight: "600", color: "#0F172A" }}
                        placeholder="rahul@example.com"
                        placeholderTextColor="#94A3B8"
                        value={regData.email}
                        onChangeText={(val) => setRegData({ ...regData, email: val })}
                        keyboardType="email-address"
                      />
                    </View>

                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 6 }}>Residential Address *</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 11 : 3, marginBottom: 12 }}>
                      <Building2 size={18} color="#059669" style={{ marginRight: 8 }} />
                      <TextInput
                        style={{ flex: 1, fontSize: 14, fontWeight: "600", color: "#0F172A" }}
                        placeholder="House No, Street, Colony"
                        placeholderTextColor="#94A3B8"
                        value={regData.address}
                        onChangeText={(val) => setRegData({ ...regData, address: val })}
                      />
                    </View>

                    {/* City Selector */}
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 6 }}>Municipal Corporation *</Text>
                    <View style={{ backgroundColor: "#F8FAFC", borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", overflow: "hidden", marginBottom: 12 }}>
                      {loadingCities ? (
                        <View style={{ padding: 12, flexDirection: "row", alignItems: "center" }}>
                          <ActivityIndicator size="small" color="#10B981" />
                          <Text style={{ marginLeft: 8, color: "#64748B", fontSize: 13 }}>Loading cities...</Text>
                        </View>
                      ) : (
                        <Picker
                          selectedValue={regData.officeId}
                          onValueChange={(itemValue, itemIndex) => {
                            if (itemIndex > 0) {
                              const selectedObj = officeList[itemIndex - 1];
                              setRegData({
                                ...regData,
                                officeId: itemValue,
                                cityName: selectedObj ? selectedObj.name : "",
                              });
                            } else {
                              setRegData({ ...regData, officeId: "", cityName: "" });
                            }
                          }}
                          style={{ color: "#0F172A" }}
                        >
                          <Picker.Item label="-- Select City / Corporation --" value="" color="#94A3B8" />
                          {officeList.map((office) => (
                            <Picker.Item key={office.id} label={`📍 ${office.name}`} value={office.id} />
                          ))}
                        </Picker>
                      )}
                    </View>

                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 6 }}>Pincode *</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 11 : 3, marginBottom: 12 }}>
                      <MapPin size={18} color="#059669" style={{ marginRight: 8 }} />
                      <TextInput
                        style={{ flex: 1, fontSize: 14, fontWeight: "600", color: "#0F172A" }}
                        placeholder="e.g. 452001"
                        placeholderTextColor="#94A3B8"
                        value={regData.pincode}
                        onChangeText={(val) => setRegData({ ...regData, pincode: val })}
                        keyboardType="numeric"
                      />
                    </View>

                    {/* GPS Auto Detector */}
                    <View style={{ backgroundColor: "#F0FDF4", padding: 12, borderRadius: 16, borderWidth: 1, borderColor: "#BBF7D0", marginBottom: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Navigation size={15} color="#059669" />
                          <Text style={{ fontSize: 12, fontWeight: "800", color: "#065F46", marginLeft: 6 }}>
                            Auto GPS Verification
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={fetchCurrentLocation}
                          disabled={locationLoading}
                          style={{ backgroundColor: "#10B981", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, flexDirection: "row", alignItems: "center" }}
                        >
                          {locationLoading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <>
                              <RefreshCw size={11} color="#FFF" style={{ marginRight: 4 }} />
                              <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "800" }}>Detect GPS</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                      {regData.latitude && regData.longitude ? (
                        <Text style={{ fontSize: 11, color: "#166534", fontWeight: "700" }}>
                          📍 Coordinates: {regData.latitude}, {regData.longitude}
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 11, color: "#059669" }}>
                          Tap &apos;Detect GPS&apos; to link your residential coordinates.
                        </Text>
                      )}
                    </View>

                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 6 }}>Password *</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 11 : 3, marginBottom: 12 }}>
                      <Lock size={18} color="#059669" style={{ marginRight: 8 }} />
                      <TextInput
                        style={{ flex: 1, fontSize: 14, fontWeight: "600", color: "#0F172A" }}
                        placeholder="Min 6 characters"
                        placeholderTextColor="#94A3B8"
                        value={regData.password}
                        onChangeText={(val) => setRegData({ ...regData, password: val })}
                        secureTextEntry
                      />
                    </View>

                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 6 }}>Confirm Password *</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 11 : 3, marginBottom: 16 }}>
                      <ShieldCheck size={18} color="#059669" style={{ marginRight: 8 }} />
                      <TextInput
                        style={{ flex: 1, fontSize: 14, fontWeight: "600", color: "#0F172A" }}
                        placeholder="Re-enter password"
                        placeholderTextColor="#94A3B8"
                        value={regData.confirmPassword}
                        onChangeText={(val) => setRegData({ ...regData, confirmPassword: val })}
                        secureTextEntry
                      />
                    </View>

                    <ScalePressable onPress={handleCitizenRegister} disabled={citizenLoading}>
                      <LinearGradient
                        colors={["#059669", "#0D9488"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          borderRadius: 18,
                          paddingVertical: 15,
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "row",
                          shadowColor: "#059669",
                          shadowOffset: { width: 0, height: 6 },
                          shadowOpacity: 0.35,
                          shadowRadius: 12,
                          elevation: 5,
                        }}
                      >
                        {citizenLoading ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            <Text style={{ fontSize: 16, fontWeight: "800", color: "#FFFFFF", marginRight: 8 }}>
                              Register Citizen Account
                            </Text>
                            <CheckCircle2 size={18} color="#FFFFFF" />
                          </>
                        )}
                      </LinearGradient>
                    </ScalePressable>
                  </View>
                )}
              </View>
            </FadeInView>

            {/* 4. OTHER SPECIALIZED PORTALS SECTION DIVIDER */}
            <FadeInView delay={180} style={{ paddingHorizontal: 20, marginBottom: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1, height: 1, backgroundColor: "#E2E8F0" }} />
                <Text style={{ paddingHorizontal: 12, fontSize: 11, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.8 }}>
                  OTHER SPECIALIZED PORTALS
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: "#E2E8F0" }} />
              </View>
            </FadeInView>

            {/* 5. SPECIALIZED PORTAL CARDS */}
            <View style={{ paddingHorizontal: 18 }}>
              {/* Card 1: Vehicle Staff Portal */}
              <FadeInView delay={220} style={{ marginBottom: 14 }}>
                <ScalePressable
                  onPress={() => setScreen("vehicleLogin")}
                  style={{
                    backgroundColor: "#FFFDF7",
                    borderRadius: 22,
                    padding: 16,
                    borderWidth: 1.5,
                    borderColor: "#FDE68A",
                    shadowColor: "#D97706",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    elevation: 3,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  {/* Orange Circle Icon */}
                  <LinearGradient
                    colors={["#F97316", "#EA580C"]}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 14,
                      shadowColor: "#EA580C",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 8,
                      elevation: 3,
                    }}
                  >
                    <Truck size={24} color="#FFFFFF" />
                  </LinearGradient>

                  {/* Content */}
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                      <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A", marginRight: 6 }}>
                        Vehicle Staff Portal
                      </Text>
                      <View style={{ backgroundColor: "#FEF3C7", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: "#C2410C" }}>FIELD CREW</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "600" }}>
                      Driver navigation & route pickups
                    </Text>
                  </View>

                  {/* Right Arrow Button */}
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: "#FFFFFF",
                      borderWidth: 1.2,
                      borderColor: "#FED7AA",
                      justifyContent: "center",
                      alignItems: "center",
                      shadowColor: "#000",
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: 1,
                    }}
                  >
                    <ArrowRight size={17} color="#EA580C" />
                  </View>
                </ScalePressable>
              </FadeInView>

              {/* Card 2: Office/Admin Portal */}
              <FadeInView delay={280} style={{ marginBottom: 18 }}>
                <ScalePressable
                  onPress={() => setScreen("officeAdminLogin")}
                  style={{
                    backgroundColor: "#FAFAFF",
                    borderRadius: 22,
                    padding: 16,
                    borderWidth: 1.5,
                    borderColor: "#E0E7FF",
                    shadowColor: "#4F46E5",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    elevation: 3,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  {/* Indigo Circle Icon */}
                  <LinearGradient
                    colors={["#6366F1", "#4F46E5"]}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 14,
                      shadowColor: "#4F46E5",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 8,
                      elevation: 3,
                    }}
                  >
                    <Building2 size={24} color="#FFFFFF" />
                  </LinearGradient>

                  {/* Content */}
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                      <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A", marginRight: 6 }}>
                        Office/Admin Portal
                      </Text>
                      <View style={{ backgroundColor: "#EEF2FF", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: "#4338CA" }}>ADMIN</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "600" }}>
                      Management & monitoring dashboard
                    </Text>
                  </View>

                  {/* Right Arrow Button */}
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: "#FFFFFF",
                      borderWidth: 1.2,
                      borderColor: "#C7D2FE",
                      justifyContent: "center",
                      alignItems: "center",
                      shadowColor: "#000",
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: 1,
                    }}
                  >
                    <ArrowRight size={17} color="#4F46E5" />
                  </View>
                </ScalePressable>
              </FadeInView>
            </View>

            {/* 6. BOTTOM FOOTER SECURITY & MADE IN INDIA BADGE */}
            <FadeInView delay={340} style={{ paddingHorizontal: 18, marginTop: 4 }}>
              <View
                style={{
                  backgroundColor: "#F8FAFC",
                  borderRadius: 20,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {/* Left Security Note */}
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Shield size={20} color="#10B981" style={{ marginRight: 8 }} />
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: "#334155" }}>
                      Secured Access
                    </Text>
                    <Text style={{ fontSize: 10, color: "#94A3B8", fontWeight: "600" }}>
                      Your data is safe with us
                    </Text>
                  </View>
                </View>

                {/* Right Made in India */}
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ alignItems: "flex-end", marginRight: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: "#334155" }}>
                      Made in India
                    </Text>
                    <Text style={{ fontSize: 10, color: "#94A3B8", fontWeight: "600" }}>
                      For a Cleaner India
                    </Text>
                  </View>
                  <Text style={{ fontSize: 18 }}>🇮🇳</Text>
                </View>
              </View>

              {/* Clear Session Option */}
              <TouchableOpacity onPress={handleLogout} style={{ alignItems: "center", marginTop: 14 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>
                  🔄 Clear Session Cache
                </Text>
              </TouchableOpacity>
            </FadeInView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
