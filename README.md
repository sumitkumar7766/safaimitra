# 🧹 SafaiMitra – Smart Waste Management System

SafaiMitra is a **smart city waste management platform** designed to bring **transparency, efficiency, and accountability** to municipal solid waste handling.  
It connects **Citizens, Sanitation Staff, Offices, and Admins** on a single digital platform using **real-time tracking, cloud image storage, and AI-based verification**.

---

## 🚀 Problem Statement

Traditional waste management systems suffer from:
- No transparency in dustbin cleaning
- Fake/manual reporting by staff
- Delayed complaint resolution
- Lack of real-time monitoring for municipalities

**SafaiMitra solves this by introducing:**
- Citizen-driven complaints
- Image-based proof of cleaning
- AI verification of dustbin status
- Centralized municipal dashboards

---

## 🎯 Key Objectives

- Enable citizens to report waste issues easily
- Ensure staff accountability using image & AI verification
- Provide city-level transparency to admins
- Digitize municipal operations end-to-end

---

## 🧑‍🤝‍🧑 User Roles

### 👤 Citizen
- Register & login
- Report complaints with location & image
- Track complaint status
- Get notifications on resolution

### 🚛 Staff (Driver / Supervisor)
- Login via staff app
- View assigned routes & vehicles
- Upload dustbin cleaning images
- Live location & duty status updates

### 🏢 Office (Municipal Unit)
- Manages staff, vehicles, routes, dustbins
- Assigns complaints to staff
- Acts as city/ward-level controller

### 🛡️ Admin
- City-wide monitoring dashboard
- Track complaints & dustbin status
- View maps & analytics
- Ensure transparency and reporting

---

## 🧠 System Architecture

SafaiMitra follows a **layered architecture**:

- **Frontend Layer**
  - Citizen App (Web/Mobile)
  - Staff App (Mobile)
  - Admin Dashboard (Web)

- **Backend Layer**
  - Node.js + Express API Gateway
  - Modular services (Auth, Complaint, Dustbin, Office, etc.)

- **Cloud & AI Layer**
  - Cloudinary for image storage
  - AI Predictor API for image verification
  - Maps API for geolocation

- **Database**
  - MongoDB (Geospatial enabled)

---

## 🔄 Application Workflow

### 🧍 Citizen Flow
1. Citizen reports a complaint with image & location
2. Image is uploaded to **Cloudinary**
3. AI analyzes image for dustbin condition
4. Complaint is stored & assigned to office
5. Citizen receives real-time updates

### 🚛 Staff Flow
1. Staff logs in & gets assigned route
2. Cleans dustbin & uploads image
3. Image is verified by AI
4. Dustbin status updated in system
5. Admin & citizen get notified

### 🛡️ Admin Flow
1. Admin monitors complaints & dustbin status
2. Views live map of city operations
3. Ensures transparency & accountability

---

## 🧠 AI Integration

AI Predictor API is used for:
- Detecting **overflow / clean / suspicious dustbins**
- Verifying staff-uploaded images
- Preventing fake/manual reporting

AI is triggered for:
- Citizen complaint images
- Staff cleaning images

---

## 🗂️ Database Design (MongoDB)

Main collections:
- `Citizen`
- `Staff`
- `Admin`
- `Office`
- `Complaint`
- `Dustbin`
- `Vehicle`
- `Route`

Features:
- Geospatial indexing (`2dsphere`)
- Relational references using ObjectId
- Optimized indexes for performance

---

## 🛠️ Tech Stack

### Frontend
- React / React Native
- Map integration
- Responsive dashboards

### Backend
- Node.js
- Express.js
- REST APIs
- JWT Authentication

### Database
- MongoDB
- Mongoose ODM

### Cloud & AI
- Cloudinary (Image Storage)
- AI Predictor API
- Maps API

---

## 🔐 Security Features

- Role-based access control
- JWT authentication
- Secure image uploads
- API validation & sanitization

---

## 📦 Installation & Setup

### Backend Setup
```bash
git clone https://github.com/your-repo/safaimitra.git
cd backend
npm install
npm run dev
```
### Web Setup
```bash
git clone https://github.com/your-repo/safaimitra.git
cd web-dashboard
npm install
npm run dev
```
### App Setup
```bash
git clone https://github.com/your-repo/safaimitra.git
cd mobile-app/safaimitra-app
npx install
npm start
```

### Project Relationship
```
Admin
  |
  | manages
  v
Office
  |-----------------------------|
  |                             |
  v                             v
Staff                        Citizen
  |                             |
  | assigned                     | raises
  v                             v
Vehicle                      Complaint
  |                             |
  | follows                      | linked to
  v                             v
Route ---------------------- Dustbin
                                  |
                                  |
                                  v
                               Images (Cloudinary)
                                  |
                                  v
                             AI Predictor API
```
