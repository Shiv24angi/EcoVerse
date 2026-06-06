# 🌍 EcoVerse

> Track. Learn. Earn. Build a sustainable future—one scan at a time. ♻️✨

EcoVerse is a web application that helps users understand the environmental impact of their daily choices. By scanning product barcodes, users can view carbon footprint estimates, check whether packaging is recyclable, and earn rewards for eco-friendly habits.

---

## 📚 Table of Contents

- [✨ Features](#-features)
- [🧱 Tech Stack](#-tech-stack)
- [📁 Project Structure](#-project-structure)
- [⚙️ Getting Started](#️-getting-started)
- [🔄 How It Works](#-how-it-works)
- [🧠 Architecture](#-architecture)
- [🌱 Project Vision](#-project-vision)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [🚀 Future Improvements](#-future-improvements)

---

## ✨ Features

### 🔐 Secure Authentication
- Google Sign-In via Firebase Auth
- Protected user sessions
- Seamless login experience

### 📦 Barcode Scanning
- Real-time product barcode scanning using camera
- Instant product identification
- Fast data retrieval pipeline

### 🌱 Carbon Footprint Estimation
- Estimates environmental impact of products
- Helps users make eco-conscious decisions
- Displays carbon score per product

### ♻️ Recyclability Detection
- Identifies if packaging is recyclable
- Promotes responsible waste management
- Clear yes/no + insights

### 🧠 Eco Points & Rewards System
- Earn points for sustainable actions
- Track eco progress over time
- Monthly reward system

### 📊 Dashboard
- View scan history
- Track eco points
- Monitor carbon savings
- View personal sustainability stats

### 🏆 Leaderboard
- Compare eco impact with other users
- Encourages friendly competition
- Community-driven sustainability

### 📈 Analytics
- Visual charts for eco activity
- Track environmental impact trends
- Insights over time

### 🎨 Theme Support
- Light & Dark mode toggle
- Smooth UI experience
- Accessible design

---

## 🧱 Tech Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Authentication:** Firebase Auth (Google Sign-In)
- **Database:** MongoDB (Mongoose)
- **Scanning:** @zxing/browser for barcode recognition
- **Cloud Functions:** Firebase Functions (TypeScript)

---

## 📁 Project Structure

```
EcoVerse/
├── app/                              # Next.js App Router pages
├── components/                       # Reusable UI and application components
│   ├── ui/                           # Shared UI primitives
│   ├── auth-provider.tsx
│   ├── dashboard-layout.tsx
│   ├── google-signin-button.tsx
│   ├── reward-notification.tsx
│   └── theme-provider.tsx
├── hooks/                            # Custom React hooks
├── lib/                              # Utility and service modules
│   ├── auth.ts
│   ├── carbon-calculator.ts
│   ├── firebase.ts
│   ├── mongodb.ts
│   ├── packaging-inference.ts
│   ├── rewards-system.ts
│   └── utils.ts
├── models/                           # Database models
├── public/                           # Static assets
├── styles/                           # Global styles
├── firebase-functions-sync-ts/       # Firebase synchronization functions
├── firebase-functions-sync-prisma/   # Prisma-based sync functions
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── LICENSE.txt
└── README.md
```

---

## ⚙️ Getting Started

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/Shiv24angi/EcoVerse.git
cd EcoVerse
```

---

### 2️⃣ Install Dependencies

```bash
npm install
```

---

### 3️⃣ Setup Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id

MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

---

### 4️⃣ Run Development Server

```bash
npm run dev
```

Visit:
```
http://localhost:3000
```

---

## 🔄 How It Works

- 👤 User logs in using Google (Firebase Authentication)
- 🔐 Firebase verifies the user and creates a session
- 📊 User gets access to the dashboard
- 📦 User scans a product barcode using the camera
- 🧠 Product details are fetched and processed
- 🌱 Carbon footprint of the product is calculated
- ♻️ Recyclability of the product is checked
- 🗄️ Data is saved in MongoDB
- 🧠 User earns eco points based on activity
- 🔄 UI updates instantly with new data and stats

---

## 🧠 Architecture

Full system design is documented here:

👉 [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 🌱 Project Vision

EcoVerse aims to make sustainability **measurable, interactive, and rewarding**, helping users understand the environmental impact of their daily choices.

---

## 🤝 Contributing

We welcome contributions!

### Steps:
1. Fork repo
2. Create feature branch
3. Make changes
4. Submit PR

Please ensure:
- Clean code structure
- Reusable components
- Proper documentation updates

---

## 🤝 Issue Management System

- All newly created issues are automatically assigned to maintainers
- This ensures faster triaging and response time
- Helps maintain clear responsibility and workflow efficiency across the project

---

## 📄 License

This project is licensed under the MIT License.

---

## 🚀 Future Improvements

- AI-based product sustainability prediction 🤖
- Mobile app version 📱
- Global product database integration 🌍
- Advanced reward marketplace 🛒
- Real-time CO₂ tracking dashboard 📊

---

## 🌍 Together for a Greener Future

EcoVerse is built to encourage awareness, action, and accountability toward sustainability—one scan at a time. ♻️✨