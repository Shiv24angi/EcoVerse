# ♻️ EcoVerse – Track, Learn, and Earn for Sustainable Living

EcoVerse is a web application that helps users understand the environmental impact of their daily choices. By scanning product barcodes, users can view carbon footprint estimates, check if packaging is recyclable, and earn rewards for eco-friendly habits.

---

## 🚀 Features

- 🔐 **Google Authentication** (Firebase)
- 📦 **Barcode Scanning** with real-time product detection
- 🌱 **Carbon Footprint Estimation** per product
- ♻️ **Recyclability Check** for packaging materials
- 🧠 **Eco Points System** and **Monthly Rewards**
- 🧾 **Dashboard** to track your scans, CO₂ savings & reward levels
- 📊 **Leaderboard** to compare with the community
- 🎨 **Dark/Light Theme Toggle**
- 📈 **Analytics Page** for visual insights
- 🔗 **Firebase–MongoDB Sync**

---

## 📦 Tech Stack

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Authentication**: Firebase Auth (Google Sign-In)
- **Database**: MongoDB (Mongoose)
- **Scanning**: `@zxing/browser` for barcode recognition
- **Cloud Functions**: Firebase Functions (TypeScript)

---
## 👥 Contributors
Imanat — UI/UX Design, Theming, Styling

Shivangi Sharma — Backend Integration, MongoDB, Firebase Auth, Rewards Logic

Harshit — Backend Integration, MongoDB, Firebase Sync, Rewards System

Jatinder — Frontend Development, Scan Feature, Barcode Integration
---

---
## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Shiv24angi/EcoVerse.git
cd EcoVerse

2. Install Dependencies 

npm install

3. Set Up Environment Variables

NEXT_PUBLIC_FIREBASE_API_KEY=your-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
MONGODB_URI=your-mongodb-uri

4. Run the App Locally

Visit http://localhost:3000 in your browser.




