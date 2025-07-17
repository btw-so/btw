import React, { useCallback, useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { useAppSelector } from "modules/hooks";
import toast from "react-hot-toast";
import AppWrapper from "./AppWraper";
import { GoogleGenAI, Modality } from "@google/genai";
import Replicate from "replicate";
import { selectIntelligence } from "selectors";
import {
  saveIntelligenceApiKeys,
  savePreferredTabs,
  changeSelectedNode,
} from "actions";
import Markdown from "react-markdown";
import MobileTabBar from "../components/MobileTabBar";
import sessionsDB from "../utils/sessionsDB";
import {
  availableModels,
  providers,
  streamOpenAI,
  streamClaude,
  streamGemini,
  streamMistral,
  streamDeepSeek,
} from "./models";


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


function IntelligenceTab({
  model,
  modelDisplayName,
  providerApiKeys,
  setProviderApiKeys,
  messages,
  setMessages,
  thinking,
  error,
  status,
  onClose,
  setZoomedImage,
}) {
  const modelDetails = availableModels.find(
    (m) => m.displayName === modelDisplayName
  );
  const provider = providers.find((p) => p.name === modelDetails?.provider);
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);

  const apiKeySaved = !!providerApiKeys[modelDetails?.provider];

  // --- Auto-scroll to bottom on new message ---
  const messagesContainerRef = useRef(null);
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      const shouldAutoScroll =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        100;
      if (shouldAutoScroll) {
        setTimeout(() => {
          container.scrollTop = container.scrollHeight;
        }, 50);
      }
    }
  }, [messages]);
  // -------------------------------------------

  useEffect(() => {
    if (apiKeySaved && !showApiKeyForm) setApiKey("");
  }, [apiKeySaved, showApiKeyForm]);

  return (
    <div className={cardClasses}>
      <div className="flex flex-col gap-2 h-full">
        <div className="flex items-center gap-2">
          <i className={`${provider?.icon} text-sm text-gray-500`}></i>
          <div className="text-md text-gray-700 font-semibold flex items-center gap-2">
            {modelDetails?.displayName}
          </div>
          <div className="text-xs text-gray-400 hidden md:block">
            {modelDetails?.model}
          </div>
          {apiKeySaved && !showApiKeyForm && (
            <>
              <button
                className="text-xs px-0.5 py-0.5 text-xs text-gray-400 hover:text-gray-900 transition"
                onClick={() => {
                  setApiKey(providerApiKeys[modelDetails?.provider]);
                  setShowApiKeyForm(true);
                }}
              >
                <i className="ri-equalizer-line"></i>
              </button>
            </>
          )}
          <button
            className="text-xs px-0.5 py-0.5 text-xs text-gray-400 hover:text-red-600 transition ml-auto"
            onClick={onClose}
            title="Close tab"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>
        {(!apiKeySaved || showApiKeyForm) && (
          <div>
            <div className="flex flex-col gap-2">
              <div className="text-sm text-gray-500">
                Please enter your {modelDetails?.provider} API key to continue.
                The key will be saved in your browser.
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="password"
                  className="grow px-3 bg-transparent py-1.5 text-sm rounded-md border border-gray-200 focus:border-gray-200 focus:ring-0 focus:outline-none transition"
                  placeholder={`${modelDetails?.provider} API Key`}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!apiKey) {
                        toast.error("Please enter an API key");
                        return;
                      }
                      const newKeys = { ...providerApiKeys };
                      newKeys[modelDetails?.provider] = apiKey;
                      setProviderApiKeys(newKeys);
                      setShowApiKeyForm(false);
                      toast.success(`${modelDetails?.provider} API key saved`);
                    }}
                    className="px-3 w-fit bg-gray-900 text-white py-1 text-sm rounded-md border border-gray-200 focus:border-gray-900 focus:outline-none transition"
                  >
                    Save
                  </button>
                  {apiKeySaved && (
                    <button
                      onClick={() => setShowApiKeyForm(false)}
                      className="px-3 w-fit bg-gray-200 text-gray-700 py-1 text-sm rounded-md border border-gray-200 focus:border-gray-900 focus:outline-none transition"
                    >
                      Hide
                    </button>
                  )}
                </div>
              </div>
            </div>{" "}
          </div>
        )}
        {/* Messages area */}
        <div
          className="mt-4 flex-1 flex flex-col gap-2 rounded p-2 overflow-y-auto"
          ref={messagesContainerRef}
        >
          {messages && messages.length > 0 ? (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`text-sm ${
                  msg.role === "user" ? "text-gray-500" : "text-gray-900"
                }`}
              >
                <span className="font-semibold mr-1">
                  {msg.role === "user" ? "You:" : "AI:"}
                </span>
                {msg.role === "user" ? (
                  <span className={"whitespace-pre-line"}>{msg.content}</span>
                ) : (
                  <span className={"prose-sm prose"}>
                    <Markdown>{msg.content}</Markdown>
                  </span>
                )}
                {/* Show attached images if present (user or assistant) */}
                {msg.images &&
                  Array.isArray(msg.images) &&
                  msg.images.length > 0 && (
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {msg.images.map((img, i) => (
                        <img
                          key={i}
                          src={img.dataUrl}
                          alt={img.name || `image-${i}`}
                          className="w-16 h-16 object-cover rounded border border-gray-200 cursor-pointer"
                          onClick={() => setZoomedImage(img.dataUrl)}
                        />
                      ))}
                    </div>
                  )}
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-400 hidden">No messages yet.</div>
          )}
          {/* Streaming/Thinking/Error indicators */}
          {status === "ongoing" && (
            <div className="flex items-center gap-2 mt-2">
              <span className="animate-spin inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full"></span>
              <span className="text-xs text-gray-500">Streaming...</span>
            </div>
          )}
          {thinking && (
            <div className="text-xs italic text-purple-700 whitespace-pre-line">
              <Markdown>{thinking}</Markdown>
            </div>
          )}
          {error && (
            <div className="text-xs text-red-600 font-semibold">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}

const cardClasses =
  "bg-gray-50 w-[calc(100%-2rem)] md:min-w-[600px] md:max-w-[600px] shrink-0 grow h-full overflow-hidden rounded-lg border border-gray-200 p-5 transition";

const ModelSelector = ({ onSelect }) => {
  const [search, setSearch] = useState("");
  const filteredModels = availableModels.filter((model) => {
    const q = search.toLowerCase();
    return (
      model.provider.toLowerCase().includes(q) ||
      model.model.toLowerCase().includes(q) ||
      model.displayName.toLowerCase().includes(q)
    );
  });

  return (
    <div className={cardClasses} style={{ maxHeight: "100%" }}>
      <h1 className="text-md font-semibold mb-4">
        Select the models you want to use.
      </h1>
      <div className="mb-4">
        <input
          type="text"
          className="grow px-3 bg-transparent w-full py-1.5 text-sm rounded-md border border-gray-200 focus:border-gray-200 focus:ring-0 focus:outline-none transition"
          placeholder="Search models"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="h-full overflow-y-auto">
        <div className="flex flex-wrap gap-5 pb-32 mt-2 overflow-y-auto">
          {filteredModels.map((model) => (
            <div
              key={`${model.model}-${model.provider}-${model.displayName}`}
              className="bg-gray-50 flex gap-2 h-fit rounded-lg border border-gray-200 p-4 cursor-pointer shadow-sm hover:border-gray-900 hover:shadow-lg transition w-[calc(100%-0.625rem)] md:w-[calc(50%-0.625rem)]"
              onClick={() => onSelect(model)}
            >
              <div className="grow shrink-0">
                <div className="font-semibold text-md mb-1">
                  {model.displayName}
                </div>
                <div className="text-sm text-gray-500">
                  <div>
                    Input:{" "}
                    <span className="">
                      ${model.input_token_price.toFixed(2)}
                    </span>
                    /1K
                  </div>
                  <div>
                    Output:{" "}
                    <span className="">
                      ${model.output_token_price.toFixed(2)}
                    </span>
                    /1K
                  </div>
                </div>
              </div>
              <div>
                <span>
                  <i
                    className={`$${
                      providers.find(
                        (provider) => provider.name === model.provider
                      ).icon
                    }`}
                  />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const tabIdGenerator = () => {
  return Math.random().toString(36).substring(2, 15);
};

function IntelligenceContainer(props) {
  const [tabs, setTabs] = useState([]); // No default tab
  const [inputValue, setInputValue] = useState("");
  const dispatch = useDispatch();
  const { apiKeys: providerApiKeys, preferredTabs } =
    useAppSelector(selectIntelligence);

  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [sessionsPage, setSessionsPage] = useState(0);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [currentSessionName, setCurrentSessionName] = useState("");
  const [currentSessionCreatedAt, setCurrentSessionCreatedAt] = useState(null);
  const [generatingTitle, setGeneratingTitle] = useState(false);

  // Helper: get model details by model name
  const getModelDetails = (modelName) => {
    console.log("modelName", modelName);
    return availableModels.find((m) => m.displayName === modelName);
  };

  // Helper: get provider for a model
  const getProvider = (modelName) => {
    const details = getModelDetails(modelName);
    return details ? details.provider : null;
  };

  // Helper: get API key for a model
  const getApiKey = (modelName) => {
    const provider = getProvider(modelName);
    return providerApiKeys[provider];
  };

  // Helper: check if any tab is ongoing
  const anyTabOngoing = tabs.some((tab) => tab.status === "ongoing");

  const [initializedTabs, setInitializedTabs] = useState(false);
  useEffect(() => {
    if (!initializedTabs && preferredTabs && preferredTabs.length > 0) {
      const initialTabs = preferredTabs
        .map((displayName) => {
          const model = availableModels.find(
            (m) => m.displayName === displayName
          );
          if (!model) return null;
          return {
            model: model.model,
            modelDisplayName: model.displayName,
            tabId: tabIdGenerator(),
            messages: [],
            status: "idle",
            thinking: "",
            error: null,
          };
        })
        .filter(Boolean);
      setTabs(initialTabs);
      setInitializedTabs(true);
    } else if (!initializedTabs) {
      setInitializedTabs(true); // Even if no preferredTabs, mark as initialized
    }
  }, [initializedTabs, preferredTabs]);
  // ---------------------------------------------------------

  // --- Save preferredTabs to DB whenever tabs change (after initial load) ---
  useEffect(() => {
    if (!initializedTabs) return;
    const displayNames = tabs.map((tab) => tab.modelDisplayName);
    dispatch(savePreferredTabs(displayNames));
  }, [tabs, initializedTabs, dispatch]);
  // -------------------------------------------------------------------------

  // Helper: Generate a short title for the session using the first message
  const generateSessionTitle = useCallback(
    async (userInput) => {
      if (!selectedSessionId || generatingTitle) return;
      // Only generate if currentSessionName is a date string (default)
      if (isNaN(Date.parse(currentSessionName))) return;
      // Use the first tab with an API key
      const firstTab = tabs.find((tab) => getApiKey(tab.modelDisplayName));
      if (!firstTab) return;
      const apiKey = getApiKey(firstTab.modelDisplayName);
      const modelDetails = getModelDetails(firstTab.modelDisplayName);
      const provider = modelDetails.provider;
      let streamFn;
      if (provider === "OpenAI") streamFn = streamOpenAI;
      else if (provider === "Gemini") streamFn = streamGemini;
      else if (provider === "Claude") streamFn = streamClaude;
      else if (provider === "Mistral") streamFn = streamMistral;
      else if (provider === "DeepSeek") streamFn = streamDeepSeek;
      else return;
      setGeneratingTitle(true);
      let title = "";
      try {
        const stream = streamFn({
          model: firstTab.model,
          reasoning: false,
          grounding: false,
          messages: [
            {
              role: "user",
              content: `Generate a short, descriptive title (max 4 words) for this conversation: "${userInput}". Respond with only the title, no punctuation at the end.`,
            },
          ],
          apiKey,
          onNewTokenOutput: (token) => {
            title += token;
          },
          onComplete: () => {},
          modelDetails,
        });
        for await (const _ of stream) {
        }
        title = title.trim().replace(/^["']|["']$/g, "");
        if (title && title.length > 2) {
          await sessionsDB.updateSession(selectedSessionId, { name: title });
          setCurrentSessionName(title);
          // Also update in sessions list
          setSessions((prev) =>
            prev.map((s) =>
              s.id === selectedSessionId ? { ...s, name: title } : s
            )
          );
        }
      } catch (e) {
        // ignore errors
      } finally {
        setGeneratingTitle(false);
      }
    },
    [
      selectedSessionId,
      currentSessionName,
      tabs,
      getApiKey,
      getModelDetails,
      setCurrentSessionName,
      setSessions,
      generatingTitle,
    ]
  );

  // Helper: Convert File to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Main send handler
  const handleSend = async () => {
    const userInput = inputValue.trim();
    if (!userInput) {
      return;
    }
    // If this is the first message in the session, generate a title
    if (tabs.every((tab) => tab.messages.length === 0)) {
      generateSessionTitle(userInput);
    }

    // Prepare images as base64
    let imagesBase64 = [];
    if (attachedImages.length > 0) {
      imagesBase64 = await Promise.all(
        attachedImages.map(async (img) => {
          return {
            dataUrl: img.dataUrl,
            file: img.file,
            mime: img.file.type,
            name: img.file.name,
          };
        })
      );
    }

    // For each tab with API key, send message and start streaming or image gen
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        const apiKey = getApiKey(tab.modelDisplayName);
        if (!apiKey) return tab;
        // Add user message and set status to ongoing, clear error/thinking
        return {
          ...tab,
          messages: [
            ...tab.messages,
            { role: "user", content: userInput, images: imagesBase64 },
            { role: "assistant", content: "", images: [] }, // Placeholder for streaming or image
          ],
          status: "ongoing",
          thinking: "",
          error: null,
        };
      })
    );
    setInputValue("");
    setAttachedImages([]);

    // For each tab with API key, start streaming or image gen
    tabs.forEach((tab) => {
      const apiKey = getApiKey(tab.modelDisplayName);
      if (!apiKey) return;
      const modelDetails = getModelDetails(tab.modelDisplayName);
      const provider = modelDetails.provider;
      const reasoning = !!modelDetails.reasoning;
      const grounding = !!modelDetails.grounding;
      const tabId = tab.tabId;
      // Prepare messages for streaming (after setTabs above, so use latest)
      const userMessage = {
        role: "user",
        content: userInput,
        images: imagesBase64,
      };
      const baseMessages = [...tab.messages, userMessage];

      // If this is an image generation model, use image gen API
      if (modelDetails.output === "image") {
        const imageGenFn =
          provider === "OpenAI"
            ? generateOpenAIImage
            : provider === "Gemini"
            ? generateGeminiImage
            : provider === "Replicate"
            ? generateReplicateImage
            : null;

        if (!imageGenFn) {
          setTabs((prevTabs) =>
            prevTabs.map((t) =>
              t.tabId === tabId
                ? {
                    ...t,
                    status: "idle",
                    thinking: "",
                    error: "Image generation not supported for this model",
                  }
                : t
            )
          );
          return;
        }

        (async () => {
          try {
            const imageGen = imageGenFn({
              prompt: userInput,
              images: imagesBase64,
              messages: baseMessages,
              modelDetails,
              apiKey,
              model: tab.model,
              onNewTokenOutput: (token) => {
                setTabs((prevTabs) =>
                  prevTabs.map((t) =>
                    t.tabId === tabId
                      ? { ...t, thinking: t.thinking + token }
                      : t
                  )
                );
              },
              onComplete: (success, imgUrl) => {
                if (!success) return;
                setTabs((prevTabs) =>
                  prevTabs.map((t) =>
                    t.tabId === tabId
                      ? {
                          ...t,
                          status: "idle",
                          thinking: "",
                          messages: t.messages.map((m, i) =>
                            i === t.messages.length - 1
                              ? {
                                  ...m,
                                  images: [
                                    {
                                      mime: imgUrl.split(";")[0].split(":")[1],
                                      name: "Generated Image",
                                      dataUrl: imgUrl,
                                    },
                                  ],
                                }
                              : m
                          ),
                        }
                      : t
                  )
                );
              },
              onError: (errMsg) => {
                setTabs((prevTabs) =>
                  prevTabs.map((t) =>
                    t.tabId === tabId
                      ? {
                          ...t,
                          status: "idle",
                          thinking: "",
                          error: errMsg,
                          messages: t.messages.map((m, i) =>
                            i === t.messages.length - 1
                              ? { ...m, content: `Error` }
                              : m
                          ),
                        }
                      : t
                  )
                );
              },
            });

            for await (const _ of imageGen) {
              // handled in onNewTokenOutput
            }
          } catch (err) {
            setTabs((prevTabs) =>
              prevTabs.map((t) =>
                t.tabId === tabId
                  ? {
                      ...t,
                      status: "idle",
                      thinking: "",
                      error: err.message || String(err),
                      messages: t.messages.map((m, i) =>
                        i === t.messages.length - 1
                          ? { ...m, content: `Error` }
                          : m
                      ),
                    }
                  : t
              )
            );
          }
        })();
        return;
      }

      // Streaming function for text models
      let streamFn;
      if (provider === "OpenAI") streamFn = streamOpenAI;
      else if (provider === "Gemini") streamFn = streamGemini;
      else if (provider === "Claude") streamFn = streamClaude;
      else if (provider === "Mistral") streamFn = streamMistral;
      else if (provider === "DeepSeek") streamFn = streamDeepSeek;
      else return;
      // Start streaming
      (async () => {
        let streamedContent = "";
        try {
          const stream = streamFn({
            model: tab.model,
            reasoning,
            grounding,
            messages: [...baseMessages],
            apiKey,
            onNewTokenOutput: (token) => {
              streamedContent += token;
              setTabs((prevTabs) =>
                prevTabs.map((t) =>
                  t.tabId === tabId
                    ? {
                        ...t,
                        messages: t.messages.map((m, i) =>
                          i === t.messages.length - 1
                            ? { ...m, content: streamedContent }
                            : m
                        ),
                      }
                    : t
                )
              );
            },
            onThinkingNewToken: (thinking) => {
              setTabs((prevTabs) =>
                prevTabs.map((t) =>
                  t.tabId === tabId
                    ? { ...t, thinking: t.thinking + thinking }
                    : t
                )
              );
            },
            onComplete: (success, errorMsg) => {
              setTabs((prevTabs) =>
                prevTabs.map((t) => {
                  if (t.tabId !== tabId) return t;
                  if (success) {
                    return { ...t, status: "idle", thinking: "" };
                  } else {
                    // Show error in last assistant message
                    return {
                      ...t,
                      status: "idle",
                      thinking: "",
                      error: errorMsg,
                      messages: t.messages.map((m, i) =>
                        i === t.messages.length - 1
                          ? { ...m, content: `Error` }
                          : m
                      ),
                    };
                  }
                })
              );
            },
            modelDetails,
            images: imagesBase64, // Pass images to stream function
          });
          for await (const _ of stream) {
            // handled in onNewTokenOutput
          }
        } catch (err) {
          setTabs((prevTabs) =>
            prevTabs.map((t) =>
              t.tabId === tabId
                ? {
                    ...t,
                    status: "idle",
                    thinking: "",
                    error: err.message || String(err),
                    messages: t.messages.map((m, i) =>
                      i === t.messages.length - 1
                        ? { ...m, content: `Error` }
                        : m
                    ),
                  }
                : t
            )
          );
        }
      })();
    });
  };

  const handleAddTab = (model) => {
    setTabs((prev) => [
      ...prev,
      {
        model: model.model,
        modelDisplayName: model.displayName,
        tabId: tabIdGenerator(),
        messages: [],
        status: "idle",
        thinking: "",
        error: null,
      },
    ]);
  };

  // Disable textarea if any tab is ongoing
  const textareaDisabled = anyTabOngoing;

  // Helper: Load sessions paginated
  const loadSessions = useCallback(async (page = 0) => {
    setSessionsLoading(true);
    const { sessions, total } = await sessionsDB.getSessionsPaginated({
      page,
      pageSize: 30,
    });
    setSessions(sessions);
    setSessionsTotal(total);
    setSessionsLoading(false);
  }, []);

  // Helper: Load a session by id and set tabs
  const loadSessionById = useCallback(async (id) => {
    const session = await sessionsDB.getSessionById(id);
    if (session) {
      setTabs(session.tabs || []);
      setSelectedSessionId(session.id);
      setCurrentSessionName(session.name);
      setCurrentSessionCreatedAt(session.createdAt);
    }
  }, []);

  // Helper: Create a new session
  const createNewSession = useCallback(async () => {
    const initialTabs = preferredTabs
      ? preferredTabs
          .map((displayName) => {
            const model = availableModels.find(
              (m) => m.displayName === displayName
            );
            if (!model) return null;
            return {
              model: model.model,
              modelDisplayName: model.displayName,
              tabId: tabIdGenerator(),
              messages: [],
              status: "idle",
              thinking: "",
              error: null,
            };
          })
          .filter(Boolean)
      : [];
    const name = new Date().toLocaleString();
    const id = await sessionsDB.addSession({ name, tabs: initialTabs });
    await loadSessions(0);
    await loadSessionById(id);
    setSessionsPage(0);
  }, [preferredTabs, loadSessions, loadSessionById]);

  // On mount: expire old sessions, load sessions, select most recent or create new
  useEffect(() => {
    (async () => {
      await sessionsDB.expireOldSessions();
      await loadSessions(0);
      setSessionsPage(0);
    })();
  }, [loadSessions]);

  // When sessions load, select most recent or create new if none
  useEffect(() => {
    if (!sessionsLoading && sessions.length > 0 && selectedSessionId == null) {
      // Select most recent
      loadSessionById(sessions[0].id);
    } else if (
      !sessionsLoading &&
      sessions.length === 0 &&
      selectedSessionId == null
    ) {
      // No sessions, create new
      createNewSession();
    }
  }, [
    sessions,
    sessionsLoading,
    selectedSessionId,
    loadSessionById,
    createNewSession,
  ]);

  // On tabs change, update session in DB
  useEffect(() => {
    if (selectedSessionId) {
      sessionsDB.updateSession(selectedSessionId, { tabs });
    }
  }, [tabs, selectedSessionId]);

  // Sidebar UI
  const Sidebar = () => (
    <div
      className={`sticky left-0 top-0 h-screen bg-transparent border-r border-gray-200 flex flex-col w-full md:flex md:w-64 z-20 ${
        showSidebarInMobile ? "flex" : "hidden"
      }`}
    >
      {/* Header */}
      <div
        className="px-1.5 py-1 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={() => {
          setShowSidebarInMobile(false);
          createNewSession();
        }}
      >
        <button className="px-5 py-3 md:px-2 md:py-1 flex gap-1 items-center">
          <span>
            <i className="ri-add-circle-fill text-sm"></i>
          </span>
          <span className="text-md md:text-sm">New chat</span>
        </button>
      </div>
      {/* Scrollable sessions list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {sessionsLoading ? (
          <div className="p-4 text-gray-400 text-sm">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-gray-400 text-sm">No sessions yet.</div>
        ) : (
          <ul>
            {sessions.map((session, idx) => (
              <li
                key={session.id}
                className={`px-6 py-3 md:px-4 md:py-1.5 cursor-pointer border-b border-gray-100 flex items-center justify-between group ${
                  selectedSessionId === session.id
                    ? "bg-gray-200 font-semibold"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => {
                  setShowSidebarInMobile(false);
                  loadSessionById(session.id);
                }}
              >
                <div className="truncate text-md md:text-sm flex-1">
                  {session.name}
                </div>
                <button
                  className="ml-2 text-xs px-0.5 py-0.5 text-gray-400 hover:text-red-600 transition opacity-0 group-hover:opacity-100"
                  title="Delete session"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await sessionsDB.deleteSession(session.id);
                    setSessions((prev) =>
                      prev.filter((s) => s.id !== session.id)
                    );
                    setSessionsTotal((prev) => prev - 1);
                    // If deleted session is selected, select next or clear
                    if (selectedSessionId === session.id) {
                      const remaining = sessions.filter(
                        (s) => s.id !== session.id
                      );
                      if (remaining.length > 0) {
                        loadSessionById(remaining[0].id);
                      } else {
                        setSelectedSessionId(null);
                        setTabs([]);
                        setCurrentSessionName("");
                        setCurrentSessionCreatedAt(null);
                      }
                    }
                  }}
                >
                  <i className="ri-close-line"></i>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Footer (pagination controls) */}
      <div className="p-2 border-t border-gray-100 flex items-center justify-between text-md md:text-xs bg-gray-100">
        <button
          className="px-5 py-3 md:px-2 md:py-1 rounded disabled:opacity-50"
          onClick={() => {
            if (sessionsPage > 0) {
              setSessionsPage(sessionsPage - 1);
              loadSessions(sessionsPage - 1);
            }
          }}
          disabled={sessionsPage === 0}
        >
          Prev
        </button>
        <span>
          Page {sessionsPage + 1} / {Math.max(1, Math.ceil(sessionsTotal / 30))}
        </span>
        <button
          className="px-5 py-3 md:px-2 md:py-1 rounded disabled:opacity-50"
          onClick={() => {
            if ((sessionsPage + 1) * 30 < sessionsTotal) {
              setSessionsPage(sessionsPage + 1);
              loadSessions(sessionsPage + 1);
            }
          }}
          disabled={(sessionsPage + 1) * 30 >= sessionsTotal}
        >
          Next
        </button>
      </div>
      <div className="h-24 block md:hidden"></div>
    </div>
  );

  const [showSidebarInMobile, setShowSidebarInMobile] = useState(false);
  // New state for attached images
  const [attachedImages, setAttachedImages] = useState([]); // {file, url}
  const textareaRef = useRef(null);

  // Auto-expand textarea up to 5 lines
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const maxRows = 5;
      const lineHeight = 24; // px, adjust if needed
      const maxHeight = maxRows * lineHeight;
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + "px";
    }
  }, [inputValue]);

  // Handle drag and drop for images
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );
    if (files.length > 0) {
      const newImages = await Promise.all(
        files.map(async (file) => {
          const dataUrl = await fileToBase64(file);
          return {
            file,
            url: URL.createObjectURL(file),
            dataUrl,
          };
        })
      );
      setAttachedImages((prev) => [...prev, ...newImages]);
    }
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle file picker for images
  const fileInputRef = useRef(null);
  const handleImageButtonClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };
  const handleFileInputChange = async (e) => {
    const files = Array.from(e.target.files).filter((file) =>
      file.type.startsWith("image/")
    );
    if (files.length > 0) {
      const newImages = await Promise.all(
        files.map(async (file) => {
          const dataUrl = await fileToBase64(file);
          return {
            file,
            url: URL.createObjectURL(file),
            dataUrl,
          };
        })
      );
      setAttachedImages((prev) => [...prev, ...newImages]);
    }
    e.target.value = "";
  };
  const handleRemoveImage = (idx) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const [zoomedImage, setZoomedImage] = useState(null);

  return (
    <AppWrapper {...props} isIntelligencePage={true}>
      <div className="flex h-full w-full">
        <Sidebar />
        <div
          className={`p-6 h-full w-screen lg:w-[calc(100vw-16rem-16rem)] flex-col pb-24 md:pb-6 overflow-x-auto md:flex ${
            showSidebarInMobile ? "hidden" : "flex"
          }`}
        >
          <div>
            <h1 className="text-lg font-bold">
              Chat with multiple AI models at once.
            </h1>
            <p className="text-sm text-gray-500 mb-4">
              All chats are saved to your device and stored for 30 days.
            </p>
          </div>
          <div className="flex gap-2 h-full w-full overflow-x-auto">
            {tabs.map((tab) => (
              <IntelligenceTab
                key={tab.tabId}
                model={tab.model}
                modelDisplayName={tab.modelDisplayName}
                providerApiKeys={providerApiKeys}
                setProviderApiKeys={(apiKeys) => {
                  dispatch(saveIntelligenceApiKeys(apiKeys));
                }}
                messages={tab.messages}
                setMessages={(messages) => {
                  setTabs((prev) =>
                    prev.map((t) =>
                      t.tabId === tab.tabId ? { ...t, messages } : t
                    )
                  );
                }}
                thinking={tab.thinking}
                error={tab.error}
                status={tab.status}
                onClose={() => {
                  setTabs((prev) => prev.filter((t) => t.tabId !== tab.tabId));
                }}
                setZoomedImage={setZoomedImage}
              />
            ))}
            <ModelSelector onSelect={handleAddTab} />
          </div>
          {/* Shared input below the tabs */}
          <div className="w-full flex flex-col items-end mt-4">
            <div
              className="w-full flex flex-col gap-2"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {/* Image previews */}
              {attachedImages.length > 0 && (
                <div className="flex gap-2 mb-1 flex-wrap">
                  {attachedImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img.url}
                        alt="preview"
                        className="w-12 h-12 object-cover rounded border border-gray-200 cursor-pointer"
                        onClick={() => setZoomedImage(img.dataUrl)}
                      />
                      <button
                        className="absolute -top-2 -right-2 bg-white rounded-full border border-gray-300 text-gray-500 hover:text-red-600 p-0.5 text-xs opacity-80 group-hover:opacity-100"
                        onClick={() => handleRemoveImage(idx)}
                        tabIndex={-1}
                        type="button"
                      >
                        <i className="ri-close-line"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="w-full flex items-center bg-gray-50 border border-gray-200 rounded-md px-2 md:px-3 py-1 md:py-2 min-h-[40px] md:min-h-[60px] relative">
                {/* Image upload button */}
                <button
                  className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200 transition"
                  onClick={handleImageButtonClick}
                  type="button"
                  tabIndex={-1}
                  title="Attach image"
                >
                  <i className="ri-image-2-line text-gray-700 text-lg"></i>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleFileInputChange}
                />
                <textarea
                  ref={textareaRef}
                  className="flex-1 bg-transparent border-none outline-none resize-none text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
                  rows={1}
                  placeholder="Send message to all AI models"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  style={{ minHeight: 32, maxHeight: 120, overflow: "auto" }}
                  disabled={textareaDisabled}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !textareaDisabled) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button
                  className="ml-4 flex items-center justify-center w-10 h-10 rounded-full  transition"
                  onClick={handleSend}
                  type="button"
                  disabled={textareaDisabled}
                >
                  <i className="ri-send-plane-fill text-gray-900 text-xl"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Mac-style dock at the bottom, same as FourThousandWeeks */}
      {!props.isSidebarOpen && (
        <MobileTabBar
          showHomeOption={true}
          showSearchOption={true}
          showSettingsOption={true}
          showChatsOption={true}
          isChatsSelected={showSidebarInMobile}
          onSelect={(tabName) => {
            if (tabName === "search") {
              props.showSidebar();
            } else if (tabName === "home") {
              props.hideSidebar();
              navigate("/list");
              dispatch(
                changeSelectedNode({
                  id: "home",
                })
              );
            } else if (tabName === "settings") {
              props.hideSidebar();
              navigate("/settings");
            } else if (tabName === "chats") {
              setShowSidebarInMobile(!showSidebarInMobile);
            }
          }}
        />
      )}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={zoomedImage}
              alt="Zoomed"
              className="max-w-[90vw] max-h-[90vh] rounded shadow-lg"
            />
            <button
              className="absolute top-2 right-2 bg-white bg-opacity-80 rounded-full p-1 text-gray-700 hover:text-red-600"
              onClick={() => setZoomedImage(null)}
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
        </div>
      )}
    </AppWrapper>
  );
}

export default IntelligenceContainer;
