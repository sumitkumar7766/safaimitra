"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Save } from "lucide-react";
import dynamic from "next/dynamic";

// Leaflet dynamic imports
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
const useMapEvents = dynamic(
  () => import("react-leaflet").then((m) => m.useMapEvents),
  { ssr: false }
);

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

  const MapClickHandler = () => {
    const MapEvents = require("react-leaflet").useMapEvents;
    MapEvents({
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

      await axios.post("http://localhost:5001/office/register", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Office created successfully!");
      router.push("/admin");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to create office");
    }
  };

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
            ["stateName", "State Name"],
            ["cityName", "City Name"],
            ["officeName", "Office Name"],
            ["adminName", "Admin Name"],
            ["adminEmail", "Admin Email"],
            ["password", "Password", "password"],
          ].map(([name, label, type = "text"]) => (
            <div key={name}>
              <label className="block text-sm font-medium mb-1">{label}</label>
              <input
                type={type}
                name={name}
                value={formData[name]}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium mb-1">Latitude</label>
            <input
              type="number"
              value={formData.latitude}
              readOnly
              className="w-full px-4 py-2 border rounded-lg bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Longitude</label>
            <input
              type="number"
              value={formData.longitude}
              readOnly
              className="w-full px-4 py-2 border rounded-lg bg-gray-100"
            />
          </div>
        </div>

        <div className="px-6 pb-6">
          <p className="text-sm text-gray-500 mb-2">
            Map par click karke city location select karo
          </p>
          <div className="h-[300px] rounded-lg overflow-hidden border">
            <MapContainer
              center={[23.2599, 77.4126]}
              zoom={6}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapClickHandler />
              {formData.latitude && formData.longitude && (
                <Marker
                  position={[
                    parseFloat(formData.latitude),
                    parseFloat(formData.longitude),
                  ]}
                />
              )}
            </MapContainer>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 border rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateOffice}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg"
          >
            <Save className="w-4 h-4" />
            Create Office
          </button>
        </div>
      </div>
    </div>
  );
}
