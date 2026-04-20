# 🏥 MedFlow - Smart Healthcare Management Platform

MedFlow is a professional-grade, full-stack healthcare orchestration platform designed to streamline patient appointments, hospital operations, and digital prescriptions. It features a specialized role-based architecture for Patients, Doctors, Pharmacists, and Administrators.

## 🌟 Key Features

### 👤 Patient Portal
- **Symptom Analyzer**: AI-driven tool to find the right specialists based on symptoms.
- **Smart Booking**: Real-time token booking with availability tracking.
- **Digital History**: Access to prescriptions and medical history.
- **Real-time Tokens**: Live tracking of the current token number in the hospital.

### 🩺 Doctor Dashboard
- **Queue Management**: Call the next patient, manage surgery breaks, and status updates.
- **Digital Prescription**: Integrated Rx creation that sends data directly to the pharmacy.
- **Clinical History**: Searchable database of past patient encounters.

### 💊 Pharmacy Portal
- **Instant Billing**: Automatic retrieval of doctor prescriptions.
- **Inventory Tracking**: Manage dispensed medicines and total billing stats.
- **Patient Verification**: Secure token-based medication dispensing.

### ⚙️ Admin & Walk-in Tools
- **Operation Oversight**: View analytics and manage all hospital appointments.
- **Manual Walk-in**: Register on-site patients with automatic token generation.
- **PDF Reporting**: Export daily appointment reports for hospital records.

## 🚀 Tech Stack
- **Frontend**: React (Vite), TypeScript, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express, TypeScript.
- **Database**: MongoDB (Mongoose ORM).
- **Security**: JWT Authentication, Role-Based Access Control (RBAC).

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account

### 1. Clone & Install
```bash
git clone https://github.com/hameedshaik2345/MedFlow.git
cd MedFlow
npm install
```

### 2. Environment Configuration
Create a `.env` file in the `backend` directory:
```env
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
SESSION_SECRET=your_session_secret
```

### 3. Run Development Server
**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## 🌐 Deploying to Vercel
1. Push the code to GitHub.
2. Connect your repo to Vercel.
3. For **Backend**: Set "Root Directory" to `backend` and set your `.env` variables.
4. For **Frontend**: Set `VITE_API_URL` to your backend URL.

---
*Created by Hameed Shaik*
