const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

function ensureLeadingSlash(value) {
    if (!value) return "";
    return value.startsWith("/") ? value : `/${value}`;
}

function getTelegramFileUrl(token, filePath) {
    return `https://api.telegram.org/file/bot${token}/${filePath}`;
}

async function downloadTelegramVoiceBuffer(bot, token, voiceFileId) {
    const fileMeta = await bot.getFile(voiceFileId);
    const filePath = fileMeta?.file_path;

    if (!filePath) {
        throw new Error("Telegram file path not found");
    }

    const downloadUrl = getTelegramFileUrl(token, filePath);
    const response = await axios.get(downloadUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
    });

    return {
        buffer: Buffer.from(response.data),
        fileName: path.basename(filePath) || "voice.ogg",
        mimeType: "audio/ogg",
    };
}

async function transcribeWithGroq(audioBuffer, fileName, mimeType) {
    if (!process.env.GROQ_API_KEY) {
        return null;
    }

    const form = new FormData();
    form.append("model", process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo");
    form.append("file", audioBuffer, {
        filename: fileName,
        contentType: mimeType,
    });

    const response = await axios.post(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        form,
        {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            },
            timeout: 60000,
        }
    );

    return String(response?.data?.text || "").trim() || null;
}

async function transcribeWithOpenAI(audioBuffer, fileName, mimeType) {
    if (!process.env.OPENAI_API_KEY) {
        return null;
    }

    const form = new FormData();
    form.append("model", process.env.OPENAI_STT_MODEL || "whisper-1");
    form.append("file", audioBuffer, {
        filename: fileName,
        contentType: mimeType,
    });

    const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", form, {
        headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        timeout: 60000,
    });

    return String(response?.data?.text || "").trim() || null;
}

async function transcribeWithPythonService(audioBuffer, fileName, mimeType) {
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || process.env.STT_BASE_URL;
    if (!pythonServiceUrl) {
        return null;
    }

    const sttPath = ensureLeadingSlash(process.env.STT_PATH || "/stt");
    const sttUrl = `${pythonServiceUrl.replace(/\/$/, "")}${sttPath}`;

    const form = new FormData();
    form.append("file", audioBuffer, {
        filename: fileName,
        contentType: mimeType,
    });

    const response = await axios.post(sttUrl, form, {
        headers: form.getHeaders(),
        timeout: 60000,
    });

    const payload = response?.data?.success ? response.data.data : response.data;
    const text = payload?.text || payload?.final_text || payload?.message;
    return String(text || "").trim() || null;
}

async function speechToTextFromTelegramVoice({ bot, botToken, voiceFileId }) {
    const { buffer, fileName, mimeType } = await downloadTelegramVoiceBuffer(bot, botToken, voiceFileId);

    try {
        const groqText = await transcribeWithGroq(buffer, fileName, mimeType);
        if (groqText) {
            return groqText;
        }
    } catch (_) {
        // Try next provider.
    }

    try {
        const openAiText = await transcribeWithOpenAI(buffer, fileName, mimeType);
        if (openAiText) {
            return openAiText;
        }
    } catch (_) {
        // Try next provider.
    }

    try {
        const pythonText = await transcribeWithPythonService(buffer, fileName, mimeType);
        if (pythonText) {
            return pythonText;
        }
    } catch (_) {
        // Fail below.
    }

    throw new Error("Speech-to-text failed");
}

module.exports = {
    speechToTextFromTelegramVoice,
};
