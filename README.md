# VoiceTrack — Folder Structure

## 📁 Project Layout

```
VoiceTrack_ColoHacks/
├── frontend/    ← 📱 Android / Capacitor Mobile App
├── website/     ← 🌐 Desktop Marketing Website
├── backend/     ← ⚙️  Node.js Express API
└── app/         ← 🐍 Python ML Services
```

---

## 📱 `frontend/` — Mobile App (Android)

Built with **React + Vite + Capacitor**.  
This is the app-first, mobile-optimised UI — the screens vendors actually use on their phones.

### Run dev server:
```bash
cd frontend
npm install
npm run dev          # → http://localhost:3000
```

### Build for Android:
```bash
npm run build
npx cap sync android
npx cap open android   # Opens in Android Studio
```

---

## 🌐 `website/` — Marketing Website (Desktop-first)

Built with **React + Vite + TailwindCSS**.  
Full desktop-first landing page with Hero, Features, How It Works, Pricing, Testimonials, Footer, and a split-screen Auth page.

### Run dev server:
```bash
cd website
npm install
npm run dev          # → http://localhost:5174
```

### Pages / Sections:
- **Landing** — Hero, Features, How It Works, Pricing, Testimonials, Footer
- **Auth** — Split-screen Create Account / Log In (connects to backend API)

---

## ⚙️ `backend/` — Node.js API

```bash
cd backend
npm install
npm run dev          # → http://localhost:5001
```

---

## 🐍 `app/` — Python ML Services

```bash
pip install -r requirements.txt
python app.py
```
