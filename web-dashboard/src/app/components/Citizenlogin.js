"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, MapPin, Loader } from 'lucide-react';
import axios from 'axios';

export default function CitizenLogin({ portal, onBack, router }) {
  // 1. Hydration Fix: Ensure component only renders on client
  const [isMounted, setIsMounted] = useState(false);

  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [officeList, setOfficeList] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // Registration form states
  const [regData, setRegData] = useState({
    fullName: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    confirmPassword: "",
    address: "",
    latitude: "",
    longitude: "",
    city: "",
    pincode: "",
    officeId: "",
    cityName: ""
  });

  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  // Hydration Fix Effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchOffices = async () => {
    setLoadingCities(true);
    try {
      const res = await axios.get("http://localhost:5001/public-list");
      if (res.data && res.data.success) {
        setOfficeList(res.data.cities);
      }
      console.log("Fetched cities for registration:", res.data.cities);
    } catch (error) {
      console.error("Error fetching cities:", error);
      // Optional: Don't alert immediately on load, just log it
    } finally {
      setLoadingCities(false);
    }
  };

  // --- Handle City Selection ---
  const handleCityChange = (e) => {
    const selectedId = e.target.value;
    const selectedOffice = officeList.find(office => office.id === selectedId);

    setRegData(prev => ({
      ...prev,
      officeId: selectedId,
      cityName: selectedOffice ? selectedOffice.name : "",
      city: selectedOffice ? selectedOffice.name : "" // Update both city fields for safety
    }));
  };

  // --- Auto-fetch logic ---
  useEffect(() => {
    if (!isLogin) {
      // FIX: Call the fetch function when switching to registration
      fetchOffices();

      if (!regData.latitude && !regData.longitude) {
        fetchCurrentLocation();
      }
    }
  }, [isLogin]); // Removed regData dependencies to prevent infinite loops

  const fetchCurrentLocation = () => {
    setLocationLoading(true);
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setRegData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
        setLocationLoading(false);
      },
      (error) => {
        console.error(error);
        setLocationError("Unable to fetch location. Please enter manually.");
        setLocationLoading(false);
      }
    );
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:5001/citizen/login", {
        username: username,
        password: password,
      });

      if (res.data && res.data.success) {
        const { token, user } = res.data;

        document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `role=Citizen; path=/; max-age=604800; SameSite=Lax`;

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("userId", user.id);
        localStorage.setItem("role", "Citizen");
        localStorage.setItem("officeId", user.officeId);

        alert("Login Successful!");
        router.push(`/citizen?id=${user.id}`);
      }
    } catch (error) {
      console.error("Login Error:", error.response?.data);
      alert(error.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (regData.password !== regData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (!regData.latitude || !regData.longitude) {
      alert("Please provide your location!");
      return;
    }

    // Validation for City
    if (!regData.officeId) {
      alert("Please select a City from the list!");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post("http://localhost:5001/citizen/register", {
        fullName: regData.fullName,
        email: regData.email,
        phone: regData.phone,
        password: regData.password,
        address: regData.address,
        latitude: parseFloat(regData.latitude),
        longitude: parseFloat(regData.longitude),
        city: regData.cityName, // Send the name
        pincode: regData.pincode,
        officeId: regData.officeId, // Send the ID
        cityName: regData.cityName  // Send the name again if backend expects it specifically here
      });

      if (res.data && res.data.success) {
        alert("Registration successful! Please login.");
        setIsLogin(true);
        setRegData({
          fullName: "", email: "", phone: "", username: "", password: "",
          confirmPassword: "", address: "", latitude: "", longitude: "",
          city: "", pincode: "", officeId: "", cityName: ""
        });
      } else {
        alert(res.data.message);
      }
    } catch (error) {
      console.error("Registration Error:", error);
      alert(error.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegDataChange = (e) => {
    const { name, value } = e.target;
    setRegData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openMapSelection = () => {
    if (regData.latitude && regData.longitude) {
      const mapUrl = `https://www.google.com/maps?q=${regData.latitude},${regData.longitude}&z=15`;
      window.open(mapUrl, '_blank');
    } else {
      alert("Please fetch your current location first.");
    }
  };

  // 2. Hydration Fix: Return null until mounted on client
  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row animate-in fade-in duration-500">
      {/* Left Side: Visual Branding */}
      <div className={`hidden md:flex md:w-1/2 ${portal.color} p-12 flex-col justify-between`}>
        <div>
          <div className="flex items-center space-x-2 mb-12">
            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
              <div className="w-5 h-5 bg-white rounded-sm" />
            </div>
            <span className="text-2xl font-bold text-gray-900">SafaiMitra</span>
          </div>
          <h2 className={`text-5xl font-extrabold ${portal.iconColor} leading-tight mb-6`}>
            {isLogin ? 'Welcome back to the' : 'Join the'} <br /> {portal.title} Portal.
          </h2>
          <p className="text-gray-700 text-lg max-w-md">
            {isLogin
              ? 'Helping you manage waste more efficiently for a cleaner, greener city environment.'
              : 'Register now to report waste, track vehicles, and contribute to a cleaner city.'
            }
          </p>
        </div>
        <div className="text-sm text-gray-500 font-medium">
          © 2026 SafaiMitra Initiative. All rights reserved.
        </div>
      </div>

      {/* Right Side: Login/Register Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative overflow-y-auto">
        <button
          onClick={onBack}
          className="absolute top-8 left-8 flex items-center text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" /> Back to Portals
        </button>

        <div className="w-full max-w-md my-8">
          <div className="md:hidden flex items-center space-x-2 mb-8 justify-center">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm" />
            </div>
            <span className="text-xl font-bold">Safai<span className="text-emerald-500">Mitra</span></span>
          </div>

          {/* Toggle Login/Register */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${isLogin
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${!isLogin
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              Register
            </button>
          </div>

          {/* LOGIN FORM */}
          {isLogin ? (
            <>
              <div className="text-center md:text-left mb-10">
                <h3 className="text-3xl font-bold text-gray-900 mb-2">Citizen Login</h3>
                <p className="text-gray-500">Enter your credentials to access your citizen portal.</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone No.</label>
                  <input
                    type="text"
                    placeholder="Enter your phone number"
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-black"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-black"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-gray-600">Remember me</span>
                  </label>
                  <a href="#" className={`${portal.iconColor} font-semibold hover:underline`}>Forgot Password?</a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full ${portal.buttonColor} text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95 disabled:opacity-50`}
                >
                  {loading ? "Signing In..." : "Sign In"}
                </button>
              </form>
            </>
          ) : (
            // REGISTRATION FORM
            <>
              <div className="text-center md:text-left mb-10">
                <h3 className="text-3xl font-bold text-gray-900 mb-2">Register as Citizen</h3>
                <p className="text-gray-500">Create your account to start making a difference.</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-5">
                {/* Personal Information */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    placeholder="Enter your full name"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-black"
                    required
                    value={regData.fullName}
                    onChange={handleRegDataChange}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="your@email.com"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-black"
                      required
                      value={regData.email}
                      onChange={handleRegDataChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone *</label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="10-digit number"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-black"
                      required
                      value={regData.phone}
                      onChange={handleRegDataChange}
                    />
                  </div>
                </div>

                {/* Account Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
                    <input
                      type="password"
                      name="password"
                      placeholder="Min 6 characters"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-black"
                      required
                      minLength={6}
                      value={regData.password}
                      onChange={handleRegDataChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password *</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      placeholder="Re-enter password"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-black"
                      required
                      value={regData.confirmPassword}
                      onChange={handleRegDataChange}
                    />
                  </div>
                </div>

                {/* Address Information */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Address *</label>
                  <textarea
                    name="address"
                    placeholder="Enter your complete address"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-black resize-none"
                    rows="2"
                    required
                    value={regData.address}
                    onChange={handleRegDataChange}
                  />
                </div>

                {/* City Dropdown and Pincode */}
                <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select City *</label>
                    <select
                      name="officeId"
                      required
                      value={regData.officeId}
                      onChange={handleCityChange}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-black appearance-none"
                    >
                      <option value="">-- Choose City --</option>
                      {loadingCities ? (
                        <option disabled>Loading cities...</option>
                      ) : (
                        officeList.map((office) => (
                          <option key={office.id} value={office.id}>
                            {office.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Pincode *</label>
                    <input
                      type="text"
                      name="pincode"
                      placeholder="6-digit pincode"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-black"
                      required
                      maxLength={6}
                      value={regData.pincode}
                      onChange={handleRegDataChange}
                    />
                  </div>
                </div>

                {/* Location Section */}
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-700 flex items-center">
                      <MapPin className="w-4 h-4 mr-1 text-emerald-600" />
                      Location Coordinates *
                    </label>
                    <button
                      type="button"
                      onClick={fetchCurrentLocation}
                      disabled={locationLoading}
                      className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center"
                    >
                      {locationLoading ? (
                        <>
                          <Loader className="w-3 h-3 mr-1 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        'Auto-Fetch Location'
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                      <input
                        type="text"
                        name="latitude"
                        placeholder="Latitude"
                        className="w-full p-2.5 bg-white border border-emerald-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-black text-sm"
                        required
                        value={regData.latitude}
                        onChange={handleRegDataChange}
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        name="longitude"
                        placeholder="Longitude"
                        className="w-full p-2.5 bg-white border border-emerald-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-black text-sm"
                        required
                        value={regData.longitude}
                        onChange={handleRegDataChange}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={openMapSelection}
                    className="w-full text-xs bg-white border border-emerald-300 text-emerald-700 px-3 py-2 rounded-lg hover:bg-emerald-50 transition-colors flex items-center justify-center"
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    Select Location on Map
                  </button>

                  {locationError && (
                    <p className="text-xs text-red-600 mt-2">{locationError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full ${portal.buttonColor} text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95 disabled:opacity-50`}
                >
                  {loading ? "Registering..." : "Register Now"}
                </button>
              </form>
            </>
          )}

          <div className="mt-8 text-center text-sm text-gray-500">
            {isLogin ? (
              <>
                Don't have an account? <button onClick={() => setIsLogin(false)} className="font-bold text-emerald-600 underline">Register here</button>
              </>
            ) : (
              <>
                Already have an account? <button onClick={() => setIsLogin(true)} className="font-bold text-emerald-600 underline">Login here</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}