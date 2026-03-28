# VoiceTrace Frontend - Architecture & Development Guide

Comprehensive technical documentation for the VoiceTrace React frontend.

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VoiceTrace Frontend                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             UI Layer (React Components)              │   │
│  │  ┌──────────┬──────────┬──────────┬──────────────┐  │   │
│  │  │ Record   │ Dashboard│ Analytics│ Navigation   │  │   │
│  │  │ Flow     │ View     │ View     │ & Layout     │  │   │
│  │  └──────────┴──────────┴──────────┴──────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        State Management (Zustand Store)              │   │
│  │  • currentView, recordingStep, processingState       │   │
│  │  • entries, currentEntry, dailyAnalytics             │   │
│  │  • pendingAmbiguities                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          API Service Layer (Axios)                   │   │
│  │  • transcribeAudio()  → Backend                       │   │
│  │  • extractEntities()  → Backend                       │   │
│  │  • saveDailyEntry()   → Backend                       │   │
│  │  • getAnalytics()     → Backend                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Backend API (FastAPI Server)                 │   │
│  │         Running on http://localhost:8000             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Data Flow

### Recording and Extraction Flow

```
1. User Records Audio
   ↓
2. Audio Blob (Webm) → Validated
   ↓
3. Convert to WAV format
   ↓
4. POST /api/transcribe
   ↓
5. Backend:
   - Saaras V3 STT → Transcript
   - Text preprocessing → Cleaned text
   - Confidence scoring
   ↓
6. TranscriptionDisplay Component
   ↓
7. User reviews → Clicks Next
   ↓
8. POST /api/extract
   ↓
9. Backend:
   - LLM extraction → JSON schema
   - Rule validation
   - Confidence engine
   - Ambiguity detection
   ↓
10. ExtractedEntities Component
    ↓
11. User confirms/resolves ambiguities
    ↓
12. Save to Database
```

## 🔄 State Management (Zustand)

### Store Structure

```typescript
VoiceTraceStore {
  // Data
  entries: DailyEntry[]
  currentEntry: DailyEntry | null
  dailyAnalytics: DailyAnalytics | null
  weeklyAnalytics: WeeklyAnalytics | null
  pendingAmbiguities: Ambiguity[]

  // UI State
  currentView: 'record' | 'dashboard' | 'ledger' | 'analytics'
  isRecording: boolean
  isProcessing: boolean
  showConfirmation: boolean
  selectedEntryId: string | null
  audioBlob: Blob | null

  // Actions (setters)
  setCurrentView()
  addEntry()
  updateEntry()
  resolveAmbiguity()
  // ... more actions
}
```

### Why Zustand?

- **Lightweight**: No providers or context boilerplate
- **Simple**: Just write functions that update state
- **TypeScript-friendly**: Full type checking
- **Performant**: Only re-renders affected components

## 🎤 Audio Processing Pipeline

### Browser Audio Capture

```typescript
AudioRecorder Component
├─ requestMicrophone()
│  └─ navigator.mediaDevices.getUserMedia()
├─ startRecording()
│  └─ new MediaRecorder(stream)
├─ displayDuration()
│  └─ Update timer every 1s (max 180s)
└─ stopRecording()
   └─ Return Blob
```

### Audio Format Conversion

```
Blob (WebM/Opus) 
   ↓
blobToWav()
   ├─ Create OfflineAudioContext
   ├─ Decode WebM to AudioBuffer
   └─ Encode to WAV format
   ↓
Blob (WAV, 16kHz, mono)
   ↓
POST /api/transcribe
```

## 📝 Component Hierarchy

```
App (Main Router)
│
├─ Header
│  └─ VoiceTrace Logo + Back Button
│
├─ Main Content (AnimatePresence based on view)
│  │
│  ├─ Recording View (currentView === 'record')
│  │  ├─ AudioRecorder
│  │  │  └─ Mic Button + Duration Display
│  │  │
│  │  ├─ TranscriptionDisplay
│  │  │  ├─ Original Transcript (italic)
│  │  │  ├─ Cleaned with Highlights (numbers highlighted)
│  │  │  └─ Audio Playback
│  │  │
│  │  ├─ ExtractedEntities
│  │  │  ├─ Summary (Earnings, Expenses, Confidence)
│  │  │  ├─ Items Sold (with confidence badges)
│  │  │  ├─ Expenses (categorized)
│  │  │  ├─ Ambiguities Resolver (if any)
│  │  │  └─ Reasoning explanations
│  │  │
│  │  └─ Confirm Buttons (Save / Re-record)
│  │
│  │
│  ├─ Dashboard View (currentView === 'dashboard')
│  │  ├─ Summary Cards
│  │  │  ├─ Total Earned (This Week)
│  │  │  ├─ Total Spent (This Week)
│  │  │  ├─ Net Profit
│  │  │  └─ Records Count
│  │  │
│  │  ├─ Record New Entry Button (CTA)
│  │  │
│  │  └─ Recent Entries List
│  │     └─ Clickable entry cards
│  │
│  │
│  └─ Analytics View (currentView === 'analytics')
│     ├─ Summary Cards (Total, Spent, Profit)
│     ├─ Daily Avg Earnings
│     ├─ Top Items Bar Chart
│     ├─ Expense Breakdown
│     ├─ Weekly Insights
│     └─ Next Week Tips
│
├─ Footer Navigation (Sticky Bottom)
│  ├─ Dashboard Tab
│  ├─ Record Tab (+ icon)
│  └─ Analytics Tab
│
└─ Toast Notifications
   └─ Success / Error messages
```

## 🎨 Styling System

### Tailwind Configuration

```javascript
tailwind.config.js
├─ colors:
│  ├─ primary: #10B981 (Emerald green)
│  ├─ danger: #EF4444 (Red)
│  ├─ warning: #F59E0B (Amber)
│  ├─ success: #34D399 (Bright green)
│  └─ neutral: #6B7280 (Gray)
│
└─ typography:
   ├─ fontSize: (xs to 4xl)
   └─ spacing: (0 to 96)
```

### Component Styling Pattern

```tsx
<motion.div className="bg-primary bg-opacity-10 border border-primary border-opacity-20 rounded-lg p-6">
  {/* 
    - Primary color background (10% opacity)
    - Border with primary color (20% opacity)
    - Rounded corners & padding
    - High contrast for readability
  */}
</motion.div>
```

## 📞 API Integration

### How API Calls Work

```typescript
// In component:
const handleSave = async () => {
  setIsProcessing(true)
  try {
    const result = await saveDailyEntry(entry)
    toast.success('✅ Saved!')
    // Update store
    addEntry(result)
  } catch (error) {
    toast.error('❌ Failed')
  } finally {
    setIsProcessing(false)
  }
}
```

### Request/Response Flow

```
Component
  ↓
Service Layer (api.ts)
  → Creates axios request
  → Sets base URL from .env
  → Adds headers
  ↓
Vite Proxy
  → Forwards to http://localhost:8000/api
  ↓
FastAPI Backend
  → Processes request
  → Returns JSON response
  ↓
Service Layer
  → Parses JSON
  → Returns typed data
  ↓
Component
  → Updates UI
  → Shows toast
```

## 🔒 Type Safety

### TypeScript Benefits

```typescript
// Fully typed entry
const entry: DailyEntry = {
  id: string
  date: string
  transcript: string
  items: ExtractedItem[]  // Typed array
  expenses: ExtractedExpense[]
  // ... all fields typed
}

// API responses are typed
const result: DailyEntry = await saveDailyEntry(entry)

// Compiler catches mistakes:
// ❌ result.foo  // Error: no property 'foo'
// ✅ result.id   // OK
```

### Type Definitions Location

```
src/types/index.ts
├─ DailyEntry
├─ ExtractedItem
├─ ExtractedExpense
├─ Ambiguity
├─ DailyAnalytics
├─ WeeklyAnalytics
├─ TranscriptionResult
└─ ExtractionResult
```

## 🎯 User Experience Flows

### Happy Path: Recording to Save

```
1. User lands on Record view
   ↓
2. Taps microphone button → recording starts
   ↓
3. Speaks naturally → "Aaj 10 banana bechey, 200 rupee mein..."
   ↓
4. Taps checkmark → recording stops
   ↓
5. System transcribes (loading spinner)
   ↓
6. Shows transcript with numbers highlighted
   ↓
7. System extracts entities (loading spinner)
   ↓
8. Shows items and expenses with confidence
   ↓
9. User taps "Confirm & Save"
   ↓
10. Celebratory animation → saved!
    ↓
11. Returns to Dashboard
```

### Ambiguity Resolution Flow

```
1. User tries to save entry with ambiguity
   ↓
2. System detects low-confidence field
   ↓
3. Shows clarification prompt:
   "You mentioned selling bananas. How many?"
   ↓
4. User enters quantity or taps Yes/No
   ↓
5. Ambiguity marked as resolved
   ↓
6. Entry saves successfully
```

## 🚀 Performance Optimizations

### Built-in Optimizations

1. **Code Splitting**: Vite automatically chunks code
2. **Tree Shaking**: Unused code removed in build
3. **Lazy Loading**: Analytics and charts load on-demand
4. **Memoization**: Components memo-ized to prevent re-renders
5. **Framer Motion**: Hardware-accelerated CSS transforms

### Production Build Stats

```bash
npm run build

# Output example:
# dist/index.html                    4.50 kB
# dist/assets/main.{hash}.js        150 kB  (gzipped: 45 kB)
# dist/assets/vendor.{hash}.js       280 kB  (gzipped: 85 kB)
```

## 🐛 Debugging

### Browser DevTools

```javascript
// In console:
// Access store directly
import { useVoiceTraceStore } from './store/store'
const store = useVoiceTraceStore.getState()
console.log(store)

// Check specific state
console.log(store.entries)
console.log(store.currentEntry)
```

### Network Requests

1. Open DevTools (F12)
2. Go to Network tab
3. Record your actions
4. Click on API request to see:
   - Request headers
   - Request body
   - Response status
   - Response data

### Component Props/State

Add React DevTools extension:
- Chrome: [React DevTools](https://chrome.google.com/webstore)
- Firefox: [React DevTools](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

## 📈 Scalability Considerations

### As the App Grows

- **More Components**: Keep in `src/components/`, organized by feature
- **More Stores**: Add new Zustand stores as needed (don't mix concerns)
- **More Utils**: Organize utilities into sub-folders
- **More Types**: Keep expanding `src/types/index.ts`

### Performance at Scale

- Use React.memo for expensive components
- Implement pagination for large lists
- Cache API responses with React Query (optional)
- Pre-fetch analytics when idle

## 🔄 Integration Checklist

Before connecting to backend:

- [ ] Backend server running on port 8000
- [ ] CORS enabled in FastAPI
- [ ] All API endpoints implemented
- [ ] API responses match TypeScript types
- [ ] Environment variables configured
- [ ] No console errors in browser
- [ ] Test with real data

## 📚 Additional Resources

- **Component Library**: [Shadcn/ui](https://ui.shadcn.com/) (if needed)
- **Form Handling**: [React Hook Form](https://react-hook-form.com/)
- **Testing**: [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/)
- **State Machine**: [XState](https://xstate.js.org/) (for complex flows)

---

**Document Version**: 1.0  
**Last Updated**: March 2026  
**Status**: Beta Release
