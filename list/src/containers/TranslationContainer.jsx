import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "modules/hooks";
import toast from "react-hot-toast";
import AppWrapper from "./AppWraper";
import { selectIntelligence } from "selectors";
import {
  saveIntelligenceApiKeys,
  savePreferredTabs,
  changeSelectedNode,
} from "actions";
import Markdown from "react-markdown";
import MobileTabBar from "../components/MobileTabBar";
import { createSessionsDB } from "../utils/sessionsDB";
const sessionsDB = createSessionsDB("ChunkedLLMSessionsDB");
import {
  availableModels,
  providers,
  streamOpenAI,
  streamClaude,
  streamGemini,
  streamMistral,
  streamDeepSeek,
} from "./models";

// --- Card Classes ---
const cardClasses =
  "bg-gray-50 w-[calc(100%-2rem)] md:min-w-[600px] md:max-w-[600px] grow shrink-0 overflow-hidden rounded-lg border border-gray-200 p-5 transition";

// --- Model Selector ---
const ModelSelector = ({
  selectedModel,
  onSelect,
  providerApiKeys,
  apiKey,
  setApiKey,
  showApiKeyForm,
  setShowApiKeyForm,
  processing,
}) => {
  // By default, select the first model if none is selected
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [localApiKey, setLocalApiKey] = useState(apiKey || "");
  const firstModel = availableModels[0];

  // If no selectedModel, select the first one
  useEffect(() => {
    if (!selectedModel && firstModel) {
      onSelect(firstModel);
    }
    // eslint-disable-next-line
  }, [selectedModel, firstModel]);

  // Keep localApiKey in sync with apiKey prop
  useEffect(() => {
    setLocalApiKey(apiKey || "");
  }, [apiKey]);

  // Filtered models for dropdown
  const filteredModels = availableModels.filter((model) => {
    const q = search.toLowerCase();
    return (
      model.provider.toLowerCase().includes(q) ||
      model.model.toLowerCase().includes(q) ||
      model.displayName.toLowerCase().includes(q)
    );
  });

  const model = selectedModel || firstModel;

  // Handler for API key input change
  const handleApiKeyChange = (e) => {
    setLocalApiKey(e.target.value);
    if (typeof setApiKey === "function") {
      setApiKey(e.target.value);
    }
  };

  return (
    <div className="mb-2 relative">
      {/* Model Card */}
      <button
        type="button"
        className={`flex items-center justify-between w-full px-3 py-2 rounded border transition text-sm ${
          model
            ? "border-gray-900 bg-gray-200 font-semibold"
            : "border-gray-200 bg-gray-50 hover:border-gray-900"
        }`}
        onClick={() => setDropdownOpen((open) => !open)}
        disabled={processing}
        tabIndex={0}
      >
        <div className="flex items-center gap-2">
          <i
            className={`${
              providers.find((p) => p.name === model?.provider)?.icon
            } text-base`}
          ></i>
          <span>{model?.displayName}</span>
          <span className="text-xs text-gray-400">{model?.model}</span>
        </div>
        <span className="ml-2 text-gray-500">
          <i
            className={`ri-arrow-down-s-line transition-transform ${
              dropdownOpen ? "rotate-180" : ""
            }`}
          ></i>
        </span>
      </button>

      {/* Dropdown for model selection */}
      {dropdownOpen && (
        <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded shadow-lg max-h-80 overflow-y-auto">
          <div className="p-2">
            <input
              type="text"
              className="grow px-3 bg-transparent w-full py-1.5 text-sm rounded-md border border-gray-200 focus:border-gray-900 focus:ring-0 focus:outline-none transition mb-2"
              placeholder="Search models"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="flex flex-col">
              {filteredModels.map((m) => (
                <button
                  key={m.displayName}
                  className={`flex items-center gap-2 px-3 py-2 rounded border transition text-sm text-left ${
                    model && model.displayName === m.displayName
                      ? "border-gray-900 bg-gray-200 font-semibold"
                      : "border-gray-200 bg-gray-50 hover:border-gray-900"
                  }`}
                  onClick={() => {
                    onSelect(m);
                    setDropdownOpen(false);
                    setSearch("");
                  }}
                  type="button"
                  tabIndex={0}
                >
                  <i
                    className={`${
                      providers.find((p) => p.name === m.provider)?.icon
                    } text-base`}
                  ></i>
                  <span>{m.displayName}</span>
                  <span className="text-xs text-gray-400">{m.model}</span>
                </button>
              ))}
              {filteredModels.length === 0 && (
                <div className="text-xs text-gray-400 px-3 py-2">
                  No models found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* API Key entry below the model card */}
      {model && (!providerApiKeys?.[model.provider] || showApiKeyForm) && (
        <div className="flex flex-col gap-2 mt-3">
          <div className="text-sm text-gray-500 mt-2">
            Please enter your {model.provider} API key to continue. The key will
            be saved in your browser.
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              className="grow px-3 bg-transparent py-1.5 text-sm rounded-md border border-gray-200 focus:border-gray-200 focus:ring-0 focus:outline-none transition"
              placeholder={`${model.provider} API Key`}
              value={localApiKey}
              onChange={handleApiKeyChange}
              disabled={processing}
            />
            {providerApiKeys?.[model.provider] && (
              <button
                onClick={() => setShowApiKeyForm(false)}
                className="px-3 w-fit bg-gray-200 text-gray-700 py-1 text-sm rounded-md border border-gray-200 focus:border-gray-900 focus:outline-none transition"
                disabled={processing}
                type="button"
              >
                Hide
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main Chunked LLM Processor ---
function ChunkedLLMProcessor(props) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { apiKeys: providerApiKeys } = useAppSelector(selectIntelligence);

  // --- Session State ---
  const [sessions, setSessions] = useState([]);
  const [sessionsPage, setSessionsPage] = useState(0);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [currentSession, setCurrentSession] = useState(null); // {prompt, inputText, chunkSize, model, outputs, finalOutput}

  // --- Input State ---
  const [prompt, setPrompt] = useState("");
  const [inputText, setInputText] = useState("");
  const [chunkSize, setChunkSize] = useState(2000);
  const [selectedModel, setSelectedModel] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);

  // --- Add showChunkDropdown state for chunk size dropdown ---
  const [showChunkDropdown, setShowChunkDropdown] = useState(false);

  // --- Processing State ---
  const [chunks, setChunks] = useState([]); // array of input chunks
  const [outputs, setOutputs] = useState([]); // array of output for each chunk
  const [processing, setProcessing] = useState(false);
  const [finalOutput, setFinalOutput] = useState("");
  const [error, setError] = useState(null);

  // --- Ref to always have latest outputs ---
  const outputsRef = useRef(outputs);
  useEffect(() => {
    outputsRef.current = outputs;
  }, [outputs]);

  // --- Load Sessions ---
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

  // --- Load a session by id ---
  const loadSessionById = useCallback(async (id) => {
    const session = await sessionsDB.getSessionById(id);
    if (session) {
      setCurrentSession(session);
      setPrompt(session.prompt || "");
      setInputText(session.inputText || "");
      setChunkSize(session.chunkSize || 2000);
      setSelectedModel(session.model || null);
      setChunks(session.chunks || []);
      setOutputs(session.outputs || []);
      setFinalOutput(session.finalOutput || "");
      setError(null);
      setSelectedSessionId(session.id);
    }
  }, []);

  // --- Create a new session ---
  const createNewSession = useCallback(async () => {
    const name = new Date().toLocaleString();
    const sessionData = {
      name,
      prompt: "",
      inputText: "",
      chunkSize: 2000,
      model: null,
      chunks: [],
      outputs: [],
      finalOutput: "",
    };
    const id = await sessionsDB.addSession(sessionData);
    await loadSessions(0);
    await loadSessionById(id);
    setSessionsPage(0);
  }, [loadSessions, loadSessionById]);

  // --- On mount: load sessions ---
  useEffect(() => {
    (async () => {
      await sessionsDB.expireOldSessions();
      await loadSessions(0);
      setSessionsPage(0);
    })();
  }, [loadSessions]);

  // --- When sessions load, select most recent or create new if none ---
  useEffect(() => {
    if (!sessionsLoading && sessions.length > 0 && selectedSessionId == null) {
      loadSessionById(sessions[0].id);
    } else if (
      !sessionsLoading &&
      sessions.length === 0 &&
      selectedSessionId == null
    ) {
      createNewSession();
    }
  }, [
    sessions,
    sessionsLoading,
    selectedSessionId,
    loadSessionById,
    createNewSession,
  ]);

  // --- On session change, update session in DB ---
  useEffect(() => {
    if (selectedSessionId) {
      sessionsDB.updateSession(selectedSessionId, {
        prompt,
        inputText,
        chunkSize,
        model: selectedModel,
        chunks,
        outputs,
        finalOutput,
      });
    }
  }, [
    prompt,
    inputText,
    chunkSize,
    selectedModel,
    chunks,
    outputs,
    finalOutput,
    selectedSessionId,
  ]);

  // --- Sidebar UI ---
  const Sidebar = () => (
    <div
      className={`sticky left-0 top-0 h-screen bg-transparent border-r border-gray-200 flex flex-col w-full md:flex md:w-64 z-20`}
    >
      {/* Header */}
      <div
        className="px-1.5 py-1 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={() => {
          createNewSession();
        }}
      >
        <button className="px-5 py-3 md:px-2 md:py-1 flex gap-1 items-center">
          <span>
            <i className="ri-add-circle-fill text-sm"></i>
          </span>
          <span className="text-md md:text-sm">New job</span>
        </button>
      </div>
      {/* Scrollable sessions list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {sessionsLoading ? (
          <div className="p-4 text-gray-400 text-sm">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-gray-400 text-sm">No jobs yet.</div>
        ) : (
          <ul>
            {sessions.map((session) => (
              <li
                key={session.id}
                className={`px-6 py-3 md:px-4 md:py-1.5 cursor-pointer border-b border-gray-100 flex items-center justify-between group ${
                  selectedSessionId === session.id
                    ? "bg-gray-200 font-semibold"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => {
                  loadSessionById(session.id);
                }}
              >
                <div className="truncate text-md md:text-sm flex-1">
                  {session.name}
                </div>
                <button
                  className="ml-2 text-xs px-0.5 py-0.5 text-gray-400 hover:text-red-600 transition opacity-0 group-hover:opacity-100"
                  title="Delete job"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await sessionsDB.deleteSession(session.id);
                    setSessions((prev) =>
                      prev.filter((s) => s.id !== session.id)
                    );
                    setSessionsTotal((prev) => prev - 1);
                    if (selectedSessionId === session.id) {
                      const remaining = sessions.filter(
                        (s) => s.id !== session.id
                      );
                      if (remaining.length > 0) {
                        loadSessionById(remaining[0].id);
                      } else {
                        setSelectedSessionId(null);
                        setCurrentSession(null);
                        setPrompt("");
                        setInputText("");
                        setChunkSize(2000);
                        setSelectedModel(null);
                        setChunks([]);
                        setOutputs([]);
                        setFinalOutput("");
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

  // --- Chunking Logic ---
  // Utility to split text into paragraphs (empty line = new paragraph)
  function splitIntoParagraphs(text) {
    // Split by two or more newlines, trim, and filter out empty
    return text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  // Step 1: Greedy merge of smallest consecutive paragraphs
  function greedyMergeParagraphs(paragraphs, chunkSize) {
    let arr = paragraphs.slice();
    let merged = true;
    while (merged) {
      merged = false;
      let minSum = Infinity;
      let minIdx = -1;
      // Find two smallest consecutive paragraphs that can be merged
      for (let i = 0; i < arr.length - 1; i++) {
        const sum = arr[i].length + 1 + arr[i + 1].length; // +1 for newline
        if (sum <= chunkSize && sum < minSum) {
          minSum = sum;
          minIdx = i;
        }
      }
      if (minIdx !== -1) {
        // Merge them
        arr = [
          ...arr.slice(0, minIdx),
          arr[minIdx] + "\n" + arr[minIdx + 1],
          ...arr.slice(minIdx + 2),
        ];
        merged = true;
      }
    }
    return arr;
  }

  // Step 2: Map to { text, concatenator }
  function mapToChunksWithConcatenator(paragraphs) {
    return paragraphs.map((text, i) => ({
      text,
      concatenator: i === paragraphs.length - 1 ? "" : "\n",
    }));
  }

  // Step 3: Split oversized paragraphs into subchunks
  function splitOversizedChunks(chunks, chunkSize) {
    const result = [];
    for (const { text, concatenator } of chunks) {
      if (text.length <= chunkSize) {
        result.push({ text, concatenator });
      } else {
        // Split into subchunks
        let i = 0;
        while (i < text.length) {
          const isLast = i + chunkSize >= text.length;
          result.push({
            text: text.slice(i, i + chunkSize),
            concatenator: isLast ? concatenator : "",
          });
          i += chunkSize;
        }
      }
    }
    return result;
  }

  // --- Main advanced chunking function ---
  function advancedChunkText(inputText, chunkSize) {
    // Step 1: Paragraph split
    let paragraphs = splitIntoParagraphs(inputText);

    // Step 2: Greedy merge
    paragraphs = greedyMergeParagraphs(paragraphs, chunkSize);

    // Step 3: Map to { text, concatenator }
    let chunks = mapToChunksWithConcatenator(paragraphs);

    // Step 4: Split oversized
    chunks = splitOversizedChunks(chunks, chunkSize);

    return chunks;
  }

  // --- LLM Call Logic (reuse your streaming logic, now for all providers) ---
  async function callLLM({
    prompt,
    chunk,
    modelDetails,
    apiKey,
    onComplete,
    onNewTokenOutput,
  }) {
    prompt = `PROMPT: 
${prompt}
    
INPUT: 
${chunk}

OUTPUT: JSON
{
  "output": "<output>"
}`;

    if (!modelDetails) return "";
    try {
      const messages = [{ role: "user", content: prompt }];

      let streamFn;
      const provider = modelDetails.provider;
      if (provider === "OpenAI") streamFn = streamOpenAI;
      else if (provider === "Gemini") streamFn = streamGemini;
      else if (provider === "Claude") streamFn = streamClaude;
      else if (provider === "Mistral") streamFn = streamMistral;
      else if (provider === "DeepSeek") streamFn = streamDeepSeek;

      (async () => {
        const stream = streamFn({
          model: modelDetails.model,
          reasoning: !!modelDetails.reasoning,
          grounding: !!modelDetails.grounding,
          messages,
          apiKey,
          onNewTokenOutput,
          onComplete,
          modelDetails,
        });

        for await (const _ of stream) {
          // handled in onNewTokenOutput
        }
      })();

      return result;
    } catch (e) {
      return `Error: ${e.message || e}`;
    }
  }

  // --- Handle Submit ---
  const processChunkWithRetry = async ({ prompt, chunk, modelDetails, apiKey, maxRetries, chunkIndex }) => {
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let fullOutput = "";
      try {
        // Wait for streaming to finish
        await new Promise((resolve, reject) => {
          callLLM({
            prompt,
            chunk,
            modelDetails,
            apiKey,
            onNewTokenOutput: (token) => {
              fullOutput += token;
              // Update UI for this chunk as tokens arrive
              setOutputs((prev) => {
                const next = [...prev];
                next[chunkIndex] = (next[chunkIndex] || "") + token;
                return next;
              });
            },
            onComplete: (success, errorMsg) => {
              if (!success) {
                reject(new Error(errorMsg || "Stream error"));
              } else {
                resolve();
              }
            },
          });
        });

        // Try to parse output
        let parsed;
        let outputToParse = fullOutput;
        const firstLine = outputToParse.split("\n")[0];
        if (firstLine.startsWith("```") && outputToParse.length > firstLine.length) {
          outputToParse = outputToParse.slice(firstLine.length);
        }

        // if the last line is ``` then remove it
        if (outputToParse.endsWith("```")) {
          outputToParse = outputToParse.slice(0, -3);
        }

        parsed = JSON.parse(outputToParse);

        // Only update the outputs array in state with the final, parsed output
        setOutputs((prev) => {
          const next = [...prev];
          next[chunkIndex] = parsed.output;
          return next;
        });

        return parsed.output;
      } catch (err) {
        console.log("1: err", err);
        lastError = err;
        // Optionally: clear UI output for this chunk on retry
        setOutputs((prev) => {
          const next = [...prev];
          next[chunkIndex] = `Retrying... (attempt ${attempt})\nReason: ${err && err.message ? err.message : err}`;
          return next;
        });
      }
    }
    // After all retries, mark as error with reason
    setOutputs((prev) => {
      const next = [...prev];
      next[chunkIndex] = `Error: ${lastError && lastError.message ? lastError.message : lastError}`;
      return next;
    });
    throw lastError;
  };

  const handleSubmit = async () => {
    setError(null);
    if (!prompt.trim() || !inputText.trim() || !selectedModel) {
      setError("Please fill all fields and select a model.");
      return;
    }
    console.log("1: selectedModel", selectedModel);
    const provider = selectedModel.provider;
    const key = providerApiKeys[provider] || apiKey;
    if (!key) {
      setError(`Please enter your ${provider} API key.`);
      setShowApiKeyForm(true);
      return;
    }
    console.log("2: apiKey", apiKey);
    setProcessing(true);
    const inputChunks = advancedChunkText(inputText, chunkSize);
    setChunks(inputChunks);
    setOutputs(Array(inputChunks.length).fill(""));
    setFinalOutput("");
    console.log("3: inputChunks", inputChunks.length);
    // Save API key if entered
    if (apiKey && !providerApiKeys[provider]) {
      const newKeys = { ...providerApiKeys, [provider]: apiKey };
      dispatch(saveIntelligenceApiKeys(newKeys));
      setApiKey("");
      setShowApiKeyForm(false);
    }
    const maxRetries = 3;
    // Process all chunks in parallel with retries
    const chunkPromises = inputChunks.map((chunk, i) =>
      processChunkWithRetry({
        prompt,
        chunk: chunk.text,
        modelDetails: selectedModel,
        apiKey: key,
        maxRetries,
        chunkIndex: i,
      }).catch((err) => `Error: ${err && err.message ? err.message : err}`)
    );

    const allOutputs = await Promise.all(chunkPromises);
    setOutputs(allOutputs);

    // Stitching logic: add back the concatenators from inputChunks
    const stitched = allOutputs
      .map((o, i) => (o !== "Error" ? o + (inputChunks[i]?.concatenator || "") : ""))
      .join("");
    console.log("6: stitched", stitched, allOutputs);
    setFinalOutput(stitched);
    setProcessing(false);
    // Save session
    if (selectedSessionId) {
      sessionsDB.updateSession(selectedSessionId, {
        prompt,
        inputText,
        chunkSize,
        model: selectedModel,
        chunks: inputChunks,
        outputs: allOutputs,
        finalOutput: stitched,
      });
    }
  };

  // --- Main UI ---
  return (
    <AppWrapper {...props} isTranslationPage={true}>
      <div className="flex h-full w-full">
        <Sidebar />
        <div className="p-6 h-full w-screen lg:w-[calc(100vw-16rem-16rem)] flex-col pb-24 md:pb-6 overflow-x-auto md:flex">
          <div className={cardClasses + " flex flex-col gap-3 overflow-y-auto"}>
            <h1 className="text-lg font-bold mb-2">Chunked LLM Processor</h1>
            <p className="text-sm text-gray-500 mb-4">
              Enter a prompt and large input. The input will be split into
              chunks and processed by the selected LLM. Each chunk's output will
              be shown below, and the final stitched result at the end. All jobs
              are saved for 30 days.
            </p>
            <div className="flex flex-col gap-3 ">
              <label className="text-sm font-semibold">Prompt</label>
              <textarea
                className="w-full px-3 py-2 rounded border border-gray-200 focus:border-gray-900 focus:outline-none text-sm"
                rows={2}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter instructions/context for the LLM"
                disabled={processing}
              />
              <label className="text-sm font-semibold">Input Text</label>
              <textarea
                className="w-full px-3 py-2 rounded border border-gray-200 focus:border-gray-900 focus:outline-none text-sm"
                rows={6}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your large input text here"
                disabled={processing}
              />
              <div className="flex gap-2 flex-col">
                <label className="text-sm font-semibold">Chunk Size</label>
                <div className="relative w-32">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded border border-gray-200 bg-white text-sm focus:border-gray-900 focus:outline-none transition"
                    onClick={() => setShowChunkDropdown((v) => !v)}
                    disabled={processing}
                  >
                    <span>
                      {chunkSize === 1000 && "1K"}
                      {chunkSize === 2000 && "2K"}
                      {chunkSize === 3000 && "3K"}
                      {chunkSize === 4000 && "4K"}
                    </span>
                    <i className="ri-arrow-down-s-line text-gray-400 ml-2"></i>
                  </button>
                  {showChunkDropdown && !processing && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg">
                      {[1000, 2000, 3000, 4000].map((size) => (
                        <button
                          key={size}
                          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 ${
                            chunkSize === size
                              ? "bg-gray-100 font-semibold"
                              : ""
                          }`}
                          onClick={() => {
                            setChunkSize(size);
                            setShowChunkDropdown(false);
                          }}
                          type="button"
                        >
                          {size / 1000}K
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <label className="text-sm font-semibold">Model</label>
              <ModelSelector
                selectedModel={selectedModel}
                onSelect={(model) => {
                  setSelectedModel(model);
                  setShowApiKeyForm(false);
                }}
                providerApiKeys={providerApiKeys}
                apiKey={apiKey}
                setApiKey={setApiKey}
                showApiKeyForm={showApiKeyForm}
                setShowApiKeyForm={setShowApiKeyForm}
                processing={processing}
              />

              {error && (
                <div className="text-red-600 text-sm font-semibold">
                  {error}
                </div>
              )}
              <button
                className="mt-2 px-4 py-2 bg-gray-900 text-white rounded font-semibold disabled:opacity-50"
                onClick={handleSubmit}
                disabled={processing}
              >
                {processing ? "Processing..." : "Submit"}
              </button>
            </div>
          </div>
          {/* Chunks and Outputs */}
          {chunks.length > 0 && (
            <div className="mt-6 flex flex-col gap-4">
              <h2 className="text-md font-semibold mb-2">Chunk Outputs</h2>
              {chunks.map((chunk, idx) => (
                <div key={idx} className={cardClasses + " flex flex-col gap-2"}>
                  <div className="text-xs text-gray-400">Chunk {idx + 1}</div>
                  <div className="text-xs text-gray-500 whitespace-pre-line max-h-32 overflow-y-auto border rounded p-2 bg-gray-100">
                    {chunk.text}
                  </div>
                  <div className="text-xs text-gray-700 font-semibold mt-2">
                    Output:
                  </div>
                  <div className="text-sm whitespace-pre-line min-h-[2em]">
                    {outputs[idx] === "..." ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full"></span>{" "}
                        Processing...
                      </span>
                    ) : (
                      <Markdown>{outputs[idx]}</Markdown>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Final Output */}
          {finalOutput && (
            <div className="mt-6">
              <div className={cardClasses + " flex flex-col gap-2"}>
                <h2 className="text-md font-semibold mb-2">
                  Final Output (Stitched)
                </h2>
                <div className="text-sm whitespace-pre-line">
                  <Markdown>{finalOutput}</Markdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* MobileTabBar (reuse as in your code) */}
      {!props.isSidebarOpen && (
        <MobileTabBar
          showHomeOption={true}
          showSearchOption={true}
          showSettingsOption={true}
          showChatsOption={true}
          isChatsSelected={false}
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
              // No-op for now
            }
          }}
        />
      )}
    </AppWrapper>
  );
}

export default ChunkedLLMProcessor;
