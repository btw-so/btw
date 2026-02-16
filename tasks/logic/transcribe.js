const fetch = require("node-fetch");
const FormData = require("form-data");

const PROVIDERS = [
    {
        name: "mistral",
        envKey: "MISTRAL_API_KEY",
        url: "https://api.mistral.ai/v1/audio/transcriptions",
        model: "voxtral-mini-latest",
    },
    {
        name: "openai",
        envKey: "OPENAI_API_KEY",
        url: "https://api.openai.com/v1/audio/transcriptions",
        model: "whisper-1",
    },
];

function getAvailableProviders() {
    return PROVIDERS.filter((p) => !!process.env[p.envKey]);
}

async function transcribeAudio({ fileBuffer, fileName }) {
    const providers = getAvailableProviders();

    if (providers.length === 0) {
        return { supported: false };
    }

    let lastError = null;

    for (const provider of providers) {
        try {
            console.log(`[Transcribe] Trying ${provider.name}...`);

            const form = new FormData();
            form.append("model", provider.model);
            form.append("file", fileBuffer, {
                filename: fileName,
                contentType: "audio/ogg",
            });

            const resp = await fetch(provider.url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env[provider.envKey]}`,
                    ...form.getHeaders(),
                },
                body: form,
            });

            const data = await resp.json();

            if (!resp.ok) {
                console.log(
                    `[Transcribe] ${provider.name} error:`,
                    JSON.stringify(data)
                );
                lastError = data.error?.message || JSON.stringify(data);
                continue;
            }

            const text = data.text;
            console.log(
                `[Transcribe] ${provider.name} success: "${(text || "").slice(0, 200)}"`
            );

            return { supported: true, text: text || "" };
        } catch (err) {
            console.log(`[Transcribe] ${provider.name} failed:`, err.message);
            lastError = err.message;
            continue;
        }
    }

    return { supported: true, text: null, error: lastError };
}

function isTranscriptionSupported() {
    return getAvailableProviders().length > 0;
}

module.exports = { transcribeAudio, isTranscriptionSupported };
