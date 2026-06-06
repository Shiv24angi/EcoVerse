# 🏗️ EcoVerse Architecture Guide

---

## 🌍 Overview

EcoVerse is a full-stack sustainability platform that analyzes consumer products using barcode scanning, estimates carbon footprint, and rewards eco-friendly behavior.

It follows a **modular, layered architecture** separating UI, business logic, authentication, and database systems.

---

## 🧩 High-Level System Architecture

```
Frontend (Next.js + React)
        ↓
Business Logic Layer (/lib)
        ↓
Authentication Layer (Firebase Auth)
        ↓
Database Layer (MongoDB)
        ↓
External Services (Barcode Scanner, Firebase Functions)
```

---

## 📁 Frontend Layer

### `/app` (Next.js App Router)

Handles routing and UI rendering.

Responsibilities:
- Page routing
- Layout management
- UI screens
- Navigation flow

---

### `/components`

Reusable UI components used across the app.

Examples:
- Dashboard UI
- Scanner interface
- Buttons & inputs
- Navigation bars
- Theme components

---

## ⚙️ Business Logic Layer (`/lib`)

This is the **core intelligence layer** of EcoVerse.

Contains:

- 🌱 Carbon footprint calculation logic
- ♻️ Recyclability detection system
- 🧠 Reward & eco-points engine
- 🔥 Firebase configuration
- 🗄️ MongoDB connection utilities
- 🧰 Helper functions

👉 Acts as the bridge between UI and backend systems.

---

## 🗄️ Database Layer (MongoDB)

MongoDB stores all persistent application data.

### Stored Data:
- User profiles
- Scan history
- Eco points & rewards
- Product insights

### Model Layer (`/models`)
Defines schema structure using Mongoose:
- User model
- Product-related models (future expansion)

---

## 🔐 Authentication System (Firebase Auth)

EcoVerse uses Firebase Authentication for secure login.

### Authentication Flow:

```
User → Google Sign-In
     → Firebase Auth Token Generated
     → Token Verified in App
     → Session Created
     → Dashboard Access Granted
```

### Responsibilities:
- Secure login
- Session management
- Identity verification

---

## 📦 Barcode Scanning System

Powered by `@zxing/browser`.

### Flow:

```
User opens scanner
→ Camera activated
→ Barcode scanned
→ Product data extracted
→ Sustainability data fetched
→ Results shown in UI
```

---

## 🌱 Sustainability Engine

Handles environmental intelligence:

### Functions:
- Carbon footprint estimation
- Packaging recyclability detection
- Eco score generation

Lives inside `/lib` as reusable logic.

---

## 🔄 Firebase ↔ MongoDB Sync System

EcoVerse uses dual persistence:

### Firebase:
- Authentication
- User identity management

### MongoDB:
- Application data storage
- Scan history
- Rewards tracking

### Sync Purpose:
- Maintain consistency across systems
- Separate auth and data layers
- Improve scalability

---

## 📊 Core Data Flow

```
User Login (Google)
        ↓
Firebase Auth Verification
        ↓
Dashboard Access Granted
        ↓
Barcode Scanned
        ↓
Product Data Processed
        ↓
Carbon + Recyclability Calculated
        ↓
MongoDB Stores Data
        ↓
Eco Points Updated
        ↓
UI Updated in Real Time
```

---

## 🧱 External Integrations

### Firebase
- Authentication
- User sessions

### MongoDB
- Persistent storage
- Structured data handling

### ZXing Barcode Scanner
- Real-time barcode scanning
- Product identification

---

## 🧠 Architecture Principles

EcoVerse follows:

- 🧩 Modular design (separation of concerns)
- 🔁 Reusable logic in `/lib`
- 🔐 Secure authentication layer
- 📦 Scalable database structure
- ⚡ Performance-first frontend design

---

## 🚀 Summary

EcoVerse is structured as a clean multi-layer system:

- UI Layer → User interaction
- Logic Layer → Business rules
- Auth Layer → Identity security
- DB Layer → Persistent storage
- External Layer → Scanning & services

This separation ensures scalability, maintainability, and future expansion potential.

---