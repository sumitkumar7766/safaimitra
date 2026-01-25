"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Save } from "lucide-react";

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
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateOffice = async () => {
    if (
      !formData.stateName ||
      !formData.cityName ||
      !formData.officeName ||
      !formData.adminName ||
      !formData.adminEmail ||
      !formData.password
    ) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      await axios.post(
        "http://localhost:5001/office/register",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Office created successfully!");
      router.push("/admin"); // back to dashboard
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
          <div>
            <label className="block text-sm font-medium mb-1">State Name</label>
            <input
              type="text"
              name="stateName"
              value={formData.stateName}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">City Name</label>
            <input
              type="text"
              name="cityName"
              value={formData.cityName}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Office Name</label>
            <input
              type="text"
              name="officeName"
              value={formData.officeName}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Admin Name</label>
            <input
              type="text"
              name="adminName"
              value={formData.adminName}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Admin Email</label>
            <input
              type="email"
              name="adminEmail"
              value={formData.adminEmail}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
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
