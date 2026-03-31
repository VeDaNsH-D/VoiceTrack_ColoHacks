/**
 * Filecoin Audio Storage Service
 * Stores audio files on Filecoin using NFT.storage (IPFS backed)
 * Retrieves stored audio via IPFS gateway
 * 
 * Requirements:
 * - NFT_STORAGE_API_KEY in environment variables
 * OR
 * - WEB3_STORAGE_API_KEY in environment variables
 */

const axios = require("axios");
const FormData = require("form-data");

// Constants
const NFT_STORAGE_API = "https://api.nft.storage/upload";
const IPFS_GATEWAY = process.env.IPFS_GATEWAY_URL || "https://nft.storage/ipfs/";
const NFT_STORAGE_KEY = process.env.NFT_STORAGE_API_KEY;
const WEB3_STORAGE_KEY = process.env.WEB3_STORAGE_API_KEY;

/**
 * Upload audio buffer to Filecoin via NFT.storage
 * Returns IPFS CID for later retrieval
 * 
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {String} fileName - Original filename
 * @returns {Promise<{cid: string, gateway_url: string, storage_provider: string}>}
 */
async function uploadAudioToFilecoin(audioBuffer, fileName) {
  if (!audioBuffer || !Buffer.isBuffer(audioBuffer)) {
    throw new Error("Audio buffer is required and must be a Buffer");
  }

  if (!NFT_STORAGE_KEY && !WEB3_STORAGE_KEY) {
    throw new Error(
      "Filecoin storage not configured. Set NFT_STORAGE_API_KEY or WEB3_STORAGE_API_KEY in environment variables"
    );
  }

  // Try NFT.storage first (easier, doesn't require delegation)
  if (NFT_STORAGE_KEY) {
    return uploadToNFTStorage(audioBuffer, fileName);
  }

  // Fallback to Web3.storage (requires proper authentication)
  if (WEB3_STORAGE_KEY) {
    return uploadToWeb3Storage(audioBuffer, fileName);
  }
}

/**
 * Upload using NFT.storage API
 * Simpler API that doesn't require complex authentication
 */
async function uploadToNFTStorage(audioBuffer, fileName) {
  try {
    const form = new FormData();
    form.append("file", audioBuffer, {
      filename: fileName || `audio-${Date.now()}.webm`,
      contentType: "audio/webm",
    });

    const response = await axios.post(NFT_STORAGE_API, form, {
      headers: {
        Authorization: `Bearer ${NFT_STORAGE_KEY}`,
        ...form.getHeaders(),
      },
      timeout: 30000,
    });

    if (!response.data?.value?.cid) {
      throw new Error("Invalid response from NFT.storage: missing CID");
    }

    const cid = response.data.value.cid;
    const gatewayUrl = `${IPFS_GATEWAY}${cid}`;

    console.log(`[Filecoin] Audio uploaded. CID: ${cid}`);

    return {
      cid,
      gateway_url: gatewayUrl,
      storage_provider: "nft.storage",
      provider_response: {
        cid: response.data.value.cid,
        size: response.data.value.size,
        created: response.data.value.created,
      },
    };
  } catch (error) {
    console.error("[Filecoin] NFT.storage upload failed:", error.message);
    throw new Error(`Failed to upload audio to Filecoin: ${error.message}`);
  }
}

/**
 * Upload using Web3.storage API (newer client)
 * Requires proper authentication with delegation
 */
async function uploadToWeb3Storage(audioBuffer, fileName) {
  try {
    // For the newer @web3-storage/w3up-client, you would need to:
    // 1. Create a client
    // 2. Parse a delegation proof
    // 3. Create a connection
    // 4. Upload the file
    //
    // For now, return a placeholder - full implementation requires
    // setup of w3up delegation first

    console.warn(
      "[Filecoin] Web3.storage client requires additional setup. Use NFT_STORAGE_API_KEY instead."
    );

    throw new Error(
      "Web3.storage requires delegation setup. Please use NFT_STORAGE_API_KEY instead."
    );
  } catch (error) {
    console.error("[Filecoin] Web3.storage upload failed:", error.message);
    throw error;
  }
}

/**
 * Get IPFS gateway URL from CID
 * Used for retrieving stored audio
 * 
 * @param {String} cid - IPFS Content Identifier
 * @returns {String} Full gateway URL
 */
function getAudioGatewayUrl(cid) {
  if (!cid || typeof cid !== "string") {
    throw new Error("Valid CID is required");
  }

  return `${IPFS_GATEWAY}${cid}`;
}

/**
 * Verify audio is accessible via Filecoin
 * Makes a HEAD request to check if file is available
 * 
 * @param {String} cid - IPFS Content Identifier
 * @returns {Promise<boolean>}
 */
async function verifyAudioAccessibility(cid) {
  try {
    const url = getAudioGatewayUrl(cid);
    const response = await axios.head(url, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.warn(`[Filecoin] Audio verification failed for CID ${cid}:`, error.message);
    return false;
  }
}

/**
 * Parse Filecoin storage response and extract relevant data
 * 
 * @param {Object} storageResponse - Response from uploadAudioToFilecoin
 * @returns {Object} Normalized storage metadata
 */
function normalizeStorageResponse(storageResponse) {
  if (!storageResponse || typeof storageResponse !== "object") {
    return null;
  }

  return {
    cid: storageResponse.cid,
    gateway_url: storageResponse.gateway_url,
    storage_provider: storageResponse.storage_provider || "filecoin",
    stored_at: new Date().toISOString(),
    provider_response: storageResponse.provider_response || {},
  };
}

module.exports = {
  uploadAudioToFilecoin,
  getAudioGatewayUrl,
  verifyAudioAccessibility,
  normalizeStorageResponse,
  NFT_STORAGE_KEY,
  WEB3_STORAGE_KEY,
};
