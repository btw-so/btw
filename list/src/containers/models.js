import { GoogleGenAI } from "@google/genai";
import Replicate from "replicate";

const providers = [
  {
    name: "OpenAI",
    icon: "ri-openai-fill",
  },
  {
    name: "Claude",
    icon: "ri-claude-fill",
  },
  {
    name: "Gemini",
    icon: "ri-gemini-fill",
  },
  {
    name: "Mistral",
    icon: "ri-mixtral-fill",
  },
  {
    name: "Replicate",
    icon: "ri-brain-line", // Placeholder icon, replace with a better one if available
  },
  {
    name: "DeepSeek",
    icon: "ri-robot-2-line", // Placeholder icon
  },
];

const availableModels = [
  {
    provider: "Claude",
    output: "text",
    input: ["text", "image"],
    reasoning: false,
    model: "claude-3-5-haiku-latest",
    displayName: "3.5 Haiku",
    max_input_tokens: 200000,
    max_output_tokens: 8192,
    max_total_tokens: 200000 + 8192,
    input_token_price: 0.8,
    output_token_price: 4,
  },
  {
    provider: "Claude",
    output: "text",
    input: ["text", "image"],
    reasoning: false,
    model: "claude-3-7-sonnet-latest",
    displayName: "3.7 Sonnet",
    max_input_tokens: 200000,
    max_output_tokens: 64000,
    max_total_tokens: 200000 + 64000,
    input_token_price: 3,
    output_token_price: 15,
  },
  {
    provider: "Claude",
    output: "text",
    input: ["text", "image"],
    reasoning: false,
    model: "claude-opus-4-20250514",
    displayName: "Opus 4",
    max_input_tokens: 200000,
    max_output_tokens: 32000,
    max_total_tokens: 200000 + 32000,
    input_token_price: 15,
    output_token_price: 75,
  },
  {
    provider: "Claude",
    output: "text",
    input: ["text", "image"],
    reasoning: false,
    model: "claude-sonnet-4-20250514",
    displayName: "Sonnet 4",
    max_input_tokens: 200000,
    max_output_tokens: 64000,
    max_total_tokens: 200000 + 64000,
    input_token_price: 3,
    output_token_price: 15,
  },
  {
    provider: "Claude",
    output: "text",
    input: ["text", "image"],
    grounding: true,
    model: "claude-3-7-sonnet-latest",
    displayName: "3.7 Sonnet Search Grounding",
    max_input_tokens: 200000,
    max_output_tokens: 64000,
    max_total_tokens: 200000 + 64000,
    input_token_price: 3,
    output_token_price: 15,
  },
  {
    provider: "Claude",
    output: "text",
    input: ["text", "image"],
    reasoning: true,
    model: "claude-3-7-sonnet-latest",
    displayName: "3.7 Sonnet Reasoning",
    max_input_tokens: 200000,
    max_output_tokens: 64000,
    max_total_tokens: 200000 + 64000,
    input_token_price: 3,
    output_token_price: 15,
  },
  {
    provider: "Claude",
    output: "text",
    input: ["text", "image"],
    reasoning: true,
    model: "claude-opus-4-20250514",
    displayName: "Opus 4 Reasoning",
    max_input_tokens: 200000,
    max_output_tokens: 32000,
    max_total_tokens: 200000 + 32000,
    input_token_price: 15,
    output_token_price: 75,
  },
  {
    provider: "Claude",
    output: "text",
    input: ["text", "image"],
    reasoning: true,
    model: "claude-sonnet-4-20250514",
    displayName: "Sonnet 4 Reasoning",
    max_input_tokens: 200000,
    max_output_tokens: 64000,
    max_total_tokens: 200000 + 64000,
    input_token_price: 3,
    output_token_price: 15,
  },
  {
    provider: "OpenAI",
    output: "image",
    input: ["text", "image"],
    reasoning: false,
    model: "gpt-image-1",
    displayName: "GPT Image 1",
    max_input_tokens: 128000,
    max_output_tokens: 16000,
    max_total_tokens: 128000,
    input_token_price: 10,
    output_token_price: 40,
  },
  {
    provider: "OpenAI",
    output: "text",
    input: ["text", "image", "audio"],
    reasoning: true,
    model: "o1-mini",
    displayName: "o1 mini Reasoning",
    max_input_tokens: 128000,
    max_output_tokens: 16000,
    max_total_tokens: 128000,
    input_token_price: 0.4,
    output_token_price: 1.6,
  },
  {
    provider: "OpenAI",
    output: "text",
    input: ["text", "image"],
    reasoning: true,
    model: "o3",
    displayName: "o3 Reasoning",
    max_input_tokens: 200000,
    max_output_tokens: 100000,
    max_total_tokens: 200000 + 100000,
    input_token_price: 10,
    output_token_price: 40,
  },
  {
    provider: "OpenAI",
    output: "text",
    input: ["text", "image", "audio"],
    reasoning: true,
    model: "o3-mini",
    displayName: "o3 mini Reasoning",
    max_input_tokens: 200000,
    max_output_tokens: 100000,
    max_total_tokens: 200000 + 100000,
    input_token_price: 1.1,
    output_token_price: 4.4,
  },
  {
    provider: "OpenAI",
    output: "text",
    input: ["text", "image"],
    reasoning: true,
    model: "o4-mini",
    displayName: "o4 mini Reasoning",
    max_input_tokens: 200000,
    max_output_tokens: 100000,
    max_total_tokens: 200000 + 100000,
    input_token_price: 1.1,
    output_token_price: 4.4,
  },
  {
    provider: "OpenAI",
    output: "text",
    input: ["text", "image", "audio"],
    reasoning: false,
    model: "gpt-4.1",
    displayName: "4.1",
    max_input_tokens: 1047576,
    max_output_tokens: 32768,
    max_total_tokens: 1047576 + 32768,
    input_token_price: 2.0,
    output_token_price: 8,
  },
  {
    provider: "OpenAI",
    output: "text",
    input: ["text", "image", "audio"],
    reasoning: false,
    model: "gpt-4.1-mini",
    displayName: "4.1 Mini",
    max_input_tokens: 1000000,
    max_output_tokens: 64000,
    max_total_tokens: 1000000,
    input_token_price: 0.4,
    output_token_price: 1.6,
  },
  {
    provider: "OpenAI",
    output: "text",
    input: ["text", "image"],
    reasoning: false,
    model: "gpt-4o",
    displayName: "4o",
    max_input_tokens: 128000,
    max_output_tokens: 16384,
    max_total_tokens: 128000 + 16384,
    input_token_price: 2.5,
    output_token_price: 10,
  },
  {
    provider: "OpenAI",
    output: "text",
    input: ["text", "image", "audio"],
    reasoning: false,
    model: "gpt-4o-mini",
    displayName: "4o Mini",
    max_input_tokens: 128000,
    max_output_tokens: 16000,
    max_total_tokens: 128000,
    input_token_price: 0.15,
    output_token_price: 0.6,
  },
  {
    provider: "OpenAI",
    output: "text",
    input: ["text"],
    reasoning: false,
    model: "gpt-4o-search-preview",
    displayName: "4.1 Search Grounding",
    max_input_tokens: 128000,
    max_output_tokens: 16384,
    max_total_tokens: 128000 + 16384,
    input_token_price: 2.5,
    output_token_price: 10,
  },
  {
    provider: "Gemini",
    output: "text",
    input: ["text", "image", "audio"],
    reasoning: false,
    model: "gemini-2.0-flash",
    displayName: "2.0 Flash",
    max_input_tokens: 1048576,
    max_output_tokens: 8192,
    max_total_tokens: 1048576 + 8192,
    input_token_price: 0.1,
    output_token_price: 0.4,
  },
  {
    provider: "Gemini",
    output: "text",
    input: ["text", "image"],
    reasoning: false,
    grounding: true,
    model: "gemini-2.0-flash",
    displayName: "2.0 Flash Search Grounding",
    max_input_tokens: 1048576,
    max_output_tokens: 8192,
    max_total_tokens: 1048576 + 8192,
    input_token_price: 35,
    output_token_price: 35,
  },
  {
    provider: "Gemini",
    output: "text",
    input: ["text", "image", "audio"],
    reasoning: false,
    model: "gemini-2.0-flash-lite",
    displayName: "2.0 Flash Lite",
    max_input_tokens: 1048576,
    max_output_tokens: 8192,
    max_total_tokens: 1048576 + 8192,
    input_token_price: 0.075,
    output_token_price: 0.3,
  },
  {
    provider: "Gemini",
    output: "text",
    input: ["text", "image", "audio"],
    reasoning: false,
    model: "gemini-2.5-flash-preview-05-20",
    displayName: "2.5 Flash",
    max_input_tokens: 1048576,
    max_output_tokens: 65536,
    max_total_tokens: 1048576 + 65536,
    input_token_price: 0.15,
    output_token_price: 0.6,
  },
  {
    provider: "Gemini",
    output: "text",
    input: ["text", "image", "audio"],
    reasoning: true,
    model: "gemini-2.5-flash-preview-05-20",
    displayName: "2.5 Flash Reasoning",
    max_input_tokens: 1048576,
    max_output_tokens: 65536,
    max_total_tokens: 1048576 + 65536,
    input_token_price: 0.15,
    output_token_price: 3.5,
  },
  {
    provider: "Gemini",
    output: "text",
    input: ["text", "image", "audio"],
    reasoning: true,
    model: "gemini-2.5-pro-preview-05-06",
    displayName: "2.5 Pro Reasoning",
    max_input_tokens: 1048576,
    max_output_tokens: 65536,
    max_total_tokens: 1048576 + 65536,
    input_token_price: 2.5,
    output_token_price: 15,
  },
  {
    provider: "Gemini",
    output: "image",
    input: ["text", "image"],
    reasoning: false,
    model: "imagen-3.0-generate-002",
    displayName: "Imagen 3.0",
    max_input_tokens: 1048576,
    max_output_tokens: 8192,
    max_total_tokens: 1048576 + 8192,
    input_token_price: 0.2,
    output_token_price: 0.8,
  },
  {
    provider: "Mistral",
    output: "text",
    input: ["text"],
    reasoning: false,
    model: "mistral-large-latest",
    displayName: "Mistral Large",
    max_input_tokens: 128000,
    max_output_tokens: 32000,
    max_total_tokens: 128000 + 32000,
    input_token_price: 2,
    output_token_price: 6,
  },
  {
    provider: "Mistral",
    output: "text",
    input: ["text", "image"],
    reasoning: false,
    model: "mistral-medium-latest",
    displayName: "Mistral Medium",
    max_input_tokens: 128000,
    max_output_tokens: 32000,
    max_total_tokens: 128000 + 32000,
    input_token_price: 0.4,
    output_token_price: 2.0,
  },
  {
    provider: "Mistral",
    output: "text",
    input: ["text", "image"],
    reasoning: false,
    model: "mistral-small-latest",
    displayName: "Mistral Small",
    max_input_tokens: 128000,
    max_output_tokens: 32000,
    max_total_tokens: 128000 + 32000,
    input_token_price: 0.1,
    output_token_price: 0.3,
  },
  {
    provider: "Mistral",
    output: "text",
    input: ["text", "image"],
    reasoning: false,
    model: "pixtral-large-latest",
    displayName: "Pixtral Large",
    max_input_tokens: 128000,
    max_output_tokens: 32000,
    max_total_tokens: 128000 + 32000,
    input_token_price: 2,
    output_token_price: 6,
  },
  {
    provider: "Mistral",
    output: "text",
    input: ["text"],
    reasoning: true,
    model: "magistral-medium-2506",
    displayName: "Magistral Medium (Reasoning)",
    max_input_tokens: 128000,
    max_output_tokens: 32000,
    max_total_tokens: 128000 + 32000,
    input_token_price: 0.4,
    output_token_price: 2.0,
  },
  {
    provider: "Mistral",
    output: "text",
    input: ["text"],
    reasoning: true,
    model: "magistral-small-2506",
    displayName: "Magistral Small (Reasoning)",
    max_input_tokens: 128000,
    max_output_tokens: 32000,
    max_total_tokens: 128000 + 32000,
    input_token_price: 0.4,
    output_token_price: 2.0,
  },
  {
    provider: "DeepSeek",
    output: "text",
    input: ["text"],
    reasoning: false,
    model: "deepseek-chat",
    displayName: "DeepSeek Chat",
    max_input_tokens: 64000,
    max_output_tokens: 8000,
    max_total_tokens: 64000 + 8000,
    input_token_price: 0.07, // cache hit, per 1M tokens
    output_token_price: 1.1, // per 1M tokens
  },
  {
    provider: "DeepSeek",
    output: "text",
    input: ["text"],
    reasoning: true,
    model: "deepseek-reasoner",
    displayName: "DeepSeek Reasoner",
    max_input_tokens: 64000,
    max_output_tokens: 64000,
    max_total_tokens: 64000 + 64000,
    input_token_price: 0.14, // cache hit, per 1M tokens
    output_token_price: 2.19, // per 1M tokens
  },
  // {
  //   provider: "Replicate",
  //   output: "image",
  //   input: ["text", "image"],
  //   reasoning: false,
  //   subprovider: "black-forest-labs",
  //   model: "flux-kontext-pro",
  //   displayName: "Flux Kontext Pro",
  //   max_input_tokens: 128000,
  //   max_output_tokens: 32000,
  //   max_total_tokens: 128000 + 32000,
  //   input_token_price: 2,
  //   output_token_price: 6,
  // }, ---> has a CORS issue
];

// --- Streaming Functions for OpenAI, Gemini, Claude ---

const formatMessagesForOpenAI = ({ messages, supportsImages, images }) => {
  let formatted = [];
  messages.forEach(({ images, content, role }) => {
    formatted.push({
      role,
      content: [
        {
          type: "text",
          text: content || "",
        },
        ...((supportsImages && images) || []).map((img) => ({
          type: "image_url",
          image_url: { url: img.dataUrl },
        })),
      ],
    });
  });
  return formatted;
};

// --- OpenAI Image Generation (gpt-image-1) ---
async function* generateOpenAIImage({
  prompt,
  images = [],
  apiKey,
  messages,
  onComplete,
  onError,
  model = "gpt-image-1",
}) {
  // if images is empty, check if there are any images in the messages
  // the last image message becomes the user added image to the images array
  if (images.length === 0) {
    // Find the most recent message with images by searching backwards
    const lastImageMessage = [...messages]
      .reverse()
      .find((m) => m.images && m.images.length > 0);
    if (lastImageMessage) {
      images = lastImageMessage.images;
    }
  }

  try {
    let response;
    // If images are attached, use the edits endpoint (multipart/form-data)
    if (images.length > 0) {
      const formData = new FormData();
      formData.append("model", model);
      images.forEach((img, idx) => {
        let fileOrBlob = img.file;
        if (!(fileOrBlob instanceof Blob)) {
          // Convert base64 to Blob
          const arr = img.dataUrl.split(",");
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          fileOrBlob = new Blob([u8arr], { type: mime });
        }
        formData.append("image[]", fileOrBlob, img.name || `image-${idx}.png`);
      });
      formData.append("prompt", prompt);
      response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });
    } else {
      // No images, use generations endpoint (application/json)
      response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt,
        }),
      });
    }
    if (!response.ok) {
      const errorText = await response.text();
      if (onError) onError(errorText || response.statusText);
      return;
    }
    const data = await response.json();
    // The result is in data.data[0].b64_json
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image returned");
    const dataUrl = `data:image/png;base64,${b64}`;
    if (onComplete) onComplete(true, dataUrl);
    return dataUrl;
  } catch (err) {
    if (onError) onError(err.message || String(err));
    throw err;
  }
}

async function* streamOpenAI({
  model,
  reasoning,
  grounding,
  messages,
  apiKey,
  onNewTokenOutput,
  onThinkingNewToken,
  onComplete,
  modelDetails,
  images = [],
}) {
  let completed = false;
  try {
    // If model supports images, format user message accordingly
    let formattedMessages = formatMessagesForOpenAI({
      messages,
      supportsImages: modelDetails.input.includes("image"),
    });
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        stream: true,
        response_format: { type: "text" },
        ...(reasoning && { reasoning_effort: "medium" }),
      }),
    });
    if (!response.ok)
      throw new Error("OpenAI API error: " + response.statusText);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.replace("data: ", "").trim();
          if (data === "[DONE]") {
            if (onComplete && !completed) {
              onComplete(true);
              completed = true;
            }
            return;
          }
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              if (onNewTokenOutput) onNewTokenOutput(content);
              yield content;
            }
          } catch (e) {
            // ignore parse errors
          }
        }
      }
    }
    if (onComplete && !completed) {
      onComplete(true);
      completed = true;
    }
  } catch (err) {
    if (onComplete && !completed) {
      onComplete(false, err.message || String(err));
      completed = true;
    }
    throw err;
  }
}

const formatMessagesForClaude = ({ messages, supportsImages, images }) => {
  let formatted = [];
  messages.forEach(({ images, content, role }) => {
    formatted.push({
      role,
      content: [
        {
          type: "text",
          text: content || "",
        },
        ...((supportsImages && images) || []).map((img) => ({
          type: "image",
          source: {
            type: "base64",
            media_type: img.mime,
            data: img.dataUrl.split(`data:${img.mime};base64,`)[1],
          },
        })),
      ],
    });
  });
  return formatted;
};

async function* streamClaude({
  model,
  reasoning,
  messages,
  grounding,
  apiKey,
  onNewTokenOutput,
  onThinkingNewToken,
  onComplete,
  modelDetails,
  images = [],
}) {
  let completed = false;
  try {
    const url = "https://api.anthropic.com/v1/messages";
    // If model supports images, format user message accordingly
    let formattedMessages = formatMessagesForClaude({
      messages,
      supportsImages: modelDetails.input.includes("image"),
    });
    const body = {
      model,
      messages: formattedMessages,
      stream: true,
      max_tokens: modelDetails.max_output_tokens,
    };
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      // Try to parse error body for more details
      let errorText = await response.text();
      let errorMsg = `${response.status} ${response.statusText}`;
      if (errorText) errorMsg += `\n${errorText}`;
      throw new Error(errorMsg);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6).trim();
        if (data === "[DONE]") {
          if (onComplete && !completed) {
            onComplete(true);
            completed = true;
          }
          return;
        }
        try {
          const json = JSON.parse(data);
          const content = json.delta?.text;
          if (content) {
            if (onNewTokenOutput) onNewTokenOutput(content);
            yield content;
          }
          if (json.delta?.thinking && onThinkingNewToken) {
            onThinkingNewToken(json.delta.thinking);
          }
        } catch (e) {
          // ignore parse errors
        }
      }
    }
    if (onComplete && !completed) {
      onComplete(true);
      completed = true;
    }
  } catch (err) {
    let errorMsg = err?.message || String(err);
    if (err?.stack) errorMsg += `\n${err.stack}`;
    if (onComplete && !completed) {
      onComplete(false, errorMsg);
      completed = true;
    }
    throw err;
  }
}

const formatMessagesForGemini = ({ messages, supportsImages, images }) => {
  let formatted = [];
  messages.forEach(({ images, content, role }) => {
    formatted.push({
      role: role === "user" ? "user" : "model",
      parts: [
        { text: content },
        ...((supportsImages && images) || []).map((img) => ({
          inlineData: {
            data: img.dataUrl.split(",")[1],
            mimeType: img.mime,
          },
        })),
      ],
    });
  });
  return formatted;
};

async function* streamGemini({
  model,
  reasoning,
  grounding,
  messages,
  apiKey,
  onNewTokenOutput,
  onThinkingNewToken,
  onComplete,
  modelDetails,
  images = [],
}) {
  try {
    const genai = new GoogleGenAI({
      apiKey: apiKey,
    });

    // If model supports images, format user message accordingly
    let formattedMessages = formatMessagesForGemini({
      messages,
      supportsImages: modelDetails.input.includes("image"),
    });
    const response = await genai.models.generateContentStream({
      model: model,
      contents: formattedMessages,
      config: {
        ...(reasoning && {
          thinkingConfig: {
            thinkingBudget: 16000,
            includeThoughts: true,
          },
        }),
        ...(grounding && {
          tools: [
            {
              googleSearch: {},
            },
          ],
        }),
      },
    });
    for await (const chunk of response) {
      for (const part of chunk.candidates[0].content.parts) {
        if (!part.text) {
          continue;
        } else if (part.thought) {
          if (onThinkingNewToken) onThinkingNewToken(part.text);
        } else {
          if (onNewTokenOutput) onNewTokenOutput(part.text);
          yield part.text;
        }
      }
    }

    if (onComplete) {
      onComplete(true);
    }
  } catch (err) {
    if (onComplete) {
      onComplete(false, err.message || String(err));
    }
  }
}

async function* generateGeminiImage({
  prompt,
  messages,
  images = [],
  apiKey,
  onComplete,
  onNewTokenOutput,
  onError,
  modelDetails,
  model = "imagen-3.0-generate-002",
}) {
  messages = formatMessagesForGemini({
    messages,
    supportsImages: modelDetails.input.includes("image"),
    images,
  });
  try {
    const genai = new GoogleGenAI({
      apiKey: apiKey,
    });
    console.log(
      "Available models in gemini",
      await genai.models.list({
        config: {
          pageSize: 200,
        },
      })
    );
    const response = await genai.models.generateImages({
      model: model,
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: "image/png",
      },
    });
    const { gcsUri, imageBytes, mimeType } =
      response.generatedImages?.[0]?.image;

    const base64Image = imageBytes
      ? `data:${mimeType};base64,${imageBytes}`
      : null;
    if (onComplete) onComplete(true, base64Image);
    yield base64Image;
  } catch (err) {
    if (onError) onError(err.message || String(err));
  }
}

const formatMessagesForMistral = ({ messages, supportsImages, images }) => {
  let formatted = [];
  messages.forEach(({ images, content, role }) => {
    formatted.push({
      role,
      content: [
        {
          type: "text",
          text: content || "",
        },
        ...((supportsImages && images) || []).map((img) => ({
          type: "image_url",
          image_url: img.dataUrl,
        })),
      ],
    });
  });
  return formatted;
};

async function* streamMistral({
  model,
  reasoning,
  grounding,
  messages,
  apiKey,
  onNewTokenOutput,
  onThinkingNewToken,
  onComplete,
  modelDetails,
  images = [],
}) {
  let completed = false;
  try {
    // If model supports images and images are present, format like OpenAI
    let formattedMessages = formatMessagesForMistral({
      messages,
      supportsImages: modelDetails.input.includes("image"),
    });

    const body = {
      model,
      messages: formattedMessages,
      stream: true,
      max_tokens: modelDetails.max_output_tokens,
    };
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      let errorText = await response.text();
      let errorMsg = `${response.status} ${response.statusText}`;
      if (errorText) errorMsg += `\n${errorText}`;
      throw new Error(errorMsg);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6).trim();
        if (data === "[DONE]") {
          if (onComplete && !completed) {
            onComplete(true);
            completed = true;
          }
          return;
        }
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) {
            if (onNewTokenOutput) onNewTokenOutput(content);
            yield content;
          }
        } catch (e) {
          // ignore parse errors
        }
      }
    }
    if (onComplete && !completed) {
      onComplete(true);
      completed = true;
    }
  } catch (err) {
    let errorMsg = err?.message || String(err);
    if (err?.stack) errorMsg += `\n${err.stack}`;
    if (onComplete && !completed) {
      onComplete(false, errorMsg);
      completed = true;
    }
    throw err;
  }
}

// --- Replicate Image Generation (Flux Kontext Pro) ---
async function* generateReplicateImage({
  prompt,
  images = [],
  apiKey,
  messages,
  onComplete,
  onError,
  model = "flux-kontext-pro",
  modelDetails,
}) {
  const subprovider = modelDetails.subprovider;
  try {
    // Find the last image in the messages if images is empty
    let inputImageUrl = "";
    if (images.length === 0 && messages && messages.length > 0) {
      const lastImageMessage = [...messages]
        .reverse()
        .find((m) => m.images && m.images.length > 0);
      if (lastImageMessage) {
        // Use the first image in the last message with images
        inputImageUrl =
          lastImageMessage.images[0].dataUrl ||
          lastImageMessage.images[0].url ||
          "";
      }
    } else if (images.length > 0) {
      inputImageUrl = images[0].dataUrl || images[0].url || "";
    }

    const replicate = new Replicate({
      auth: apiKey,
    });

    const [output] = await replicate.run(`${subprovider}/${model}`, {
      input: {
        prompt: prompt,
        input_image: inputImageUrl,
        output_format: "jpg",
      },
    });

    const imgUrl = output.url();
    let base64Image = await fetch(imgUrl);
    const buffer = await base64Image.arrayBuffer();
    base64Image = Buffer.from(buffer).toString("base64");

    if (onComplete) onComplete(true, base64Image);
    yield base64Image;
  } catch (err) {
    if (onError) onError(err.message || String(err));
    throw err;
  }
}

const formatMessagesForDeepSeek = ({ messages, supportsImages, images }) => {
  let formatted = [];
  messages.forEach(({ images, content, role }) => {
    formatted.push({
      role,
      content: content || "",
    });
  });
  return formatted;
};

// --- DeepSeek Streaming (OpenAI-compatible) ---
async function* streamDeepSeek({
  model,
  reasoning,
  grounding,
  messages,
  apiKey,
  onNewTokenOutput,
  onThinkingNewToken,
  onComplete,
  modelDetails,
  images = [],
}) {
  let completed = false;
  try {
    let formattedMessages = formatMessagesForDeepSeek({
      messages,
      supportsImages: false, // DeepSeek does not support images
    });
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        stream: true,
        response_format: { type: "text" },
      }),
    });
    if (!response.ok)
      throw new Error("DeepSeek API error: " + response.statusText);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.replace("data: ", "").trim();
          if (data === "[DONE]") {
            if (onComplete && !completed) {
              onComplete(true);
              completed = true;
            }
            return;
          }
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            const reasoning_content =
              json.choices?.[0]?.delta?.reasoning_content;
            if (content) {
              if (onNewTokenOutput) onNewTokenOutput(content);
              yield content;
            }
            if (reasoning_content) {
              if (onThinkingNewToken) onThinkingNewToken(reasoning_content);
              yield reasoning_content;
            }
          } catch (e) {
            // ignore parse errors
          }
        }
      }
    }
    if (onComplete && !completed) {
      onComplete(true);
      completed = true;
    }
  } catch (err) {
    if (onComplete && !completed) {
      onComplete(false, err.message || String(err));
      completed = true;
    }
    throw err;
  }
}

export {
  providers,
  availableModels,
  streamOpenAI,
  streamClaude,
  streamGemini,
  streamMistral,
  streamDeepSeek,
};
