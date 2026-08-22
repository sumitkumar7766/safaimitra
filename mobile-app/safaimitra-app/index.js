import React, { Component } from "react";
import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import { registerRootComponent } from "expo";
import { SafeAreaProvider } from "react-native-safe-area-context";
import App from "./App";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("SafaiMitra Global Caught Error:", error, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: "#0F172A", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
          <Text style={{ fontSize: 32, marginBottom: 12 }}>🛡️</Text>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: "#FFFFFF", marginBottom: 8, textAlign: "center" }}>
            SafaiMitra Recovered
          </Text>
          <Text style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", marginBottom: 24, lineHeight: 18 }}>
            {this.state.error?.message || "An unexpected error occurred during startup. Tap below to reload the portal."}
          </Text>
          <TouchableOpacity
            onPress={this.handleRestart}
            style={{ backgroundColor: "#10B981", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 14 }}>Restart Application</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function Root() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

registerRootComponent(Root);

