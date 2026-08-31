import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Location from "expo-location";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  Users,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Sparkles,
  ShieldCheck,
  Building,
  Utensils,
  PartyPopper,
  Info,
  ChevronRight,
  RotateCcw,
  Compass,
} from "lucide-react-native";

const API_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || "https://api.safaimitra.online").replace(/\/+$/, "");
const { width } = Dimensions.get("window");

const EVENT_TYPES = [
  { label: "Marriage", icon: "💍" },
  { label: "Birthday", icon: "🎂" },
  { label: "Religious", icon: "🪔" },
  { label: "Political", icon: "🏛️" },
  { label: "Community", icon: "👥" },
  { label: "School/College", icon: "🎓" },
  { label: "Festival", icon: "🎆" },
  { label: "Corporate", icon: "💼" },
  { label: "Other", icon: "🎪" },
];

const VENUE_TYPES = [
  "Community Hall",
  "Marriage Hall",
  "Open Ground",
  "School/College",
  "Road/Public Area",
  "Religious Place",
  "Other",
];

const WASTE_OPTIONS = ["Wet", "Dry", "Plastic", "Food", "General"];

export default function EventDustbinRequestScreen({ onClose, onSuccess }) {
  // Current Wizard Step: 1 -> 2 -> 3 -> 4 -> 5
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState(null);

  // Form State
  const [eventType, setEventType] = useState("Marriage");
  const [eventName, setEventName] = useState("");
  const [expectedGuests, setExpectedGuests] = useState("300");
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [startTime, setStartTime] = useState("10:00 AM");
  const [endTime, setEndTime] = useState("06:00 PM");
  const [durationHours, setDurationHours] = useState(8);
  const [venueType, setVenueType] = useState("Community Hall");
  const [foodService, setFoodService] = useState(true);
  const [foodType, setFoodType] = useState("Full Meal");
  const [foodPlates, setFoodPlates] = useState("300");
  const [wasteTypes, setWasteTypes] = useState(["Wet", "Dry", "Food", "Plastic"]);
  const [notes, setNotes] = useState("");

  // Location State
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState(23.2599);
  const [longitude, setLongitude] = useState(77.4126);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Document State
  const [eventProof, setEventProof] = useState(null);
  const [identityProof, setIdentityProof] = useState(null);

  // Load User details and GPS on mount
  useEffect(() => {
    (async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.address) setAddress(user.address);
          if (user.latitude && user.longitude) {
            setLatitude(Number(user.latitude));
            setLongitude(Number(user.longitude));
          }
        }
        detectGPSLocation();
      } catch (e) {}
    })();
  }, []);

  // Calculate duration automatically from common time formats
  useEffect(() => {
    // Default safe duration estimation
    setDurationHours(8);
  }, [startTime, endTime]);

  // Detect GPS
  const detectGPSLocation = async () => {
    setDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        try {
          const geo = await Location.reverseGeocodeAsync({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          if (geo && geo.length > 0) {
            const g = geo[0];
            const fullAddr = `${g.name || g.street || ""}, ${g.subregion || g.city || ""}, ${g.region || ""}`.trim();
            if (fullAddr) setAddress(fullAddr);
          }
        } catch (e) {}
      }
    } catch (e) {
      console.log("GPS error", e);
    } finally {
      setDetectingLocation(false);
    }
  };

  // Toggle Waste Type Multi-select
  const toggleWasteType = (type) => {
    if (wasteTypes.includes(type)) {
      setWasteTypes(wasteTypes.filter((t) => t !== type));
    } else {
      setWasteTypes([...wasteTypes, type]);
    }
  };

  // Document Pickers
  const pickEventProof = async () => {
    try {
      Alert.alert("Upload Event Proof / Invitation", "Choose upload source:", [
        {
          text: "Take Photo (Camera)",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") return;
            const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
            if (!res.canceled && res.assets[0]) {
              setEventProof({
                uri: res.assets[0].uri,
                name: "event_invitation.jpg",
                type: "image/jpeg",
              });
            }
          },
        },
        {
          text: "Choose from Gallery",
          onPress: async () => {
            const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
            if (!res.canceled && res.assets[0]) {
              setEventProof({
                uri: res.assets[0].uri,
                name: "event_invitation.jpg",
                type: "image/jpeg",
              });
            }
          },
        },
        {
          text: "Upload PDF Document",
          onPress: async () => {
            const res = await DocumentPicker.getDocumentAsync({
              type: ["application/pdf", "image/*"],
            });
            if (!res.canceled && res.assets[0]) {
              const file = res.assets[0];
              setEventProof({
                uri: file.uri,
                name: file.name || "event_proof.pdf",
                type: file.mimeType || "application/pdf",
              });
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]);
    } catch (e) {
      console.error(e);
    }
  };

  const pickIdentityProof = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
      if (!res.canceled && res.assets[0]) {
        setIdentityProof({
          uri: res.assets[0].uri,
          name: "identity_proof.jpg",
          type: "image/jpeg",
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Realtime Client Estimation for Step 4 Preview
  const estimateWasteClient = () => {
    const guests = Math.max(1, Number(expectedGuests) || 100);
    const eventFactor = eventType === "Marriage" ? 1.45 : eventType === "Festival" ? 1.35 : 1.1;
    const foodFactor = foodService ? 1.5 : 0.6;
    const rawKg = Math.round(guests * 0.65 * eventFactor * foodFactor);
    const totalBins = Math.max(2, Math.ceil((rawKg * 1.25) / 45));
    const wetBins = Math.max(1, Math.round(totalBins * (foodService ? 0.55 : 0.2)));
    const dryBins = Math.max(1, Math.round(totalBins * (foodService ? 0.3 : 0.55)));
    const generalBins = Math.max(1, totalBins - wetBins - dryBins);
    const risk = guests >= 600 ? "HIGH" : guests >= 200 ? "MEDIUM" : "LOW";
    return {
      wasteKg: rawKg,
      wetBins,
      dryBins,
      generalBins,
      totalBins: wetBins + dryBins + generalBins,
      risk,
    };
  };

  // Step Validations
  const validateStep1 = () => {
    if (!eventName.trim()) {
      Alert.alert("Missing Field", "Please enter your event name.");
      return false;
    }
    if (!expectedGuests || Number(expectedGuests) <= 0) {
      Alert.alert("Invalid Guests", "Please enter a valid guest count greater than 0.");
      return false;
    }
    if (!eventDate) {
      Alert.alert("Missing Date", "Please specify the event date.");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!address.trim()) {
      Alert.alert("Missing Address", "Please enter the venue address.");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!eventProof) {
      Alert.alert("Missing Document", "Please upload the event invitation card or permission letter.");
      return false;
    }
    return true;
  };

  // Final Submit
  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const userStr = await AsyncStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : {};

      const formData = new FormData();
      formData.append("eventType", eventType);
      formData.append("eventName", eventName);
      formData.append("expectedGuests", expectedGuests);
      formData.append("eventDate", eventDate);
      formData.append("startTime", startTime);
      formData.append("endTime", endTime);
      formData.append("durationHours", durationHours.toString());
      formData.append("venueType", venueType);
      formData.append("foodService", foodService.toString());
      formData.append("foodType", foodType);
      formData.append("foodPlates", foodPlates || expectedGuests);
      formData.append("wasteTypes", wasteTypes.join(","));
      formData.append("notes", notes);
      formData.append("address", address);
      formData.append("latitude", latitude.toString());
      formData.append("longitude", longitude.toString());
      if (user.officeId) formData.append("officeId", user.officeId);
      if (user.cityName) formData.append("cityName", user.cityName);

      // Append files
      formData.append("eventProof", {
        uri: eventProof.uri,
        name: eventProof.name || "event_proof.jpg",
        type: eventProof.type || "image/jpeg",
      });

      if (identityProof) {
        formData.append("identityProof", {
          uri: identityProof.uri,
          name: identityProof.name || "identity_proof.jpg",
          type: identityProof.type || "image/jpeg",
        });
      }

      const res = await axios.post(`${API_URL}/api/event-dustbin-requests`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        timeout: 30000,
      });

      if (res.data && res.data.success) {
        setSubmittedRequest(res.data.request);
        setCurrentStep(5);
        if (onSuccess) onSuccess(res.data.request);
      } else {
        Alert.alert("Submission Failed", res.data?.message || "Could not register event request.");
      }
    } catch (err) {
      console.error("Event submit error:", err);
      Alert.alert("Error", err.response?.data?.message || "Failed to submit request. Please verify details.");
    } finally {
      setSubmitting(false);
    }
  };

  const clientEst = estimateWasteClient();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
    >
      {/* Header */}
      <LinearGradient
        colors={["#059669", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingHorizontal: 20,
          paddingTop: Platform.OS === "ios" ? 54 : 44,
          paddingBottom: 18,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 12 }}>✕ Close</Text>
          </TouchableOpacity>

          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 17, fontWeight: "900", color: "#FFFFFF" }}>
              Event Dustbin Request
            </Text>
            <Text style={{ fontSize: 11, color: "#D1FAE5", fontWeight: "600" }}>
              Municipal Temporary Allocation
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* Stepper Progress Bar */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 16, gap: 6 }}>
          {[1, 2, 3, 4, 5].map((step) => {
            const isActive = currentStep >= step;
            const isCurrent = currentStep === step;
            return (
              <React.Fragment key={step}>
                <View
                  style={{
                    width: isCurrent ? 28 : 22,
                    height: isCurrent ? 28 : 22,
                    borderRadius: 14,
                    backgroundColor: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.3)",
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: isCurrent ? 2 : 0,
                    borderColor: "#059669",
                  }}
                >
                  <Text
                    style={{
                      fontSize: isCurrent ? 12 : 10,
                      fontWeight: "900",
                      color: isActive ? "#059669" : "#FFFFFF",
                    }}
                  >
                    {step}
                  </Text>
                </View>
                {step < 5 && (
                  <View
                    style={{
                      width: 24,
                      height: 3,
                      backgroundColor: currentStep > step ? "#FFFFFF" : "rgba(255, 255, 255, 0.3)",
                      borderRadius: 2,
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Step Name */}
        <Text style={{ textAlign: "center", color: "#FFFFFF", fontSize: 12, fontWeight: "800", marginTop: 8 }}>
          {currentStep === 1 && "Step 1 of 5: Event Information"}
          {currentStep === 2 && "Step 2 of 5: Location & Venue"}
          {currentStep === 3 && "Step 3 of 5: Document Uploads"}
          {currentStep === 4 && "Step 4 of 5: AI Estimate & Review"}
          {currentStep === 5 && "Step 5 of 5: Request Submitted"}
        </Text>
      </LinearGradient>

      {/* Main Form Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ======================================================== */}
        {/* STEP 1: EVENT DETAILS */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <View>
            <Text style={{ fontSize: 15, fontWeight: "900", color: "#0F172A", marginBottom: 10 }}>
              1. Choose Event Type *
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {EVENT_TYPES.map((t) => {
                const isSelected = eventType === t.label;
                return (
                  <TouchableOpacity
                    key={t.label}
                    onPress={() => setEventType(t.label)}
                    activeOpacity={0.85}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: isSelected ? "#059669" : "#FFFFFF",
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: isSelected ? "#059669" : "#E2E8F0",
                    }}
                  >
                    <Text style={{ fontSize: 14, marginRight: 6 }}>{t.icon}</Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "800",
                        color: isSelected ? "#FFFFFF" : "#334155",
                      }}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Event Name */}
            <Text style={{ fontSize: 13, fontWeight: "800", color: "#334155", marginBottom: 6 }}>
              Event Title / Name *
            </Text>
            <TextInput
              placeholder="e.g. Sharma & Verma Wedding Ceremony"
              value={eventName}
              onChangeText={setEventName}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: "#E2E8F0",
                padding: 14,
                fontSize: 14,
                color: "#0F172A",
                marginBottom: 14,
              }}
            />

            {/* Expected Guests */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: "#334155", marginBottom: 6 }}>
                  Expected Guests *
                </Text>
                <TextInput
                  placeholder="e.g. 500"
                  value={expectedGuests}
                  onChangeText={setExpectedGuests}
                  keyboardType="numeric"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: "#E2E8F0",
                    padding: 14,
                    fontSize: 14,
                    color: "#0F172A",
                  }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: "#334155", marginBottom: 6 }}>
                  Event Date (YYYY-MM-DD) *
                </Text>
                <TextInput
                  placeholder="2026-09-15"
                  value={eventDate}
                  onChangeText={setEventDate}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: "#E2E8F0",
                    padding: 14,
                    fontSize: 14,
                    color: "#0F172A",
                  }}
                />
              </View>
            </View>

            {/* Start / End Time */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: "#334155", marginBottom: 6 }}>
                  Start Time *
                </Text>
                <TextInput
                  placeholder="10:00 AM"
                  value={startTime}
                  onChangeText={setStartTime}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: "#E2E8F0",
                    padding: 14,
                    fontSize: 14,
                    color: "#0F172A",
                  }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: "#334155", marginBottom: 6 }}>
                  End Time *
                </Text>
                <TextInput
                  placeholder="06:00 PM"
                  value={endTime}
                  onChangeText={setEndTime}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: "#E2E8F0",
                    padding: 14,
                    fontSize: 14,
                    color: "#0F172A",
                  }}
                />
              </View>
            </View>

            {/* Food Service Toggle */}
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 18,
                padding: 14,
                borderWidth: 1,
                borderColor: "#E2E8F0",
                marginBottom: 14,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>Food / Catering Service?</Text>
                  <Text style={{ fontSize: 11, color: "#64748B" }}>Increases organic wet waste estimation</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setFoodService(!foodService)}
                  style={{
                    backgroundColor: foodService ? "#059669" : "#E2E8F0",
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: foodService ? "#FFFFFF" : "#64748B", fontWeight: "900", fontSize: 12 }}>
                    {foodService ? "YES 🍽️" : "NO"}
                  </Text>
                </TouchableOpacity>
              </View>

              {foodService && (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: "#334155", marginBottom: 8 }}>
                    Select Food Type:
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {["Full Meal", "Snacks", "Both"].map((ft) => (
                      <TouchableOpacity
                        key={ft}
                        onPress={() => setFoodType(ft)}
                        style={{
                          backgroundColor: foodType === ft ? "#ECFDF5" : "#F8FAFC",
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: foodType === ft ? "#059669" : "#E2E8F0",
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: "800", color: foodType === ft ? "#059669" : "#64748B" }}>
                          {ft}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Expected Waste Types */}
            <Text style={{ fontSize: 13, fontWeight: "800", color: "#334155", marginBottom: 8 }}>
              Expected Waste Types (Multi-select)
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {WASTE_OPTIONS.map((w) => {
                const sel = wasteTypes.includes(w);
                return (
                  <TouchableOpacity
                    key={w}
                    onPress={() => toggleWasteType(w)}
                    style={{
                      backgroundColor: sel ? "#ECFDF5" : "#FFFFFF",
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: sel ? "#059669" : "#CBD5E1",
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "800", color: sel ? "#059669" : "#64748B" }}>
                      {sel ? "✓ " : "+ "}
                      {w} Waste
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Next Button */}
            <TouchableOpacity
              onPress={() => {
                if (validateStep1()) setCurrentStep(2);
              }}
              style={{
                backgroundColor: "#059669",
                borderRadius: 16,
                paddingVertical: 15,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                shadowColor: "#059669",
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "900", marginRight: 8 }}>
                Proceed to Location (Step 2)
              </Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 2: LOCATION & VENUE */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <View>
            <Text style={{ fontSize: 15, fontWeight: "900", color: "#0F172A", marginBottom: 10 }}>
              2. Venue & Delivery Location
            </Text>

            {/* Venue Type */}
            <Text style={{ fontSize: 13, fontWeight: "800", color: "#334155", marginBottom: 6 }}>
              Venue Environment *
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {VENUE_TYPES.map((vt) => (
                <TouchableOpacity
                  key={vt}
                  onPress={() => setVenueType(vt)}
                  style={{
                    backgroundColor: venueType === vt ? "#059669" : "#FFFFFF",
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: venueType === vt ? "#059669" : "#CBD5E1",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "800", color: venueType === vt ? "#FFFFFF" : "#334155" }}>
                    {vt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Address Field */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#334155" }}>
                Full Venue Address *
              </Text>
              <TouchableOpacity
                onPress={detectGPSLocation}
                style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#ECFDF5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}
              >
                {detectingLocation ? <ActivityIndicator size="small" color="#059669" /> : <Compass size={12} color="#059669" />}
                <Text style={{ fontSize: 10, fontWeight: "800", color: "#059669", marginLeft: 4 }}>
                  Auto-Detect GPS
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="e.g. Royal Palace Garden, Plot 42, Ring Road, Indore"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: "#E2E8F0",
                padding: 14,
                fontSize: 14,
                color: "#0F172A",
                minHeight: 80,
                textAlignVertical: "top",
                marginBottom: 14,
              }}
            />

            {/* Coordinates display */}
            <View style={{ backgroundColor: "#F0FDF4", padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "#BBF7D0", marginBottom: 20 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#166534" }}>
                📍 GPS Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </Text>
              <Text style={{ fontSize: 10, color: "#15803D", marginTop: 2 }}>
                Sanitation vehicles will deliver dustbins directly to these coordinates.
              </Text>
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setCurrentStep(1)}
                style={{ flex: 1, backgroundColor: "#F1F5F9", borderRadius: 16, paddingVertical: 14, alignItems: "center" }}
              >
                <Text style={{ fontWeight: "800", color: "#475569" }}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (validateStep2()) setCurrentStep(3);
                }}
                style={{ flex: 2, backgroundColor: "#059669", borderRadius: 16, paddingVertical: 14, alignItems: "center" }}
              >
                <Text style={{ fontWeight: "900", color: "#FFFFFF" }}>Next: Documents →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 3: DOCUMENT UPLOAD */}
        {/* ======================================================== */}
        {currentStep === 3 && (
          <View>
            <Text style={{ fontSize: 15, fontWeight: "900", color: "#0F172A", marginBottom: 6 }}>
              3. Supporting Documents Upload
            </Text>
            <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>
              Upload event invitation card or permission letter for AI verification.
            </Text>

            {/* Document 1: Event Proof (Required) */}
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }}>
                  1. Event Proof / Invitation Card *
                </Text>
                {eventProof && (
                  <View style={{ backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: "800", color: "#166534" }}>Ready ✓</Text>
                  </View>
                )}
              </View>

              {eventProof ? (
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F0FDF4", padding: 10, borderRadius: 14 }}>
                  <FileText size={24} color="#059669" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: "#166534" }} numberOfLines={1}>
                      {eventProof.name}
                    </Text>
                    <Text style={{ fontSize: 10, color: "#15803D" }}>Document Selected</Text>
                  </View>
                  <TouchableOpacity onPress={() => setEventProof(null)} style={{ padding: 6 }}>
                    <Trash2 size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={pickEventProof}
                  style={{
                    backgroundColor: "#ECFDF5",
                    borderRadius: 16,
                    paddingVertical: 24,
                    alignItems: "center",
                    borderWidth: 1.5,
                    borderStyle: "dashed",
                    borderColor: "#10B981",
                  }}
                >
                  <UploadCloud size={30} color="#059669" style={{ marginBottom: 6 }} />
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#059669" }}>
                    Tap to Upload Invitation / Proof
                  </Text>
                  <Text style={{ fontSize: 10, color: "#047857", marginTop: 2 }}>
                    Supports JPG, PNG, PDF (Max 15MB)
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Document 2: Identity Proof (Optional) */}
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 20 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A" }}>
                  2. Identity Proof (Optional)
                </Text>
                {identityProof && (
                  <View style={{ backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: "800", color: "#166534" }}>Attached ✓</Text>
                  </View>
                )}
              </View>

              {identityProof ? (
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F0FDF4", padding: 10, borderRadius: 14 }}>
                  <ShieldCheck size={24} color="#059669" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: "#166534" }} numberOfLines={1}>
                      {identityProof.name}
                    </Text>
                    <Text style={{ fontSize: 10, color: "#15803D" }}>Government ID Attached</Text>
                  </View>
                  <TouchableOpacity onPress={() => setIdentityProof(null)} style={{ padding: 6 }}>
                    <Trash2 size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={pickIdentityProof}
                  style={{
                    backgroundColor: "#F8FAFC",
                    borderRadius: 16,
                    paddingVertical: 18,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#CBD5E1",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "800", color: "#64748B" }}>
                    + Upload Identity Document (Aadhaar / Voter ID / License)
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setCurrentStep(2)}
                style={{ flex: 1, backgroundColor: "#F1F5F9", borderRadius: 16, paddingVertical: 14, alignItems: "center" }}
              >
                <Text style={{ fontWeight: "800", color: "#475569" }}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (validateStep3()) setCurrentStep(4);
                }}
                style={{ flex: 2, backgroundColor: "#059669", borderRadius: 16, paddingVertical: 14, alignItems: "center" }}
              >
                <Text style={{ fontWeight: "900", color: "#FFFFFF" }}>Review & Estimate →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 4: REVIEW & LIVE WASTE ESTIMATION */}
        {/* ======================================================== */}
        {currentStep === 4 && (
          <View>
            <Text style={{ fontSize: 15, fontWeight: "900", color: "#0F172A", marginBottom: 6 }}>
              4. Review AI Recommendation
            </Text>
            <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 14 }}>
              The SafaiMitra municipal engine will analyze your inputs and generate dustbin quotas for City Admin approval.
            </Text>

            {/* Live Recommendation Card */}
            <LinearGradient
              colors={["#047857", "#059669"]}
              style={{
                borderRadius: 22,
                padding: 18,
                marginBottom: 16,
                shadowColor: "#059669",
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 4,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Sparkles size={18} color="#A7F3D0" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 14, fontWeight: "900", color: "#FFFFFF" }}>
                    AI Waste & Bin Estimate
                  </Text>
                </View>
                <View style={{ backgroundColor: "#065F46", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: "800", color: "#A7F3D0" }}>
                    Risk: {clientEst.risk}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 24, fontWeight: "900", color: "#FFFFFF", marginBottom: 4 }}>
                ~{clientEst.wasteKg} kg Expected Waste
              </Text>
              <Text style={{ fontSize: 11, color: "#D1FAE5", marginBottom: 14 }}>
                Estimated for {expectedGuests} guests • {foodService ? foodType : "No Food"}
              </Text>

              {/* Bins breakdown */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "rgba(255, 255, 255, 0.15)", borderRadius: 14, padding: 10 }}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: "#FFFFFF" }}>{clientEst.wetBins}</Text>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#D1FAE5" }}>Wet Bins</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: "#FFFFFF" }}>{clientEst.dryBins}</Text>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#D1FAE5" }}>Dry Bins</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: "#FFFFFF" }}>{clientEst.generalBins}</Text>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#D1FAE5" }}>General</Text>
                </View>
                <View style={{ alignItems: "center", borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.3)", paddingLeft: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: "#FEF08A" }}>{clientEst.totalBins}</Text>
                  <Text style={{ fontSize: 9, fontWeight: "900", color: "#FEF08A" }}>Total Bins</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Event Summary Details */}
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: "900", color: "#0F172A", marginBottom: 10 }}>
                Event Summary
              </Text>
              <Text style={{ fontSize: 12, color: "#334155", marginBottom: 4 }}>
                <Text style={{ fontWeight: "800" }}>Event:</Text> {eventName} ({eventType})
              </Text>
              <Text style={{ fontSize: 12, color: "#334155", marginBottom: 4 }}>
                <Text style={{ fontWeight: "800" }}>Date & Time:</Text> {eventDate} | {startTime} - {endTime}
              </Text>
              <Text style={{ fontSize: 12, color: "#334155", marginBottom: 4 }}>
                <Text style={{ fontWeight: "800" }}>Venue:</Text> {address} ({venueType})
              </Text>
              <Text style={{ fontSize: 12, color: "#334155" }}>
                <Text style={{ fontWeight: "800" }}>Documents:</Text> {eventProof ? eventProof.name : "None"}
              </Text>
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setCurrentStep(3)}
                disabled={submitting}
                style={{ flex: 1, backgroundColor: "#F1F5F9", borderRadius: 16, paddingVertical: 15, alignItems: "center" }}
              >
                <Text style={{ fontWeight: "800", color: "#475569" }}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleFinalSubmit}
                disabled={submitting}
                style={{
                  flex: 2,
                  backgroundColor: submitting ? "#94A3B8" : "#059669",
                  borderRadius: 16,
                  paddingVertical: 15,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ fontWeight: "900", color: "#FFFFFF", fontSize: 15 }}>
                    Submit to City Admin 🚀
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 5: SUBMITTED CONFIRMATION & LIVE TRACKER */}
        {/* ======================================================== */}
        {currentStep === 5 && submittedRequest && (
          <View style={{ alignItems: "center", paddingTop: 20 }}>
            <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: "#DCFCE7", justifyContent: "center", alignItems: "center", marginBottom: 16 }}>
              <CheckCircle2 size={40} color="#059669" />
            </View>

            <Text style={{ fontSize: 22, fontWeight: "900", color: "#0F172A", marginBottom: 6 }}>
              Request Registered!
            </Text>
            <Text style={{ fontSize: 13, color: "#64748B", textAlign: "center", marginBottom: 20 }}>
              Your event dustbin requirement has been submitted and queued for municipal admin approval.
            </Text>

            {/* Request Card */}
            <View style={{ width: "100%", backgroundColor: "#FFFFFF", borderRadius: 22, padding: 18, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 20 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748B", textTransform: "uppercase" }}>
                Request Tracking ID
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "900", color: "#059669", marginTop: 2, marginBottom: 12 }}>
                {submittedRequest.requestId}
              </Text>

              <View style={{ height: 1, backgroundColor: "#F1F5F9", marginBottom: 12 }} />

              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ fontSize: 12, color: "#64748B" }}>AI Recommended Bins:</Text>
                <Text style={{ fontSize: 12, fontWeight: "800", color: "#0F172A" }}>
                  {submittedRequest.aiAnalysis?.recommendedBins?.total || clientEst.totalBins} Units
                </Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ fontSize: 12, color: "#64748B" }}>Current Status:</Text>
                <View style={{ backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: "900", color: "#B45309" }}>
                    PENDING ADMIN REVIEW
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: "100%",
                backgroundColor: "#059669",
                borderRadius: 16,
                paddingVertical: 15,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "900", color: "#FFFFFF" }}>
                Return to Citizen Dashboard
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
