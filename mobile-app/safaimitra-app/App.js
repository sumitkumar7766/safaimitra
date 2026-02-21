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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import UserRegister from "./screens/userRegister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import AdminPage from "./screens/Admin/Admin";
import OfficeDashboard from "./screens/Office/Office";
import StaffDashboard from "./screens/Staff/Staff";
import CitizenDashboard from "./screens/Citizen/Citizen";
import * as Location from "expo-location";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const { width } = Dimensions.get("window");

// --- ENHANCED ANIMATION COMPONENTS ---
const AnimatedCard = ({ children, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay,
        tension: 45,
        friction: 8,
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

const FloatingElement = ({ children, delay = 0 }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2000,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
      {children}
    </Animated.View>
  );
};

// --- CORE LOGIN FUNCTION (UNCHANGED) ---
const processStrictLogin = async (
  username,
  password,
  endpoint,
  expectedRole,
  onSuccess,
) => {
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
      { headers: { "Content-Type": "application/json" }, timeout: 10000 },
    );

    if (res.data.success) {
      const { token, user } = res.data;
      const actualRole = user.role ? user.role.toLowerCase() : "";

      let isAuthorized = false;
      if (expectedRole === "admin" && actualRole === "admin")
        isAuthorized = true;
      else if (expectedRole === "office" && actualRole === "office")
        isAuthorized = true;
      else if (expectedRole === "citizen" && actualRole === "citizen")
        isAuthorized = true;
      else if (
        expectedRole === "vehicle" &&
        ["driver", "helper", "supervisor"].includes(actualRole)
      )
        isAuthorized = true;

      if (actualRole === "admin" && expectedRole === "office")
        isAuthorized = true;

      if (!isAuthorized) {
        Alert.alert(
          "Access Denied",
          `You cannot login as ${expectedRole} with role ${actualRole}`,
        );
        return;
      }

      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("user", JSON.stringify(user));

      Alert.alert("Success", `Welcome back, ${user.name || "User"}`);

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
    console.log("LOGIN ERROR:", err);
    Alert.alert(
      "Login Error",
      err.response?.data?.message || "Connection Failed",
    );
  }
};

// --- UPDATED CITIZEN LOGIN WITH REGISTRATION ---
const CitizenLogin = ({ goBack, onLoginSuccess, onRegisterPress }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [officeList, setOfficeList] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // Registration form states
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

  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  const fetchOffices = async () => {
    setLoadingCities(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/public-list`);
      if (res.data && res.data.success) {
        setOfficeList(res.data.cities);
      }
      console.log("Fetched cities for registration:", res.data.cities);
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
      // 1. Request Permission
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationError("Permission to access location was denied");
        setLocationLoading(false);
        return;
      }

      // 2. Get Current Position
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // 3. Update State
      setRegData((prev) => ({
        ...prev,
        latitude: location.coords.latitude.toFixed(6),
        longitude: location.coords.longitude.toFixed(6),
      }));
    } catch (error) {
      console.error("Location Error:", error);
      setLocationError("Unable to fetch location. Please ensure GPS is ON.");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!id || !password) {
      Alert.alert("Missing Info", "Please enter Phone No. and Password");
      return;
    }

    setLoading(true);
    const fullUrl = `${API_BASE_URL}/citizen/login`;

    try {
      const res = await axios.post(
        fullUrl,
        { username: id, password: password },
        { headers: { "Content-Type": "application/json" }, timeout: 10000 },
      );

      if (res.data.success) {
        const { token, user } = res.data;

        await AsyncStorage.setItem("token", token);
        await AsyncStorage.setItem("user", JSON.stringify(user));
        await AsyncStorage.setItem("userId", user.id.toString());
        await AsyncStorage.setItem("role", "Citizen");
        if (user.officeId) {
          await AsyncStorage.setItem("officeId", user.officeId.toString());
        }

        Alert.alert(
          "Success",
          `Welcome back, ${user.name || user.fullName || "User"}`,
        );
        onLoginSuccess("citizen");
      } else {
        Alert.alert("Login Failed", res.data.message || "Invalid Credentials");
      }
    } catch (err) {
      console.log("LOGIN ERROR:", err);
      Alert.alert(
        "Login Error",
        err.response?.data?.message || "Connection Failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (regData.password !== regData.confirmPassword) {
      Alert.alert("Error", "Passwords do not match!");
      return;
    }

    if (!regData.latitude || !regData.longitude) {
      Alert.alert("Error", "Please provide your location!");
      return;
    }

    if (!regData.officeId) {
      Alert.alert("Error", "Please select a City from the list!");
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
      Alert.alert("Error", "Please fill all required fields!");
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
        Alert.alert("Success", "Registration successful! Please login.");
        setIsLogin(true);
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
        Alert.alert("Error", res.data.message);
      }
    } catch (error) {
      console.error("Registration Error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegDataChange = (field, value) => {
    setRegData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCityChange = (selectedId) => {
    const selectedOffice = officeList.find(
      (office) => office.id === selectedId,
    );
    setRegData((prev) => ({
      ...prev,
      officeId: selectedId,
      cityName: selectedOffice ? selectedOffice.name : "",
      city: selectedOffice ? selectedOffice.name : "",
    }));
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="pt-6 pb-4 px-6 bg-green-500">
          <AnimatedCard delay={0}>
            <TouchableOpacity
              onPress={goBack}
              className="flex-row items-center justify-center mb-6 self-start bg-white/20 px-5 py-3 rounded-full"
              activeOpacity={0.8}
            >
              <Text className="text-white text-xl font-bold mr-2 mt-[-2px]">
                ←
              </Text>
              <Text className="text-white font-semibold text-base">Back</Text>
            </TouchableOpacity>
          </AnimatedCard>

          <AnimatedCard delay={100}>
            <View className="items-center mb-6">
              <FloatingElement delay={0}>
                <View className="bg-white w-24 h-24 rounded-3xl justify-center items-center mb-5 shadow-xl">
                  <Text className="text-6xl">👤</Text>
                </View>
              </FloatingElement>
              <Text className="text-white text-4xl font-bold mb-2">
                Citizen Portal
              </Text>
              <View className="bg-white/20 px-4 py-2 rounded-full">
                <Text className="text-white text-sm font-semibold">
                  Community Access
                </Text>
              </View>
            </View>
          </AnimatedCard>
        </View>

        {/* Toggle Login/Register */}
        <View className="px-6 pt-6">
          <View className="flex-row bg-gray-100 rounded-2xl p-1 mb-6">
            <TouchableOpacity
              onPress={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-xl items-center ${isLogin ? "bg-white shadow-sm" : ""}`}
            >
              <Text
                className={`font-semibold ${isLogin ? "text-green-600" : "text-gray-500"}`}
              >
                Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-xl items-center ${!isLogin ? "bg-white shadow-sm" : ""}`}
            >
              <Text
                className={`font-semibold ${!isLogin ? "text-green-600" : "text-gray-500"}`}
              >
                Register
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Container */}
        <View className="flex-1 px-6 bg-white">
          {isLogin ? (
            // LOGIN FORM
            <AnimatedCard delay={200}>
              <View className="bg-white rounded-3xl p-6 shadow-xl border-2 border-green-200 mb-6">
                <View className="bg-green-500 h-1 rounded-full mb-6" />

                {/* Phone Input */}
                <View className="mb-5">
                  <Text className="text-green-600 font-bold mb-3 text-xs uppercase tracking-wider">
                    Phone No.
                  </Text>
                  <View className="bg-green-50 rounded-2xl border-2 border-green-300 overflow-hidden">
                    <TextInput
                      className="p-4 text-base text-gray-900 font-medium"
                      placeholder="Enter your phone number"
                      placeholderTextColor="#9ca3af"
                      value={id}
                      onChangeText={setId}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View className="mb-6">
                  <Text className="text-green-600 font-bold mb-3 text-xs uppercase tracking-wider">
                    Password
                  </Text>
                  <View className="bg-green-50 rounded-2xl border-2 border-green-300 overflow-hidden">
                    <TextInput
                      className="p-4 text-base text-gray-900 font-medium"
                      placeholder="Enter your password"
                      placeholderTextColor="#9ca3af"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>
                </View>

                {/* Login Button */}
                <TouchableOpacity
                  className="bg-green-500 p-5 rounded-2xl items-center shadow-lg mb-3"
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <View className="flex-row items-center">
                      <Text className="text-white font-bold text-base mr-2">
                        Login to Portal
                      </Text>
                      <Text className="text-white text-lg">→</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </AnimatedCard>
          ) : (
            // REGISTRATION FORM
            <AnimatedCard delay={200}>
              <View className="bg-white rounded-3xl p-6 shadow-xl border-2 border-green-200 mb-6">
                <View className="bg-green-500 h-1 rounded-full mb-6" />

                {/* Full Name */}
                <View className="mb-4">
                  <Text className="text-green-600 font-bold mb-2 text-xs uppercase tracking-wider">
                    Full Name *
                  </Text>
                  <View className="bg-green-50 rounded-2xl border-2 border-green-300 overflow-hidden">
                    <TextInput
                      className="p-3 text-base text-gray-900 font-medium"
                      placeholder="Enter your full name"
                      placeholderTextColor="#9ca3af"
                      value={regData.fullName}
                      onChangeText={(value) =>
                        handleRegDataChange("fullName", value)
                      }
                    />
                  </View>
                </View>

                {/* Email */}
                <View className="mb-4">
                  <Text className="text-green-600 font-bold mb-2 text-xs uppercase tracking-wider">
                    Email *
                  </Text>
                  <View className="bg-green-50 rounded-2xl border-2 border-green-300 overflow-hidden">
                    <TextInput
                      className="p-3 text-base text-gray-900 font-medium"
                      placeholder="your@email.com"
                      placeholderTextColor="#9ca3af"
                      value={regData.email}
                      onChangeText={(value) =>
                        handleRegDataChange("email", value)
                      }
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Phone */}
                <View className="mb-4">
                  <Text className="text-green-600 font-bold mb-2 text-xs uppercase tracking-wider">
                    Phone *
                  </Text>
                  <View className="bg-green-50 rounded-2xl border-2 border-green-300 overflow-hidden">
                    <TextInput
                      className="p-3 text-base text-gray-900 font-medium"
                      placeholder="10-digit number"
                      placeholderTextColor="#9ca3af"
                      value={regData.phone}
                      onChangeText={(value) =>
                        handleRegDataChange("phone", value)
                      }
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                </View>

                {/* Password */}
                <View className="mb-4">
                  <Text className="text-green-600 font-bold mb-2 text-xs uppercase tracking-wider">
                    Password *
                  </Text>
                  <View className="bg-green-50 rounded-2xl border-2 border-green-300 overflow-hidden">
                    <TextInput
                      className="p-3 text-base text-gray-900 font-medium"
                      placeholder="Min 6 characters"
                      placeholderTextColor="#9ca3af"
                      value={regData.password}
                      onChangeText={(value) =>
                        handleRegDataChange("password", value)
                      }
                      secureTextEntry
                    />
                  </View>
                </View>

                {/* Confirm Password */}
                <View className="mb-4">
                  <Text className="text-green-600 font-bold mb-2 text-xs uppercase tracking-wider">
                    Confirm Password *
                  </Text>
                  <View className="bg-green-50 rounded-2xl border-2 border-green-300 overflow-hidden">
                    <TextInput
                      className="p-3 text-base text-gray-900 font-medium"
                      placeholder="Re-enter password"
                      placeholderTextColor="#9ca3af"
                      value={regData.confirmPassword}
                      onChangeText={(value) =>
                        handleRegDataChange("confirmPassword", value)
                      }
                      secureTextEntry
                    />
                  </View>
                </View>

                {/* Address */}
                <View className="mb-4">
                  <Text className="text-green-600 font-bold mb-2 text-xs uppercase tracking-wider">
                    Address *
                  </Text>
                  <View className="bg-green-50 rounded-2xl border-2 border-green-300 overflow-hidden">
                    <TextInput
                      className="p-3 text-base text-gray-900 font-medium"
                      placeholder="Enter your complete address"
                      placeholderTextColor="#9ca3af"
                      value={regData.address}
                      onChangeText={(value) =>
                        handleRegDataChange("address", value)
                      }
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                </View>

                {/* City Selection */}
                <View className="bg-green-50 rounded-2xl border-2 border-green-300 overflow-hidden">
                  <Picker
                    selectedValue={regData.officeId}
                    onValueChange={(itemValue) => handleCityChange(itemValue)}
                    style={{ height: 55, color: "#111827" }} // Height is important for Android
                    dropdownIconColor="#10b981"
                  >
                    <Picker.Item label="-- Choose City --" value="" />

                    {loadingCities ? (
                      <Picker.Item label="Loading cities..." value="" />
                    ) : (
                      // Added optional chaining ?. to ensure map doesn't run on undefined
                      officeList?.map((office) => (
                        <Picker.Item
                          key={office.id || office._id} // Use _id if your backend is MongoDB
                          label={office.name}
                          value={office.id || office._id}
                        />
                      ))
                    )}
                  </Picker>
                </View>

                {/* Pincode */}
                <View className="mb-4">
                  <Text className="text-green-600 font-bold mb-2 text-xs uppercase tracking-wider">
                    Pincode *
                  </Text>
                  <View className="bg-green-50 rounded-2xl border-2 border-green-300 overflow-hidden">
                    <TextInput
                      className="p-3 text-base text-gray-900 font-medium"
                      placeholder="6-digit pincode"
                      placeholderTextColor="#9ca3af"
                      value={regData.pincode}
                      onChangeText={(value) =>
                        handleRegDataChange("pincode", value)
                      }
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                </View>

                {/* Location Section */}
                <View className="bg-green-50 p-4 rounded-2xl border-2 border-green-300 mb-4">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-green-600 font-bold text-xs uppercase tracking-wider">
                      📍 Location Coordinates *
                    </Text>
                    <TouchableOpacity
                      onPress={fetchCurrentLocation}
                      disabled={locationLoading}
                      className="bg-green-600 px-3 py-2 rounded-lg"
                    >
                      {locationLoading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text className="text-white text-xs font-bold">
                          Auto-Fetch
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row gap-2 mb-2">
                    <View className="flex-1">
                      <TextInput
                        className="p-2.5 bg-white border-2 border-green-300 rounded-lg text-gray-900 text-sm"
                        placeholder="Latitude"
                        placeholderTextColor="#9ca3af"
                        value={regData.latitude}
                        onChangeText={(value) =>
                          handleRegDataChange("latitude", value)
                        }
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View className="flex-1">
                      <TextInput
                        className="p-2.5 bg-white border-2 border-green-300 rounded-lg text-gray-900 text-sm"
                        placeholder="Longitude"
                        placeholderTextColor="#9ca3af"
                        value={regData.longitude}
                        onChangeText={(value) =>
                          handleRegDataChange("longitude", value)
                        }
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  {locationError ? (
                    <Text className="text-red-600 text-xs mt-2">
                      {locationError}
                    </Text>
                  ) : null}
                </View>

                {/* Register Button */}
                <TouchableOpacity
                  className="bg-green-500 p-5 rounded-2xl items-center shadow-lg mb-3"
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <View className="flex-row items-center">
                      <Text className="text-white font-bold text-base mr-2">
                        Register Now
                      </Text>
                      <Text className="text-white text-lg">→</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </AnimatedCard>
          )}

          {/* Info Box */}
          <AnimatedCard delay={400}>
            <View className="bg-green-50 border-l-4 border-green-500 rounded-2xl p-5 mb-6">
              <View className="flex-row items-start">
                <View className="bg-green-100 rounded-full p-2 mr-3">
                  <Text className="text-2xl">💡</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-green-900 font-bold text-base mb-2">
                    {isLogin ? "Quick Tip" : "Registration Info"}
                  </Text>
                  <Text className="text-green-700 text-sm leading-5">
                    {isLogin
                      ? "File complaints, track status, and contribute to a cleaner city"
                      : "All fields marked with * are required. Make sure to provide accurate location data."}
                  </Text>
                </View>
              </View>
            </View>
          </AnimatedCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const VehicleLogin = ({ goBack, onLoginSuccess }) => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    await processStrictLogin(
      id,
      password,
      "/staff/login",
      "vehicle",
      onLoginSuccess,
    );
    setLoading(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="pt-6 pb-4 px-6 bg-amber-500">
          <AnimatedCard delay={0}>
            <TouchableOpacity
              onPress={goBack}
              className="flex-row items-center justify-center mb-6 self-start bg-white/20 px-5 py-3 rounded-full"
              activeOpacity={0.8}
            >
              <Text className="text-white text-xl font-bold mr-2 mt-[-2px]">
                ←
              </Text>

              <Text className="text-white font-semibold text-base">Back</Text>
            </TouchableOpacity>
          </AnimatedCard>

          <AnimatedCard delay={100}>
            <View className="items-center mb-6">
              <FloatingElement delay={200}>
                <View className="bg-white w-24 h-24 rounded-3xl justify-center items-center mb-5 shadow-xl">
                  <Text className="text-6xl">🚛</Text>
                </View>
              </FloatingElement>
              <Text className="text-white text-4xl font-bold mb-2">
                Vehicle Staff
              </Text>
              <View className="bg-white/20 px-4 py-2 rounded-full">
                <Text className="text-white text-sm font-semibold">
                  Collection Team
                </Text>
              </View>
            </View>
          </AnimatedCard>
        </View>

        {/* Form Container */}
        <View className="flex-1 px-6 pt-8 bg-white">
          <AnimatedCard delay={200}>
            <View className="bg-white rounded-3xl p-6 shadow-xl border-2 border-amber-200 mb-6">
              <View className="bg-amber-500 h-1 rounded-full mb-6" />

              {/* ID Input */}
              <View className="mb-5">
                <Text className="text-amber-600 font-bold mb-3 text-xs uppercase tracking-wider">
                  Staff ID
                </Text>
                <View className="bg-amber-50 rounded-2xl border-2 border-amber-300 overflow-hidden">
                  <TextInput
                    className="p-4 text-base text-gray-900 font-medium"
                    placeholder="Enter staff ID"
                    placeholderTextColor="#9ca3af"
                    value={id}
                    onChangeText={setId}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className="mb-6">
                <Text className="text-amber-600 font-bold mb-3 text-xs uppercase tracking-wider">
                  Password
                </Text>
                <View className="bg-amber-50 rounded-2xl border-2 border-amber-300 overflow-hidden">
                  <TextInput
                    className="p-4 text-base text-gray-900 font-medium"
                    placeholder="Enter password"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                className="bg-amber-500 p-5 rounded-2xl items-center shadow-lg mb-3"
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <View className="flex-row items-center">
                    <Text className="text-white font-bold text-base mr-2">
                      Start Duty
                    </Text>
                    <Text className="text-white text-lg">→</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </AnimatedCard>

          {/* Info Box */}
          <AnimatedCard delay={300}>
            <View className="bg-amber-50 border-l-4 border-amber-500 rounded-2xl p-5 mb-6">
              <View className="flex-row items-start">
                <View className="bg-amber-100 rounded-full p-2 mr-3">
                  <Text className="text-2xl">⚡</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-amber-900 font-bold text-base mb-2">
                    Remember
                  </Text>
                  <Text className="text-amber-700 text-sm leading-5">
                    Mark attendance after login and follow assigned routes
                  </Text>
                </View>
              </View>
            </View>
          </AnimatedCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const AdminLogin = ({ goBack, onLoginSuccess, isOffice }) => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const theme = isOffice
    ? {
        headerBg: "bg-indigo-600",
        titleColor: "text-white",
        badgeBg: "bg-white/20",
        badgeText: "text-white",
        topBar: "bg-indigo-600",
        border: "border-indigo-200",
        inputBg: "bg-indigo-50",
        inputBorder: "border-indigo-300",
        label: "text-indigo-600",
        button: "bg-indigo-600",
        infoBg: "bg-indigo-50",
        infoBorder: "border-indigo-500",
        infoTitle: "text-indigo-900",
        infoText: "text-indigo-700",
        iconBg: "bg-indigo-100",
        icon: "🏢",
        title: "Office Staff",
        subtitle: "Management Portal",
      }
    : {
        headerBg: "bg-slate-800",
        titleColor: "text-white",
        badgeBg: "bg-white/20",
        badgeText: "text-white",
        topBar: "bg-slate-800",
        border: "border-slate-200",
        inputBg: "bg-slate-50",
        inputBorder: "border-slate-300",
        label: "text-slate-600",
        button: "bg-slate-800",
        infoBg: "bg-slate-50",
        infoBorder: "border-slate-500",
        infoTitle: "text-slate-900",
        infoText: "text-slate-700",
        iconBg: "bg-slate-100",
        icon: "🔐",
        title: "System Admin",
        subtitle: "Control Center",
      };

  const handleLogin = async () => {
    setLoading(true);
    const endpoint = isOffice ? "/office/login" : "/admin/login";
    const role = isOffice ? "office" : "admin";
    await processStrictLogin(id, password, endpoint, role, onLoginSuccess);
    setLoading(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className={`pt-6 pb-4 px-6 ${theme.headerBg}`}>
          <AnimatedCard delay={0}>
            <TouchableOpacity
              onPress={goBack}
              className="flex-row items-center justify-center mb-6 self-start bg-white/20 px-5 py-3 rounded-full"
              activeOpacity={0.8}
            >
              <Text className="text-white text-xl font-bold mr-2 mt-[-2px]">
                ←
              </Text>

              <Text className="text-white font-semibold text-base">Return</Text>
            </TouchableOpacity>
          </AnimatedCard>

          <AnimatedCard delay={100}>
            <View className="items-center mb-6">
              <FloatingElement delay={400}>
                <View className="bg-white w-24 h-24 rounded-3xl justify-center items-center mb-5 shadow-xl">
                  <Text className="text-6xl">{theme.icon}</Text>
                </View>
              </FloatingElement>
              <Text className={`${theme.titleColor} text-4xl font-bold mb-2`}>
                {theme.title}
              </Text>
              <View className={`${theme.badgeBg} px-4 py-2 rounded-full`}>
                <Text className={`${theme.badgeText} text-sm font-semibold`}>
                  {theme.subtitle}
                </Text>
              </View>
            </View>
          </AnimatedCard>
        </View>

        {/* Form Container */}
        <View className="flex-1 px-6 pt-8 bg-white">
          <AnimatedCard delay={200}>
            <View
              className={`bg-white rounded-3xl p-6 shadow-xl border-2 ${theme.border} mb-6`}
            >
              <View className={`${theme.topBar} h-1 rounded-full mb-6`} />

              {/* Username Input */}
              <View className="mb-5">
                <Text
                  className={`${theme.label} font-bold mb-3 text-xs uppercase tracking-wider`}
                >
                  Username
                </Text>
                <View
                  className={`${theme.inputBg} rounded-2xl border-2 ${theme.inputBorder} overflow-hidden`}
                >
                  <TextInput
                    className="p-4 text-base text-gray-900 font-medium"
                    placeholder="Enter username"
                    placeholderTextColor="#9ca3af"
                    value={id}
                    onChangeText={setId}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className="mb-6">
                <Text
                  className={`${theme.label} font-bold mb-3 text-xs uppercase tracking-wider`}
                >
                  Password
                </Text>
                <View
                  className={`${theme.inputBg} rounded-2xl border-2 ${theme.inputBorder} overflow-hidden`}
                >
                  <TextInput
                    className="p-4 text-base text-gray-900 font-medium"
                    placeholder="Enter password"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                className={`${theme.button} p-5 rounded-2xl items-center shadow-lg mb-3`}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <View className="flex-row items-center">
                    <Text className="text-white font-bold text-base mr-2">
                      AUTHENTICATE
                    </Text>
                    <Text className="text-white text-lg">→</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </AnimatedCard>

          {/* Security Notice */}
          <AnimatedCard delay={300}>
            <View
              className={`${theme.infoBg} border-l-4 ${theme.infoBorder} rounded-2xl p-5 mb-6`}
            >
              <View className="flex-row items-start">
                <View className={`${theme.iconBg} rounded-full p-2 mr-3`}>
                  <Text className="text-2xl">🔒</Text>
                </View>
                <View className="flex-1">
                  <Text
                    className={`${theme.infoTitle} font-bold text-base mb-2`}
                  >
                    Secure Session
                  </Text>
                  <Text className={`${theme.infoText} text-sm leading-5`}>
                    Your connection is encrypted and monitored for security
                  </Text>
                </View>
              </View>
            </View>
          </AnimatedCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- PLACEHOLDER DASHBOARDS (UNCHANGED) ---
const Citizen = ({ goBack }) => (
  <SafeAreaView className="flex-1 bg-green-50 justify-center items-center">
    <Text className="text-2xl font-bold">Citizen Dashboard</Text>
    <TouchableOpacity onPress={goBack} className="mt-4 bg-red-500 p-3 rounded">
      <Text className="text-white">Logout</Text>
    </TouchableOpacity>
  </SafeAreaView>
);

const Vehicle = ({ goBack }) => (
  <SafeAreaView className="flex-1 bg-amber-50 justify-center items-center">
    <Text className="text-2xl font-bold">Vehicle Dashboard</Text>
    <TouchableOpacity onPress={goBack} className="mt-4 bg-red-500 p-3 rounded">
      <Text className="text-white">Logout</Text>
    </TouchableOpacity>
  </SafeAreaView>
);

// --- MAIN APP WITH COLORFUL HOME SCREEN ---
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

      if (targetDashboard === "adminDashboard") {
        if (!isAdmin) {
          Alert.alert("Access Denied", "Only for System Administrators.");
          return;
        }
      }

      if (targetDashboard === "officeDashboard") {
        if (role !== "office" && !isAdmin) {
          Alert.alert("Access Denied", "Only for Office Staff.");
          return;
        }
      }

      if (targetDashboard === "vehicle") {
        if (!["driver", "helper", "supervisor"].includes(role) && !isAdmin) {
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

  if (loading)
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );

  // Navigation routing (unchanged logic)
  if (screen === "adminDashboard") {
    return <AdminPage isOffice={false} goBack={handleLogout} />;
  }

  if (screen === "officeDashboard") {
    return <OfficeDashboard isOffice={true} goBack={handleLogout} />;
  }

  if (screen === "citizen") return <CitizenDashboard goBack={handleLogout} />;
  if (screen === "vehicle") return <StaffDashboard goBack={handleLogout} />;
  if (screen === "register")
    return <UserRegister goBack={() => setScreen("citizenLogin")} />;

  // Login Screens
  if (screen === "citizenLogin")
    return (
      <CitizenLogin
        goBack={() => setScreen("home")}
        onLoginSuccess={(next) => setScreen(next)}
        onRegisterPress={() => setScreen("register")}
      />
    );
  if (screen === "vehicleLogin")
    return (
      <VehicleLogin
        goBack={() => setScreen("home")}
        onLoginSuccess={(next) => setScreen(next)}
      />
    );
  if (screen === "officeLogin")
    return (
      <AdminLogin
        isOffice={true}
        goBack={() => setScreen("home")}
        onLoginSuccess={(next) => setScreen(next)}
      />
    );
  if (screen === "adminLogin")
    return (
      <AdminLogin
        isOffice={false}
        goBack={() => setScreen("home")}
        onLoginSuccess={(next) => setScreen(next)}
      />
    );

  // --- VIBRANT HOME SCREEN ---
  const RoleButton = ({
    title,
    icon,
    colorClass,
    bgLight,
    description,
    delay,
    targetDashboard,
    targetLogin,
  }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      }).start();
    };

    return (
      <AnimatedCard delay={delay}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            onPress={() => navigateWithGuard(targetDashboard, targetLogin)}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
            className={`bg-white rounded-3xl mb-4 shadow-lg border-2 ${bgLight} overflow-hidden`}
          >
            <View className="flex-row items-center p-5">
              {/* Icon Container */}
              <View
                className={`${colorClass} w-16 h-16 rounded-2xl justify-center items-center mr-4 shadow-md`}
              >
                <Text className="text-3xl">{icon}</Text>
              </View>

              {/* Content */}
              <View className="flex-1">
                <Text className="text-gray-900 text-lg font-bold mb-1">
                  {title}
                </Text>
                <Text className="text-gray-600 text-sm">{description}</Text>
              </View>

              {/* Arrow */}
              <View
                className={`${colorClass} w-11 h-11 rounded-xl justify-center items-center shadow-sm`}
              >
                <Text className="text-white font-bold text-xl">→</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </AnimatedCard>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header with Green Accent */}
      <View className="pt-12 pb-6 px-6 bg-green-500">
        <AnimatedCard delay={0}>
          <View className="items-center mb-4">
            <FloatingElement delay={0}>
              <View className="bg-white w-20 h-20 rounded-3xl justify-center items-center mb-4 shadow-xl">
                <Text className="text-4xl">🌿</Text>
              </View>
            </FloatingElement>
            <Text className="text-white text-5xl font-bold mb-2">
              SafaiMitra
            </Text>
            <View className="bg-white/20 px-5 py-2 rounded-full">
              <Text className="text-white text-sm font-bold">
                Clean City Initiative
              </Text>
            </View>
          </View>
        </AnimatedCard>
      </View>

      {/* Decorative Divider */}
      <View className="bg-green-500 h-1" />

      {/* Content Container */}
      <ScrollView
        className="flex-1 px-6 pt-8 bg-white"
        showsVerticalScrollIndicator={false}
      >
        <AnimatedCard delay={150}>
          <View className="mb-6">
            <Text className="text-gray-900 text-2xl font-bold mb-2">
              Choose Your Portal
            </Text>
            <Text className="text-gray-600 text-sm">
              Select your role to access the system
            </Text>
          </View>
        </AnimatedCard>

        {/* Role Buttons */}
        <RoleButton
          title="Citizen Portal"
          description="File & Track Complaints"
          icon="👤"
          colorClass="bg-green-500"
          bgLight="border-green-200"
          targetDashboard="citizen"
          targetLogin="citizenLogin"
          delay={200}
        />

        <RoleButton
          title="Vehicle Staff"
          description="Route & Collection Duty"
          icon="🚛"
          colorClass="bg-amber-500"
          bgLight="border-amber-200"
          targetDashboard="vehicle"
          targetLogin="vehicleLogin"
          delay={250}
        />

        <RoleButton
          title="Office Staff"
          description="Operations Management"
          icon="🏢"
          colorClass="bg-indigo-600"
          bgLight="border-indigo-200"
          targetDashboard="officeDashboard"
          targetLogin="officeLogin"
          delay={300}
        />

        <RoleButton
          title="System Admin"
          description="Full System Control"
          icon="🔐"
          colorClass="bg-slate-800"
          bgLight="border-slate-200"
          targetDashboard="adminDashboard"
          targetLogin="adminLogin"
          delay={350}
        />

        {/* Footer */}
        <View className="mt-6 mb-10">
          <AnimatedCard delay={400}>
            <View className="items-center mb-4">
              <TouchableOpacity
                onPress={handleLogout}
                className="bg-gray-100 rounded-full px-8 py-3 border border-gray-200"
              >
                <Text className="text-gray-700 text-sm font-bold">
                  Reset Session
                </Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>

          <AnimatedCard delay={450}>
            <View className="items-center">
              <View className="bg-green-500 h-1 w-32 rounded-full mb-3" />
              <Text className="text-gray-400 text-xs font-semibold mb-1">
                VERSION 2.0
              </Text>
              <Text className="text-gray-400 text-xs">
                Powered by SafaiMitra
              </Text>
            </View>
          </AnimatedCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
