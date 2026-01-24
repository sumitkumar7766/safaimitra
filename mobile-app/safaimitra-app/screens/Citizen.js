import React, { useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  ScrollView,
  StatusBar,
  Alert,
  Dimensions
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from "expo-image-picker";
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';

const { width } = Dimensions.get('window');

export default function Citizen({ goBack }) {
  const [image, setImage] = useState(null);
  const [status, setStatus] = useState("waiting");
  const [address, setAddress] = useState("Fetching your location...");
  const [showMap, setShowMap] = useState(true);
  const [selectedTab, setSelectedTab] = useState("report"); // "report" or "track"

  // Simulate location fetch
  React.useEffect(() => {
    setTimeout(() => setAddress("Sector 4, Main Market, Bhopal"), 1500);
  }, []);

  // Mock data for nearby bins and vehicles
  const nearbyBins = [
    {
      id: 1,
      name: "Sector 4 Market",
      coordinates: { latitude: 23.2599, longitude: 77.4126 },
      status: "clean",
      cleanedAt: "8:30 AM Today",
      vehicle: "MH-09-AB-1234"
    },
    {
      id: 2,
      name: "Main Road Junction",
      coordinates: { latitude: 23.2620, longitude: 77.4150 },
      status: "overflow",
      reportedAt: "2 hours ago",
      vehicle: "Not cleaned yet"
    },
    {
      id: 3,
      name: "New Market Area",
      coordinates: { latitude: 23.2580, longitude: 77.4100 },
      status: "clean",
      cleanedAt: "9:15 AM Today",
      vehicle: "MH-09-AB-5678"
    },
    {
      id: 4,
      name: "Your Location",
      coordinates: { latitude: 23.2599, longitude: 77.4126 },
      status: "pending",
      reportedAt: "Waiting",
      vehicle: "On the way"
    },
  ];

  const activeVehicles = [
    {
      id: 1,
      number: "MH-09-AB-1234",
      coordinates: { latitude: 23.2645, longitude: 77.4186 },
      status: "active",
      lastStop: "Zone-A Ward-12",
      stopsCompleted: 3
    },
    {
      id: 2,
      number: "MH-09-AB-5678",
      coordinates: { latitude: 23.2520, longitude: 77.4050 },
      status: "active",
      lastStop: "Kolar Road",
      stopsCompleted: 4
    },
  ];

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ 
      quality: 0.7,
      allowsEditing: true 
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setStatus("ready");
    }
  };

  const handleSubmit = () => {
    if (!image) {
      Alert.alert("Photo Required", "📸 Please take a photo of the issue first!");
      return;
    }
    setStatus("submitted");
    Alert.alert("Success!", "✅ Thank you! Your complaint has been registered successfully. You can track the status below.");
  };

  const handleRetake = () => {
    setImage(null);
    setStatus("waiting");
  };

  const getMarkerColor = (status) => {
    switch(status) {
      case "clean": return "#10b981";
      case "overflow": return "#f59e0b";
      case "pending": return "#6b7280";
      default: return "#9ca3af";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>SafaiMitra Citizen</Text>
          <Text style={styles.headerSubtitle}>Report & Track Cleanliness</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === "report" && styles.tabActive]}
          onPress={() => setSelectedTab("report")}
        >
          <Text style={[styles.tabText, selectedTab === "report" && styles.tabTextActive]}>
            📸 Report Issue
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === "track" && styles.tabActive]}
          onPress={() => setSelectedTab("track")}
        >
          <Text style={[styles.tabText, selectedTab === "track" && styles.tabTextActive]}>
            🗺️ Track Status
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        
        {selectedTab === "report" ? (
          <>
            {/* Step 1: Photo Card */}
            <View style={styles.card}>
              <View style={[styles.stepHeader, styles.stepHeaderOrange]}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>1</Text>
                </View>
                <View style={styles.stepTextContainer}>
                  <Text style={styles.stepTitle}>Take a Photo</Text>
                  <Text style={styles.stepSubtitle}>Click a clear picture of the problem</Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                <TouchableOpacity onPress={takePhoto} style={styles.imageContainer}>
                  {image ? (
                    <Image source={{ uri: image }} style={styles.image} />
                  ) : (
                    <View style={styles.placeholder}>
                      <View style={styles.cameraIconCircle}>
                        <Text style={styles.cameraIcon}>📸</Text>
                      </View>
                      <Text style={styles.placeholderTitle}>Tap to Open Camera</Text>
                      <Text style={styles.placeholderText}>Take a photo of the overflowing bin or dirty area</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {image && (
                  <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
                    <Text style={styles.retakeText}>🔄 Take Another Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Step 2: Details Card */}
            <View style={styles.card}>
              <View style={[styles.stepHeader, styles.stepHeaderGreen]}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>2</Text>
                </View>
                <View style={styles.stepTextContainer}>
                  <Text style={styles.stepTitle}>Review Details</Text>
                  <Text style={styles.stepSubtitle}>Check location and status</Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                {/* Location Info */}
                <View style={styles.infoBox}>
                  <View style={styles.iconCircle}>
                    <Text style={styles.iconEmoji}>📍</Text>
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Your Location</Text>
                    <Text style={styles.infoValue}>{address}</Text>
                  </View>
                </View>

                {/* Status Info */}
                <View style={[
                  styles.infoBox,
                  { backgroundColor: 
                    status === "submitted" ? "#dcfce7" : 
                    status === "ready" ? "#fef3c7" : 
                    "#f3f4f6" 
                  }
                ]}>
                  <View style={[
                    styles.iconCircle,
                    { backgroundColor: 
                      status === "submitted" ? "#10b981" : 
                      status === "ready" ? "#f59e0b" : 
                      "#9ca3af" 
                    }
                  ]}>
                    <Text style={styles.iconEmoji}>
                      {status === "submitted" ? "✅" : status === "ready" ? "⚡" : "⏳"}
                    </Text>
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Status</Text>
                    <Text style={[
                      styles.infoValue,
                      { color: 
                        status === "submitted" ? "#059669" : 
                        status === "ready" ? "#d97706" : 
                        "#6b7280" 
                      }
                    ]}>
                      {status === "submitted" 
                        ? "Successfully Submitted!" 
                        : status === "ready"
                        ? "Ready to Submit"
                        : "Waiting for Photo"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Tips Card */}
            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>💡 Quick Tips</Text>
              <View style={styles.tipsList}>
                <View style={styles.tipItem}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>Take a clear photo showing the problem</Text>
                </View>
                <View style={styles.tipItem}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>Your location is automatically detected</Text>
                </View>
                <View style={styles.tipItem}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>Track cleaning status in real-time</Text>
                </View>
                <View style={styles.tipItem}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>Get SMS updates on your complaint</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Tracking Section */}
            
            {/* Map View */}
            <View style={styles.mapCard}>
              <View style={styles.mapHeader}>
                <Text style={styles.mapTitle}>🗺️ Live Area Status</Text>
                <Text style={styles.mapSubtitle}>See cleaned bins and active vehicles in your area</Text>
              </View>
              
              <View style={styles.mapContainer}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: 23.2599,
                    longitude: 77.4126,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }}
                >
                  {/* Your Location Circle */}
                  <Circle
                    center={{ latitude: 23.2599, longitude: 77.4126 }}
                    radius={500}
                    strokeColor="rgba(59, 130, 246, 0.5)"
                    fillColor="rgba(59, 130, 246, 0.1)"
                    strokeWidth={2}
                  />

                  {/* Bin Status Markers */}
                  {nearbyBins.map((bin) => (
                    <Marker
                      key={bin.id}
                      coordinate={bin.coordinates}
                      title={bin.name}
                      description={bin.status === "clean" 
                        ? `✅ Cleaned at ${bin.cleanedAt}` 
                        : bin.status === "overflow"
                        ? `⚠️ Overflow - ${bin.reportedAt}`
                        : "⏳ Pending"}
                    >
                      <View style={[
                        styles.customMarker,
                        { backgroundColor: getMarkerColor(bin.status) }
                      ]}>
                        <Text style={styles.markerText}>
                          {bin.status === "clean" ? "✓" : 
                           bin.status === "overflow" ? "!" : "⏳"}
                        </Text>
                      </View>
                    </Marker>
                  ))}

                  {/* Active Vehicle Markers */}
                  {activeVehicles.map((vehicle) => (
                    <Marker
                      key={vehicle.id}
                      coordinate={vehicle.coordinates}
                      title={`Vehicle ${vehicle.number}`}
                      description={`Active • ${vehicle.stopsCompleted} stops completed`}
                    >
                      <View style={styles.vehicleMarker}>
                        <Text style={styles.vehicleMarkerText}>🚛</Text>
                      </View>
                    </Marker>
                  ))}
                </MapView>
              </View>

              {/* Map Legend */}
              <View style={styles.mapLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#10b981" }]} />
                  <Text style={styles.legendText}>Clean</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#f59e0b" }]} />
                  <Text style={styles.legendText}>Overflow</Text>
                </View>
                <View style={styles.legendItem}>
                  <Text style={styles.legendText}>🚛</Text>
                  <Text style={styles.legendText}>Vehicle</Text>
                </View>
              </View>
            </View>

            {/* Today's Status Card */}
            <View style={styles.statusCard}>
              <Text style={styles.statusCardTitle}>📊 Today's Status in Your Area</Text>
              
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statIcon}>✅</Text>
                  <Text style={styles.statNumber}>3</Text>
                  <Text style={styles.statLabel}>Cleaned Today</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statIcon}>🚛</Text>
                  <Text style={styles.statNumber}>2</Text>
                  <Text style={styles.statLabel}>Vehicles Active</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statIcon}>⚠️</Text>
                  <Text style={styles.statNumber}>1</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
              </View>
            </View>

            {/* Nearby Bins List */}
            <View style={styles.binsListCard}>
              <Text style={styles.binsListTitle}>📍 Nearby Collection Points</Text>
              
              {nearbyBins.map((bin) => (
                <View key={bin.id} style={styles.binItem}>
                  <View style={[
                    styles.binIcon,
                    { backgroundColor: 
                      bin.status === "clean" ? "#D1FAE5" :
                      bin.status === "overflow" ? "#FEF3C7" : "#F3F4F6"
                    }
                  ]}>
                    <Text style={styles.binEmoji}>
                      {bin.status === "clean" ? "✅" :
                       bin.status === "overflow" ? "⚠️" : "⏳"}
                    </Text>
                  </View>
                  
                  <View style={styles.binInfo}>
                    <Text style={styles.binName}>{bin.name}</Text>
                    <Text style={styles.binStatus}>
                      {bin.status === "clean" 
                        ? `Cleaned at ${bin.cleanedAt} by ${bin.vehicle}`
                        : bin.status === "overflow"
                        ? `Overflow reported ${bin.reportedAt}`
                        : `${bin.vehicle}`}
                    </Text>
                  </View>

                  {bin.status === "clean" && (
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedText}>✓</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Active Vehicles List */}
            <View style={styles.vehiclesCard}>
              <Text style={styles.vehiclesTitle}>🚛 Active Vehicles Near You</Text>
              
              {activeVehicles.map((vehicle) => (
                <View key={vehicle.id} style={styles.vehicleItem}>
                  <View style={styles.vehicleIconBox}>
                    <Text style={styles.vehicleIconText}>🚛</Text>
                  </View>
                  
                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleNumber}>{vehicle.number}</Text>
                    <Text style={styles.vehicleStatus}>
                      Last: {vehicle.lastStop} • {vehicle.stopsCompleted} stops done
                    </Text>
                  </View>

                  <View style={styles.activeDot} />
                </View>
              ))}
            </View>

            {/* Transparency Message */}
            <View style={styles.transparencyCard}>
              <Text style={styles.transparencyIcon}>👁️</Text>
              <Text style={styles.transparencyTitle}>Full Transparency</Text>
              <Text style={styles.transparencyText}>
                All collection activities are verified with photos and GPS. You can see exactly when and where cleaning happened in your area.
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Submit Button - Only show in Report tab */}
      {selectedTab === "report" && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[
              styles.submitBtn,
              { backgroundColor: image && status !== "submitted" ? "#10b981" : "#d1d5db" }
            ]} 
            onPress={handleSubmit}
            disabled={!image || status === "submitted"}
          >
            <Text style={[
              styles.submitText,
              { color: image && status !== "submitted" ? "#fff" : "#9ca3af" }
            ]}>
              {status === "submitted" ? "✅ Submitted Successfully" : "Submit Your Complaint"}
            </Text>
          </TouchableOpacity>
          {!image && (
            <Text style={styles.helperText}>📸 Please take a photo to continue</Text>
          )}
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#1E40AF" 
  },
  
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#1E40AF",
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  backIcon: { 
    fontSize: 24, 
    color: "#fff",
    fontWeight: "bold"
  },
  headerContent: { 
    flex: 1 
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: "bold", 
    color: "#fff",
    marginBottom: 4
  },
  headerSubtitle: { 
    fontSize: 13, 
    color: "#BFDBFE" 
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    backgroundColor: "#10b981",
    borderRadius: 4,
  },
  liveText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },

  // Tab Container
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#1E40AF",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#fff",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
  tabTextActive: {
    color: "#1E40AF",
  },

  // ScrollView
  scrollView: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  
  // Cards
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },

  // Step Header
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingVertical: 16,
  },
  stepHeaderOrange: {
    backgroundColor: "#F59E0B",
  },
  stepHeaderGreen: {
    backgroundColor: "#10B981",
  },
  stepBadge: {
    width: 40,
    height: 40,
    backgroundColor: "#fff",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 2,
  },
  stepSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
  },

  // Card Content
  cardContent: {
    padding: 20,
  },

  // Image Area
  imageContainer: {
    width: "100%",
    height: 240,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#EFF6FF",
    borderWidth: 3,
    borderColor: "#BFDBFE",
    borderStyle: "dashed",
  },
  image: { 
    width: "100%", 
    height: "100%" 
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  cameraIconCircle: {
    width: 80,
    height: 80,
    backgroundColor: "#1E40AF",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cameraIcon: { 
    fontSize: 36 
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  placeholderText: { 
    color: "#6b7280",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  
  retakeBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    alignSelf: "center",
  },
  retakeText: { 
    color: "#4b5563", 
    fontSize: 15, 
    fontWeight: "600" 
  },

  // Info Boxes
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    marginBottom: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    backgroundColor: "#1E40AF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconEmoji: {
    fontSize: 24,
  },
  infoTextContainer: { 
    flex: 1 
  },
  infoLabel: { 
    fontSize: 13, 
    color: "#6b7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  infoValue: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#1f2937",
    lineHeight: 22,
  },

  // Tips Card
  tipsCard: {
    backgroundColor: "rgba(30, 64, 175, 0.1)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#BFDBFE",
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E40AF",
    marginBottom: 12,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  tipBullet: {
    color: "#3B82F6",
    fontSize: 20,
    marginRight: 12,
    marginTop: -2,
  },
  tipText: {
    flex: 1,
    color: "#1E3A8A",
    fontSize: 14,
    lineHeight: 20,
  },

  // Map Card
  mapCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  mapHeader: {
    marginBottom: 16,
  },
  mapTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  mapSubtitle: {
    fontSize: 13,
    color: "#6b7280",
  },
  mapContainer: {
    height: 300,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  map: {
    flex: 1,
  },
  customMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  vehicleMarker: {
    width: 40,
    height: 40,
    backgroundColor: "#fff",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#3b82f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  vehicleMarkerText: {
    fontSize: 20,
  },
  mapLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "600",
  },

  // Status Card
  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statusCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor:
    "#F3F4F6",
      borderRadius: 16,
      padding: 16,
      alignItems: "center",
      justifyContent: "center",
      },
      statIcon: {
      fontSize: 28,
      marginBottom: 8,
      },
      statNumber: {
      fontSize: 24,
      fontWeight: "bold",
      color: "#1f2937",
      marginBottom: 4,
      },
      statLabel: {
      fontSize: 13,
      color: "#6b7280",
      fontWeight: "600",
      },

      // Bins List Card
      binsListCard: {
      backgroundColor: "#fff",
      borderRadius: 24,
      padding: 20,
      marginBottom: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
      },
      binsListTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#1f2937",
      marginBottom: 16,
      },
      binItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#F3F4F6",
      },
      binIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
      },
      binEmoji: {
      fontSize: 20,
      },
      binInfo: {
      flex: 1,
      },
      binName: {
      fontSize: 15,
      fontWeight: "bold",
      color: "#1f2937",
      marginBottom: 4,
      },
      binStatus: {
      fontSize: 13,
      color: "#6b7280",
      },
      verifiedBadge: {
      width: 28,
      height: 28,
      backgroundColor: "#10b981",
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
      },
      verifiedText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "bold",
      },

      // Vehicles Card
      vehiclesCard: {
      backgroundColor: "#fff",
      borderRadius: 24,
      padding: 20,
      marginBottom: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
      },
      vehiclesTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#1f2937",
      marginBottom: 16,
      },
      vehicleItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#F3F4F6",
      },
      vehicleIconBox: {
      width: 44,
      height: 44,
      backgroundColor: "#DBEAFE",
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
      },
      vehicleIconText: {
      fontSize: 20,
      },
      vehicleInfo: {
      flex: 1,
      },
      vehicleNumber: {
      fontSize: 15,
      fontWeight: "bold",
      color: "#1f2937",
      marginBottom: 4,
      },
      vehicleStatus: {
      fontSize: 13,
      color: "#6b7280",
      },
      activeDot: {
      width: 10,
      height: 10,
      backgroundColor: "#10b981",
      borderRadius: 5,
      marginLeft: 12,
      },

      // Transparency Card
      transparencyCard: {
      backgroundColor: "rgba(16, 185, 129, 0.1)",
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      alignItems: "center",
      borderWidth: 2,
      borderColor: "#D1FAE5",
      },
      transparencyIcon: {
      fontSize: 40,
      marginBottom: 12,
      },
      transparencyTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#059669",
      marginBottom: 8,
      },
      transparencyText: {
      fontSize: 14,
      color: "#047857",
      textAlign: "center",
      lineHeight: 20,
      },

      // Footer
      footer: {
      backgroundColor: "#fff",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: "#E5E7EB",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
      },
      submitBtn: {
      width: "100%",
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      },
      submitText: {
      fontSize: 16,
      fontWeight: "bold",
      },
      helperText: {
      marginTop: 12,
      textAlign: "center",
      fontSize: 13,
      color: "#9ca3af",
      },
    });