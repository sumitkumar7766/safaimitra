# 📱 SafaiMitra – Complete Application Setup & APK Build Guide

This document provides a step-by-step guide on setting up, running, and building the **SafaiMitra Mobile Application**, **Backend API Gateway**, and **Web Dashboard**.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed on your development machine:

* **Node.js**: `v18.x` or `v20.x` (LTS recommended)
* **npm**: `v9.x` or higher
* **Git**: Installed and configured
* **Expo CLI & EAS CLI**:
  ```bash
  npm install -g expo-cli eas-cli
  ```
* **Android Studio / Android Emulator** (Optional for local testing) or **Physical Android Device** with **Expo Go** installed.

---

## 🛠️ 1. Mobile App Setup (`mobile-app/safaimitra-app`)

### Step 1: Navigate to Mobile App Directory
```bash
cd mobile-app/safaimitra-app
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables (`.env`)
Create or edit `.env` inside `mobile-app/safaimitra-app/`:

```env
# Backend API Base URL (Live Production API or Local Server IP)
EXPO_PUBLIC_API_BASE_URL=https://api.safaimitra.online
EXPO_PUBLIC_API_URL=https://api.safaimitra.online

# OpenRouteService API Key (for navigation routes)
NEXT_PUBLIC_ORS_API_KEY=eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImU0ZTY1YzcwYTRjOTQ5OGViMDVjMDQ1ZGRlM2VhOWIzIiwiaCI6Im11cm11cjY0In0=
```

> 💡 **Local Development Tip**: If testing with a local backend running on your machine, set `EXPO_PUBLIC_API_BASE_URL=http://<YOUR_LOCAL_IP>:5002` (e.g. `http://192.168.1.5:5002`). Avoid `localhost` on mobile devices.

---

### Step 4: Run in Expo Development Mode

```bash
npx expo start
```

* **On Android Emulator**: Press `a` in the terminal to launch on the running emulator.
* **On Physical Android Phone**: Open **Expo Go** app and scan the terminal QR code.
* **On Web Browser**: Press `w`.

---

## 📦 2. Building Standalone Android APK (EAS Build)

To build a standalone `.apk` file that can be directly installed on any Android device without Expo Go:

### Step 1: Login to Expo Account
```bash
eas login
```

### Step 2: Verify `eas.json` Configuration
Ensure `eas.json` has `buildType: "apk"` configured under preview/production profiles:

```json
{
  "cli": {
    "version": ">= 22.2.0"
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### Step 3: Trigger APK Build
Run the build command:
```bash
eas build -p android --profile preview
```
* Select `Yes` if prompted to generate a new keystore or configure project credentials.
* Once completed, EAS will provide a direct download link for the generated `.apk` file.

---

## ⚡ 3. Backend API Gateway Setup (`backend`)

### Step 1: Navigate to Backend Directory
```bash
cd backend
npm install
```

### Step 2: Configure Environment Variables (`.env`)
Create a `.env` file in the `backend/` directory:

```env
PORT=5002
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/safaimitra?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key
SECRET_KEY=your_session_secret_key

# Cloudinary Media Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# AI Vision Engines
ROBOFLOW_API_KEY=your_roboflow_key
ROBOFLOW_MODEL_URL=https://classify.roboflow.com/dustbin-status/5
OPENROUTER_API_KEY=your_openrouter_gemini_key
```

### Step 3: Start Backend Server
```bash
npm run dev
# Server running at http://localhost:5002
```

---

## 🌐 4. Web Dashboard Setup (`web-dashboard`)

### Step 1: Navigate to Web Dashboard Directory
```bash
cd web-dashboard
npm install
```

### Step 2: Configure `.env.local`
Create `.env.local` inside `web-dashboard/`:

```env
NEXT_PUBLIC_API_URL=https://api.safaimitra.online
NEXT_PUBLIC_ORS_API_KEY=your_openrouteservice_key
```

### Step 3: Run Web Dashboard
```bash
npm run dev
# Web Dashboard accessible at http://localhost:3000
```

---

## 🔧 5. Troubleshooting & Best Practices

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **APK closes immediately on open** | Missing `INTERNET` permission in `app.json` or unconfigured `PROVIDER_GOOGLE` on maps. | Verify `app.json` contains `"android.permission.INTERNET"` and `"usesCleartextTraffic": true`. Standard `<MapView>` usage resolves map crashes. |
| **`AxiosError: Network Error`** | App cannot reach backend server. | Ensure `EXPO_PUBLIC_API_BASE_URL` points to `https://api.safaimitra.online` or a reachable network IP address (not `localhost`). |
| **Camera / Location permission error** | Device permissions denied. | Grant camera and location permissions when prompted in Android app settings. |

---

<div align="center">

**SafaiMitra — Smart City Waste Management Platform**

</div>
