import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert 
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { UserCircle, Home, Phone, ChevronLeft, MapPin, ShieldAlert } from 'lucide-react-native';

// --- STABLE COMPONENT (Defined outside to prevent focus loss) ---
const FormField = ({ label, placeholder, required, value, onChangeText, error, keyboardType = "default", secureTextEntry = false }) => (
  <View className="mb-4">
    <Text className="text-gray-700 text-sm font-semibold mb-1">
      {label} {required && <Text className="text-red-500">*</Text>}
    </Text>
    <TextInput
      className={`bg-white px-4 py-3 rounded-xl border-2 ${error ? 'border-red-500' : 'border-gray-200'} text-gray-800`}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
    />
    {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
  </View>
);

export default function UserRegister({ goBack }) {
  const [formData, setFormData] = useState({
    fullName: '',
    fatherName: '',
    motherName: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    phone: '',
    alternatePhone: '',
    houseNo: '',
    wardNo: '',
    street: '',
    locality: '',
    city: '',
    state: '',
    pincode: '',
    nationality: '',
    occupation: '',
    emergencyContact: '',
    emergencyRelation: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Required';
    if (!formData.fatherName.trim()) newErrors.fatherName = 'Required';
    if (!formData.email.trim()) newErrors.email = 'Required';
    if (!formData.phone.trim()) newErrors.phone = 'Required';
    if (!formData.houseNo.trim()) newErrors.houseNo = 'Required';
    if (!formData.city.trim()) newErrors.city = 'Required';
    if (!formData.pincode.trim()) newErrors.pincode = 'Required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      Alert.alert("Success", "Registration details saved locally!");
      console.log('Form submitted:', formData);
    } else {
      Alert.alert("Form Incomplete", "Please fill in all mandatory fields marked with *");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-blue-900 pt-6 pb-12 px-6 rounded-b-[40px]">
          <TouchableOpacity onPress={goBack} className="flex-row items-center mb-6">
            <ChevronLeft color="white" size={24} />
            <Text className="text-white text-base font-semibold ml-1">Back</Text>
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-white text-3xl font-bold">Create Account</Text>
            <Text className="text-blue-200 text-sm mt-1">Please provide your valid details</Text>
          </View>
        </View>

        <View className="px-6 -mt-8">
          <View className="bg-white rounded-3xl p-6 shadow-xl mb-10">
            
            {/* 1. PERSONAL INFORMATION */}
            <View className="flex-row items-center mb-4">
              <UserCircle size={20} color="#1E3A8A" />
              <Text className="text-blue-900 font-bold ml-2 uppercase text-xs tracking-widest">Personal Information</Text>
            </View>
            <FormField label="Full Name" placeholder="Full Name" required value={formData.fullName} onChangeText={(t) => handleChange('fullName', t)} error={errors.fullName} />
            <FormField label="Father's Name" placeholder="Father's Name" required value={formData.fatherName} onChangeText={(t) => handleChange('fatherName', t)} error={errors.fatherName} />
            <FormField label="Mother's Name" placeholder="Mother's Name" value={formData.motherName} onChangeText={(t) => handleChange('motherName', t)} />
            <FormField label="Date of Birth" placeholder="DD/MM/YYYY" required value={formData.dateOfBirth} onChangeText={(t) => handleChange('dateOfBirth', t)} />
            <FormField label="Gender" placeholder="Male/Female/Other" value={formData.gender} onChangeText={(t) => handleChange('gender', t)} />
            <FormField label="Nationality" placeholder="e.g. Indian" value={formData.nationality} onChangeText={(t) => handleChange('nationality', t)} />
            <FormField label="Occupation" placeholder="e.g. Business/Student" value={formData.occupation} onChangeText={(t) => handleChange('occupation', t)} />

            <View className="h-px bg-gray-100 my-6" />

            {/* 2. CONTACT INFORMATION */}
            <View className="flex-row items-center mb-4">
              <Phone size={20} color="#1E3A8A" />
              <Text className="text-blue-900 font-bold ml-2 uppercase text-xs tracking-widest">Contact Details</Text>
            </View>
            <FormField label="Email Address" placeholder="email@example.com" required keyboardType="email-address" value={formData.email} onChangeText={(t) => handleChange('email', t)} error={errors.email} />
            <FormField label="Phone Number" placeholder="10 Digit Mobile No" required keyboardType="numeric" value={formData.phone} onChangeText={(t) => handleChange('phone', t)} error={errors.phone} />
            <FormField label="Alternate Phone" placeholder="Optional Number" keyboardType="numeric" value={formData.alternatePhone} onChangeText={(t) => handleChange('alternatePhone', t)} />

            <View className="h-px bg-gray-100 my-6" />

            {/* 3. ADDRESS INFORMATION */}
            <View className="flex-row items-center mb-4">
              <MapPin size={20} color="#1E3A8A" />
              <Text className="text-blue-900 font-bold ml-2 uppercase text-xs tracking-widest">Address Details</Text>
            </View>
            <FormField label="House/Flat No." placeholder="House No." required value={formData.houseNo} onChangeText={(t) => handleChange('houseNo', t)} error={errors.houseNo} />
            <FormField label="Ward No." placeholder="Ward Number" value={formData.wardNo} onChangeText={(t) => handleChange('wardNo', t)} />
            <FormField label="Street/Road" placeholder="Street Name" value={formData.street} onChangeText={(t) => handleChange('street', t)} />
            <FormField label="Locality" placeholder="Area Name" value={formData.locality} onChangeText={(t) => handleChange('locality', t)} />
            <View className="flex-row gap-x-4">
               <View className="flex-1"><FormField label="City" placeholder="City" required value={formData.city} onChangeText={(t) => handleChange('city', t)} error={errors.city} /></View>
               <View className="flex-1"><FormField label="State" placeholder="State" value={formData.state} onChangeText={(t) => handleChange('state', t)} /></View>
            </View>
            <FormField label="Pincode" placeholder="6 Digit Code" required keyboardType="numeric" value={formData.pincode} onChangeText={(t) => handleChange('pincode', t)} error={errors.pincode} />

            <View className="h-px bg-gray-100 my-6" />

            {/* 4. EMERGENCY CONTACT */}
            <View className="flex-row items-center mb-4">
              <ShieldAlert size={20} color="#B91C1C" />
              <Text className="text-red-700 font-bold ml-2 uppercase text-xs tracking-widest">Emergency Contact</Text>
            </View>
            <FormField label="Emergency Contact Name/No" placeholder="Contact Details" value={formData.emergencyContact} onChangeText={(t) => handleChange('emergencyContact', t)} />
            <FormField label="Relation" placeholder="e.g. Spouse/Parent" value={formData.emergencyRelation} onChangeText={(t) => handleChange('emergencyRelation', t)} />

            {/* ACTIONS */}
            <TouchableOpacity 
              onPress={handleSubmit}
              className="bg-blue-900 rounded-2xl py-4 mt-8 items-center shadow-lg"
              activeOpacity={0.8}
            >
              <Text className="text-white text-lg font-bold">Complete Registration</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={goBack} className="mt-4 py-2">
              <Text className="text-gray-500 text-center font-medium">Already have an account? <Text className="text-blue-900 font-bold">Login</Text></Text>
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}