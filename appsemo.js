import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, SafeAreaView, TextInput, Alert } from "react-native";

// Placeholder screen components
const Citizen = ({ goBack }) => (
  <SafeAreaView style={styles.container}>
    <View style={styles.screenHeader}>
      <TouchableOpacity onPress={goBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.screenTitle}>Citizen Dashboard</Text>
    </View>
  </SafeAreaView>
);

const Vehicle = ({ goBack }) => (
  <SafeAreaView style={styles.container}>
    <View style={styles.screenHeader}>
      <TouchableOpacity onPress={goBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.screenTitle}>Vehicle Staff Dashboard</Text>
    </View>
  </SafeAreaView>
);

const Admin = ({ goBack }) => (
  <SafeAreaView style={styles.container}>
    <View style={styles.screenHeader}>
      <TouchableOpacity onPress={goBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.screenTitle}>Admin Dashboard</Text>
    </View>
  </SafeAreaView>
);

// Login Screen Component
const LoginScreen = ({ role, goBack, onLoginSuccess }) => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (!id || !password) {
      Alert.alert("Error", "Please enter both ID and Password");
      return;
    }
    // Here you would validate credentials with your backend
    Alert.alert("Success", "Login successful!");
    onLoginSuccess();
  };

  const handleRegister = () => {
    Alert.alert("Register", "Registration form will open here");
    // Navigate to registration screen
  };

  const roleDetails = {
    citizen: { title: "Citizen Login", icon: "👤", color: "#dcfce7" },
    vehicle: { title: "Vehicle Staff Login", icon: "🚛", color: "#fef9c3" },
    admin: { title: "Admin Login", icon: "🏢", color: "#dbeafe" }
  };

  const currentRole = roleDetails[role];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      
      {/* Header */}
      <View style={styles.loginHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={[styles.loginIconContainer, { backgroundColor: currentRole.color }]}>
          <Text style={styles.loginIcon}>{currentRole.icon}</Text>
        </View>
        <Text style={styles.loginTitle}>{currentRole.title}</Text>
        <Text style={styles.loginSubtitle}>Enter your credentials to continue</Text>
      </View>

      {/* Login Form */}
      <View style={styles.loginContent}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>ID / Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your ID"
            placeholderTextColor="#9CA3AF"
            value={id}
            onChangeText={setId}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>

        {/* Register Button - Only for Citizen */}
        {role === "citizen" && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity 
              style={styles.registerButton} 
              onPress={handleRegister}
            >
              <Text style={styles.registerButtonText}>Register Now</Text>
            </TouchableOpacity>

            <Text style={styles.registerHint}>
              New user? Create your citizen account
            </Text>
          </>
        )}

        {/* Note for Admin and Vehicle */}
        {role !== "citizen" && (
          <Text style={styles.adminNote}>
            Note: {role === "admin" ? "Admin" : "Vehicle staff"} accounts are created manually by administrators
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

export default function App() {
  const [screen, setScreen] = useState("home");

  // Navigation Logic
  if (screen === "citizen") return <Citizen goBack={() => setScreen("home")} />;
  if (screen === "vehicle") return <Vehicle goBack={() => setScreen("home")} />;
  if (screen === "admin") return <Admin goBack={() => setScreen("home")} />;
  
  // Login Screens
  if (screen === "citizenLogin") {
    return (
      <LoginScreen 
        role="citizen" 
        goBack={() => setScreen("home")}
        onLoginSuccess={() => setScreen("citizen")}
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

  // Custom Button Component
  const RoleButton = ({ title, icon, color, onPress, description }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress} 
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{description}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>SafaiMitra</Text>
        <Text style={styles.tagline}>Smart Waste Management System</Text>
      </View>

      {/* Content Section */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Select Your Profile</Text>

        <RoleButton 
          title="Citizen" 
          description="Report waste & track vehicles"
          icon="👤" 
          color="#dcfce7"
          onPress={() => setScreen("citizenLogin")} 
        />

        <RoleButton 
          title="Vehicle Staff" 
          description="Route navigation & updates"
          icon="🚛" 
          color="#fef9c3"
          onPress={() => setScreen("vehicleLogin")} 
        />

        <RoleButton 
          title="Admin / Office" 
          description="Dashboard & monitoring"
          icon="🏢" 
          color="#dbeafe"
          onPress={() => setScreen("adminLogin")} 
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by CleanBin AI</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E3A8A",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 25,
    backgroundColor: "#1E3A8A",
  },
  appTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    color: "#bfdbfe",
    marginTop: 5,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingTop: 35,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1F2937",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  arrow: {
    fontSize: 24,
    color: "#CBD5E1",
    fontWeight: "300",
  },
  footer: {
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  // Login Screen Styles
  loginHeader: {
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 25,
    backgroundColor: "#1E3A8A",
    alignItems: "center",
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loginIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  loginIcon: {
    fontSize: 40,
  },
  loginTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 5,
  },
  loginSubtitle: {
    fontSize: 14,
    color: "#bfdbfe",
    fontWeight: "500",
  },
  loginContent: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingTop: 35,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  loginButton: {
    backgroundColor: "#1E3A8A",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 25,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#D1D5DB",
  },
  dividerText: {
    marginHorizontal: 15,
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },
  registerButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#1E3A8A",
  },
  registerButtonText: {
    color: "#1E3A8A",
    fontSize: 16,
    fontWeight: "700",
  },
  registerHint: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 13,
    marginTop: 10,
  },
  adminNote: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 13,
    marginTop: 20,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  screenHeader: {
    padding: 25,
    backgroundColor: "#1E3A8A",
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 10,
  },
});