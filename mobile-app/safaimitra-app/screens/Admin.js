import React, { useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  StatusBar,
  Dimensions,
  Modal
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width } = Dimensions.get('window');

export default function Admin({ goBack }) {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Mock data for demonstration
  const stats = {
    total: 156,
    clean: 98,
    overflow: 42,
    missed: 16,
    activeVehicles: 12,
    pendingComplaints: 23
  };

  // Mock report data with locations
  const reports = [
    {
      id: 1,
      type: "overflow",
      location: "Sector 4, Main Market",
      coordinates: { latitude: 23.2599, longitude: 77.4126 },
      time: "2 hours ago",
      priority: "high",
      status: "pending",
      reportedBy: "Citizen",
      vehicle: "Not Assigned"
    },
    {
      id: 2,
      type: "clean",
      location: "Zone-A, Ward-12",
      coordinates: { latitude: 23.2645, longitude: 77.4186 },
      time: "30 mins ago",
      priority: "low",
      status: "completed",
      reportedBy: "Vehicle MH-09-AB-1234",
      vehicle: "MH-09-AB-1234"
    },
    {
      id: 3,
      type: "missed",
      location: "Kolar Road, Block-3",
      coordinates: { latitude: 23.2520, longitude: 77.4050 },
      time: "4 hours ago",
      priority: "high",
      status: "flagged",
      reportedBy: "Auto-Detection",
      vehicle: "MH-09-AB-5678"
    },
    {
      id: 4,
      type: "overflow",
      location: "MP Nagar Zone 1",
      coordinates: { latitude: 23.2315, longitude: 77.4245 },
      time: "1 hour ago",
      priority: "critical",
      status: "urgent",
      reportedBy: "Citizen",
      vehicle: "Not Assigned"
    },
    {
      id: 5,
      type: "clean",
      location: "New Market Area",
      coordinates: { latitude: 23.2688, longitude: 77.4068 },
      time: "15 mins ago",
      priority: "low",
      status: "completed",
      reportedBy: "Vehicle MH-09-AB-9012",
      vehicle: "MH-09-AB-9012"
    },
  ];

  const getFilteredReports = () => {
    if (selectedFilter === "all") return reports;
    return reports.filter(r => r.type === selectedFilter);
  };

  const getMarkerColor = (type) => {
    switch(type) {
      case "clean": return "#10b981";
      case "overflow": return "#f59e0b";
      case "missed": return "#ef4444";
      default: return "#6b7280";
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case "critical": return "#dc2626";
      case "high": return "#f59e0b";
      case "low": return "#10b981";
      default: return "#6b7280";
    }
  };

  const openReportDetails = (report) => {
    setSelectedReport(report);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>CleanBin AI</Text>
          <Text style={styles.headerSubtitle}>Municipal Dashboard</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: "#DBEAFE" }]}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total Bins</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#D1FAE5" }]}>
              <Text style={[styles.statNumber, { color: "#059669" }]}>{stats.clean}</Text>
              <Text style={styles.statLabel}>Clean ✅</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#FEF3C7" }]}>
              <Text style={[styles.statNumber, { color: "#d97706" }]}>{stats.overflow}</Text>
              <Text style={styles.statLabel}>Overflow ⚠️</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#FEE2E2" }]}>
              <Text style={[styles.statNumber, { color: "#dc2626" }]}>{stats.missed}</Text>
              <Text style={styles.statLabel}>Missed 🚨</Text>
            </View>
          </View>

          {/* Active Info */}
          <View style={styles.activeInfoRow}>
            <View style={styles.activeInfoCard}>
              <Text style={styles.activeInfoIcon}>🚛</Text>
              <View>
                <Text style={styles.activeInfoNumber}>{stats.activeVehicles}</Text>
                <Text style={styles.activeInfoLabel}>Active Vehicles</Text>
              </View>
            </View>
            <View style={styles.activeInfoCard}>
              <Text style={styles.activeInfoIcon}>📋</Text>
              <View>
                <Text style={styles.activeInfoNumber}>{stats.pendingComplaints}</Text>
                <Text style={styles.activeInfoLabel}>Pending Actions</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Map View */}
        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>🗺️ Live City Map</Text>
            <Text style={styles.mapSubtitle}>Real-time bin status across Bhopal</Text>
          </View>
          
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: 23.2599,
                longitude: 77.4126,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              {reports.map((report) => (
                <Marker
                  key={report.id}
                  coordinate={report.coordinates}
                  pinColor={getMarkerColor(report.type)}
                  onPress={() => openReportDetails(report)}
                >
                  <View style={[
                    styles.customMarker,
                    { backgroundColor: getMarkerColor(report.type) }
                  ]}>
                    <Text style={styles.markerText}>
                      {report.type === "clean" ? "✓" : 
                       report.type === "overflow" ? "!" : "✕"}
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
              <Text style={styles.legendText}>Clean</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#f59e0b" }]} />
              <Text style={styles.legendText}>Overflow</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#ef4444" }]} />
              <Text style={styles.legendText}>Missed</Text>
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {["all", "overflow", "missed", "clean"].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterTab,
                  selectedFilter === filter && styles.filterTabActive
                ]}
                onPress={() => setSelectedFilter(filter)}
              >
                <Text style={[
                  styles.filterText,
                  selectedFilter === filter && styles.filterTextActive
                ]}>
                  {filter === "all" ? "All Reports" : 
                   filter === "overflow" ? "⚠️ Overflow" :
                   filter === "missed" ? "🚨 Missed" : "✅ Clean"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Reports List */}
        <View style={styles.reportsSection}>
          <Text style={styles.sectionTitle}>Recent Reports ({getFilteredReports().length})</Text>
          
          {getFilteredReports().map((report) => (
            <TouchableOpacity 
              key={report.id}
              style={styles.reportCard}
              onPress={() => openReportDetails(report)}
            >
              <View style={styles.reportHeader}>
                <View style={[
                  styles.reportIcon,
                  { backgroundColor: 
                    report.type === "clean" ? "#D1FAE5" :
                    report.type === "overflow" ? "#FEF3C7" : "#FEE2E2"
                  }
                ]}>
                  <Text style={styles.reportEmoji}>
                    {report.type === "clean" ? "✅" :
                     report.type === "overflow" ? "⚠️" : "🚨"}
                  </Text>
                </View>
                
                <View style={styles.reportInfo}>
                  <Text style={styles.reportLocation}>{report.location}</Text>
                  <Text style={styles.reportTime}>{report.time}</Text>
                </View>

                <View style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(report.priority) + "20" }
                ]}>
                  <Text style={[
                    styles.priorityText,
                    { color: getPriorityColor(report.priority) }
                  ]}>
                    {report.priority.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.reportFooter}>
                <Text style={styles.reportDetail}>
                  📍 {report.reportedBy}
                </Text>
                <Text style={styles.reportDetail}>
                  🚛 {report.vehicle}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Report Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedReport && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Report Details</Text>
                  <TouchableOpacity 
                    onPress={() => setModalVisible(false)}
                    style={styles.modalClose}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Location:</Text>
                    <Text style={styles.modalValue}>{selectedReport.location}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Status:</Text>
                    <Text style={[
                      styles.modalValue,
                      { color: getMarkerColor(selectedReport.type) }
                    ]}>
                      {selectedReport.type.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Priority:</Text>
                    <Text style={[
                      styles.modalValue,
                      { color: getPriorityColor(selectedReport.priority) }
                    ]}>
                      {selectedReport.priority.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Reported By:</Text>
                    <Text style={styles.modalValue}>{selectedReport.reportedBy}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Vehicle:</Text>
                    <Text style={styles.modalValue}>{selectedReport.vehicle}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Time:</Text>
                    <Text style={styles.modalValue}>{selectedReport.time}</Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalActionBtn}>
                    <Text style={styles.modalActionText}>📞 Call Vehicle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: "#7C3AED" }]}>
                    <Text style={[styles.modalActionText, { color: "#fff" }]}>
                      🚛 Assign Vehicle
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#7C3AED" 
  },
  
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#7C3AED",
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
    color: "#DDD6FE" 
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

  // Stats Container
  statsContainer: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 56) / 2,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "600",
  },

  // Active Info
  activeInfoRow: {
    flexDirection: "row",
    gap: 12,
  },
  activeInfoCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeInfoIcon: {
    fontSize: 28,
  },
  activeInfoNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#7C3AED",
  },
  activeInfoLabel: {
    fontSize: 12,
    color: "#6b7280",
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

  // Filter Tabs
  filterContainer: {
    marginBottom: 20,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginRight: 12,
  },
  filterTabActive: {
    backgroundColor: "#7C3AED",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  filterTextActive: {
    color: "#fff",
  },

  // Reports Section
  reportsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  reportCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  reportEmoji: {
    fontSize: 24,
  },
  reportInfo: {
    flex: 1,
  },
  reportLocation: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  reportTime: {
    fontSize: 13,
    color: "#6b7280",
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  reportFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  reportDetail: {
    fontSize: 12,
    color: "#6b7280",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1f2937",
  },
  modalClose: {
    width: 36,
    height: 36,
    backgroundColor: "#f3f4f6",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 20,
    color: "#6b7280",
  },
  modalBody: {
    marginBottom: 24,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalLabel: {
    fontSize: 15,
    color: "#6b7280",
    fontWeight: "600",
  },
  modalValue: {
    fontSize: 15,
    color: "#1f2937",
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    alignItems: "center",
  },
  modalActionText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1f2937",
  },
});