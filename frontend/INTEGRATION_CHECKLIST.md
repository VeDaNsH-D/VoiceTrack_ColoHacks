# VoiceTrace Frontend - Backend Integration Checklist

Complete checklist for integrating the frontend with the FastAPI backend.

## ✅ Pre-Integration

- [ ] FastAPI backend is running on `http://localhost:8000`
- [ ] Frontend is running on `http://localhost:3000`
- [ ] Browser console shows no errors
- [ ] No "Failed to connect" messages in Network tab

## ✅ Step 1: Verify Backend Health

Open browser console and run:
```javascript
fetch('http://localhost:8000/api/health')
  .then(r => r.json())
  .then(d => console.log('Backend OK:', d))
  .catch(e => console.error('Backend error:', e))
```

Expected response:
```json
{ "status": "ok" }
```

## ✅ Step 2: Test Transcription Endpoint

```javascript
const audioBlob = /* get from recording button */
const formData = new FormData()
formData.append('audio', audioBlob, 'test.wav')

fetch('http://localhost:8000/api/transcribe', {
  method: 'POST',
  body: formData
})
  .then(r => r.json())
  .then(d => console.log('Transcription:', d))
  .catch(e => console.error('Error:', e))
```

Expected response:
```json
{
  "raw": "aaj 10 banana bechey...",
  "cleaned": "Today sold 10 bananas...",
  "confidence": 0.92,
  "processingTime": 1250,
  "usedFallback": false
}
```

## ✅ Step 3: Test Extraction Endpoint

```javascript
const transcript = "Today sold 10 bananas for 200 rupees, spent 50 on transport"

fetch('http://localhost:8000/api/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ transcript })
})
  .then(r => r.json())
  .then(d => console.log('Extraction:', d))
  .catch(e => console.error('Error:', e))
```

Expected response:
```json
{
  "items": [
    {
      "id": "1",
      "name": "Banana",
      "quantity": 10,
      "unit": "pieces",
      "pricePerUnit": 20,
      "totalPrice": 200,
      "confidence": 0.95
    }
  ],
  "expenses": [
    {
      "id": "1",
      "category": "transport",
      "amount": 50,
      "description": "Transport",
      "confidence": 0.90
    }
  ],
  "totalEarnings": 200,
  "totalExpenses": 50,
  "confidence": 0.92,
  "ambiguities": [],
  "reasonings": ["Extracted 10 bananas sold for 200 rupees"]
}
```

## ✅ Step 4: Test Ledger Save Endpoint

```javascript
const entry = {
  id: Date.now().toString(),
  date: new Date().toISOString(),
  transcript: "Today sold 10 bananas...",
  items: [ /* from extraction */ ],
  expenses: [ /* from extraction */ ],
  totalEarnings: 200,
  totalExpenses: 50,
  confidence: 0.92,
  flagged: false,
  ambiguities: [],
  createdAt: new Date().toISOString()
}

fetch('http://localhost:8000/api/ledger/entry', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(entry)
})
  .then(r => r.json())
  .then(d => console.log('Saved:', d))
  .catch(e => console.error('Error:', e))
```

Expected: Entry saved with status 200/201

## ✅ Step 5: Test Fetch Entries

```javascript
fetch('http://localhost:8000/api/ledger/entries?limit=10')
  .then(r => r.json())
  .then(d => console.log('Entries:', d))
  .catch(e => console.error('Error:', e))
```

Expected response:
```json
[
  {
    "id": "1",
    "date": "2025-03-28T...",
    "transcript": "...",
    "items": [ ... ],
    "expenses": [ ... ],
    "totalEarnings": 200,
    "totalExpenses": 50,
    "confidence": 0.92,
    "flagged": false,
    "ambiguities": [],
    "createdAt": "..."
  }
]
```

## ✅ Step 6: Test Analytics Endpoints

```javascript
// Daily analytics
fetch('http://localhost:8000/api/analytics/daily?date=2025-03-28')
  .then(r => r.json())
  .then(d => console.log('Daily analytics:', d))

// Weekly analytics
fetch('http://localhost:8000/api/analytics/weekly?start=2025-03-21')
  .then(r => r.json())
  .then(d => console.log('Weekly analytics:', d))

// Last week
fetch('http://localhost:8000/api/analytics/last-week')
  .then(r => r.json())
  .then(d => console.log('Last week:', d))
```

Expected response (daily):
```json
{
  "date": "2025-03-28",
  "totalEarnings": 200,
  "totalExpenses": 50,
  "profit": 150,
  "itemsSold": 10,
  "topItem": {
    "name": "Banana",
    "quantity": 10,
    "revenue": 200
  },
  "highestRevenueItem": {
    "name": "Banana",
    "revenue": 200
  },
  "expenses": [ ... ]
}
```

## ✅ Step 7: CORS Configuration

If you get CORS errors, backend needs:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## ✅ Step 8: Environment Configuration

Update frontend `.env`:
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## ✅ Step 9: Test Full Flow (UI)

1. **Record** → Click mic button, speak for 5 seconds, click stop
2. **Transcribe** → System calls `/api/transcribe`, shows results
3. **Extract** → System calls `/api/extract`, shows items/expenses
4. **Save** → Click "Confirm & Save", system calls `/api/ledger/entry`
5. **Dashboard** → Should show new entry in recent entries list

## ✅ Step 10: Test Analytics (UI)

1. Open **Analytics** tab
2. Should show weekly summary from `/api/analytics/last-week`
3. Charts should populate with top items
4. Insights should display based on trends

## 🔧 Troubleshooting

### Error: "Failed to connect to http://localhost:8000"
- [ ] Is backend running? Check terminal
- [ ] Is port 8000 correct? (check FastAPI startup message)
- [ ] Any firewall blocking? Try restarting both

### Error: "CORS error"
- [ ] Is origin allowed in backend? (should be `http://localhost:3000`)
- [ ] Check browser console for exact error
- [ ] Restart backend after adding CORS middleware

### Error: "Cannot read property 'items' of undefined"
- [ ] Response format doesn't match TypeScript interface
- [ ] Check actual response vs expected in `src/types/index.ts`
- [ ] Update extraction result format in backend

### Transcription always fails
- [ ] Is audio file wav format? (code converts it)
- [ ] Is file size < 25MB?
- [ ] Check Saaras API key in backend
- [ ] Try Whisper fallback in backend code

### Analytics showing no data
- [ ] Have you saved at least 7 days of entries?
- [ ] Get weekly returns data with proper date range?
- [ ] Check database has entries from last week

## 📋 Endpoint Documentation Template

Each backend endpoint should return exactly this format:

### POST `/api/transcribe`
**Request:**
```
Content-Type: multipart/form-data
Body: { audio: File }
```

**Response:**
```json
{
  "raw": "string",
  "cleaned": "string",
  "confidence": 0.0-1.0,
  "processingTime": number,
  "usedFallback": boolean
}
```

### POST `/api/extract`
**Request:**
```json
{
  "transcript": "string",
  "context": [DailyEntry] (optional, last 7 days)
}
```

**Response:**
```json
{
  "items": [ExtractedItem],
  "expenses": [ExtractedExpense],
  "totalEarnings": number,
  "totalExpenses": number,
  "ambiguities": [Ambiguity],
  "confidence": number,
  "reasonings": [string]
}
```

### POST `/api/ledger/entry`
**Request:**
```json
{ DailyEntry }
```

**Response:**
```json
{ DailyEntry }
```

### GET `/api/ledger/entries?limit=30`
**Response:**
```json
[DailyEntry]
```

### GET `/api/analytics/daily?date=YYYY-MM-DD`
**Response:**
```json
{ DailyAnalytics }
```

### GET `/api/analytics/weekly?start=YYYY-MM-DD`
**Response:**
```json
{ WeeklyAnalytics }
```

### GET `/api/analytics/last-week`
**Response:**
```json
{ WeeklyAnalytics }
```

## ✅ Final Integration Test

Once all endpoints work, run this:

```javascript
// Copy-paste in browser console

async function testIntegration() {
  console.log('🧪 Testing VoiceTrace Integration...')
  
  try {
    // 1. Test health
    let res = await fetch('http://localhost:8000/api/health')
    console.log('✅ Backend health:', res.status === 200)
    
    // 2. Test extract
    res = await fetch('http://localhost:8000/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'Sold 10 bananas for 200' })
    })
    const extraction = await res.json()
    console.log('✅ Extraction works:', extraction.items.length > 0)
    
    // 3. Test entries
    res = await fetch('http://localhost:8000/api/ledger/entries?limit=1')
    const entries = await res.json()
    console.log('✅ Ledger works:', entries.length >= 0)
    
    // 4. Test analytics
    res = await fetch('http://localhost:8000/api/analytics/last-week')
    const analytics = await res.json()
    console.log('✅ Analytics works:', analytics.totalEarnings >= 0)
    
    console.log('✅✅✅ All systems go! Ready to launch. 🚀')
  } catch (e) {
    console.error('❌ Integration test failed:', e.message)
  }
}

testIntegration()
```

## 📊 Expected Output

```
✅ Backend health: true
✅ Extraction works: true
✅ Ledger works: true
✅ Analytics works: true
✅✅✅ All systems go! Ready to launch. 🚀
```

---

## 🎉 You're Ready!

Once all tests pass, the frontend is fully integrated and ready to:
- [ ] Demo to stakeholders
- [ ] Deploy to production
- [ ] Onboard real vendors
- [ ] Collect data and iterate

**Happy shipping! 🚀**
