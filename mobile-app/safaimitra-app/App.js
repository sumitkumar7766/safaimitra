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
  Dimensions,
  Platform,
  KeyboardAvoidingView,
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
  Zap,
  Globe,
} from "lucide-react-native";

import AdminPage from "./screens/Admin/Admin";
import OfficeDashboard from "./screens/Office/Office";
import StaffDashboard from "./screens/Staff/Staff";
import CitizenDashboard from "./screens/Citizen/Citizen";
import UserRegister from "./screens/userRegister";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.5.49.186:5002";
const { width } = Dimensions.get("window");

// =========================================================================
// 🌟 FLUID ANIMATIONS & PRESSABLE UTILITIES
// =========================================================================

// Staggered Fade & Spring Entrance
const FadeInView = ({ children, delay = 0, style }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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
        tension: 55,
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

// Gentle Floating Badge Animation
const FloatingBadge = ({ children, delay = 0 }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -5,
          duration: 1600,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1600,
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

// Spring Bounce Pressable
const ScalePressable = ({ onPress, children, style, disabled = false, activeOpacity = 0.9 }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 120,
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

// Modern Color-Coded Input Component
const ModernInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  IconComponent,
  secureTextEntry = false,
  keyboardType = "default",
  accentColor = "#10B981",
  rightAction,
  autoCapitalize = "none",
  editable = true,
  error,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={{ marginBottom: 14 }}>
      {label ? (
        <Text style={{ fontSize: 12, fontWeight: "800", color: "#475569", marginBottom: 6, letterSpacing: 0.4 }}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: isFocused ? "#FFFFFF" : "#F8FAFC",
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: error ? "#EF4444" : isFocused ? accentColor : "#E2E8F0",
          paddingHorizontal: 14,
          paddingVertical: Platform.OS === "ios" ? 13 : 3,
          shadowColor: isFocused ? accentColor : "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: isFocused ? 0.16 : 0.03,
          shadowRadius: 8,
          elevation: isFocused ? 3 : 1,
        }}
      >
        {IconComponent ? (
          <View style={{ marginRight: 10 }}>
            <IconComponent size={19} color={isFocused ? accentColor : "#94A3B8"} />
          </View>
        ) : null}

        <TextInput
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: "500",
            color: "#0F172A",
            paddingVertical: Platform.OS === "ios" ? 0 : 8,
          }}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {rightAction ? rightAction : null}
      </View>
      {error ? (
        <Text style={{ color: "#EF4444", fontSize: 11, marginTop: 4, fontWeight: "600" }}>{error}</Text>
      ) : null}
    </View>
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
    Alert.alert("Missing Information", "Please enter ID/Username and Password");
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
      err.response?.data?.message || "Could not connect to SafaiMitra server. Please try again."
    );
  }
};

// =========================================================================
// 🚛 VEHICLE STAFF LOGIN VIEW
// =========================================================================
const VehicleLoginScreen = ({ goBack, onLoginSuccess }) => {
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFBEB" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFBEB" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Top Header Navigation */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
          <ScalePressable
            onPress={goBack}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 14,
              backgroundColor: "#FFFFFF",
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#FDE68A",
              shadowColor: "#D97706",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <ChevronLeft size={18} color="#D97706" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#D97706" }}>Citizen Login</Text>
          </ScalePressable>

          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#FCD34D" }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#D97706", marginRight: 6 }} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#92400E" }}>Vehicle Crew</Text>
          </View>
        </View>

        {/* Hero Header */}
        <FadeInView delay={100} style={{ paddingHorizontal: 24, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <FloatingBadge delay={150}>
              <LinearGradient
                colors={["#F59E0B", "#EA580C"]}
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 18,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 14,
                  shadowColor: "#F59E0B",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Truck size={30} color="#FFFFFF" />
              </LinearGradient>
            </FloatingBadge>
            <View>
              <Text style={{ fontSize: 26, fontWeight: "900", color: "#78350F", letterSpacing: -0.5 }}>
                Vehicle Staff
              </Text>
              <Text style={{ fontSize: 14, color: "#B45309", fontWeight: "600", marginTop: 2 }}>
                Collection team & driver operations
              </Text>
            </View>
          </View>
        </FadeInView>

        {/* Card Form */}
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
            <ModernInput
              label="STAFF IDENTIFIER / PHONE"
              placeholder="Enter your registered staff ID"
              value={id}
              onChangeText={setId}
              keyboardType="numeric"
              IconComponent={User}
              accentColor="#D97706"
            />

            <ModernInput
              label="PASSWORD"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              keyboardType="numeric"
              IconComponent={Lock}
              accentColor="#D97706"
              rightAction={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  {showPassword ? (
                    <EyeOff size={18} color="#64748B" />
                  ) : (
                    <Eye size={18} color="#64748B" />
                  )}
                </TouchableOpacity>
              }
            />

            {/* Submit Action */}
            <ScalePressable onPress={handleLogin} disabled={loading} style={{ marginTop: 10 }}>
              <LinearGradient
                colors={["#F59E0B", "#EA580C"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 16,
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

        {/* Operational Notice */}
        <FadeInView delay={300} style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#FEF3C7",
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: "#FCD34D",
            }}
          >
            <Compass size={22} color="#B45309" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#78350F" }}>
                Live GPS Routing Active
              </Text>
              <Text style={{ fontSize: 12, color: "#92400E", marginTop: 2 }}>
                Ensure device GPS remains enabled to sync waste collection progress with headquarters.
              </Text>
            </View>
          </View>
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );
};

// =========================================================================
// 🏢 OFFICE STAFF & SYSTEM ADMIN LOGIN VIEW
// =========================================================================
const AdminLoginScreen = ({ goBack, onLoginSuccess, isOffice }) => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const theme = isOffice
    ? {
        screenBg: "#EEF2FF",
        borderTone: "#C7D2FE",
        badgeBg: "#E0E7FF",
        badgeText: "#4338CA",
        accent: "#4F46E5",
        gradient: ["#6366F1", "#4F46E5", "#7C3AED"],
        title: "Office Operations",
        subtitle: "Municipal Operations & Staff Portal",
        icon: Building2,
      }
    : {
        screenBg: "#F1F5F9",
        borderTone: "#CBD5E1",
        badgeBg: "#E2E8F0",
        badgeText: "#0F172A",
        accent: "#0F172A",
        gradient: ["#334155", "#1E293B", "#0F172A"],
        title: "System Admin",
        subtitle: "Central Control & Governance",
        icon: ShieldCheck,
      };

  const handleLogin = async () => {
    setLoading(true);
    const endpoint = isOffice ? "/office/login" : "/admin/login";
    const role = isOffice ? "office" : "admin";
    await processStrictLogin(id, password, endpoint, role, onLoginSuccess);
    setLoading(false);
  };

  const IconComp = theme.icon;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.screenBg }}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.screenBg} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Navigation */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
          <ScalePressable
            onPress={goBack}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 14,
              backgroundColor: "#FFFFFF",
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: theme.borderTone,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <ChevronLeft size={18} color={theme.accent} style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 13, fontWeight: "700", color: theme.accent }}>Citizen Login</Text>
          </ScalePressable>

          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.badgeBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: theme.borderTone }}>
            <KeyRound size={12} color={theme.badgeText} style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: theme.badgeText }}>
              {isOffice ? "Operations Portal" : "Admin Console"}
            </Text>
          </View>
        </View>

        {/* Header */}
        <FadeInView delay={100} style={{ paddingHorizontal: 24, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <FloatingBadge delay={200}>
              <LinearGradient
                colors={theme.gradient}
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 18,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 14,
                  shadowColor: theme.accent,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <IconComp size={30} color="#FFFFFF" />
              </LinearGradient>
            </FloatingBadge>
            <View>
              <Text style={{ fontSize: 26, fontWeight: "900", color: "#0F172A", letterSpacing: -0.5 }}>
                {theme.title}
              </Text>
              <Text style={{ fontSize: 14, color: "#64748B", fontWeight: "600", marginTop: 2 }}>
                {theme.subtitle}
              </Text>
            </View>
          </View>
        </FadeInView>

        {/* Card Form */}
        <FadeInView delay={200} style={{ paddingHorizontal: 20 }}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              padding: 22,
              borderWidth: 1.5,
              borderColor: theme.borderTone,
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.07,
              shadowRadius: 20,
              elevation: 4,
            }}
          >
            <ModernInput
              label="OFFICIAL USERNAME / EMAIL"
              placeholder="Enter official credentials"
              value={id}
              onChangeText={setId}
              IconComponent={User}
              accentColor={theme.accent}
            />

            <ModernInput
              label="SECURITY PASSWORD"
              placeholder="Enter secret password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              IconComponent={Lock}
              accentColor={theme.accent}
              rightAction={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  {showPassword ? (
                    <EyeOff size={18} color="#64748B" />
                  ) : (
                    <Eye size={18} color="#64748B" />
                  )}
                </TouchableOpacity>
              }
            />

            {/* Login Action */}
            <ScalePressable onPress={handleLogin} disabled={loading} style={{ marginTop: 10 }}>
              <LinearGradient
                colors={theme.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 16,
                  paddingVertical: 15,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  shadowColor: theme.accent,
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

        {/* Security Notice */}
        <FadeInView delay={300} style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: theme.borderTone,
            }}
          >
            <ShieldCheck size={22} color={theme.accent} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#334155" }}>
                Encrypted Session
              </Text>
              <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                All administrative access is monitored and audited in compliance with municipal IT guidelines.
              </Text>
            </View>
          </View>
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );
};

// =========================================================================
// 🌟 MAIN APPLICATION & UNIFIED DEFAULT CITIZEN LOGIN SCREEN
// =========================================================================
export default function App() {
  const [screen, setScreen] = useState("home"); // "home" is Default Citizen Portal + other options
  const [loading, setLoading] = useState(false);

  // Citizen Login/Register state
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [citizenId, setCitizenId] = useState("");
  const [citizenPassword, setCitizenPassword] = useState("");
  const [showCitizenPassword, setShowCitizenPassword] = useState(false);
  const [citizenLoading, setCitizenLoading] = useState(false);

  // Citizen Registration States
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
        setLocationError("GPS permission denied.");
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
    if (!citizenId || !citizenPassword) {
      Alert.alert("Missing Details", "Please enter your Phone Number and Password.");
      return;
    }
    setCitizenLoading(true);
    const fullUrl = `${API_BASE_URL}/citizen/login`;

    try {
      const res = await axios.post(
        fullUrl,
        { username: citizenId, password: citizenPassword },
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

        Alert.alert("Welcome! 🎉", `Logged in as ${user.name || user.fullName || "Citizen"}`);
        setScreen("citizen");
      } else {
        Alert.alert("Authentication Failed", res.data.message || "Invalid credentials.");
      }
    } catch (err) {
      console.error("Citizen Login Error:", err);
      Alert.alert("Login Error", err.response?.data?.message || "Unable to connect to the backend server.");
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
        setCitizenId(regData.phone);
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

  // Secondary Specialized Login Screens (Accessible from options below)
  if (screen === "vehicleLogin") {
    return (
      <VehicleLoginScreen
        goBack={() => setScreen("home")}
        onLoginSuccess={(next) => setScreen(next)}
      />
    );
  }
  if (screen === "officeLogin") {
    return (
      <AdminLoginScreen
        isOffice={true}
        goBack={() => setScreen("home")}
        onLoginSuccess={(next) => setScreen(next)}
      />
    );
  }
  if (screen === "adminLogin") {
    return (
      <AdminLoginScreen
        isOffice={false}
        goBack={() => setScreen("home")}
        onLoginSuccess={(next) => setScreen(next)}
      />
    );
  }

  // =========================================================================
  // 🌟 COLORFUL DEFAULT HOME SCREEN (CITIZEN LOGIN + OTHER PORTAL CARDS)
  // =========================================================================
  const ColorfulPortalOption = ({
    title,
    subtitle,
    badge,
    icon: IconComponent,
    gradientColors,
    accentColor,
    borderColor,
    targetScreen,
    delay,
  }) => {
    return (
      <FadeInView delay={delay} style={{ marginBottom: 12 }}>
        <ScalePressable
          onPress={() => setScreen(targetScreen)}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 14,
            borderWidth: 1.5,
            borderColor,
            shadowColor: accentColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 3,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {/* Icon Badge with Multi-stop Gradient */}
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 15,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 14,
              shadowColor: accentColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <IconComponent size={24} color="#FFFFFF" />
          </LinearGradient>

          {/* Description */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A", marginRight: 6 }}>
                {title}
              </Text>
              {badge ? (
                <View style={{ backgroundColor: `${accentColor}18`, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: "800", color: accentColor }}>{badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "600" }}>{subtitle}</Text>
          </View>

          {/* Arrow Pill */}
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              backgroundColor: `${accentColor}15`,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ArrowRight size={17} color={accentColor} />
          </View>
        </ScalePressable>
      </FadeInView>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Top Brand Hero with Vibrant Gradient Banner */}
          <FadeInView delay={50} style={{ paddingHorizontal: 20, paddingTop: 12, marginBottom: 16 }}>
            {/* Live Indicator + Tagline Banner */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#ECFDF5",
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "#A7F3D0",
                }}
              >
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#10B981", marginRight: 6 }} />
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#047857" }}>
                  🟢 Live Network Active
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#EEF2FF",
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "#C7D2FE",
                }}
              >
                <Sparkles size={12} color="#6366F1" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#4F46E5" }}>
                  Swachh Bharat 2.0
                </Text>
              </View>
            </View>

            {/* Brand Logo & Title */}
            <LinearGradient
              colors={["#059669", "#10B981", "#0D9488"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 24,
                padding: 18,
                shadowColor: "#10B981",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.35,
                shadowRadius: 16,
                elevation: 6,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <FloatingBadge delay={0}>
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 18,
                    backgroundColor: "#FFFFFF",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 14,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Text style={{ fontSize: 26 }}>🌿</Text>
                </View>
              </FloatingBadge>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 24, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.5 }}>
                  SafaiMitra
                </Text>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#D1FAE5", marginTop: 2 }}>
                  Smart Civic Waste & Sanitation Platform
                </Text>
              </View>
            </LinearGradient>
          </FadeInView>

          {/* ========================================================= */}
          {/* 🌟 1. DEFAULT CITIZEN LOGIN & REGISTRATION CARD */}
          {/* ========================================================= */}
          <FadeInView delay={120} style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 24,
                padding: 20,
                borderWidth: 1.5,
                borderColor: "#A7F3D0",
                shadowColor: "#10B981",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
                elevation: 4,
              }}
            >
              {/* Header Title with User Icon */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <LinearGradient
                    colors={["#10B981", "#059669"]}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 10,
                    }}
                  >
                    <User size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <View>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>
                      Citizen Portal
                    </Text>
                    <Text style={{ fontSize: 12, color: "#059669", fontWeight: "700" }}>
                      Default Public Access
                    </Text>
                  </View>
                </View>

                {/* Status Chip */}
                <View style={{ backgroundColor: "#DCFCE7", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#166534" }}>PUBLIC</Text>
                </View>
              </View>

              {/* Segmented Control Pill Switcher */}
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: "#F1F5F9",
                  borderRadius: 14,
                  padding: 4,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                }}
              >
                <TouchableOpacity
                  onPress={() => setIsLoginTab(true)}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    borderRadius: 11,
                    backgroundColor: isLoginTab ? "#FFFFFF" : "transparent",
                    alignItems: "center",
                    shadowColor: isLoginTab ? "#000" : "transparent",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isLoginTab ? 0.08 : 0,
                    shadowRadius: 4,
                    elevation: isLoginTab ? 2 : 0,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "800", color: isLoginTab ? "#047857" : "#64748B" }}>
                    Sign In
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsLoginTab(false)}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    borderRadius: 11,
                    backgroundColor: !isLoginTab ? "#FFFFFF" : "transparent",
                    alignItems: "center",
                    shadowColor: !isLoginTab ? "#000" : "transparent",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: !isLoginTab ? 0.08 : 0,
                    shadowRadius: 4,
                    elevation: !isLoginTab ? 2 : 0,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "800", color: !isLoginTab ? "#047857" : "#64748B" }}>
                    Create Account
                  </Text>
                </TouchableOpacity>
              </View>

              {isLoginTab ? (
                /* ================= CITIZEN SIGN IN ================= */
                <View>
                  <ModernInput
                    label="PHONE NUMBER"
                    placeholder="Enter registered 10-digit mobile"
                    value={citizenId}
                    onChangeText={setCitizenId}
                    keyboardType="phone-pad"
                    IconComponent={Phone}
                    accentColor="#10B981"
                  />

                  <ModernInput
                    label="PASSWORD"
                    placeholder="Enter secret password"
                    value={citizenPassword}
                    onChangeText={setCitizenPassword}
                    secureTextEntry={!showCitizenPassword}
                    IconComponent={Lock}
                    accentColor="#10B981"
                    rightAction={
                      <TouchableOpacity onPress={() => setShowCitizenPassword(!showCitizenPassword)} style={{ padding: 4 }}>
                        {showCitizenPassword ? (
                          <EyeOff size={18} color="#64748B" />
                        ) : (
                          <Eye size={18} color="#64748B" />
                        )}
                      </TouchableOpacity>
                    }
                  />

                  {/* Sign In CTA Button */}
                  <ScalePressable onPress={handleCitizenLogin} disabled={citizenLoading} style={{ marginTop: 6 }}>
                    <LinearGradient
                      colors={["#10B981", "#059669"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        borderRadius: 16,
                        paddingVertical: 14,
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                        shadowColor: "#10B981",
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
                          <Text style={{ fontSize: 15, fontWeight: "800", color: "#FFFFFF", marginRight: 8 }}>
                            Sign In as Citizen
                          </Text>
                          <ArrowRight size={18} color="#FFFFFF" />
                        </>
                      )}
                    </LinearGradient>
                  </ScalePressable>
                </View>
              ) : (
                /* ================= CITIZEN REGISTER ================= */
                <View>
                  <ModernInput
                    label="FULL NAME *"
                    placeholder="e.g. Rahul Sharma"
                    value={regData.fullName}
                    onChangeText={(val) => setRegData({ ...regData, fullName: val })}
                    IconComponent={User}
                    accentColor="#10B981"
                    autoCapitalize="words"
                  />

                  <ModernInput
                    label="PHONE NUMBER *"
                    placeholder="10-digit mobile number"
                    value={regData.phone}
                    onChangeText={(val) => setRegData({ ...regData, phone: val })}
                    keyboardType="phone-pad"
                    IconComponent={Phone}
                    accentColor="#10B981"
                  />

                  <ModernInput
                    label="EMAIL ADDRESS *"
                    placeholder="rahul@example.com"
                    value={regData.email}
                    onChangeText={(val) => setRegData({ ...regData, email: val })}
                    keyboardType="email-address"
                    IconComponent={Mail}
                    accentColor="#10B981"
                  />

                  <ModernInput
                    label="RESIDENTIAL ADDRESS *"
                    placeholder="Flat / House No, Street, Colony"
                    value={regData.address}
                    onChangeText={(val) => setRegData({ ...regData, address: val })}
                    IconComponent={Building2}
                    accentColor="#10B981"
                  />

                  {/* City Selector */}
                  <View style={{ marginBottom: 14 }}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: "#475569", marginBottom: 6 }}>
                      MUNICIPAL CORPORATION *
                    </Text>
                    <View
                      style={{
                        backgroundColor: "#F8FAFC",
                        borderRadius: 16,
                        borderWidth: 1.5,
                        borderColor: "#E2E8F0",
                        overflow: "hidden",
                      }}
                    >
                      {loadingCities ? (
                        <View style={{ padding: 14, flexDirection: "row", alignItems: "center" }}>
                          <ActivityIndicator size="small" color="#10B981" />
                          <Text style={{ marginLeft: 10, color: "#64748B", fontSize: 13 }}>Loading cities...</Text>
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
                  </View>

                  <ModernInput
                    label="PINCODE *"
                    placeholder="e.g. 452001"
                    value={regData.pincode}
                    onChangeText={(val) => setRegData({ ...regData, pincode: val })}
                    keyboardType="numeric"
                    IconComponent={MapPin}
                    accentColor="#10B981"
                  />

                  {/* GPS Coordinate Auto-Detector */}
                  <View style={{ backgroundColor: "#F0FDF4", padding: 12, borderRadius: 16, borderWidth: 1, borderColor: "#BBF7D0", marginBottom: 14 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Navigation size={16} color="#059669" />
                        <Text style={{ fontSize: 12, fontWeight: "800", color: "#065F46", marginLeft: 6 }}>
                          Auto GPS Verification
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={fetchCurrentLocation}
                        disabled={locationLoading}
                        style={{ backgroundColor: "#10B981", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, flexDirection: "row", alignItems: "center" }}
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
                      <View style={{ backgroundColor: "#DCFCE7", padding: 6, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, color: "#166534", fontWeight: "700" }}>
                          📍 Lat: {regData.latitude}, Lng: {regData.longitude}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 11, color: "#059669" }}>
                        Tap &apos;Detect GPS&apos; to link your residential location.
                      </Text>
                    )}
                    {locationError ? (
                      <Text style={{ color: "#DC2626", fontSize: 11, marginTop: 4 }}>{locationError}</Text>
                    ) : null}
                  </View>

                  <ModernInput
                    label="CREATE PASSWORD *"
                    placeholder="Min 6 characters"
                    value={regData.password}
                    onChangeText={(val) => setRegData({ ...regData, password: val })}
                    secureTextEntry
                    IconComponent={Lock}
                    accentColor="#10B981"
                  />

                  <ModernInput
                    label="CONFIRM PASSWORD *"
                    placeholder="Re-enter password"
                    value={regData.confirmPassword}
                    onChangeText={(val) => setRegData({ ...regData, confirmPassword: val })}
                    secureTextEntry
                    IconComponent={ShieldCheck}
                    accentColor="#10B981"
                  />

                  {/* Register CTA Button */}
                  <ScalePressable onPress={handleCitizenRegister} disabled={citizenLoading} style={{ marginTop: 6 }}>
                    <LinearGradient
                      colors={["#10B981", "#059669"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        borderRadius: 16,
                        paddingVertical: 14,
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                        shadowColor: "#10B981",
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
                          <Text style={{ fontSize: 15, fontWeight: "800", color: "#FFFFFF", marginRight: 8 }}>
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

          {/* ========================================================= */}
          {/* 🌈 2. COLORFUL SPECIALIZED PORTAL OPTIONS (BELOW CITIZEN) */}
          {/* ========================================================= */}
          <View style={{ paddingHorizontal: 20 }}>
            {/* Section Divider with Badge */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "#CBD5E1" }} />
              <View style={{ backgroundColor: "#F1F5F9", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0" }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748B", letterSpacing: 0.5 }}>
                  OTHER SPECIALIZED PORTALS
                </Text>
              </View>
              <View style={{ flex: 1, height: 1, backgroundColor: "#CBD5E1" }} />
            </View>

            {/* 🚛 Vehicle Staff Card */}
            <ColorfulPortalOption
              title="Vehicle Staff Portal"
              subtitle="Driver navigation & route pickups"
              badge="FIELD CREW"
              icon={Truck}
              gradientColors={["#F59E0B", "#EA580C"]}
              accentColor="#D97706"
              borderColor="#FDE68A"
              targetScreen="vehicleLogin"
              delay={200}
            />

            {/* 🏢 Office Staff Card */}
            <ColorfulPortalOption
              title="Office Staff Portal"
              subtitle="Operations, complaints & staff oversight"
              badge="MUNICIPAL"
              icon={Building2}
              gradientColors={["#6366F1", "#4F46E5", "#7C3AED"]}
              accentColor="#4F46E5"
              borderColor="#C7D2FE"
              targetScreen="officeLogin"
              delay={260}
            />

            {/* 🔐 System Admin Card */}
            <ColorfulPortalOption
              title="System Admin Console"
              subtitle="Central governance & city controls"
              badge="GOVERNANCE"
              icon={ShieldCheck}
              gradientColors={["#334155", "#1E293B", "#0F172A"]}
              accentColor="#0F172A"
              borderColor="#CBD5E1"
              targetScreen="adminLogin"
              delay={320}
            />
          </View>

          {/* Quick System Highlights Banner */}
          <FadeInView delay={380} style={{ paddingHorizontal: 20, marginTop: 14 }}>
            <LinearGradient
              colors={["#F0FDF4", "#ECFDF5", "#EFF6FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 18,
                padding: 14,
                borderWidth: 1,
                borderColor: "#BBF7D0",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#065F46" }}>100%</Text>
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#047857", marginTop: 1 }}>Digital</Text>
              </View>
              <View style={{ width: 1, backgroundColor: "#A7F3D0" }} />
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#065F46" }}>AI Photo</Text>
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#047857", marginTop: 1 }}>Verification</Text>
              </View>
              <View style={{ width: 1, backgroundColor: "#A7F3D0" }} />
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#065F46" }}>JAES 24h</Text>
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#047857", marginTop: 1 }}>Auto-Escalation</Text>
              </View>
            </LinearGradient>
          </FadeInView>

          {/* Footer Reset & Security Seal */}
          <FadeInView delay={440} style={{ alignItems: "center", marginTop: 18, paddingHorizontal: 20 }}>
            <TouchableOpacity
              onPress={handleLogout}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#E2E8F0",
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748B" }}>
                🔄 Clear App Cache / Reset Session
              </Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8" }}>
              SafaiMitra Smart Civic Network • Swachh Bharat Initiative 2026
            </Text>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
