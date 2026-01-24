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
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

const { width } = Dimensions.get('window');

export default function Vehicle({ goBack }) {
  const [currentStop, setCurrentStop] = useState(1);
  const [totalStops, setTotalStops] = useState(8);
  const [beforeImage, setBeforeImage] = useState(null);
  const [afterImage, setAfterImage] = useState(null);
  const [todayCompleted, setTodayCompleted] = useState(3);
  const [attendance, setAttendance] = useState("In Progress");
  const [currentLocation, setCurrentLocation] = useState("Fetching location...");
  const [showMap, setShowMap] = useState(true);

  // Mock route data with bin locations
  const routeStops = [
    {
      id: 1,
      name: "Stop 1 - Sector 4 Market",
      coordinates: { latitude: 23.2599, longitude: 77.4126 },
      status: "completed",
      completedAt: "8:30 AM"
    },
    {
      id: 2,
      name: "Stop 2 - Zone-A Ward-12",
      coordinates: { latitude: 23.2645, longitude: 77.4186 },
      status: "completed",
      completedAt: "9:15 AM"
    },
    {
      id: 3,
      name: "Stop 3 - New Market",
      coordinates: { latitude: 23.2688, longitude: 77.4068 },
      status: "completed",
      completedAt: "9:45 AM"
    },
    {
      id: 4,
      name: "Stop 4 - Kolar Road Block-3",
      coordinates: { latitude: 23.2520, longitude: 77.4050 },
      status: "current",
      completedAt: null
    },
    {
      id: 5,
      name: "Stop 5 - MP Nagar Zone 1",
      coordinates: { latitude: 23.2315, longitude: 77.4245 },
      status: "pending",
      completedAt: null
    },
    {
      id: 6,
      name: "Stop 6 - Ayodhya Bypass",
      coordinates: { latitude: 23.2450, longitude: 77.4320 },
      status: "pending",
      completedAt: null
    },
    {
      id: 7,
      name: "Stop 7 - Hoshangabad Road",
      coordinates: { latitude: 23.2280, longitude: 77.4180 },
      status: "pending",
      completedAt: null
    },
    {
      id: 8,
      name: "Stop 8 - Shahpura Lake",
      coordinates: { latitude: 23.2550, longitude: 77.4280 },
      status: "pending",
      completedAt: null
    },
  ];

  // Route polyline coordinates
  const routeCoordinates = routeStops.map(stop => stop.coordinates);

  // Simulate location fetch
  React.useEffect(() => {
    const currentStopData = routeStops[currentStop - 1];
    if (currentStopData) {
      setCurrentLocation(currentStopData.name.split(" - ")[1]);
    }
  }, [currentStop]);

  const takeBeforePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ 
      quality: 0.7,
      allowsEditing: true 
    });
    if (!result.canceled) {
      setBeforeImage(result.assets[0].uri);
    }
  };

  const takeAfterPhoto = async () => {
    if (!beforeImage) {
      Alert.alert("Before Photo Required", "📸 Please take a BEFORE photo first!");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ 
      quality: 0.7,
      allowsEditing: true 
    });
    if (!result.canceled) {
      setAfterImage(result.assets[0].uri);
    }
  };

  const handleMarkComplete = () => {
    if (!beforeImage || !afterImage) {
      Alert.alert(
        "Photos Required", 
        "📸 Please take both BEFORE and AFTER photos to mark this stop complete!"
      );
      return;
    }
    
    Alert.alert(
      "Stop Completed! ✅",
      `Stop ${currentStop} has been marked complete. Photos uploaded successfully!`,
      [
        {
          text: "Next Stop",
          onPress: () => {
            if (currentStop < totalStops) {
              setCurrentStop(currentStop + 1);
              setTodayCompleted(todayCompleted + 1);
              setBeforeImage(null);
              setAfterImage(null);
            } else {
              Alert.alert("Route Completed! 🎉", "All stops have been completed for today!");
              setAttendance("Completed");
            }
          }
        }
      ]
    );
  };

  const skipStop = () => {
    Alert.alert(
      "Skip This Stop?",
      "⚠️ This stop will be marked as MISSED and flagged in the system. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Skip & Flag as Missed",
          style: "destructive",
          onPress: () => {
            if (currentStop < totalStops) {
              setCurrentStop(currentStop + 1);
            }
            Alert.alert("🚨 Stop Flagged", "This stop has been marked as MISSED and reported to municipal office.");
          }
        }
      ]
    );
  };

  const getMarkerColor = (status) => {
    switch(status) {
      case "completed": return "#10b981";
      case "current": return "#3b82f6";
      case "pending": return "#9ca3af";
      default: return "#9ca3af";
    }
  };

  const getMarkerIcon = (status) => {
    switch(status) {
      case "completed": return "✓";
      case "current": return "📍";
      case "pending": return String(status.id);
      default: return "•";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F766E" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>SafaiMitra Driver</Text>
          <Text style={styles.headerSubtitle}>Vehicle: MH-09-AB-1234</Text>
        </View>
        <TouchableOpacity 
          style={styles.mapToggleBtn}
          onPress={() => setShowMap(!showMap)}
        >
          <Text style={styles.mapToggleText}>{showMap ? "📋" : "🗺️"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        
        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressLabel}>Today's Route Progress</Text>
              <Text style={styles.progressCount}>
                {todayCompleted} / {totalStops} Stops
              </Text>
            </View>
            <View style={styles.percentageCircle}>
              <Text style={styles.percentageText}>
                {Math.round((todayCompleted / totalStops) * 100)}%
              </Text>
            </View>
          </View>
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${(todayCompleted / totalStops) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressSubtext}>
            🎯 {totalStops - todayCompleted} stops remaining • Keep going!
          </Text>
        </View>

        {/* Map View Section */}
        {showMap && (
          <View style={styles.mapCard}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>🗺️ Your Route Map</Text>
              <Text style={styles.mapSubtitle}>Today's collection route with all stops</Text>
            </View>
            
            <View style={styles.mapContainer}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                  latitude: 23.2520,
                  longitude: 77.4180,
                  latitudeDelta: 0.08,
                  longitudeDelta: 0.08,
                }}
              >
                {/* Route Line */}
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor="#0F766E"
                  strokeWidth={4}
                  lineDashPattern={[1, 10]}
                />

                {/* Markers for each stop */}
                {routeStops.map((stop) => (
                  <Marker
                    key={stop.id}
                    coordinate={stop.coordinates}
                    title={stop.name}
                    description={stop.status === "completed" ? `✅ Completed at ${stop.completedAt}` : 
                               stop.status === "current" ? "📍 Current Stop" : "⏳ Pending"}
                  >
                    <View style={[
                      styles.customMarker,
                      { backgroundColor: getMarkerColor(stop.status) }
                    ]}>
                      <Text style={styles.markerText}>
                        {stop.status === "completed" ? "✓" : 
                         stop.status === "current" ? "📍" : stop.id}
                      </Text>
                    </View>
                  </Marker>
                ))}
              </MapView>
            </View>

            {/* Map Legend */}
            <View style={styles.mapLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#10b981" }]} />
                <Text style={styles.legendText}>Completed</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#3b82f6" }]} />
                <Text style={styles.legendText}>Current</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#9ca3af" }]} />
                <Text style={styles.legendText}>Pending</Text>
              </View>
            </View>
          </View>
        )}

        {/* Route List */}
        <View style={styles.routeListCard}>
          <Text style={styles.routeListTitle}>📍 All Stops on Your Route</Text>
          {routeStops.map((stop) => (
            <View 
              key={stop.id}
              style={[
                styles.routeStopItem,
                stop.status === "current" && styles.routeStopItemCurrent
              ]}
            >
              <View style={[
                styles.routeStopIcon,
                { backgroundColor: 
                  stop.status === "completed" ? "#D1FAE5" :
                  stop.status === "current" ? "#DBEAFE" : "#F3F4F6"
                }
              ]}>
                <Text style={[
                  styles.routeStopIconText,
                  { color: 
                    stop.status === "completed" ? "#059669" :
                    stop.status === "current" ? "#2563eb" : "#6b7280"
                  }
                ]}>
                  {stop.status === "completed" ? "✓" : 
                   stop.status === "current" ? "📍" : stop.id}
                </Text>
              </View>
              <View style={styles.routeStopInfo}>
                <Text style={styles.routeStopName}>{stop.name}</Text>
                <Text style={styles.routeStopStatus}>
                  {stop.status === "completed" ? `✅ Done at ${stop.completedAt}` :
                   stop.status === "current" ? "🚛 Current Stop - In Progress" :
                   "⏳ Pending"}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Current Stop Card */}
        <View style={styles.card}>
          <View style={[styles.stepHeader, styles.stepHeaderTeal]}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>{currentStop}</Text>
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepTitle}>Current Stop</Text>
              <Text style={styles.stepSubtitle}>Upload photos to mark complete</Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            {/* Location Info */}
            <View style={styles.infoBox}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>📍</Text>
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Current Location</Text>
                <Text style={styles.infoValue}>{currentLocation}</Text>
              </View>
            </View>

            {/* Before Photo Section */}
            <Text style={styles.sectionLabel}>STEP 1: Before Collection</Text>
            <TouchableOpacity onPress={takeBeforePhoto} style={styles.photoContainer}>
              {beforeImage ? (
                <View style={styles.photoWrapper}>
                  <Image source={{ uri: beforeImage }} style={styles.photo} />
                  <View style={styles.photoOverlay}>
                    <Text style={styles.photoLabel}>✅ BEFORE</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <View style={styles.cameraIconCircle}>
                    <Text style={styles.cameraIcon}>📸</Text>
                  </View>
                  <Text style={styles.photoPlaceholderText}>Tap to take BEFORE photo</Text>
                  <Text style={styles.photoHint}>Show the bin/area before cleaning</Text>
                </View>
              )}
            </TouchableOpacity>

            {beforeImage && (
              <TouchableOpacity style={styles.retakeBtn} onPress={takeBeforePhoto}>
                <Text style={styles.retakeText}>🔄 Retake</Text>
              </TouchableOpacity>
            )}

            {/* After Photo Section */}
            <Text style={styles.sectionLabel}>STEP 2: After Collection</Text>
            <TouchableOpacity 
              onPress={takeAfterPhoto} 
              style={[
                styles.photoContainer,
                !beforeImage && styles.photoContainerDisabled
              ]}
              disabled={!beforeImage}
            >
              {afterImage ? (
                <View style={styles.photoWrapper}>
                  <Image source={{ uri: afterImage }} style={styles.photo} />
                  <View style={[styles.photoOverlay, { backgroundColor: "rgba(16, 185, 129, 0.9)" }]}>
                    <Text style={styles.photoLabel}>✅ AFTER</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <View style={[
                    styles.cameraIconCircle,
                    !beforeImage && { backgroundColor: "#d1d5db" }
                  ]}>
                    <Text style={styles.cameraIcon}>📸</Text>
                  </View>
                  <Text style={[
                    styles.photoPlaceholderText,
                    !beforeImage && { color: "#9ca3af" }
                  ]}>
                    {beforeImage ? "Tap to take AFTER photo" : "Take BEFORE photo first"}
                  </Text>
                  <Text style={styles.photoHint}>Show the cleaned bin/area</Text>
                </View>
              )}
            </TouchableOpacity>

            {afterImage && (
              <TouchableOpacity style={styles.retakeBtn} onPress={takeAfterPhoto}>
                <Text style={styles.retakeText}>🔄 Retake</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Instructions Card */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>📋 How It Works</Text>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>1.</Text>
              <Text style={styles.tipText}>Follow the route map to reach each stop</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>2.</Text>
              <Text style={styles.tipText}>Take BEFORE photo showing the bin condition</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>3.</Text>
              <Text style={styles.tipText}>Complete collection/cleaning work</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>4.</Text>
              <Text style={styles.tipText}>Take AFTER photo from same angle</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>5.</Text>
              <Text style={styles.tipText}>Mark complete - your attendance is auto-recorded!</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 180 }} />
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.skipBtn}
          onPress={skipStop}
        >
          <Text style={styles.skipText}>⚠️ Skip & Flag</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.completeBtn,
            { backgroundColor: beforeImage && afterImage ? "#10b981" : "#d1d5db" }
          ]} 
          onPress={handleMarkComplete}
          disabled={!beforeImage || !afterImage}
        >
          <Text style={[
            styles.completeText,
            { color: beforeImage && afterImage ? "#fff" : "#9ca3af" }
          ]}>
            ✅ Mark Complete
          </Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#0F766E" 
  },
  
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#0F766E",
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
    color: "#99F6E4" 
  },
  mapToggleBtn: {
    width: 44,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  mapToggleText: {
    fontSize: 20,
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

  // Progress Card
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  progressCount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0F766E",
  },
  percentageCircle: {
    width: 60,
    height: 60,
    backgroundColor: "#D1FAE5",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  percentageText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#059669",
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#10b981",
    borderRadius: 6,
  },
  progressSubtext: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
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
    height: 280,
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
    fontSize: 16,
    fontWeight: "bold",
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

  // Route List Card
  routeListCard: {
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
  routeListTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  routeStopItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 10,
  },
  routeStopItemCurrent: {
    backgroundColor: "#DBEAFE",
    borderWidth: 2,
    borderColor: "#3b82f6",
  },
  routeStopIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  routeStopIconText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  routeStopInfo: {
    flex: 1,
  },
  routeStopName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  routeStopStatus: {
    fontSize: 12,
    color: "#6b7280",
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
  stepHeaderTeal: {
    backgroundColor: "#14B8A6",
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
    color: "#0F766E",
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

  // Info Box
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#CCFBF1",
    borderRadius: 16,
    marginBottom: 24,
  },
  iconCircle: {
    width: 48,
    height: 48,
    backgroundColor: "#0F766E",
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
    color: "#0F766E",
    fontWeight: "600",
    marginBottom: 4,
  },
  infoValue: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#134E4A",
    lineHeight: 22,
  },

  // Section Label
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 12,
    marginTop: 8,
  },

  // Photo Area
  photoContainer: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F0FDFA",
    borderWidth: 3,
    borderColor: "#99F6E4",
    borderStyle: "dashed",
    marginBottom: 8,
  },
  photoContainerDisabled: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
  },
  photoWrapper: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  photo: { 
    width: "100%", 
    height: "100%" 
  },
  photoOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(20, 184, 166, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  photoLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  cameraIconCircle: {
    width: 64,
    height: 64,
    backgroundColor: "#0F766E",
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#0F766E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cameraIcon: { 
    fontSize: 32 
  },
  photoPlaceholderText: {
    fontSize: 16,
    fontWeight: "600",
      color: "#1f2937",
      marginBottom: 8,
      textAlign: "center",
      },
      photoHint: {
      fontSize: 13,
      color: "#6b7280",
      textAlign: "center",
      },
      retakeBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: "#F3F4F6",
      borderRadius: 12,
      alignItems: "center",
      marginBottom: 20,
      borderWidth: 1,
      borderColor: "#E5E7EB",
      },
      retakeText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#374151",
      },

      // Tips Card
      tipsCard: {
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
      tipsTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#1f2937",
      marginBottom: 16,
      },
      tipsList: {
      gap: 12,
      },
      tipItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      },
      tipBullet: {
      fontSize: 15,
      fontWeight: "bold",
      color: "#0F766E",
      width: 24,
      },
      tipText: {
      fontSize: 14,
      color: "#4b5563",
      flex: 1,
      lineHeight: 20,
      },

      // Footer
      footer: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
      paddingBottom: 20,
      backgroundColor: "#0F766E",
      },
      skipBtn: {
      flex: 1,
      paddingVertical: 14,
      backgroundColor: "rgba(255,255,255,0.2)",
      borderRadius: 16,
      alignItems: "center",
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.3)",
      },
      skipText: {
      fontSize: 15,
      fontWeight: "bold",
      color: "#fff",
      },
      completeBtn: {
      flex: 1,
      paddingVertical: 14,
      backgroundColor: "#10b981",
      borderRadius: 16,
      alignItems: "center",
      },
      completeText: {
      fontSize: 15,
      fontWeight: "bold",
      color: "#fff",
      },
    });