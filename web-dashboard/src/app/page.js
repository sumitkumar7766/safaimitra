'use client';

import React, { useState } from "react";
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [hoveredCard, setHoveredCard] = useState(null);

  const handleNavigation = (path) => {
    router.push(path);
  };

  const RoleButton = ({ title, icon, color, description, onClick, index }) => (
    <div
      onClick={onClick}
      onMouseEnter={() => setHoveredCard(index)}
      onMouseLeave={() => setHoveredCard(null)}
      className={`bg-white rounded-2xl p-4 mb-4 flex items-center cursor-pointer transition-all duration-300 shadow-md hover:shadow-2xl transform ${
        hoveredCard === index ? 'scale-105 -translate-y-1' : 'scale-100'
      }`}
    >
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center mr-4 transition-all duration-300 ${
          hoveredCard === index ? 'scale-110 rotate-6' : 'scale-100 rotate-0'
        }`}
        style={{ backgroundColor: color }}
      >
        <span className="text-3xl">{icon}</span>
      </div>
      
      <div className="flex-1">
        <h3 className="text-lg font-bold text-gray-800 mb-1">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      
      <div className={`text-3xl text-gray-300 font-light transition-all duration-300 ${
        hoveredCard === index ? 'translate-x-2 text-blue-800' : 'translate-x-0'
      }`}>
        ›
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-blue-900 flex flex-col">
      {/* Header Section */}
      <header className="bg-blue-900 text-white pt-16 pb-12 px-6">
        <div className="container mx-auto max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight animate-fade-in">
            SafaiMitra
          </h1>
          <p className="text-blue-200 text-base font-medium animate-fade-in-delay">
            Smart Waste Management System
          </p>
        </div>
      </header>

      {/* Content Section */}
      <main className="flex-1 bg-gray-100 rounded-t-[30px] shadow-2xl px-6 pt-10 pb-8">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-xl font-bold text-gray-700 mb-6">
            Select Your Profile
          </h2>

          <div className="space-y-0">
            <RoleButton
              index={0}
              title="Citizen"
              description="Report waste & track vehicles"
              icon="👤"
              color="#dcfce7"
              onClick={() => handleNavigation('/citizen')}
            />

            <RoleButton
              index={1}
              title="Vehicle Staff"
              description="Route navigation & updates"
              icon="🚛"
              color="#fef9c3"
              onClick={() => handleNavigation('/driver')}
            />

            <RoleButton
              index={2}
              title="Admin / Office"
              description="Dashboard & monitoring"
              icon="🏢"
              color="#dbeafe"
              onClick={() => handleNavigation('/admin')}
            />
          </div>

          {/* Feature Highlights */}
          <div className="mt-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl p-6 text-white shadow-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">✨</span>
              Key Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: "📍", text: "Real-time GPS Tracking" },
                { icon: "📸", text: "Photo Verification" },
                { icon: "📊", text: "Live Dashboard" },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center transform transition-all hover:scale-105 hover:bg-white/20"
                >
                  <div className="text-2xl mb-2">{feature.icon}</div>
                  <p className="text-xs font-semibold">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            {[
              { number: "500+", label: "Active Users", color: "bg-green-100 text-green-700" },
              { number: "50+", label: "Vehicles", color: "bg-amber-100 text-amber-700" },
              { number: "98%", label: "Efficiency", color: "bg-blue-100 text-blue-700" },
            ].map((stat, index) => (
              <div
                key={index}
                className={`${stat.color} rounded-2xl p-4 text-center transform transition-all hover:scale-105 shadow-md`}
              >
                <div className="text-2xl font-extrabold mb-1">{stat.number}</div>
                <div className="text-xs font-semibold opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 text-center py-6">
        <p className="text-sm text-gray-500 font-semibold">
          Powered by CleanBin AI
        </p>
        <p className="text-xs text-gray-400 mt-1">
          © 2024 SafaiMitra. All rights reserved.
        </p>
      </footer>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fade-in-delay {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-fade-in-delay {
          animation: fade-in-delay 0.8s ease-out 0.2s both;
        }
      `}</style>
    </div>
  );
}