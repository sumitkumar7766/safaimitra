import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

export const checkPermission = async (targetScreen) => {
  try {
    const userString = await AsyncStorage.getItem("user");
    const token = await AsyncStorage.getItem("token");
    const user = userString ? JSON.parse(userString) : null;
    const role = user?.role; // e.g., 'admin', 'citizen', 'vehicle'

    console.log(`Middleware Checking: Target -> ${targetScreen} | Role -> ${role}`);

    // 1. Login Check: Agar token nahi hai aur user andar jane ki koshish kar raha hai
    // Note: Login/Register/Home pages ko allowed list me rakhein
    const publicScreens = ["home", "citizenLogin", "vehicleLogin", "adminLogin", "officeLogin", "register"];
    
    if (!publicScreens.includes(targetScreen) && !token) {
      Alert.alert("Access Denied", "Please login first.");
      return false; // Block access
    }

    // 2. Role-Based Protection (SECURITY)
    
    // CASE A: Citizen trying to access Admin or Vehicle pages
    if (targetScreen === "adminPage" && role !== "admin") {
      Alert.alert("Restricted", "Only Admins can access this area.");
      return false;
    }
    
    if (targetScreen === "vehicle" && role !== "vehicle") {
      Alert.alert("Restricted", "Only Vehicle Staff can access this area.");
      return false;
    }

    // CASE B: Agar Admin galti se Citizen dashboard kholna chahe (Optional)
    if (targetScreen === "citizen" && role !== "citizen") {
       // Usually Admins can see everything, but agar restrict karna ho to yaha karein
       // return true; 
    }

    // Agar sab sahi hai to TRUE return karo
    return true;

  } catch (error) {
    console.error("Middleware Error:", error);
    return false;
  }
};