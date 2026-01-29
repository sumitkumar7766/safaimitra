"use client";

import React, { useState } from 'react';
import { User, Truck, Building2, ArrowRight, Lock, X, ChevronLeft } from 'lucide-react';
import { useRouter } from "next/navigation";
import axios from "axios";


export default function SafaiMitra() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState(null);
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);


  const portals = [
    {
      title: 'Citizen',
      icon: User,
      description: 'Report waste, track vehicles, and view your impact history.',
      color: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      buttonColor: 'bg-emerald-600 hover:bg-emerald-700',
      lightText: 'text-emerald-500'
    },
    {
      title: 'Vehicle Staff',
      icon: Truck,
      description: 'Manage routes, checkpoints, and vehicle status updates.',
      color: 'bg-orange-100',
      iconColor: 'text-orange-600',
      buttonColor: 'bg-orange-600 hover:bg-orange-700',
      lightText: 'text-orange-500'
    },
    {
      title: 'Office Staff',
      icon: Building2,
      description: 'Manage City, Zone, and Ward level operations.',
      color: 'bg-green-100',
      iconColor: 'text-green-600',
      buttonColor: 'bg-green-600 hover:bg-green-700',
      lightText: 'text-green-500'
    },
    {
      title: 'Administrator',
      icon: Building2,
      description: 'System overview, user management, and city-wide analytics.',
      color: 'bg-blue-100',
      iconColor: 'text-blue-600',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
      lightText: 'text-blue-500'
    }
  ];

  const handlePortalClick = (portal) => {
    setSelectedPortal(portal);
    setIsLoginOpen(true);
  };

  //Login centrol
  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPortal) return;

    let endpoint = "";
    let redirectBase = "";

    switch (selectedPortal.title) {
      case "Citizen":
        endpoint = "http://localhost:5001/loginc";
        redirectBase = "/citizen";
        break;
      case "Vehicle Staff":
        endpoint = "http://localhost:5001/staff/login";
        redirectBase = "/staff";
        break;
      case "Office Staff":
        endpoint = "http://localhost:5001/office/login";
        redirectBase = "/office";
        break;
      case "Administrator":
        endpoint = "http://localhost:5001/admin/login";
        redirectBase = "/admin";
        break;
      default:
        return;
    }

    try {
      const res = await axios.post(endpoint, {
        username,
        password,
      });

      if (res.data && res.data.user && res.data.token) {
        // 1. Set the cookie (Middleware looks for this)
        document.cookie = `token=${res.data.token}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `role=${selectedPortal.title}; path=/; max-age=86400; SameSite=Lax`;

        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        localStorage.setItem("role", selectedPortal.title);

        const userId = res.data.user.id;
        localStorage.setItem("userId", userId);

        router.push(`${redirectBase}?id=${userId}`);
      } else {
        alert("Invalid credentials or missing data from server.");
      }
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed. Please check your credentials.");
    }
  };


  // --- FULL PAGE LOGIN VIEW ---
  if (isLoginOpen && selectedPortal) {
    return (
      <div className="min-h-screen bg-white flex flex-col md:flex-row animate-in fade-in duration-500">
        {/* Left Side: Visual Branding (Hidden on small mobile) */}
        <div className={`hidden md:flex md:w-1/2 ${selectedPortal.color} p-12 flex-col justify-between`}>
          <div>
            <div className="flex items-center space-x-2 mb-12">
              <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                <div className="w-5 h-5 bg-white rounded-sm" />
              </div>
              <span className="text-2xl font-bold text-gray-900">SafaiMitra</span>
            </div>
            <h2 className={`text-5xl font-extrabold ${selectedPortal.iconColor} leading-tight mb-6`}>
              Welcome back to the <br /> {selectedPortal.title} Portal.
            </h2>
            <p className="text-gray-700 text-lg max-w-md">
              Helping you manage waste more efficiently for a cleaner, greener city environment.
            </p>
          </div>
          <div className="text-sm text-gray-500 font-medium">
            © 2026 SafaiMitra Initiative. All rights reserved.
          </div>
        </div>

        {/* Right Side: Responsive Login Form */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative">
          <button
            onClick={() => setIsLoginOpen(false)}
            className="absolute top-8 left-8 flex items-center text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" /> Back to Portals
          </button>

          <div className="w-full max-w-md">
            <div className="md:hidden flex items-center space-x-2 mb-8 justify-center">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm" />
              </div>
              <span className="text-xl font-bold">Safai<span className="text-emerald-500">Mitra</span></span>
            </div>

            <div className="text-center md:text-left mb-10">
              <h3 className="text-3xl font-bold text-gray-900 mb-2">Login</h3>
              <p className="text-gray-500">Please enter your authorized credentials.</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Portal ID / Username</label>
                <input
                  type="text"
                  placeholder="Please enter the username"
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
                  placeholder="Please enter the correct password"
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
                <a href="#" className={`${selectedPortal.iconColor} font-semibold hover:underline`}>Forgot Password?</a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full ${selectedPortal.buttonColor} text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95`}
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

  // --- MAIN PORTAL SELECTION VIEW ---
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm" />
            </div>
            <span className="text-xl font-bold text-gray-900">Safai<span className="text-emerald-500">Mitra</span></span>
          </div>
          <button className="text-sm font-medium text-gray-500 hover:text-gray-900">Help & Support</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-16 px-4">
          <div className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wide text-emerald-700 uppercase bg-emerald-100 rounded-full">
            Smart Waste Management
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Cleaner Cities, <span className="text-emerald-500 italic">Better Future</span>
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Welcome to the SafaiMitra digital ecosystem. Choose your portal below to begin.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {portals.map((portal, index) => (
            <div
              key={index}
              onClick={() => handlePortalClick(portal)}
              className="group bg-white rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 p-8 cursor-pointer border border-gray-100 hover:border-emerald-200 flex flex-col h-full"
            >
              <div className={`${portal.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500`}>
                <portal.icon className={`w-8 h-8 ${portal.iconColor}`} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{portal.title}</h2>
              <p className="text-gray-500 mb-8 flex-grow leading-relaxed">
                {portal.description}
              </p>
              <div className={`flex items-center font-bold ${portal.iconColor} group-hover:translate-x-2 transition-transform`}>
                Enter Portal <ArrowRight className="ml-2 w-5 h-5" />
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-12 text-center text-gray-400 text-sm">
        Powered by SmartCity Solutions © 2026
      </footer>
    </div>
  );
}