"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import axios from "axios";
import { Users, Building2, UserCog, Activity, Plus, Edit2, Trash2, Power, X, Menu, Settings, LogOut, User, Shield, Key, Mail, Phone, MapPin, Save, UserX } from 'lucide-react';

export default function OfficeDashboard() {
    const [currentView, setCurrentView] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const [offices, setOffices] = useState([]);

    const [admins, setAdmins] = useState([]);

    const [settings, setSettings] = useState({
        systemName: 'SafaiMitra',
        adminEmail: 'admin@safaimitra.in',
        supportEmail: 'support@safaimitra.in',
        supportPhone: '+91 1234567890',
        address: 'Municipal Corporation Building, Indore, MP',
        enableNotifications: true,
        enableEmailAlerts: true,
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        passwordExpiry: 90,
        backupFrequency: 'daily',
        maintenanceMode: false
    });

    const [formData, setFormData] = useState({
        statename: '',
        cityName: '',
        officeName: '',
        adminName: '',
        adminEmail: '',
        username: '',
        password: '',
        status: 'Active'
    });

    const [adminFormData, setAdminFormData] = useState({
        name: '',
        email: '',
        phone: '',
        city: '',
        office: '',
        username: '',
        password: '',
        status: 'Active'
    });

    const stats = {
        totalCities: 2,
        totalOffices: offices.length,
        totalAdmins: admins.length,
        activeCities: 2
    };

    const handleSettingsChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings({
            ...settings,
            [name]: type === 'checkbox' ? checked : value
        });
    };


    // Show Office Data
    useEffect(() => {
        const fetchOffices = async () => {
            try {
                const token = localStorage.getItem("token"); // ya jahan tumne save kiya ho

                const res = await axios.get("http://localhost:5001/office", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (res.data && res.data.offices) {
                    setOffices(
                        res.data.offices.map(o => ({
                            id: o._id,
                            cityName: o.cityName,
                            officeName: o.officeName,
                            adminName: o.adminName,
                            adminEmail: o.adminEmail,
                            status: o.status,
                        }))
                    );
                }
            } catch (err) {
                console.error("Failed to fetch offices:", err);
            }
        };

        fetchOffices();
    }, []);

    // Show Admin Data
    useEffect(() => {
        const fetchAdmins = async () => {
            try {
                const token = localStorage.getItem("token");

                const res = await axios.get("http://localhost:5001/admin", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (res.data && res.data.admins) {
                    setAdmins(
                        res.data.admins.map(a => ({
                            id: a._id,        // ya a.id
                            name: a.name,
                            email: a.email,
                            username: a.username,
                            role: a.role,
                        }))
                    );
                }
            } catch (err) {
                console.error("Failed to fetch admins:", err);
            }
        };

        fetchAdmins();
    }, []);

    const [userName, setUserName] = useState("");
    const [roleLabel, setRoleLabel] = useState("Admin");

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const payload = JSON.parse(atob(token.split(".")[1]));

            const name = payload.name || payload.username || "Admin";
            setUserName(name);

            if (name === "Admin") {
                setRoleLabel("Super Admin");
            } else {
                setRoleLabel("Admin");
            }
        } catch (e) {
            console.error("Invalid token");
        }
    }, []);

    const handleDeleteOffice = async (officeId) => {
        if (!officeId) {
            console.error("Invalid officeId:", officeId);
            return;
        }

        if (!confirm("Are you sure you want to delete this office?")) return;

        try {
            const token = localStorage.getItem("token");

            await axios.delete(
                `http://localhost:5001/office/${officeId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setOffices(prev => prev.filter(o => o.id !== officeId));
            alert("Office deleted successfully");
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to delete office");
        }
    };

    const handleDeleteAdmin = async (adminId) => {
        if (!adminId) {
            console.error("Invalid adminId:", adminId);
            return;
        }

        if (!confirm("Are you sure you want to delete this admin?")) return;

        try {
            const token = localStorage.getItem("token");

            await axios.delete(
                `http://localhost:5001/admin/${adminId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            // UI se bhi hata do
            setAdmins(prev => prev.filter(a => a.id !== adminId));

            alert("Admin deleted successfully");
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to delete admin");
        }
    };


    const handleSaveSettings = () => {
        alert('Settings saved successfully!');
    };

    const router = useRouter();
    const handleLogout = async () => {
        console.log("Logging out...");
        await axios.post("http://localhost:5001/admin/logout");

        // Clear client-side data
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        localStorage.removeItem("userId");

        // Cookie bhi manually clear kar do (safe side)
        document.cookie = "token=; Max-Age=0; path=/;";
        document.cookie = "role=; Max-Age=0; path=/;";

        router.replace("/"); // back to home/login
    };


    const StatCard = ({ icon: Icon, title, value, color }) => (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-500 text-sm font-medium">{title}</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
                </div>
                <div className="p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
                    <Icon className="w-8 h-8" style={{ color }} />
                </div>
            </div>
        </div>
    );

    const DashboardView = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatCard icon={Building2} title="Total Cities" value={stats.totalCities} color="#10b981" />
                <StatCard icon={Users} title="Total Offices" value={stats.totalOffices} color="#3b82f6" />
                <StatCard icon={UserCog} title="Total Admins" value={stats.totalAdmins} color="#f59e0b" />
                <StatCard icon={Activity} title="Active Cities" value={stats.activeCities} color="#8b5cf6" />
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">City Offices Management</h3>
                <button
                    onClick={() => router.push("/admin/newoffice")}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    <span>Create New Office</span>
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Office Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Admin</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {offices.map((office) => (
                                <tr key={office.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{office.cityName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{office.officeName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{office.adminName}</div>
                                            <div className="text-sm text-gray-500">{office.adminEmail}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${office.status === 'Active'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                            }`}>
                                            {office.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleDeleteOffice(office.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );

    const DashboardView2 = () => (
        <>

            <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">City Offices Management</h3>
                <button
                    onClick={() => router.push("/admin/newoffice")}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    <span>Create New Office</span>
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Office Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Admin</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {offices.map((office) => (
                                <tr key={office.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{office.cityName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{office.officeName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{office.adminName}</div>
                                            <div className="text-sm text-gray-500">{office.adminEmail}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${office.status === 'Active'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                            }`}>
                                            {office.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleDeleteOffice(office.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );

    const AdminsView = () => (
        <>
            <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">City Admins Management</h3>
                <button
                    onClick={() => {
                        router.push("/admin/newadmin");
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    <span>Create New Admin</span>
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {admins.map((admin) => (
                                <tr key={admin.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                                                {admin.name.charAt(0)}
                                            </div>
                                            <div className="ml-3">
                                                <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{admin.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleDeleteAdmin(admin.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );

    const SettingsView = () => (
        <>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-800">System Settings</h3>
                    <button
                        onClick={handleSaveSettings}
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Save className="w-5 h-5" />
                        <span>Save Settings</span>
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="border-b pb-6">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">General Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-black">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">System Name</label>
                                <input
                                    type="text"
                                    name="systemName"
                                    value={settings.systemName}
                                    onChange={handleSettingsChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
                                <input
                                    type="email"
                                    name="adminEmail"
                                    value={settings.adminEmail}
                                    onChange={handleSettingsChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
                                <input
                                    type="email"
                                    name="supportEmail"
                                    value={settings.supportEmail}
                                    onChange={handleSettingsChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Support Phone</label>
                                <input
                                    type="tel"
                                    name="supportPhone"
                                    value={settings.supportPhone}
                                    onChange={handleSettingsChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={settings.address}
                                    onChange={handleSettingsChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-b pb-6">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Notification Settings</h4>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-700">Enable Notifications</p>
                                    <p className="text-sm text-gray-500">Send system notifications to users</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="enableNotifications"
                                        checked={settings.enableNotifications}
                                        onChange={handleSettingsChange}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-700">Email Alerts</p>
                                    <p className="text-sm text-gray-500">Send email alerts for critical events</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="enableEmailAlerts"
                                        checked={settings.enableEmailAlerts}
                                        onChange={handleSettingsChange}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="border-b pb-6">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Security Settings</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                                <input
                                    type="number"
                                    name="sessionTimeout"
                                    value={settings.sessionTimeout}
                                    onChange={handleSettingsChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Max Login Attempts</label>
                                <input
                                    type="number"
                                    name="maxLoginAttempts"
                                    value={settings.maxLoginAttempts}
                                    onChange={handleSettingsChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Password Expiry (days)</label>
                                <input
                                    type="number"
                                    name="passwordExpiry"
                                    value={settings.passwordExpiry}
                                    onChange={handleSettingsChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-b pb-6">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">System Maintenance</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
                                <select
                                    name="backupFrequency"
                                    value={settings.backupFrequency}
                                    onChange={handleSettingsChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                >
                                    <option value="hourly">Hourly</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-700">Maintenance Mode</p>
                                    <p className="text-sm text-gray-500">Temporarily disable system access</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="maintenanceMode"
                                        checked={settings.maintenanceMode}
                                        onChange={handleSettingsChange}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-gray-100">
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-green-700 to-green-900 text-white transition-all duration-300 flex flex-col`}>
                <div className="p-4 flex items-center justify-between">
                    {sidebarOpen && (
                        <div className="flex items-center gap-2">
                            <Shield className="w-8 h-8" />
                            <h1 className="text-xl font-bold">SafaiMitra</h1>
                        </div>
                    )}
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-green-600 rounded">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 p-4">
                    <ul className="space-y-2">
                        <li>
                            <button
                                onClick={() => setCurrentView('dashboard')}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${currentView === 'dashboard' ? 'bg-green-600' : 'hover:bg-green-600'
                                    }`}
                            >
                                <Activity className="w-5 h-5" />
                                {sidebarOpen && <span>Dashboard</span>}
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => setCurrentView('offices')}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${currentView === 'offices' ? 'bg-green-600' : 'hover:bg-green-600'
                                    }`}
                            >
                                <Building2 className="w-5 h-5" />
                                {sidebarOpen && <span>Offices</span>}
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => setCurrentView('admins')}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${currentView === 'admins' ? 'bg-green-600' : 'hover:bg-green-600'
                                    }`}
                            >
                                <UserCog className="w-5 h-5" />
                                {sidebarOpen && <span>Admins</span>}
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => setCurrentView('settings')}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${currentView === 'settings' ? 'bg-green-600' : 'hover:bg-green-600'
                                    }`}
                            >
                                <Settings className="w-5 h-5" />
                                {sidebarOpen && <span>Settings</span>}
                            </button>
                        </li>
                    </ul>
                </nav>

                <div className="p-4 border-t border-green-600">
                    <button
                        type="button"
                        onClick={async () => {
                            await handleLogout();
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg text-left text-white hover:bg-red-600 transition-colors hover:cursor-pointer"
                    >
                        <LogOut className="w-5 h-5" />
                        {sidebarOpen && <span className="font-medium">Logout</span>}
                    </button>

                </div>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white shadow-md">
                    <div className="flex items-center justify-between p-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">
                                {currentView === 'dashboard' && 'Super Admin Dashboard'}
                                {currentView === 'offices' && 'Offices Management'}
                                {currentView === 'admins' && 'Admins Management'}
                                {currentView === 'settings' && 'System Settings'}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {currentView === 'dashboard' && 'Manage all city offices and administrators'}
                                {currentView === 'offices' && 'Create, update, and manage city offices'}
                                {currentView === 'admins' && 'Manage city administrators and their permissions'}
                                {currentView === 'settings' && 'Configure system settings and preferences'}
                            </p>
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="flex items-center gap-3 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                                    <User className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-gray-800">{roleLabel}</p>
                                    <p className="text-xs text-gray-500">{userName}</p>
                                </div>
                            </button>

                            {showProfileMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                                    <button
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            alert('Profile page coming soon!');
                                        }}
                                        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-gray-700"
                                    >
                                        <User className="w-4 h-4" />
                                        <span>Profile</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            setCurrentView('settings');
                                        }}
                                        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-gray-700"
                                    >
                                        <Settings className="w-4 h-4" />
                                        <span>Settings</span>
                                    </button>
                                    <hr className="my-2" />
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            await handleLogout();
                                        }}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg text-left text-black hover:bg-red-600 transition-colors hover:text-white hover:cursor-pointer"
                                    >
                                        <LogOut className="w-5 h-5" />
                                        {sidebarOpen && <span className="font-medium">Logout</span>}
                                    </button>

                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6">
                    {currentView === 'dashboard' && <DashboardView />}
                    {currentView === 'offices' && <DashboardView2 />}
                    {currentView === 'admins' && <AdminsView />}
                    {currentView === 'settings' && <SettingsView />}
                </main>
            </div>
        </div>
    );
}