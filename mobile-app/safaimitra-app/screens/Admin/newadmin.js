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

// ✅ InputField Component
const InputField = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  secureTextEntry = false, 
  keyboardType = "default",
  editable = true 
}) => (
  <View className="mb-4">
    <Text className="text-sm font-medium text-gray-700 mb-2">
      {label} {editable && "*"}
    </Text>
    <TextInput
      className={`w-full border rounded-lg px-4 py-3 text-base ${
        editable 
          ? "bg-white border-gray-300 text-gray-800" 
          : "bg-gray-100 border-gray-200 text-gray-500"
      }`}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize="none"
      editable={editable}
    />
  </View>
);

export default function NewAdminPage({ goBack }) {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "admin",
    password: ""
  });

  const handleInputChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateAdmin = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      Alert.alert("Missing Fields", "All required fields must be filled");
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem("token");

      await axios.post(
        `${API_BASE_URL}/admin/register`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      Alert.alert("Success", "Admin created successfully!", [
        { 
          text: "OK", 
          // 👇 CHANGE IS HERE: Pass 'true' to signal refresh
          onPress: () => goBack(true) 
        }
      ]);
      
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || "Failed to create admin";
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
                // 👇 Regular back doesn't need refresh
                onPress={() => goBack(false)} 
                className="p-2 bg-gray-50 rounded-lg mr-4"
              >
                <ArrowLeft color="#374151" size={24} />
              </TouchableOpacity>
              <Text className="text-xl font-bold text-gray-800">
                Create New Admin
              </Text>
            </View>

            {/* Form */}
            <View className="p-5">
              <InputField 
                label="Full Name" 
                value={formData.name} 
                onChangeText={(text) => handleInputChange("name", text)}
                placeholder="Enter full name"
              />
              
              <InputField 
                label="Email" 
                value={formData.email} 
                onChangeText={(text) => handleInputChange("email", text)}
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

              <InputField 
                label="Role" 
                value={formData.role} 
                editable={false} 
              />
            </View>

            {/* Footer Buttons */}
            <View className="p-5 bg-gray-50 border-t border-gray-100 flex-row justify-end gap-3">
              <TouchableOpacity
                onPress={() => goBack(false)}
                className="px-6 py-3 rounded-xl border border-gray-300 bg-white"
                disabled={loading}
              >
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCreateAdmin}
                className={`px-6 py-3 rounded-xl bg-green-600 flex-row items-center gap-2 ${loading ? 'opacity-70' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Save color="white" size={18} />
                    <Text className="text-white font-bold">Create Admin</Text>
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