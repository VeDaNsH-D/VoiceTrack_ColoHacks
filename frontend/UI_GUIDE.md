# VoiceTrace Frontend - UI/Component Guide

Visual reference and component usage guide for the VoiceTrace frontend.

## 🎨 Design System Overview

### Color Palette

```
🟢 PRIMARY (Income/Positive)
   Hex: #10B981
   Used for: CTA buttons, earnings, profits, positive indicators
   
🔴 DANGER (Expenses/Alerts)
   Hex: #EF4444
   Used for: Expenses, expenses, errors, dangerous actions
   
🟠 WARNING (Caution)
   Hex: #F59E0B
   Used for: Alerts, flagged entries, uncertain data
   
✅ SUCCESS (Confirmation)
   Hex: #34D399
   Used for: Confirmation buttons, successful actions
   
⚫ NEUTRAL (Secondary)
   Hex: #6B7280
   Used for: Text, borders, disabled states
   
🤍 LIGHT (Background)
   Hex: #F9FAFB
   Used for: Page background, light surfaces
```

### Typography

```
Headings:     Font-bold, varying sizes (3xl for page title)
Body Text:    text-base (16px), text-neutral
Small Text:   text-xs (12px), text-neutral
UI Labels:    text-sm font-semibold
```

### Spacing

```
Page padding:        p-6 (24px)
Card padding:        p-4 (16px)
Component gaps:      gap-4 or gap-6
Vertical spacing:    mb-2, mb-4, mb-6
```

## 📱 Wireframes by View

### View 1: Recording Flow - Microphone Input

```
┌─────────────────────────────────────────────────────────┐
│                 VoiceTrace                  [Back]       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│         📢 Tell us about your day                        │
│                                                           │
│   Speak naturally. Tell us what you sold, what you       │
│   spent, how your day was.                               │
│                                                           │
│              ┌──────────────┐                            │
│              │      🎤      │  ← Tap to start            │
│              │   (Large)    │                            │
│              └──────────────┘                            │
│                                                           │
│   💡 Tip: Speak in your natural way. Mention items      │
│   sold, prices, and any expenses.                        │
│                                                           │
│ [Tab: Dashboard] [+ Record] [Analytics]                  │
├─────────────────────────────────────────────────────────┤
│                                                           │
└─────────────────────────────────────────────────────────┘

While Recording:

┌─────────────────────────────────────────────────────────┐
│                 VoiceTrace                  [Back]       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│              🔴 Recording...                             │
│                                                           │
│               ┌──────────────┐                           │
│               │   🎤💨        │ ← Animated pulse          │
│               │  (Growing)   │                           │
│               └──────────────┘                           │
│                                                           │
│                  1:42  ← Time                            │
│                Max 3 minutes                             │
│                                                           │
│          [✓ Stop]    [✗ Cancel]                         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### View 2: Transcription Display

```
┌─────────────────────────────────────────────────────────┐
│                 VoiceTrace                  [Back]       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│     ✅ Transcription Complete                           │
│     Here's what we heard...                              │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐│
│  │ 📍 Confidence  ⚡ 1250ms              Using Backup   ││
│  ├─────────────────────────────────────────────────────┤│
│  │                                                     ││
│  │ 🎙️ Your Voice (Original)                          ││
│  │ ┌─────────────────────────────────────────────────┐││
│  │ │ "Aaj chai bechey, 200 rupee mein... ek...  ││
│  │ └─────────────────────────────────────────────────┘││
│  │                                                     ││
│  │ ✨ Cleaned & Highlighted                          ││
│  │ ┌─────────────────────────────────────────────────┐││
│  │ │ Today sold chai for 200 rupees, one liter...   ││
│  │ │           ↑ highlighted                        ││
│  │ └─────────────────────────────────────────────────┘││
│  │                                                     ││
│  │ 🔊 Audio Playback                                 ││
│  │ ┌─────────────────────────────────────────────────┐││
│  │ │ [|=====------] 0:15 / 0:42  🔊  ⏸ ⏭          ││
│  │ └─────────────────────────────────────────────────┘││
│  │                                                     ││
│  │ [📋 Copy Transcript]                               ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
│  → Extract Details                                       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### View 3: Extraction Results

```
┌─────────────────────────────────────────────────────────┐
│                 VoiceTrace                  [Back]       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│       📊 Extracted Data                                  │
│       Here's what we found...                            │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐│
│  │ 💰 Total Earnings    💸 Total Spent  📊 Confidence  ││
│  │                                                     ││
│  │    ₹200               ₹50              92%           ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
│  📦 Items Sold (2)                                       │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Chai                              ₹200     🟢 95%   ││
│  │ 1 liter @ ₹200/liter                               ││
│  │                                                     ││
│  │ Sugar                             ₹50      🟡 75%   ││
│  │ Some amount of sugar                               ││
│  │                                                     ││
│  │ ⚠️ Not sure about the quantity. Confirm?            ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
│  💳 Expenses (1)                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Transport (auto fare)             ₹50      🟢 98%   ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
│  ❓ A Few Clarifications                                │
│  ┌─────────────────────────────────────────────────────┐│
│  │ How much sugar did you sell?      [____] units      ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
│  [✅ Confirm & Save]  [🔄 Re-record]                   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### View 4: Dashboard

```
┌─────────────────────────────────────────────────────────┐
│                 VoiceTrace                               │
├─────────────────────────────────────────────────────────┤
│                                                           │
│         💼 Your Business Dashboard                       │
│         Last 7 days summary                              │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ 💰 Earned    │  │ 💸 Spent     │                    │
│  │              │  │              │                    │
│  │   ₹1,500     │  │    ₹350      │                    │
│  │ This week    │  │ This week    │                    │
│  └──────────────┘  └──────────────┘                    │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ 📈 Profit    │  │ 📊 Records   │                    │
│  │              │  │              │                    │
│  │   ₹1,150     │  │     12       │                    │
│  │ This week    │  │ Total        │                    │
│  └──────────────┘  └──────────────┘                    │
│                                                           │
│  [+ Record Today's Update]  ← Large, colorful button    │
│                                                           │
│  📋 Recent Entries                                       │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Mon, 24 Mar          "Aaj chai bechey..."  ₹200    ││
│  │ 📦 2 items  💳 1 expense  ✨ 95% confident         ││
│  │                                                     ││
│  │ Sun, 23 Mar          "Subah chai aur..."   ₹180    ││
│  │ 📦 3 items  💳 2 expenses  ✨ 87% confident         ││
│  │                                                     ││
│  │ Sat, 22 Mar          "Raat ko nath aaya..."₹220    ││
│  │ 📦 2 items  💳 1 expense   ⚠️ Flagged              ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
│  [📥 Download Income Statement (PDF)]                  │
│                                                           │
│ [Dashboard] [+ Record] [Analytics]                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### View 5: Analytics Dashboard

```
┌─────────────────────────────────────────────────────────┐
│                 VoiceTrace                               │
├─────────────────────────────────────────────────────────┤
│                                                           │
│       📊 Your Weekly Insights                            │
│       Mar 16 - Mar 22, 2025                              │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │   ₹1,200 │  │   ₹300   │  │   ₹900   │              │
│  │ Earnings │  │ Expenses │  │ Profit   │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                           │
│  💡 Daily Average                                        │
│  ┌─────────────────────────────────────────────────────┐│
│  │                  ₹800 / day                         ││
│  │      Average earnings per day this week             ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
│  🏆 Top Selling Items                                    │
│  ┌─────────────────────────────────────────────────────┐│
│  │    Chai      ║████████░░                           ││
│  │    Sugar     ║████░░                                ││
│  │    Bread     ║███░░                                 ││
│  │    Butter    ║██░░░                                 ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
│  💳 Expense Categories                                   │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Transport              ₹100                         ││
│  │ Raw Material           ₹200                         ││
│  │ Rent                   ₹0                           ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
│  🧠 VoiceTrace Insights                                 │
│  ┌─────────────────────────────────────────────────────┐│
│  │ ✓ Chai sells 2x faster than sugar                  ││
│  │ ✓ Sunday has 40% higher earnings                    ││
│  │ ✓ Your margins improved by 5% this week             ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
│  💡 Next Week Tips                                       │
│  ┌─────────────────────────────────────────────────────┐│
│  │ 📦 Stock up on your top 3 items                     ││
│  │ 💰 Transport costs trending up - bulk buy           ││
│  │ 📈 Weekends get 30% more orders - prepare extra    ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
│ [Dashboard] [+ Record] [Analytics]                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## 🧩 Reusable Component Patterns

### Info Card Pattern

```tsx
<div className="bg-primary bg-opacity-10 border border-primary border-opacity-20 rounded-lg p-4">
  <p className="text-xs text-neutral mb-1">💰 Label</p>
  <p className="text-2xl font-bold text-primary">₹1,500</p>
  <p className="text-xs text-neutral mt-1">Subtext</p>
</div>
```

Used for: Summary metrics, stats displays

### List Item Pattern

```tsx
<button className="w-full bg-white border border-neutral border-opacity-10 rounded-lg p-4 hover:border-primary hover:border-opacity-30 transition text-left">
  <div className="flex justify-between items-start mb-2">
    <p className="font-semibold text-dark">Title</p>
    <p className="text-lg font-bold text-primary">₹500</p>
  </div>
  <p className="text-sm text-neutral">Description or metadata</p>
</button>
```

Used for: Entries, ledger items, clickable lists

### Alert/Warning Pattern

```tsx
<div className="bg-warning bg-opacity-10 border border-warning border-opacity-30 rounded-lg p-4">
  <h4 className="font-semibold text-dark mb-2">⚠️ Title</h4>
  <p className="text-sm text-dark">Description</p>
</div>
```

Used for: Ambiguities, alerts, important notices

### Loading State

```tsx
<div className="text-center py-8">
  <p className="text-neutral">Loading your records...</p>
</div>
```

Used for: While fetching data

### Empty State

```tsx
<div className="bg-neutral bg-opacity-5 rounded-lg p-8 text-center">
  <p className="text-neutral mb-4">No records yet</p>
  <button className="text-primary font-semibold hover:underline">
    Record your first update
  </button>
</div>
```

Used for: When no data exists

## 🎯 Icons & Emojis Used

| Icon | Usage | Component |
|------|-------|-----------|
| 🎤 | Record, audio, recording | AudioRecorder |
| 📢 | Announcement, instructions | AudioRecorder |
| 🔴 | Recording indicator | AudioRecorder |
| ✅ | Confirmation, success | Buttons, badges |
| 🎙️ | Transcription, original audio | TranscriptionDisplay |
| ✨ | Cleaned, processed | TranscriptionDisplay |
| 🔊 | Audio playback | TranscriptionDisplay |
| 📦 | Items sold, inventory | ExtractedEntities |
| 💳 | Expenses | ExtractedEntities |
| 💰 | Earnings, income | Dashboard, Analytics |
| 💸 | Spending, expenses | Dashboard, Analytics |
| 📊 | Analytics, charts | Dashboard, Analytics |
| 📈 | Profit, growth, trending up | Dashboard, Analytics |
| 📉 | Decline, trending down | Analytics |
| 💼 | Business, dashboard | Dashboard |
| 📋 | Ledger, records, list | Dashboard |
| ⚠️ | Warning, alert | ExtractedEntities |
| ❓ | Questions, clarification | ExtractedEntities |
| 🧠 | Insights, intelligence | Analytics |
| 💡 | Tips, suggestions | Multiple |
| 📥 | Download, export | Dashboard |

## 🎬 Animations

Used Framer Motion for:

1. **Page Transitions**: Fade + slide in/out
2. **Button Interactions**: Scale down on tap
3. **Loading States**: Pulse ring, spinner
4. **List Items**: Staggered children with delays
5. **Confirmations**: Celebratory scale-up

```tsx
<motion.button
  whileTap={{ scale: 0.95 }}  // Shrink slightly when tapped
  onClick={handleClick}
/>

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
/>
```

## 📏 Responsive Breakpoints

```
Mobile (< 640px):    Full width, max-w-none
Tablet (640px+):     max-w-2xl, centered
Desktop (1024px+):   Still max-w-2xl (optimized for mobile-first)
```

The app is optimized for **mobile phones first** since vendors use phones.

---

**UI Version**: 1.0  
**Last Updated**: March 2026
