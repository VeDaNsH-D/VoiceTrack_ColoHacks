# VoiceTrace Frontend - Quick Setup Guide

Complete guide to get the VoiceTrace frontend running in minutes.

## 📋 Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm 9+** (comes with Node.js)
- **Git** - [Download](https://git-scm.com/)
- **Backend Running** - FastAPI server on http://localhost:8000

## ⚡ Quick Start (5 mins)

### 1. Clone & Navigate

```bash
cd frontend
```

### 2. Install Dependencies

```bash
npm install
```

*This might take 2-3 minutes for all packages to download.*

### 3. Create Environment File

```bash
cp .env.example .env
```

### 4. Start Development Server

```bash
npm run dev
```

**That's it!** Open http://localhost:3000 in your browser.

---

## 🔧 Configuration

### Environment Variables

Edit `.env` to customize:

```env
# Backend API URL (change if backend runs on different port)
VITE_API_BASE_URL=http://localhost:8000/api

# Feature flags
VITE_ENABLE_AUDIO_PLAYBACK=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_EXPORT_PDF=true

# Max recording duration (seconds)
VITE_MAX_RECORDING_DURATION=180

# Items per page in ledger
VITE_ITEMS_PER_PAGE=30
```

## 📱 Testing the App

### Without Backend (Mock Mode)

The API layer is set up to handle errors gracefully. For testing without a backend:

1. **Mock API responses** by editing `src/services/api.ts`
2. **Test UI flows** with dummy data

Example mock in `api.ts`:
```typescript
export const getDailyEntries = async (): Promise<DailyEntry[]> => {
  // Mock: return dummy entries
  return [{
    id: '1',
    date: new Date().toISOString(),
    transcript: 'Aaj 10 banana bechey, 50 rupee mein...',
    items: [{ id: '1', name: 'Banana', quantity: 10, totalPrice: 500, ... }],
    expenses: [],
    totalEarnings: 500,
    totalExpenses: 100,
    confidence: 0.95,
    flagged: false,
    ambiguities: [],
    createdAt: new Date().toISOString(),
  }]
}
```

### With Backend

1. Start FastAPI backend (see backend README)
2. Verify `VITE_API_BASE_URL` in `.env` matches backend port
3. App will automatically connect

## 🎯 Project Structure Overview

```
frontend/
├── src/
│   ├── components/     ← React components
│   ├── services/       ← API calls
│   ├── store/          ← Global state (Zustand)
│   ├── types/          ← TypeScript interfaces
│   ├── utils/          ← Helper functions
│   └── App.tsx         ← Main component
├── public/             ← Static assets
├── index.html          ← HTML entry point
├── package.json        ← Dependencies
└── vite.config.ts      ← Build config
```

## 🚀 Build for Production

```bash
# Create optimized build
npm run build

# Preview before deploying
npm run preview
```

Output goes to `dist/` folder - ready to deploy anywhere.

## 🛠️ Common Issues & Solutions

### Issue: Port 3000 already in use

```bash
# Use different port
HOST=localhost PORT=3001 npm run dev
```

### Issue: Backend connection fails

Check:
1. Backend is running: `http://localhost:8000/api/health`
2. `VITE_API_BASE_URL` in `.env` is correct
3. CORS is enabled in FastAPI backend

### Issue: Microphone access denied

- Check browser permissions for http://localhost:3000
- Use HTTPS in production (microphone requires secure context)

### Issue: npm install fails

```bash
# Clear npm cache
npm cache clean --force

# Try install again
npm install
```

## 📚 Important Files to Know

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main app with routing logic |
| `src/store/store.ts` | Global state management |
| `src/services/api.ts` | All backend API calls |
| `src/types/index.ts` | TypeScript type definitions |
| `tailwind.config.js` | Color scheme & typography |
| `vite.config.ts` | Dev server & API proxy |

## 🎨 Customizing the UI

### Change Colors

Edit `tailwind.config.js`:
```javascript
colors: {
  primary: '#10B981',   // Change green
  danger: '#EF4444',    // Change red
  // ...
}
```

### Change Fonts

Update `tailwind.config.js` theme section:
```javascript
fontSize: {
  'sm': '0.875rem',
  'base': '1rem',
  'lg': '1.125rem',
  // ...
}
```

### Add New Component

1. Create in `src/components/MyComponent.tsx`
2. Export from `src/components/index.ts`
3. Use in `App.tsx`

## 🔌 Backend Integration

### Expected API Responses

**POST /api/transcribe**
```json
{
  "raw": "Aaj 10 apple...",
  "cleaned": "Today sold 10 apples...",
  "confidence": 0.92,
  "processingTime": 1250,
  "usedFallback": false
}
```

**POST /api/extract**
```json
{
  "items": [
    {
      "id": "1",
      "name": "Apple",
      "quantity": 10,
      "unit": "kg",
      "totalPrice": 500,
      "confidence": 0.95
    }
  ],
  "expenses": [],
  "totalEarnings": 500,
  "totalExpenses": 100,
  "confidence": 0.93,
  "ambiguities": [],
  "reasonings": ["Detected 10 apples sold for 500 rupees"]
}
```

See `src/types/index.ts` for all type definitions.

## 📊 Development Tips

### Debug State

Open browser console:
```javascript
// Zustand store
import { useVoiceTraceStore } from './store/store'
const store = useVoiceTraceStore()
console.log(store.getState())
```

### Network Requests

1. Open DevTools (F12)
2. Go to Network tab
3. All API calls show with request/response

### Performance

```bash
npm run build  # Check bundle size
```

## 🚢 Deployment Checklist

- [ ] `npm run build` succeeds
- [ ] No console errors
- [ ] Backend API URL configured correctly
- [ ] HTTPS enabled (for microphone)
- [ ] Environment variables set in production
- [ ] CORS configured in backend
- [ ] Test on actual device

## 📱 Mobile Testing

### Test on Real Phone

1. Get your computer IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Start dev server: `npm run dev`
3. Open on phone: `http://YOUR_IP:3000`

## 📞 Getting Help

1. **Check console** - Press F12, look for errors
2. **Read component comments** - Hints are in the code
3. **Check types** - `src/types/index.ts` explains all data structures
4. **Review API layer** - `src/services/api.ts` shows all backend calls

## 🎓 Learning Resources

- **React**: [Official Tutorial](https://react.dev/learn)
- **Tailwind**: [Docs](https://tailwindcss.com/docs)
- **Zustand**: [GitHub Repo](https://github.com/pmndrs/zustand)
- **TypeScript**: [Official Handbook](https://www.typescriptlang.org/docs/)

---

**Happy coding! 🚀**
