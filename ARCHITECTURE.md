# ♻️ EcoVerse – Track, Learn, and Earn for Sustainable Living

EcoVerse is a sustainability-focused web application that helps users make eco-conscious decisions by analyzing product impact. Users can scan barcodes, view carbon footprint estimates, check recyclability, and earn rewards for sustainable behavior.

---

## ✨ Highlights

- Real-time barcode scanning
- Eco impact analysis (carbon + recyclability)
- Gamified reward system
- Firebase + MongoDB hybrid backend

---

## 🚀 FEATURES

- 🔐 **Google Authentication (Firebase)**
  - Secure sign-in using Google account via Firebase Authentication.
  - Token-based session management for persistent login.
  - Protects user data with secure authentication flow.

- 📦 **Barcode Scanning**
  - Real-time product barcode scanning using device camera.
  - Powered by @zxing/browser for fast and accurate detection.
  - Supports instant product identification.

- 🌱 **Carbon Footprint Estimation**
  - Calculates estimated CO₂ emissions for scanned products.
  - Uses product metadata to evaluate environmental impact.
  - Helps users compare eco-impact before making purchases.

- ♻️ **Recyclability Check**
  - Detects whether product packaging is recyclable or not.
  - Provides clear yes/no sustainability classification.
  - Encourages responsible waste disposal habits.

- 🧠 **Eco Points System & Rewards**
  - Awards eco points for sustainable user actions.
  - Tracks daily and monthly eco-performance.
  - Unlocks rewards and badges based on user activity.

- 🧾 **Dashboard**
  - Centralized view of all user activity and history.
  - Displays scanned products and eco-score progress.
  - Tracks carbon savings over time.

- 📊 **Leaderboard**
  - Compares eco-performance with other users.
  - Encourages healthy competition in sustainability goals.
  - Updates rankings dynamically based on activity.

- 🎨 **Dark / Light Theme Toggle**
  - Switch between themes based on user preference.
  - Improves accessibility and user experience.
  - Saves theme preference across sessions.

- 📈 **Analytics Page**
  - Visualizes user sustainability trends using charts.
  - Tracks carbon reduction and eco-score growth.
  - Provides insights into long-term behavior.

- 🔗 **Firebase–MongoDB Sync**
  - Syncs authentication and application data across databases.
  - Ensures consistency between frontend and backend storage.
  - Prevents data loss with real-time synchronization.
---

## 📦 TECH STACK

- Frontend: Next.js (App Router), TypeScript, Tailwind CSS  
- Authentication: Firebase Auth (Google Sign-In)  
- Database: MongoDB + Mongoose  
- Scanning: @zxing/browser  
- Backend: Firebase Functions (TypeScript)

---

## 📽️ DEMO VIDEO

LINK → https://drive.google.com/file/d/1DDff6gDIA4S_em2jsJIeY2Z83XV7iJ65/view?usp=sharing

---

## 🛠️ INSTALLATION

STEP 1 → Clone Repository  
git clone https://github.com/Shiv24angi/EcoVerse.git  

STEP 2 → Enter Project Directory  
cd EcoVerse  

STEP 3 → Install Dependencies  
npm install  

---

## 🔐 ENVIRONMENT SETUP

STEP 4 → Create Environment File  
File → .env.local  

STEP 5 → Add Required Variables  

NEXT_PUBLIC_FIREBASE_API_KEY=your-key  
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain  
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id  
MONGODB_URI=your-mongodb-uri  

---

## ▶️ RUN PROJECT

STEP 6 → Start Development Server  
npm run dev  

STEP 7 → Open in Browser  
http://localhost:3000  

---

## 📁 PROJECT STRUCTURE

```text
EcoVerse/
│
├── app/                         # Next.js App Router (pages, routes, layouts)
│   ├── (auth)/                  # Authentication-related routes
│   ├── dashboard/               # User dashboard (stats, eco points)
│   ├── scan/                    # Barcode scanning feature pages
│   └── api/                     # Backend API routes (server actions / handlers)
│
├── components/                 # Reusable UI components
│   ├── ui/                      # Buttons, modals, cards, inputs
│   ├── dashboard/              # Dashboard-specific components
│   ├── scanner/                # Barcode scanner UI components
│   └── layout/                 # Navbar, sidebar, footer
│
├── hooks/                      # Custom React hooks
│   ├── useAuth.ts
│   ├── useScanner.ts
│   └── useEcoPoints.ts
│
├── lib/                        # Core utilities & configurations
│   ├── firebase.ts
│   ├── mongodb.ts
│   ├── auth.ts
│   └── utils.ts
│
├── models/
├── public/
├── styles/
└── package.json
```
---

## ⚡ HOW IT WORKS

🔐 1. Authentication
User signs in using Google via Firebase Auth.  
A secure session is created and linked with MongoDB user data.

📦 2. Product Scanning
User opens camera and scans product barcode in real time.  
Camera captures barcode using live video stream.

📡 3. Barcode Processing (ZXing)
ZXing decodes barcode into a unique product ID.  
This ID is sent to backend for processing.

🌱 4. Product Data Fetching
Backend fetches product details from DB or APIs.  
Includes name, category, and material information.

🌍 5. Carbon Footprint Calculation
System evaluates environmental impact of product.  
Returns score: Low / Medium / High carbon impact.

♻️ 6. Recyclability Check
Packaging material is analyzed for recyclability.  
User gets clear recyclable / non-recyclable result.

💾 7. Data Storage
All scan data is stored in MongoDB securely.  
Includes user ID, product data, score, and timestamp.

🧠 8. Eco Points System
User earns points for eco-friendly actions.  
More sustainable activity = higher rewards.

📊 9. Dashboard Update
All data updates instantly in user dashboard UI.  
Shows scans, points, savings, and progress.

🏆 10. Rewards System
Users unlock badges and leaderboard ranks.  
Based on total eco points and engagement level.

---

## 🤝 CONTRIBUTING

1 → Fork the repository  
2 → Create a new branch → git checkout -b feature-name  
3 → Implement your changes  
4 → Commit changes → git commit -m "feat: update"  
5 → Push branch → git push origin feature-name  
6 → Open a Pull Request  

---

## ⚙️ GitHub Workflow Automation

This repository includes an automated issue assignment workflow.
- Contributors can comment **`/assign`** on any issue to automatically assign it to themselves.
- GitHub Actions handles the assignment process without maintainer intervention.
- Improves contribution speed and reduces manual triaging work.

---

## 📄 LICENSE

This project is licensed under the MIT License.

See the LICENSE file for full details.