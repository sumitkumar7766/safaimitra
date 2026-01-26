import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { ArrowLeft, Save } from "lucide-react-native";

const API_BASE_URL = "http://10.13.177.129:5001"; 

// ✅ FIX: Is component ko function ke BAHAR nikal diya
const InputField = ({ label, value, onChangeText, placeholder, secureTextEntry = false, keyboardType = "default" }) => (
  <View className="mb-4">
    <Text className="text-sm font-medium text-gray-700 mb-2">{label}</Text>
    <TextInput
      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 text-base"
      value={value}
      onChangeText={onChangeText} // Direct prop passing
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize="none"
    />
  </View>
);

export default function NewOfficePage({ goBack }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    stateName: "",
    cityName: "",
    officeName: "",
    adminName: "",
    adminEmail: "",
    username: "",
    password: "",
    status: "Active",
  });

  // Handle Input Changes
  const handleInputChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateOffice = async () => {
    if (
      !formData.stateName ||
      !formData.cityName ||
      !formData.officeName ||
      !formData.adminName ||
      !formData.adminEmail ||
      !formData.password
    ) {
      Alert.alert("Missing Fields", "Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem("token");

      await axios.post(
        `${API_BASE_URL}/office/register`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      Alert.alert("Success", "Office created successfully!", [
        { text: "OK", onPress: () => goBack() }
      ]);
      
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to create office";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        className="flex-1"
      >
        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
            
            {/* Header */}
            <View className="flex-row items-center p-5 border-b border-gray-100">
              <TouchableOpacity
                onPress={goBack}
                className="p-2 bg-gray-50 rounded-lg mr-4"
              >
                <ArrowLeft color="#374151" size={24} />
              </TouchableOpacity>
              <Text className="text-xl font-bold text-gray-800">
                Create New Office
              </Text>
            </View>

            {/* Form */}
            <View className="p-5">
              <InputField 
                label="State Name" 
                value={formData.stateName} 
                onChangeText={(text) => handleInputChange("stateName", text)}
                placeholder="e.g. Madhya Pradesh"
              />
              
              <InputField 
                label="City Name" 
                value={formData.cityName} 
                onChangeText={(text) => handleInputChange("cityName", text)}
                placeholder="e.g. Bhopal"
              />
              
              <InputField 
                label="Office Name" 
                value={formData.officeName} 
                onChangeText={(text) => handleInputChange("officeName", text)}
                placeholder="e.g. Main Zone Office"
              />

              <InputField 
                label="Admin Name" 
                value={formData.adminName} 
                onChangeText={(text) => handleInputChange("adminName", text)}
                placeholder="Full Name"
              />

              <InputField 
                label="Admin Email" 
                value={formData.adminEmail} 
                onChangeText={(text) => handleInputChange("adminEmail", text)}
                placeholder="admin@example.com"
                keyboardType="email-address"
              />

              <InputField 
                label="Password" 
                value={formData.password} 
                onChangeText={(text) => handleInputChange("password", text)}
                placeholder="Secure Password"
                secureTextEntry={true}
              />

              {/* Status Selection */}
              <View className="mb-6">
                <Text className="text-sm font-medium text-gray-700 mb-2">Status</Text>
                <View className="flex-row gap-3">
                  {['Active', 'Inactive'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      onPress={() => handleInputChange('status', status)}
                      className={`flex-1 py-3 rounded-lg border items-center ${
                        formData.status === status 
                          ? 'bg-blue-50 border-blue-500' 
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <Text className={`font-semibold ${
                        formData.status === status ? 'text-blue-700' : 'text-gray-600'
                      }`}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Footer Buttons */}
            <View className="p-5 bg-gray-50 border-t border-gray-100 flex-row justify-end gap-3">
              <TouchableOpacity
                onPress={goBack}
                className="px-6 py-3 rounded-xl border border-gray-300 bg-white"
                disabled={loading}
              >
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCreateOffice}
                className={`px-6 py-3 rounded-xl bg-green-600 flex-row items-center gap-2 ${loading ? 'opacity-70' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Save color="white" size={18} />
                    <Text className="text-white font-bold">Create Office</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}