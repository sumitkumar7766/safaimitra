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
  FileText,
  Award,
} from "lucide-react-native";

import AdminPage from "./screens/Admin/Admin";
import OfficeDashboard from "./screens/Office/Office";
import StaffDashboard from "./screens/Staff/Staff";
import CitizenDashboard from "./screens/Citizen/Citizen";
import UserRegister from "./screens/userRegister";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.5.49.186:5002";
const { width } = Dimensions.get("window");

// =========================================================================
// 🌟 MODERN ANIMATION & INTERACTIVE UTILITY COMPONENTS
// =========================================================================

// Staggered Fade & Spring Slide In
const FadeInView = ({ children, delay = 0, style }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
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

// Gentle Floating Motion for Badges / Icons
const FloatingBadge = ({ children, delay = 0 }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1800,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
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

// Interactive Touch Scale Spring Button
const ScalePressable = ({ onPress, children, style, disabled = false, activeOpacity = 0.9 }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 0.96,
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

// Modern Text Input with Focus Glow and Icon
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
    <View style={{ marginBottom: 16 }}>
      {label ? (
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 6, letterSpacing: 0.3 }}>
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
          paddingVertical: Platform.OS === "ios" ? 14 : 4,
          shadowColor: isFocused ? accentColor : "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isFocused ? 0.12 : 0.03,
          shadowRadius: 8,
          elevation: isFocused ? 3 : 1,
        }}
      >
        {IconComponent ? (
          <View style={{ marginRight: 10 }}>
            <IconComponent size={20} color={isFocused ? accentColor : "#94A3B8"} />
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
        <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 4, fontWeight: "600" }}>{error}</Text>
      ) : null}
    </View>
  );
};

// =========================================================================
// 🔐 CORE STRICT LOGIN HELPER (UNCHANGED CORE LOGIC)
// =========================================================================
const processStrictLogin = async (
  username,
  password,
  endpoint,
  expectedRole,
  onSuccess
) => {
  if (!username || !password) {
    Alert.alert("Missing Information", "Please provide both ID/Username and Password");
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

      Alert.alert("Success", `Welcome back, ${user.name || user.fullName || "User"}!`);

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
      Alert.alert("Login Failed", res.data.message || "Invalid Credentials");
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
// 👤 CITIZEN LOGIN & REGISTRATION SCREEN (MODERN LIGHT THEME)
// =========================================================================
const CitizenLogin = ({ goBack, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Registration Form State
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
    if (!isLogin) {
      fetchOffices();
      if (!regData.latitude && !regData.longitude) {
        fetchCurrentLocation();
      }
    }
  }, [isLogin]);

  const fetchCurrentLocation = async () => {
    setLocationLoading(true);
    setLocationError("");
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Permission to access GPS was denied.");
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
      setLocationError("Ensure Device GPS is turned ON.");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!id || !password) {
      Alert.alert("Missing Details", "Please enter your Phone Number and Password.");
      return;
    }
    setLoading(true);
    const fullUrl = `${API_BASE_URL}/citizen/login`;

    try {
      const res = await axios.post(
        fullUrl,
        { username: id, password },
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

        Alert.alert("Welcome!", `Signed in successfully as ${user.name || user.fullName || "Citizen"}`);
        onLoginSuccess("citizen");
      } else {
        Alert.alert("Authentication Failed", res.data.message || "Invalid credentials.");
      }
    } catch (err) {
      console.error("Citizen Login Error:", err);
      Alert.alert("Login Error", err.response?.data?.message || "Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
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

    setLoading(true);
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
        Alert.alert("Account Created! 🎉", "Your citizen profile is ready. Please sign in.");
        setIsLogin(true);
        setId(regData.phone);
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
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Top Navigation Bar */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
            <ScalePressable
              onPress={goBack}
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: "#FFFFFF",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#E2E8F0",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <ChevronLeft size={22} color="#1E293B" />
            </ScalePressable>

            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#ECFDF5", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#A7F3D0" }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981", marginRight: 6 }} />
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#047857" }}>Citizen Portal</Text>
            </View>
          </View>

          {/* Hero Branding Header */}
          <FadeInView delay={100} style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <FloatingBadge delay={100}>
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 14,
                    shadowColor: "#10B981",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 6,
                  }}
                >
                  <User size={28} color="#FFFFFF" />
                </LinearGradient>
              </FloatingBadge>
              <View>
                <Text style={{ fontSize: 26, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 }}>
                  {isLogin ? "Welcome Citizen" : "Join SafaiMitra"}
                </Text>
                <Text style={{ fontSize: 14, color: "#64748B", fontWeight: "500", marginTop: 2 }}>
                  {isLogin ? "Sign in to report & track waste issues" : "Register to make your city clean & green"}
                </Text>
              </View>
            </View>

            {/* Segmented Control Pill Switcher */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#E2E8F0",
                borderRadius: 16,
                padding: 4,
                marginTop: 10,
              }}
            >
              <TouchableOpacity
                onPress={() => setIsLogin(true)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 13,
                  backgroundColor: isLogin ? "#FFFFFF" : "transparent",
                  alignItems: "center",
                  shadowColor: isLogin ? "#000" : "transparent",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isLogin ? 0.08 : 0,
                  shadowRadius: 4,
                  elevation: isLogin ? 2 : 0,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: isLogin ? "#0F172A" : "#64748B" }}>
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsLogin(false)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 13,
                  backgroundColor: !isLogin ? "#FFFFFF" : "transparent",
                  alignItems: "center",
                  shadowColor: !isLogin ? "#000" : "transparent",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: !isLogin ? 0.08 : 0,
                  shadowRadius: 4,
                  elevation: !isLogin ? 2 : 0,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: !isLogin ? "#0F172A" : "#64748B" }}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>
          </FadeInView>

          {/* Form Card Container */}
          <FadeInView delay={200} style={{ paddingHorizontal: 20 }}>
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 24,
                padding: 22,
                borderWidth: 1,
                borderColor: "#E2E8F0",
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.05,
                shadowRadius: 20,
                elevation: 4,
              }}
            >
              {isLogin ? (
                /* ================= SIGN IN FORM ================= */
                <View>
                  <ModernInput
                    label="PHONE NUMBER / CITIZEN ID"
                    placeholder="Enter 10-digit registered phone"
                    value={id}
                    onChangeText={setId}
                    keyboardType="phone-pad"
                    IconComponent={Phone}
                    accentColor="#10B981"
                  />

                  <ModernInput
                    label="PASSWORD"
                    placeholder="Enter your secret password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    IconComponent={Lock}
                    accentColor="#10B981"
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

                  {/* Submit Button */}
                  <ScalePressable onPress={handleLogin} disabled={loading} style={{ marginTop: 8 }}>
                    <LinearGradient
                      colors={["#10B981", "#059669"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        borderRadius: 16,
                        paddingVertical: 15,
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
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF", marginRight: 8 }}>
                            Sign In to Portal
                          </Text>
                          <ArrowRight size={18} color="#FFFFFF" />
                        </>
                      )}
                    </LinearGradient>
                  </ScalePressable>
                </View>
              ) : (
                /* ================= REGISTRATION FORM ================= */
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A", marginBottom: 14 }}>
                    Personal Details
                  </Text>

                  <ModernInput
                    label="FULL NAME *"
                    placeholder="Enter your full name"
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
                    placeholder="name@example.com"
                    value={regData.email}
                    onChangeText={(val) => setRegData({ ...regData, email: val })}
                    keyboardType="email-address"
                    IconComponent={Mail}
                    accentColor="#10B981"
                  />

                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A", marginTop: 10, marginBottom: 14 }}>
                    Address & City Jurisdiction
                  </Text>

                  <ModernInput
                    label="STREET / RESIDENTIAL ADDRESS *"
                    placeholder="Flat / House No, Street, Landmark"
                    value={regData.address}
                    onChangeText={(val) => setRegData({ ...regData, address: val })}
                    IconComponent={Building2}
                    accentColor="#10B981"
                  />

                  {/* City Selector */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 6 }}>
                      MUNICIPAL CITY JURISDICTION *
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
                          <Text style={{ marginLeft: 10, color: "#64748B", fontSize: 14 }}>Loading registered cities...</Text>
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
                          <Picker.Item label="-- Select Municipal Corporation --" value="" color="#94A3B8" />
                          {officeList.map((office) => (
                            <Picker.Item key={office.id} label={`📍 ${office.name}`} value={office.id} />
                          ))}
                        </Picker>
                      )}
                    </View>
                  </View>

                  <ModernInput
                    label="POSTAL PINCODE *"
                    placeholder="e.g. 452001"
                    value={regData.pincode}
                    onChangeText={(val) => setRegData({ ...regData, pincode: val })}
                    keyboardType="numeric"
                    IconComponent={MapPin}
                    accentColor="#10B981"
                  />

                  {/* Location Coordinate Detector */}
                  <View style={{ backgroundColor: "#F0FDF4", padding: 14, borderRadius: 16, borderWidth: 1, borderColor: "#BBF7D0", marginBottom: 16 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Navigation size={18} color="#059669" />
                        <Text style={{ fontSize: 13, fontWeight: "700", color: "#065F46", marginLeft: 6 }}>
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
                            <RefreshCw size={12} color="#FFF" style={{ marginRight: 4 }} />
                            <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "700" }}>Detect GPS</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>

                    {regData.latitude && regData.longitude ? (
                      <View style={{ flexDirection: "row", backgroundColor: "#DCFCE7", padding: 8, borderRadius: 10 }}>
                        <Text style={{ fontSize: 12, color: "#166534", fontWeight: "600" }}>
                          📍 Coordinates: {regData.latitude}, {regData.longitude}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 12, color: "#059669" }}>
                        Tap &apos;Detect GPS&apos; to link your residential location.
                      </Text>
                    )}
                    {locationError ? (
                      <Text style={{ color: "#DC2626", fontSize: 11, marginTop: 4 }}>{locationError}</Text>
                    ) : null}
                  </View>

                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A", marginTop: 4, marginBottom: 14 }}>
                    Security Password
                  </Text>

                  <ModernInput
                    label="CREATE PASSWORD *"
                    placeholder="At least 6 characters"
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

                  {/* Register Submit Button */}
                  <ScalePressable onPress={handleRegister} disabled={loading} style={{ marginTop: 8 }}>
                    <LinearGradient
                      colors={["#10B981", "#059669"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        borderRadius: 16,
                        paddingVertical: 15,
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
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF", marginRight: 8 }}>
                            Complete Registration
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

          {/* Trust Badge */}
          <FadeInView delay={300} style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#F1F5F9",
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: "#E2E8F0",
              }}
            >
              <ShieldCheck size={22} color="#059669" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#334155" }}>
                  Verified Civic System
                </Text>
                <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                  Direct automated escalation to city sanitation officers.
                </Text>
              </View>
            </View>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// =========================================================================
// 🚛 VEHICLE STAFF LOGIN SCREEN (MODERN LIGHT THEME)
// =========================================================================
const VehicleLogin = ({ goBack, onLoginSuccess }) => {
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
        {/* Navigation */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
          <ScalePressable
            onPress={goBack}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: "#FFFFFF",
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#FDE68A",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <ChevronLeft size={22} color="#92400E" />
          </ScalePressable>

          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#FCD34D" }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#D97706", marginRight: 6 }} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#92400E" }}>Fleet & Drivers</Text>
          </View>
        </View>

        {/* Header */}
        <FadeInView delay={100} style={{ paddingHorizontal: 24, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <FloatingBadge delay={150}>
              <LinearGradient
                colors={["#F59E0B", "#D97706"]}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 14,
                  shadowColor: "#F59E0B",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Truck size={28} color="#FFFFFF" />
              </LinearGradient>
            </FloatingBadge>
            <View>
              <Text style={{ fontSize: 26, fontWeight: "800", color: "#78350F", letterSpacing: -0.5 }}>
                Vehicle Staff
              </Text>
              <Text style={{ fontSize: 14, color: "#92400E", fontWeight: "500", marginTop: 2 }}>
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
              borderWidth: 1,
              borderColor: "#FDE68A",
              shadowColor: "#B45309",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.06,
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

            {/* Login Action */}
            <ScalePressable onPress={handleLogin} disabled={loading} style={{ marginTop: 8 }}>
              <LinearGradient
                colors={["#F59E0B", "#D97706"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 16,
                  paddingVertical: 15,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  shadowColor: "#D97706",
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
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF", marginRight: 8 }}>
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
// 🏢 OFFICE STAFF & SYSTEM ADMIN LOGIN SCREEN (MODERN LIGHT THEME)
// =========================================================================
const AdminLogin = ({ goBack, onLoginSuccess, isOffice }) => {
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
        gradient: ["#6366F1", "#4F46E5"],
        title: "Office Operations",
        subtitle: "Municipal Staff Management Portal",
        icon: Building2,
      }
    : {
        screenBg: "#F8FAFC",
        borderTone: "#CBD5E1",
        badgeBg: "#E2E8F0",
        badgeText: "#0F172A",
        accent: "#0F172A",
        gradient: ["#334155", "#0F172A"],
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
        {/* Top Header Navigation */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
          <ScalePressable
            onPress={goBack}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: "#FFFFFF",
              justifyContent: "center",
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
            <ChevronLeft size={22} color={theme.accent} />
          </ScalePressable>

          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.badgeBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: theme.borderTone }}>
            <KeyRound size={12} color={theme.badgeText} style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: theme.badgeText }}>
              {isOffice ? "Operations Portal" : "Admin Console"}
            </Text>
          </View>
        </View>

        {/* Hero Title */}
        <FadeInView delay={100} style={{ paddingHorizontal: 24, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <FloatingBadge delay={200}>
              <LinearGradient
                colors={theme.gradient}
                style={{
                  width: 56,
                  height: 56,
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
                <IconComp size={28} color="#FFFFFF" />
              </LinearGradient>
            </FloatingBadge>
            <View>
              <Text style={{ fontSize: 26, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 }}>
                {theme.title}
              </Text>
              <Text style={{ fontSize: 14, color: "#64748B", fontWeight: "500", marginTop: 2 }}>
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
              borderWidth: 1,
              borderColor: theme.borderTone,
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.06,
              shadowRadius: 20,
              elevation: 4,
            }}
          >
            <ModernInput
              label="USERNAME / OFFICIAL EMAIL"
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
            <ScalePressable onPress={handleLogin} disabled={loading} style={{ marginTop: 8 }}>
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
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF", marginRight: 8 }}>
                      Authenticate Session
                    </Text>
                    <ArrowRight size={18} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </ScalePressable>
          </View>
        </FadeInView>

        {/* Security Warning */}
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
                All administrative access is monitored and logged in compliance with municipal IT policies.
              </Text>
            </View>
          </View>
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );
};

// =========================================================================
// 🚀 MAIN APPLICATION & ENHANCED HOME PORTAL SCREEN
// =========================================================================
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

      if (targetDashboard === "adminDashboard" && !isAdmin) {
        Alert.alert("Access Denied", "Only for System Administrators.");
        return;
      }
      if (targetDashboard === "officeDashboard" && role !== "office" && !isAdmin) {
        Alert.alert("Access Denied", "Only for Office Staff.");
        return;
      }
      if (targetDashboard === "vehicle" && !["driver", "helper", "supervisor"].includes(role) && !isAdmin) {
        Alert.alert("Access Denied", "Only for Vehicle Staff.");
        return;
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
  if (screen === "register") return <UserRegister goBack={() => setScreen("citizenLogin")} />;

  // Login Views
  if (screen === "citizenLogin") {
    return (
      <CitizenLogin
        goBack={() => setScreen("home")}
        onLoginSuccess={(next) => setScreen(next)}
      />
    );
  }
  if (screen === "vehicleLogin") {
    return (
      <VehicleLogin
        goBack={() => setScreen("home")}
        onLoginSuccess={(next) => setScreen(next)}
      />
    );
  }
  if (screen === "officeLogin") {
    return (
      <AdminLogin
        isOffice={true}
        goBack={() => setScreen("home")}
        onLoginSuccess={(next) => setScreen(next)}
      />
    );
  }
  if (screen === "adminLogin") {
    return (
      <AdminLogin
        isOffice={false}
        goBack={() => setScreen("home")}
        onLoginSuccess={(next) => setScreen(next)}
      />
    );
  }

  // =========================================================================
  // 🌟 MODERN LIGHT THEMED HOME PORTAL SELECTION
  // =========================================================================
  const ModernRoleCard = ({
    title,
    subtitle,
    badge,
    icon: IconComponent,
    gradientColors,
    accentColor,
    borderColor,
    targetDashboard,
    targetLogin,
    delay,
  }) => {
    return (
      <FadeInView delay={delay} style={{ marginBottom: 14 }}>
        <ScalePressable
          onPress={() => navigateWithGuard(targetDashboard, targetLogin)}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 22,
            padding: 16,
            borderWidth: 1.5,
            borderColor,
            shadowColor: accentColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 14,
            elevation: 3,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {/* Icon Badge */}
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 14,
              shadowColor: accentColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <IconComponent size={26} color="#FFFFFF" />
          </LinearGradient>

          {/* Description */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: "#0F172A", marginRight: 6 }}>
                {title}
              </Text>
              {badge ? (
                <View style={{ backgroundColor: `${accentColor}15`, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: accentColor }}>{badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ fontSize: 13, color: "#64748B", fontWeight: "500" }}>{subtitle}</Text>
          </View>

          {/* Enter Pill */}
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: `${accentColor}12`,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ArrowRight size={18} color={accentColor} />
          </View>
        </ScalePressable>
      </FadeInView>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Brand Header */}
        <FadeInView delay={50} style={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            {/* Live System Indicator */}
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
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#047857" }}>
                GovTech Network 24/7
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Sparkles size={16} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B" }}>v2.0 Clean City</Text>
            </View>
          </View>

          {/* Main Logo & Title */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <FloatingBadge delay={0}>
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 18,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                  shadowColor: "#10B981",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  elevation: 5,
                }}
              >
                <Text style={{ fontSize: 26 }}>🌿</Text>
              </LinearGradient>
            </FloatingBadge>
            <View>
              <Text style={{ fontSize: 28, fontWeight: "900", color: "#0F172A", letterSpacing: -0.5 }}>
                SafaiMitra
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#059669" }}>
                Smart Waste Management System
              </Text>
            </View>
          </View>
        </FadeInView>

        {/* Feature Highlights Banner */}
        <FadeInView delay={120} style={{ paddingHorizontal: 20, marginBottom: 18 }}>
          <LinearGradient
            colors={["#ECFDF5", "#F0FDF4"]}
            style={{
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: "#D1FAE5",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#065F46" }}>100%</Text>
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#047857", marginTop: 1 }}>Digital</Text>
            </View>
            <View style={{ width: 1, backgroundColor: "#A7F3D0" }} />
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#065F46" }}>AI Photo</Text>
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#047857", marginTop: 1 }}>Verified</Text>
            </View>
            <View style={{ width: 1, backgroundColor: "#A7F3D0" }} />
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#065F46" }}>JAES 24h</Text>
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#047857", marginTop: 1 }}>Escalation</Text>
            </View>
          </LinearGradient>
        </FadeInView>

        {/* Portal Options Section */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A", marginBottom: 12, paddingHorizontal: 4 }}>
            Select Access Portal
          </Text>

          <ModernRoleCard
            title="Citizen Portal"
            subtitle="File complaints & track live trucks"
            badge="Public"
            icon={User}
            gradientColors={["#10B981", "#059669"]}
            accentColor="#10B981"
            borderColor="#D1FAE5"
            targetDashboard="citizen"
            targetLogin="citizenLogin"
            delay={180}
          />

          <ModernRoleCard
            title="Vehicle Staff"
            subtitle="Driver navigation & route pickups"
            badge="Field"
            icon={Truck}
            gradientColors={["#F59E0B", "#D97706"]}
            accentColor="#D97706"
            borderColor="#FEF3C7"
            targetDashboard="vehicle"
            targetLogin="vehicleLogin"
            delay={240}
          />

          <ModernRoleCard
            title="Office Staff"
            subtitle="Operations, complaints & staff duty"
            badge="Municipal"
            icon={Building2}
            gradientColors={["#6366F1", "#4F46E5"]}
            accentColor="#4F46E5"
            borderColor="#E0E7FF"
            targetDashboard="officeDashboard"
            targetLogin="officeLogin"
            delay={300}
          />

          <ModernRoleCard
            title="System Admin"
            subtitle="Central administrative oversight"
            badge="Root"
            icon={ShieldCheck}
            gradientColors={["#334155", "#0F172A"]}
            accentColor="#0F172A"
            borderColor="#E2E8F0"
            targetDashboard="adminDashboard"
            targetLogin="adminLogin"
            delay={360}
          />
        </View>

        {/* Footer & Reset Button */}
        <FadeInView delay={420} style={{ alignItems: "center", marginTop: 16, paddingHorizontal: 20 }}>
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#E2E8F0",
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B" }}>
              🔄 Reset App Session
            </Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 11, fontWeight: "600", color: "#94A3B8" }}>
            SafaiMitra Swachh Bharat Initiative • 2026
          </Text>
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );
}
