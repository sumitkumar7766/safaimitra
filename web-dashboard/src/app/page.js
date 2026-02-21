"use client";

import React, { useState } from 'react';
import { User, Truck, Building2, ArrowRight } from 'lucide-react';
import { useRouter } from "next/navigation";
import CitizenLogin from './components/Citizenlogin.js';
import VehicleStaffLogin from './components/Vehiclestafflogin.js';
import OfficeStaffLogin from './components/Officestafflogin.js';
import AdministratorLogin from './components/Administratorlogin.js';

export default function SafaiMitra() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState(null);
  const router = useRouter();

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

  const handleBackToPortals = () => {
    setIsLoginOpen(false);
    setSelectedPortal(null);
  };

  // Render appropriate login component based on selected portal
  if (isLoginOpen && selectedPortal) {
    const loginProps = {
      portal: selectedPortal,
      onBack: handleBackToPortals,
      router: router
    };

    switch (selectedPortal.title) {
      case 'Citizen':
        return <CitizenLogin {...loginProps} />;
      case 'Vehicle Staff':
        return <VehicleStaffLogin {...loginProps} />;
      case 'Office Staff':
        return <OfficeStaffLogin {...loginProps} />;
      case 'Administrator':
        return <AdministratorLogin {...loginProps} />;
      default:
        return null;
    }
  }

  // MAIN PORTAL SELECTION VIEW
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
        Powered by CleanBin AI © 2026
      </footer>
    </div>
  );
}