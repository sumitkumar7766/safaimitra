"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Save } from "lucide-react";
import { API_BASE_URL } from "@/config/api";
import dynamic from "next/dynamic";
import { useMapEvents, useMap } from "react-leaflet";
import { Navigation } from "lucide-react";

// 1. Only Import COMPONENTS dynamically
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);

// 2. Map Click Component to set coordinates on click
const LocationSelector = ({ setFormData }) => {
  useMapEvents({
    click(e) {
      setFormData((prev) => ({
        ...prev,
        latitude: e.latlng.lat.toFixed(6),
        longitude: e.latlng.lng.toFixed(6),
      }));
    },
  });
  return null;
};

// 3. Map View Updater when coordinates change manually or via map
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (
      center &&
      !isNaN(center[0]) &&
      !isNaN(center[1]) &&
      center[0] >= -90 &&
      center[0] <= 90 &&
      center[1] >= -180 &&
      center[1] <= 180
    ) {
      map.setView(center, Math.max(map.getZoom(), 12));
    }
  }, [center, map]);
  return null;
};

export default function NewOfficePage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    stateName: "",
    cityName: "",
    officeName: "",
    adminName: "",
    adminEmail: "",
    username: "",
    password: "",
    status: "Active",
    latitude: "",
    longitude: "",
  });

  // Fix for Leaflet Marker Icons
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet").then((L) => {
        delete L.default.Icon.Default.prototype._getIconUrl;
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });
      });
    }
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
      },
      (error) => {
        alert("Unable to fetch your current location. Please enter manually or select on the map.");
      }
    );
  };

  const handleCreateOffice = async () => {
    if (
      !formData.stateName ||
      !formData.cityName ||
      !formData.officeName ||
      !formData.adminName ||
      !formData.adminEmail ||
      !formData.password ||
      !formData.latitude ||
      !formData.longitude
    ) {
      alert("All fields including map location are required");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      await axios.post(`${API_BASE_URL}/office/register`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Office created successfully!");
      router.push("/admin");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to create office");
    }
  };

  const hasValidCoords =
    formData.latitude !== "" &&
    formData.longitude !== "" &&
    !isNaN(parseFloat(formData.latitude)) &&
    !isNaN(parseFloat(formData.longitude));

  const coords = hasValidCoords
    ? [parseFloat(formData.latitude), parseFloat(formData.longitude)]
    : null;

  return (
    <div className="min-h-screen bg-gray-100 p-6 text-black">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">
              Create New Office
            </h1>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ["stateName", "State Name", "text", "e.g. Madhya Pradesh"],
            ["cityName", "City Name", "text", "e.g. Indore"],
            ["officeName", "Office Name", "text", "e.g. Nagar Nigam Zone 1"],
            ["adminName", "Admin Name", "text", "e.g. Rajesh Sharma"],
            ["adminEmail", "Admin Email", "email", "e.g. rajesh@safaimitra.in"],
            ["password", "Password", "password", "Enter secure password"],
          ].map(([name, label, type = "text", placeholder = ""]) => (
            <div key={name}>
              <label className="block text-sm font-medium mb-1">{label}</label>
              <input
                type={type}
                name={name}
                placeholder={placeholder}
                value={formData[name]}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          ))}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium">Latitude</label>
              <span className="text-xs text-gray-400">Manual or map click</span>
            </div>
            <input
              type="number"
              step="any"
              name="latitude"
              placeholder="e.g. 23.259933"
              value={formData.latitude}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium">Longitude</label>
              <span className="text-xs text-gray-400">Manual or map click</span>
            </div>
            <input
              type="number"
              step="any"
              name="longitude"
              placeholder="e.g. 77.412615"
              value={formData.longitude}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            />
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">
              Click on the map or type coordinates above to set office location
            </p>
            <button
              type="button"
              onClick={handleGetLocation}
              className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              <Navigation className="w-3.5 h-3.5" />
              Use Current Location
            </button>
          </div>
          <div className="h-[300px] rounded-lg overflow-hidden border">
            <MapContainer
              center={coords || [23.2599, 77.4126]}
              zoom={coords ? 13 : 6}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              <LocationSelector setFormData={setFormData} />
              {coords && <MapUpdater center={coords} />}
              {coords && <Marker position={coords} />}
            </MapContainer>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateOffice}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
          >
            <Save className="w-4 h-4" />
            Create Office
          </button>
        </div>
      </div>
    </div>
  );
}