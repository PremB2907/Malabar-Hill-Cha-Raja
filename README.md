# Malabar Hill Cha Raja

Official website and lightweight management portal for **Shree Bal Gopal Ganesh Utsav Mandal**, Malabar Hill Cha Raja, Mumbai.

Mandal details:

- Established: 1973
- Address: Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007
- Mandal emails: `Mcroffical1973@gmail.com`, `marketing.malabarhillcharaja@gmail.com`
- Website provider/sending mailbox: Mitram Solutions (`mitramsolutions@gmail.com`)

## Features

- Marathi/English corporate-style public website
- Home, history, schedule, social work, committee, contact and gallery pages
- Bappa and celebrity galleries using the supplied mandal assets
- Online donations through Razorpay
- Donor PDF receipt showing the actual paid amount
- Protected admin PDF receipt showing the amount received after the 2% processing cutoff
- Excel upload, record viewing, deletion and combined export for offline donations and merchandise
- Official T-shirt booking and PDF token receipt
- Optional Twilio SMS notifications
- Direct bank transfer (DBT) page with the mandal's bank details
- Advertisement page with 2026-27 placement sizes and rates

## Technology

- Node.js and Express
- EJS templates
- MySQL via `mysql2`, with an in-memory fallback for local/demo mode
- Razorpay, Twilio, PDFKit, ExcelJS and node-cron
- Vanilla CSS and client-side JavaScript

## Run Locally

Requirements: Node.js 18+ and npm. MySQL is optional for local demo mode.

```bash
npm install
cp .env.example .env
npm start
```

Open `http://localhost:3000`.

If port 3000 is already in use, stop the existing `node server.js` process or run `PORT=3001 npm start`.

## Environment Variables

Set these in `.env` locally or in Vercel Project Settings. Never commit `.env` or API secrets.

```env
PORT=3000
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+14155238886
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-password
DB_HOST=your-mysql-host
DB_USER=your-mysql-user
DB_PASSWORD=your-mysql-password
DB_NAME=malabar_hill_cha_raja
DB_PORT=3306
```

Razorpay and Twilio fall back to simulated/logged behavior when credentials are absent. Advertisement enquiries are sent from `SMTP_USER` to the mandal, with the marketing mailbox in CC and the visitor in CC when an email is provided. Configure a persistent MySQL database for production records; the in-memory fallback resets when the serverless instance restarts.

## Important Routes

| Route | Purpose |
| --- | --- |
| `/` | Public home page |
| `/donate` | Razorpay donation flow |
| `/dbt` | Direct bank transfer details |
| `/advertise` | Sponsorship and advertisement placements |
| `/glimpses` | Historical, Bappa and celebrity galleries |
| `/tshirt` | Official T-shirt booking |
| `/admin/login` | Admin login |
| `/admin` | Protected dashboard |
| `/admin/excel` | Excel records management |

## Deployment on Vercel

1. Import this GitHub repository into Vercel.
2. Set the environment variables above in Vercel Project Settings.
3. Use the default Node.js build settings; `vercel.json` routes requests to `server.js`.
4. Deploy and test `/`, `/donate`, `/dbt`, `/advertise`, and `/admin/login`.

Vercel serverless storage is not durable. Use MySQL for production donations, Excel records and admin data. Configure a custom domain separately if the mandal's brochure domain is available.

## Supplied Assets

- `Broucher 2026.pdf`: advertisement brochure
- `bank details.jpeg`: DBT account reference
- `Committee members.jpeg`: mandal committee reference
- `Bappa Pics/`: Bappa photo archive
- `Celebrities/`: celebrity photo archive
- `history.txt`: mandal history source

## Security

Use fresh Razorpay/Twilio credentials in deployment environment variables, change the default admin password, and never share OTPs, banking PINs or API secrets. The DBT page only displays account information and does not collect banking credentials.# 🚩 Shri Saileela Palkhi Pilgrimage & Management Portal

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
