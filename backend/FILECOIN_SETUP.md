# Filecoin Audio Storage Setup Guide

## Overview
Audio files from voice transactions are now automatically uploaded to **Filecoin** (via IPFS) for decentralized storage. Each audio file gets an immutable IPFS Content Identifier (CID) that's stored with the transaction.

---

## Setup Requirements

### 1. Get NFT.storage API Key (Recommended)
NFT.storage provides the easiest integration with Filecoin. No complex authentication required.

**Steps:**
1. Go to [nft.storage](https://nft.storage)
2. Sign in with GitHub or email
3. Go to your API Keys page
4. Copy your API key

**Add to `.env`:**
```env
NFT_STORAGE_API_KEY=your_api_key_here
```

### 2. Alternative: Web3.storage (Advanced)
If you prefer Web3.storage, you'll need to set up delegation first. This is more complex but provides direct w3up access.

**For now, use NFT.storage** - it's simpler and doesn't require delegation setup.

---

## Environment Variables

Add these to your `.env` file in the backend directory:

```env
# Filecoin/IPFS Configuration
NFT_STORAGE_API_KEY=your_nft_storage_api_key
IPFS_GATEWAY_URL=https://nft.storage/ipfs/

# Optional: Custom IPFS gateway (default: NFT.storage)
# IPFS_GATEWAY_URL=https://ipfs.io/ipfs/
# IPFS_GATEWAY_URL=https://gateway.pinata.cloud/ipfs/
```

---

## How It Works

### Audio Upload Flow
1. **User records audio** via the `/api/voice/process` endpoint
2. **Audio is transcribed** to extract transaction details
3. **Transaction is saved** to MongoDB
4. **Audio is uploaded to Filecoin** (NFT.storage) in the background
5. **IPFS CID is stored** with the transaction for later retrieval

### Storage Schema
Each transaction now includes:
```javascript
audioStorage: {
  cid: "QmXxxx...",           // IPFS Content Identifier
  gateway_url: "https://...",  // Full URL to access audio
  storage_provider: "nft.storage",
  stored_at: "2024-01-15T10:30:00Z",
  audio_metadata: {
    original_filename: "recording.webm",
    mime_type: "audio/webm",
    size_bytes: 25000
  }
}
```

---

## API Endpoints

### 1. Get Audio URL
```bash
GET /api/voice/audio/:transactionId
```

**Response:**
```json
{
  "transactionId": "507f1f77bcf86cd799439011",
  "audioUrl": "https://nft.storage/ipfs/QmXxxx...",
  "cid": "QmXxxx...",
  "storage_provider": "nft.storage",
  "stored_at": "2024-01-15T10:30:00Z",
  "audio_metadata": { ... }
}
```

**Redirect to audio:**
```bash
GET /api/voice/audio/:transactionId?redirect=true
# Returns 302 redirect to IPFS gateway
```

---

### 2. List All Stored Audio
```bash
GET /api/voice/audio/list?userId=xxx
```

**Response:**
```json
{
  "count": 5,
  "transactions": [
    {
      "transactionId": "507f1f77bcf86cd799439011",
      "rawText": "दो समोसे पच्चीस रुपये में बेचे",
      "audioUrl": "https://nft.storage/ipfs/QmXxxx...",
      "cid": "QmXxxx...",
      "sales_amount": 50,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### 3. Retry Audio Upload
If audio upload fails initially, retry later:
```bash
POST /api/voice/audio/retry-upload/:transactionId
Content-Type: multipart/form-data

file: <audio.webm>
```

---

## Error Handling

### If upload fails:
- Transaction is **still saved** (doesn't block workflow)
- Error is logged for debugging
- `audioStorage.cid` remains `null`
- User can retry later using the retry endpoint

### If API key is missing:
- Error: `"Filecoin storage not configured. Set NFT_STORAGE_API_KEY"`
- Transactions still work, but audio won't be stored
- Check `.env` file

---

## Verification

### Test Filecoin integration:
```bash
curl -X POST http://localhost:3000/api/voice/process \
  -F "audio=@recording.webm" \
  -F "userId=507f1f77bcf86cd799439011"
```

**Check response for:**
```json
{
  "audioStorage": {
    "cid": "QmXxxx...",
    "gateway_url": "https://nft.storage/ipfs/QmXxxx...",
    "storage_provider": "nft.storage"
  }
}
```

### Verify audio is accessible:
```bash
curl https://nft.storage/ipfs/QmXxxx... -I
# Should return 200 OK
```

---

## Cost

**NFT.storage:** Free for up to 150GB per month

**Filecoin storage:**
- One-time storage cost per file
- Automatic retrieval via IPFS
- Files stored indefinitely

---

## Troubleshooting

### "NFT_STORAGE_API_KEY not found"
- Check `.env` file exists in `backend/` directory
- Restart `npm run dev`

### Audio uploads are slow
- Normal: First upload may take 5-30 seconds
- NFT.storage queues uploads to Filecoin
- Subsequent retrieval via gateway is instant

### CID is null after upload
- Check backend logs for Filecoin errors
- Verify API key is valid
- Retry upload using `/api/voice/audio/retry-upload/:transactionId`

### Gateway returns 404
- IPFS node may not have file yet
- Wait 1-2 minutes and retry
- Files eventually propagate across network

---

## Advanced: Use Different IPFS Gateway

```env
# Option 1: Pinata (requires auth)
IPFS_GATEWAY_URL=https://gateway.pinata.cloud/ipfs/

# Option 2: IPFS public gateway
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/

# Option 3: Cloudflare (fast, reliable)
IPFS_GATEWAY_URL=https://cloudflare-ipfs.com/ipfs/
```

---

## Next Steps

1. ✅ Get NFT.storage API key
2. ✅ Add `NFT_STORAGE_API_KEY` to `.env`
3. ✅ Restart backend: `npm run dev`
4. ✅ Test upload via `/api/voice/process`
5. ✅ Verify audio via `/api/voice/audio/:transactionId`

Your audio is now backed by Filecoin! 🎉
