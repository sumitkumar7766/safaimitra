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
  Dimensions
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import UserRegister from "./screens/userRegister";

// Animated Card Component
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

// Placeholder screen components with animations
const Citizen = ({ goBack }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-blue-900">
      <Animated.View 
        style={{ flex: 1, transform: [{ scale: scaleAnim }] }}
      >
        <View className="p-6 bg-blue-900">
          <TouchableOpacity onPress={goBack} className="mb-4">
            <Text className="text-white text-base font-semibold">← Back</Text>
          </TouchableOpacity>
          <Text className="text-white text-3xl font-bold">Citizen Dashboard</Text>
          <Text className="text-blue-200 text-sm mt-2">Welcome to your personal dashboard</Text>
        </View>
        <View className="flex-1 bg-gray-50 rounded-t-3xl mt-6 p-6">
          <Text className="text-gray-800 text-lg font-bold mb-4">Quick Actions</Text>
          {/* Add dashboard content here */}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const Vehicle = ({ goBack }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-blue-900">
      <Animated.View 
        style={{ flex: 1, transform: [{ scale: scaleAnim }] }}
      >
        <View className="p-6 bg-blue-900">
          <TouchableOpacity onPress={goBack} className="mb-4">
            <Text className="text-white text-base font-semibold">← Back</Text>
          </TouchableOpacity>
          <Text className="text-white text-3xl font-bold">Vehicle Staff Dashboard</Text>
          <Text className="text-blue-200 text-sm mt-2">Manage routes and updates</Text>
        </View>
        <View className="flex-1 bg-gray-50 rounded-t-3xl mt-6 p-6">
          <Text className="text-gray-800 text-lg font-bold mb-4">Today's Routes</Text>
          {/* Add dashboard content here */}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const Admin = ({ goBack }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-blue-900">
      <Animated.View 
        style={{ flex: 1, transform: [{ scale: scaleAnim }] }}
      >
        <View className="p-6 bg-blue-900">
          <TouchableOpacity onPress={goBack} className="mb-4">
            <Text className="text-white text-base font-semibold">← Back</Text>
          </TouchableOpacity>
          <Text className="text-white text-3xl font-bold">Admin Dashboard</Text>
          <Text className="text-blue-200 text-sm mt-2">Monitor and manage operations</Text>
        </View>
        <View className="flex-1 bg-gray-50 rounded-t-3xl mt-6 p-6">
          <Text className="text-gray-800 text-lg font-bold mb-4">System Overview</Text>
          {/* Add dashboard content here */}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

// Login Screen Component with animations
const LoginScreen = ({ role, goBack, onLoginSuccess, onRegisterPress }) => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [focusedInput, setFocusedInput] = useState(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const iconScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        delay: 200,
        tension: 50,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = () => {
    if (!id || !password) {
      Alert.alert("Error", "Please enter both ID and Password");
      return;
    }
    Alert.alert("Success", "Login successful!");
    onLoginSuccess();
  };


  const roleDetails = {
    citizen: { 
      title: "Citizen Login", 
      icon: "👤", 
      bgColor: "bg-gradient-to-br from-green-400 to-emerald-500",
      iconBg: "bg-green-100"
    },
    vehicle: { 
      title: "Vehicle Staff Login", 
      icon: "🚛", 
      bgColor: "bg-gradient-to-br from-yellow-400 to-amber-500",
      iconBg: "bg-yellow-100"
    },
    admin: { 
      title: "Admin Login", 
      icon: "🏢", 
      bgColor: "bg-gradient-to-br from-blue-400 to-indigo-500",
      iconBg: "bg-blue-100"
    }
  };

  const currentRole = roleDetails[role];

  return (
    <SafeAreaView className="flex-1 bg-green-500">
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View 
          style={{ opacity: fadeAnim }}
          className="pt-10 pb-8 px-6 bg-green-500"
        >
          <TouchableOpacity onPress={goBack} className="mb-6">
            <Text className="text-blue-900 text-base font-semibold">← Back</Text>
          </TouchableOpacity>
          
          <View className="items-center">
            <Animated.View 
              style={{ transform: [{ scale: iconScale }] }}
              className={`w-20 h-20 rounded-2xl justify-center items-center mb-4 ${currentRole.iconBg}`}
            >
              <Text className="text-4xl">{currentRole.icon}</Text>
            </Animated.View>
            <Text className="text-black text-3xl font-bold mb-2">{currentRole.title}</Text>
            <Text className="text-black text-sm font-medium">Enter your credentials to continue</Text>
          </View>
        </Animated.View>

        {/* Login Form */}
        <Animated.View 
          style={{ 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
          className="flex-1 bg-gray-50 rounded-t-3xl px-6 pt-8 pb-6"
        >
          {/* ID Input */}
          <View className="mb-5">
            <Text className="text-gray-700 text-sm font-semibold mb-2">ID / Username</Text>
            <View className={`bg-white rounded-xl border-2 ${focusedInput === 'id' ? 'border-blue-500' : 'border-gray-200'}`}>
              <TextInput
                className="px-4 py-4 text-base text-gray-800"
                placeholder="Enter your ID"
                placeholderTextColor="#9CA3AF"
                value={id}
                onChangeText={setId}
                onFocus={() => setFocusedInput('id')}
                onBlur={() => setFocusedInput(null)}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password Input */}
          <View className="mb-6">
            <Text className="text-gray-700 text-sm font-semibold mb-2">Password</Text>
            <View className={`bg-white rounded-xl border-2 ${focusedInput === 'password' ? 'border-blue-500' : 'border-gray-200'}`}>
              <TextInput
                className="px-4 py-4 text-base text-gray-800"
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                secureTextEntry
              />
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity 
            className="bg-blue-900 rounded-xl py-4 items-center shadow-lg mb-4"
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <Text className="text-white text-base font-bold">Login</Text>
          </TouchableOpacity>

          {/* Register Section - Only for Citizen */}
          {role === "citizen" && (
            <>
              <View className="flex-row items-center my-6">
                <View className="flex-1 h-px bg-gray-300" />
                <Text className="mx-4 text-gray-500 text-sm font-semibold">OR</Text>
                <View className="flex-1 h-px bg-gray-300" />
              </View>

              <TouchableOpacity 
                className="bg-white border-2 border-blue-900 rounded-xl py-4 items-center mb-3"
                onPress={onRegisterPress}
                activeOpacity={0.8}
              >
                <Text className="text-blue-900 text-base font-bold">Register Now</Text>
              </TouchableOpacity>

              <Text className="text-center text-gray-500 text-xs">
                New user? Create your citizen account
              </Text>
            </>
          )}

          {/* Note for Admin and Vehicle */}
          {role !== "citizen" && (
            <View className="bg-blue-50 rounded-xl p-4 mt-4">
              <Text className="text-center text-gray-600 text-xs leading-5">
                ℹ️ Note: {role === "admin" ? "Admin" : "Vehicle staff"} accounts are created manually by administrators
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default function App() {
  const [screen, setScreen] = useState("home");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (screen === "home") {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(headerScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [screen]);

  // Navigation Logic
  if (screen === "citizen") return <Citizen goBack={() => setScreen("home")} />;
  if (screen === "vehicle") return <Vehicle goBack={() => setScreen("home")} />;
  if (screen === "admin") return <Admin goBack={() => setScreen("home")} />;
  if (screen === "register") return <UserRegister goBack={() => setScreen("citizenLogin")} />;
  
  // Login Screens
  if (screen === "citizenLogin") {
    return (
      <LoginScreen 
        role="citizen" 
        goBack={() => setScreen("home")}
        onLoginSuccess={() => setScreen("citizen")}
        // Pass the navigation function here
        onRegisterPress={() => setScreen("register")} 
      />
    );
  }
  if (screen === "vehicleLogin") {
    return (
      <LoginScreen 
        role="vehicle" 
        goBack={() => setScreen("home")}
        onLoginSuccess={() => setScreen("vehicle")}
      />
    );
  }
  if (screen === "adminLogin") {
    return (
      <LoginScreen 
        role="admin" 
        goBack={() => setScreen("home")}
        onLoginSuccess={() => setScreen("admin")}
      />
    );
  }
  if (screen === "register") {
    return <UserRegister goBack={() => setScreen("citizenLogin")} />;
  }

  // Custom Button Component with hover effect
  const RoleButton = ({ title, icon, color, onPress, description, delay }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <AnimatedCard delay={delay}>
        <TouchableOpacity 
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <Animated.View 
            style={{ transform: [{ scale: scaleAnim }] }}
            className="flex-row items-center bg-white p-4 rounded-2xl mb-4 shadow-md"
          >
            <View className={`w-14 h-14 rounded-xl justify-center items-center mr-4 ${color}`}>
              <Text className="text-3xl">{icon}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-gray-900 text-lg font-bold">{title}</Text>
              <Text className="text-gray-500 text-xs mt-1">{description}</Text>
            </View>
            <Text className="text-gray-300 text-2xl font-light">›</Text>
          </Animated.View>
        </TouchableOpacity>
      </AnimatedCard>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-green-500">
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      
      {/* Header Section */}
      <Animated.View 
        style={{ 
          opacity: fadeAnim,
          transform: [{ scale: headerScale }]
        }}
        className="pt-16 pb-10 px-6 bg-green-500"
      >
        <View className="items-center mb-4">
          <View className="bg-blue-800 px-6 py-3 rounded-full mb-4">
            <Text className="text-white text-sm font-semibold tracking-wide ">♻️ SMART SOLUTION</Text>
          </View>
          <Text className="text-white text-4xl font-bold tracking-tight">SafaiMitra</Text>
          <Text className="text-black text-sm mt-2 font-medium">Smart Waste Management System</Text>
        </View>
      </Animated.View>

      {/* Content Section */}
      <View className="flex-1 bg-gray-50 rounded-t-3xl px-6 pt-8 shadow-2xl">
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text className="text-gray-800 text-xl font-bold mb-6">Select Your Profile</Text>
        </Animated.View>

        <RoleButton 
          title="Citizen" 
          description="Report waste & track vehicles"
          icon="👤" 
          color="bg-green-100"
          onPress={() => setScreen("citizenLogin")}
          delay={100}
        />

        <RoleButton 
          title="Vehicle Staff" 
          description="Route navigation & updates"
          icon="🚛" 
          color="bg-yellow-100"
          onPress={() => setScreen("vehicleLogin")}
          delay={200}
        />

        <RoleButton 
          title="Admin / Office" 
          description="Dashboard & monitoring"
          icon="🏢" 
          color="bg-blue-100"
          onPress={() => setScreen("adminLogin")}
          delay={300}
        />

        {/* Footer */}
        <Animated.View 
          style={{ opacity: fadeAnim }}
          className="items-center mt-8 pb-4"
        >
          <View className="bg-gray-200 px-4 py-2 rounded-full">
            <Text className="text-gray-600 text-xs font-semibold">⚡ Powered by CleanBin AI</Text>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}