# VoiceTrace Frontend

Professional, accessible React.js frontend for the VoiceTrace voice-to-business-intelligence platform.

## 🎯 Features

### Core Features
- **🎙️ Voice Recording**: High-quality audio recording with real-time duration tracking
- **📊 Transcription Display**: Clean, highlighted transcription with confidence scoring
- **📝 Entity Extraction**: Visual display of extracted items, expenses, and confidence flags
- **💼 Dashboard**: Daily summary with earnings, expenses, and entry history
- **📈 Analytics**: Weekly insights, trends, and item performance data
- **❓ Ambiguity Resolution**: Smart prompts for low-confidence extractions
- **📱 Mobile-First Design**: Optimized for street vendors with low digital literacy

### Technical Stack
- **React 18** with TypeScript
- **Tailwind CSS** for responsive styling
- **Zustand** for state management
- **Framer Motion** for smooth animations
- **Recharts** for data visualization
- **Axios** for API communication
- **Vite** for fast development

## 📦 Project Structure

```
frontend/
├── src/
│   ├── components/           # React components
│   │   ├── AudioRecorder.tsx        # Voice input component
│   │   ├── TranscriptionDisplay.tsx # STT output display
│   │   ├── ExtractedEntities.tsx    # Extraction results
│   │   ├── Dashboard.tsx            # Main dashboard view
│   │   └── AnalyticsDashboard.tsx   # Weekly analytics
│   ├── services/            # API integration
│   │   └── api.ts                   # Backend API calls
│   ├── store/               # State management
│   │   └── store.ts                 # Zustand store
│   ├── types/               # TypeScript definitions
│   │   └── index.ts                 # Type definitions
│   ├── utils/               # Utility functions
│   │   ├── formatting.ts            # Format helpers
│   │   └── audio.ts                 # Audio processing
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── index.html               # HTML template
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind configuration
├── postcss.config.js        # PostCSS configuration
├── tsconfig.json            # TypeScript configuration
├── package.json             # Dependencies
└── README.md                # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Configure backend URL in .env if needed
VITE_API_BASE_URL=http://localhost:8000/api
```

### Development

```bash
# Start dev server (runs on http://localhost:3000)
npm run dev

# The app will auto-reload when you make changes
```

### Build

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## 🎨 UI/UX Design Principles

### For Low-Literacy Users
1. **Large, Clear Icons**: Concrete, culturally-relevant iconography
2. **Minimal Text**: Information presented through icons and colors
3. **Semantic Colors**: 
   - 🟢 Green = income, profit, positive
   - 🔴 Red = expenses, alerts
   - 🟠 Orange = warnings, caution
4. **Audio Feedback**: System speaks summaries back to users
5. **High Contrast**: Large touch targets for one-handed operation

### Visual Hierarchy
- **Biggest**: Primary CTA (Record button)
- **Large**: Daily totals and key insights
- **Medium**: Individual entries and analytics
- **Small**: Metadata and confidence indicators

## 🔄 Component Flow

```
App
├── Recording Flow
│   ├── AudioRecorder (mic button, duration)
│   ├── TranscriptionDisplay (original + cleaned)
│   ├── ExtractedEntities (items, expenses, ambiguities)
│   └── Confirmation screen
├── Dashboard
│   ├── Weekly summary cards
│   ├── Recent entries list
│   └── Export button
├── Analytics
│   ├── Summary metrics
│   ├── Top items chart
│   ├── Expense breakdown
│   └── Insights & suggestions
└── Navigation (bottom tabs)
```

## 🔌 API Integration

The frontend communicates with the FastAPI backend via REST endpoints:

### Key Endpoints
```
POST /api/transcribe       # Send audio for transcription
POST /api/extract          # Extract entities from text
POST /api/ledger/entry     # Save daily entry
GET  /api/ledger/entries   # Fetch entries
GET  /api/analytics/daily  # Get daily analytics
GET  /api/analytics/weekly # Get weekly analytics
GET  /api/export/pdf       # Download income statement
```

See `src/services/api.ts` for the complete API client.

## 📱 Mobile Optimization

- **Responsive Design**: Works on phones, tablets, and desktops
- **Touch-Friendly**: Large buttons and swipe-capable UI
- **Offline-Ready**: Caches recently used data
- **Performance**: Lazy-loads analytics and heavy components

## 🔧 Configuration

Key configuration options in `tailwind.config.js`:

```javascript
{
  colors: {
    primary: '#10B981',    // Green for income
    danger: '#EF4444',     // Red for expenses
    warning: '#F59E0B',    // Orange for alerts
    success: '#34D399',    // Bright green
  },
  fontSize: { /* ... */ },  // Readable sizes
}
```

## 🧪 Testing (Optional)

To add tests, install testing libraries:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

## 🚢 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Deploy to other platforms
The `dist/` folder contains the optimized build ready for any static host:
- Netlify
- AWS S3 + CloudFront
- Firebase Hosting
- Traditional web servers

## 📚 Key Dependencies

| Package | Purpose |
|---------|---------|
| `zustand` | Lightweight state management |
| `framer-motion` | Smooth animations & transitions |
| `recharts` | Data visualization |
| `react-toastify` | Toast notifications |
| `axios` | HTTP client |
| `tailwindcss` | Utility-first CSS |

## 🎯 Roadmap

- [ ] Offline mode with service workers
- [ ] WhatsApp integration via deep links
- [ ] Multi-language support (Hindi, Tamil, Marathi)
- [ ] Dark mode
- [ ] Audio playback mapping (force alignment)
- [ ] PDF export with signatures
- [ ] Photo receipt upload
- [ ] Demand forecasting UI

## 🛠️ Common Tasks

### Add a New Component
1. Create file in `src/components/`
2. Export from component
3. Import in `App.tsx` or parent component

### Add API Endpoint
1. Add function in `src/services/api.ts`
2. Create type in `src/types/index.ts`
3. Use in component via `const { data } = await apiFunction()`

### Modify Theme Colors
Edit `tailwind.config.js` under `theme.extend.colors`

### Format Code
```bash
npm run lint  # Check for issues
```

## 📖 Documentation

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Docs](https://react.dev)
- [Zustand Guide](https://github.com/pmndrs/zustand)
- [Framer Motion](https://www.framer.com/motion/)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes
3. Commit: `git commit -am 'Add feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

## 📄 License

MIT - See LICENSE file for details

## 👥 Support

For issues, questions, or feature requests, reach out to the development team.

---

**Built with ❤️ for India's microentrepreneurs**
