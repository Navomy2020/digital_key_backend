# 🔐 Digital Lab Resource Management System (DLRMS) - Backend

A robust backend system designed to automate and manage lab resources such as lab keys and IC components using RFID and barcode-based identification.

---

## 🚀 Features

### 🔍 Hardware Scan Integration
- Handles RFID + Barcode input
- Automatically detects item type (Lab Key / IC)
- Routes logic dynamically based on scanned item

---

### 🔑 Lab Key Management
- Issue lab keys to students/faculty
- Return keys with automatic status update
- Real-time tracking of key availability
- Maintains key transaction logs

---

### 📦 IC (Integrated Circuit) Management
- Issue IC components with quantity tracking
- Supports:
  - Full return
  - Partial return
- Prevents over-return errors
- Tracks issued vs returned quantities

---

### 📊 Logs & Monitoring

#### Key Logs
- View today's logs
- Filter logs by date
- Tracks issue & return timestamps

#### IC Logs
- Track issued & returned quantities
- View pending IC returns
- Filter logs by date

---

### ⚠️ Pending Items Tracking
- View unreturned lab keys
- View pending IC returns
- Helps maintain lab discipline

---

### 🔐 Authentication
- Faculty login system
- Password hashing using bcrypt
- JWT-based authentication
- Protected routes for secure access

---

## 🧠 Tech Stack

- Node.js
- Express.js
- MySQL
- JWT (Authentication)
- bcrypt (Password hashing)

---

## 📡 API Endpoints

### 🔐 Authentication
- `POST /api/login` → Faculty login
- `GET /api/verify-session` → Verify JWT token

---

### 📡 Hardware
- `POST /api/scan` → Handle RFID + barcode scan

---

### 🔑 Key Management
- `GET /api/keylogs` → Today's key logs
- `GET /api/keylogsbydate?date=YYYY-MM-DD` → Filter logs by date
- `GET /api/pendingkey` → Pending key returns

---

### 📦 IC Management
- `GET /api/iclogs` → Today's IC logs
- `GET /api/iclogsbydate?date=YYYY-MM-DD` → Filter IC logs
- `GET /api/pendingic` → Pending IC returns

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the repository
```bash
git clone https://github.com/Navomy2020/digital_key_backend.git
cd digital_key_backend