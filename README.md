# 🚩 Shri Saileela Palkhi Pilgrimage & Management Portal

A full-featured, executive web application for **Shri Saileela Palkhi Sohala & Devotee Seva Trust** (Reg No: E-3892/MUM). 

Built to handle digital pilgrim registration, live GPS/yatra tracking, Razorpay donation handling with instant 80G tax benefit PDF receipts, Twilio SMS alerts, and an executive Admin Management Control Panel.

---

## 🌟 Key Features

- **Devotee Gate Pass Registration**: Multi-step registration wizard generating unique pilgrim pass codes (`SLP-2026-XXXX`).
- **Instant Downloadable PDF Passes (`PDFKit`)**: QR-coded official gate passes with verified ID details and emergency contact info.
- **Pass Verification Portal**: Instant online lookup for devotees and trust security officers.
- **Online Seva & Annadan Hub (`Razorpay`)**: Preset and custom donation options supporting Mahaprasad, Medical Camps, and Chariot Seva.
- **80G Tax Exemption Receipts (`PDFKit`)**: Automated PDF receipt generation containing 80G tax deduction details.
- **Live Yatra Route Tracker & Timeline**: 11-day detailed itinerary (Mumbai to Shirdi, 265 KM) featuring live halt location, distance covered, and meals served.
- **Twilio SMS Notifications**: Automated SMS dispatch for pass confirmations and broadcast announcements.
- **Executive Admin Control Panel (`/admin`)**: Real-time metrics dashboard, gate scanner simulator, SMS broadcaster, and data tables.
- **Flexible Database Architecture**: MySQL connection with automatic schema creation and a seamless fallback data store.

---

## 🛠️ Tech Stack

- **Backend Framework**: Node.js & Express.js
- **Template Engine**: EJS (Embedded JavaScript)
- **Database**: MySQL2 (with fallback data store for offline demo)
- **Payment Gateway**: Razorpay SDK
- **SMS & Alerts**: Twilio API
- **PDF Generation**: PDFKit
- **Background Tasks**: Node-cron
- **Styling**: Vanilla CSS3 (Custom formal design system, Google Fonts Outfit & Inter)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- MySQL Server (Optional, app runs with built-in data store if offline)

### 2. Installation & Setup
```bash
# Clone repository
git clone https://github.com/PremB2907/saileela.git
cd saileela

# Install dependencies
npm install

# Setup Environment Variables
cp .env.example .env
```

### 3. Running the Application
```bash
# Start server
npm start
```
Open **`http://localhost:3000`** in your browser.

---

## 📄 License
Licensed under the ISC License. Organized by Shri Sai Leela Seva Trust. Om Sai Ram.
