"use client";

import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

export default function OfficeStaffLogin({ portal, onBack, router }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/office/login`, {
        username,
        password,
      });

      if (res.data && res.data.user && res.data.token) {
        document.cookie = `token=${res.data.token}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `role=${portal.title}; path=/; max-age=86400; SameSite=Lax`;

        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        localStorage.setItem("role", portal.title);

        const userId = res.data.user.id;
        localStorage.setItem("userId", userId);

        router.push(`/office?id=${userId}`);
      } else {
        alert("Invalid credentials or missing data from server.");
      }
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

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
            Welcome back to the <br /> {portal.title} Portal.
          </h2>
          <p className="text-gray-700 text-lg max-w-md">
            Helping you manage waste more efficiently for a cleaner, greener city environment.
          </p>
        </div>
        <div className="text-sm text-gray-500 font-medium">
          © 2026 SafaiMitra Initiative. All rights reserved.
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative">
        <button
          onClick={onBack}
          className="absolute top-8 left-8 flex items-center text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" /> Back to Portals
        </button>

        <div className="w-full max-w-md">
          <div className="md:hidden flex items-center space-x-2 mb-8 justify-center">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm" />
            </div>
            <span className="text-xl font-bold">Safai<span className="text-green-500">Mitra</span></span>
          </div>

          <div className="text-center md:text-left mb-10">
            <h3 className="text-3xl font-bold text-gray-900 mb-2">Office Staff Login</h3>
            <p className="text-gray-500">Enter your credentials to access the office portal.</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Office ID / Username</label>
              <input
                type="text"
                placeholder="Enter your office ID"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all text-black"
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
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all text-black"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                <span className="text-gray-600">Remember me</span>
              </label>
              <a href="#" className={`${portal.iconColor} font-semibold hover:underline`}>Forgot Password?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${portal.buttonColor} text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95`}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="mt-12 text-center text-sm text-gray-500">
            Unauthorized access is strictly prohibited. <br />
            Need help? <a href="#" className="font-bold text-gray-900 underline">Contact System Admin</a>
          </div>
        </div>
      </div>
    </div>
  );
}