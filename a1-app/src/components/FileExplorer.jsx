import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    listSandboxDirectory,
    readSandboxFile,
    fetchSandboxRawBlob,
    downloadSandboxPath,
} from "../api";

const IMAGE_EXTENSIONS = new Set([
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico",
]);

const AUDIO_EXTENSIONS = new Set([
    ".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".webm",
]);

const KNOWN_TEXT_EXTENSIONS = new Set([
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".py", ".rb", ".go", ".rs", ".java", ".kt", ".scala", ".swift",
    ".c", ".cpp", ".cc", ".h", ".hpp", ".cs", ".php", ".lua",
    ".html", ".htm", ".css", ".scss", ".sass", ".less",
    ".vue", ".svelte", ".astro",
    ".json", ".yaml", ".yml", ".toml", ".xml", ".ini", ".conf", ".cfg",
    ".env", ".properties",
    ".sh", ".bash", ".zsh", ".fish", ".ps1", ".bat",
    ".txt", ".log", ".csv", ".tsv", ".rst", ".tex",
    ".dockerfile", ".gitignore", ".editorconfig", ".prettierrc",
    ".eslintrc", ".babelrc", ".npmrc", ".makefile", ".cmake",
    ".graphql", ".gql", ".proto", ".sql",
    ".lock", ".sum",
]);

const KNOWN_TEXT_FILENAMES = new Set([
    "Makefile", "Dockerfile", "Containerfile", "Procfile",
    "Gemfile", "Rakefile", "Brewfile",
    "LICENSE", "LICENCE", "CHANGELOG", "AUTHORS",
    "README", "INSTALL", "TODO", "NOTES",
    ".gitignore", ".dockerignore", ".env",
]);

function getFileCategory(filePath) {
    const name = filePath.split("/").pop() || "";
    const ext = name.includes(".")
        ? "." + name.split(".").pop().toLowerCase()
        : "";

    if (/\.(md|mdx|markdown)$/i.test(name)) return "markdown";
    if (IMAGE_EXTENSIONS.has(ext)) return "image";
    if (AUDIO_EXTENSIONS.has(ext)) return "audio";
    if (KNOWN_TEXT_EXTENSIONS.has(ext)) return "text";
    if (KNOWN_TEXT_FILENAMES.has(name)) return "text";
    if (name.startsWith(".") && ext && !IMAGE_EXTENSIONS.has(ext) && !AUDIO_EXTENSIONS.has(ext)) return "text";
    if (!ext) return "text";
    return "binary";
}

function getLanguageHint(filePath) {
    const ext = ("." + (filePath.split(".").pop() || "")).toLowerCase();
    const map = {
        ".ts": "TypeScript", ".tsx": "TSX", ".js": "JavaScript", ".jsx": "JSX",
        ".py": "Python", ".rb": "Ruby", ".go": "Go", ".rs": "Rust",
        ".java": "Java", ".kt": "Kotlin", ".swift": "Swift",
        ".c": "C", ".cpp": "C++", ".h": "C Header", ".cs": "C#",
        ".html": "HTML", ".css": "CSS", ".scss": "SCSS",
        ".json": "JSON", ".yaml": "YAML", ".yml": "YAML", ".toml": "TOML", ".xml": "XML",
        ".sh": "Shell", ".bash": "Bash", ".sql": "SQL",
        ".graphql": "GraphQL", ".proto": "Protobuf",
        ".dockerfile": "Dockerfile",
    };
    return map[ext] || "";
}

export default function FileExplorer() {
    const [columns, setColumns] = useState([]);
    const [selectedPath, setSelectedPath] = useState(null);
    const [selectedType, setSelectedType] = useState(null);
    const [error, setError] = useState(null);
    const scrollContainerRef = useRef(null);

    // Download state
    const [downloadingPath, setDownloadingPath] = useState(null);

    // Preview state
    const [previewContent, setPreviewContent] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState(null);
    const [mediaBlobUrl, setMediaBlobUrl] = useState(null);
    const [showRawMarkdown, setShowRawMarkdown] = useState(false);

    const loadDirectory = useCallback(async (dirPath) => {
        try {
            const res = await listSandboxDirectory(dirPath);
            if (res.success) {
                return { entries: res.data.entries, resolvedPath: res.data.path };
            }
            return null;
        } catch {
            return null;
        }
    }, []);

    // Load initial directory
    useEffect(() => {
        const init = async () => {
            setColumns([{ path: "/root", entries: [], loading: true, error: null, selectedEntry: null }]);

            const result = await loadDirectory("/root");
            if (result) {
                setColumns([{
                    path: result.resolvedPath,
                    entries: result.entries,
                    loading: false,
                    error: null,
                    selectedEntry: null,
                }]);
            } else {
                setColumns([{
                    path: "/root",
                    entries: [],
                    loading: false,
                    error: "Sandbox not available",
                    selectedEntry: null,
                }]);
                setError("Could not connect to sandbox. Make sure you have an active Pro subscription.");
            }
        };
        init();
    }, [loadDirectory]);

    // Auto-scroll right when new columns added
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
    }, [columns.length]);

    // Load media blob for images and audio
    useEffect(() => {
        if (!selectedPath || selectedType !== "file") {
            setMediaBlobUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
            });
            return;
        }

        const category = getFileCategory(selectedPath);
        if (category !== "image" && category !== "audio") return;

        let cancelled = false;
        setPreviewLoading(true);
        setPreviewError(null);
        fetchSandboxRawBlob(selectedPath)
            .then((url) => {
                if (!cancelled) {
                    setMediaBlobUrl(url);
                    setPreviewLoading(false);
                } else {
                    URL.revokeObjectURL(url);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setPreviewError(err.message || "Failed to load media");
                    setPreviewLoading(false);
                }
            });
        return () => { cancelled = true; };
    }, [selectedPath, selectedType]);

    // Load text content for preview
    useEffect(() => {
        if (!selectedPath || selectedType !== "file") {
            setPreviewContent(null);
            setPreviewError(null);
            setShowRawMarkdown(false);
            return;
        }

        setShowRawMarkdown(false);
        const category = getFileCategory(selectedPath);

        if (category === "image" || category === "audio" || category === "binary") {
            setPreviewContent(null);
            setPreviewError(null);
            setPreviewLoading(false);
            return;
        }

        let cancelled = false;
        const loadPreview = async () => {
            setPreviewLoading(true);
            setPreviewError(null);
            try {
                const res = await readSandboxFile(selectedPath);
                if (!cancelled && res.success) {
                    setPreviewContent(res.data.content);
                } else if (!cancelled) {
                    setPreviewError(res.error || "Failed to load file");
                }
            } catch (err) {
                if (!cancelled) {
                    setPreviewError(err.message || "Failed to load file");
                }
            } finally {
                if (!cancelled) setPreviewLoading(false);
            }
        };
        loadPreview();
        return () => { cancelled = true; };
    }, [selectedPath, selectedType]);

    const handleEntryClick = async (columnIndex, entry) => {
        setColumns((prev) => {
            const updated = prev.slice(0, columnIndex + 1);
            updated[columnIndex] = { ...updated[columnIndex], selectedEntry: entry.name };
            return updated;
        });

        setSelectedPath(entry.path);
        setSelectedType(entry.type);

        if (entry.type === "directory") {
            setColumns((prev) => {
                const updated = prev.slice(0, columnIndex + 1);
                updated[columnIndex] = { ...updated[columnIndex], selectedEntry: entry.name };
                return [...updated, { path: entry.path, entries: [], loading: true, error: null, selectedEntry: null }];
            });

            const result = await loadDirectory(entry.path);
            setColumns((prev) => {
                if (prev.length < columnIndex + 2) return prev;
                const updated = [...prev];
                const targetIdx = columnIndex + 1;
                if (updated[targetIdx]?.path === entry.path) {
                    updated[targetIdx] = result
                        ? { path: result.resolvedPath, entries: result.entries, loading: false, error: null, selectedEntry: null }
                        : { path: entry.path, entries: [], loading: false, error: "Failed to load", selectedEntry: null };
                }
                return updated;
            });
        }
    };

    const handleDownload = (targetPath) => {
        setDownloadingPath(targetPath);
        downloadSandboxPath(targetPath)
            .catch(() => {})
            .finally(() => setDownloadingPath(null));
    };

    const fileCategory = selectedPath ? getFileCategory(selectedPath) : null;
    const showPreview = selectedPath && selectedType === "file";

    const renderPreviewContent = () => {
        if (!selectedPath || !fileCategory) return null;

        if (previewLoading) {
            return (
                <div className="flex items-center justify-center h-32">
                    <i className="ri-loader-4-line animate-spin text-xl text-neutral-400" />
                </div>
            );
        }

        if (previewError) {
            return <div className="text-sm text-red-600">{previewError}</div>;
        }

        if (fileCategory === "image" && mediaBlobUrl) {
            return (
                <div className="flex items-center justify-center p-4">
                    <img
                        src={mediaBlobUrl}
                        alt={selectedPath.split("/").pop() || "Image"}
                        className="max-w-full max-h-[60vh] object-contain rounded"
                    />
                </div>
            );
        }

        if (fileCategory === "audio" && mediaBlobUrl) {
            return (
                <div className="flex flex-col items-center justify-center gap-3 p-4">
                    <i className="ri-music-2-line text-3xl text-neutral-400" />
                    <audio controls src={mediaBlobUrl} className="w-full max-w-md">
                        Your browser does not support the audio element.
                    </audio>
                </div>
            );
        }

        if (fileCategory === "binary") {
            return (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-neutral-400">
                    <i className="ri-file-line text-3xl" />
                    <span className="text-sm">Binary file — cannot preview</span>
                </div>
            );
        }

        if (fileCategory === "markdown" && previewContent !== null) {
            if (showRawMarkdown) {
                return renderCodeLines(previewContent);
            }
            return (
                <div className="prose-chat text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {previewContent}
                    </ReactMarkdown>
                </div>
            );
        }

        if (previewContent !== null) {
            return renderCodeLines(previewContent);
        }

        return null;
    };

    const renderCodeLines = (content) => {
        const lines = content.split("\n");
        const gutterWidth = String(lines.length).length;
        return (
            <div className="text-sm font-mono overflow-x-auto">
                <table className="border-collapse w-full">
                    <tbody>
                        {lines.map((line, i) => (
                            <tr key={i} className="hover:bg-neutral-50">
                                <td
                                    className="select-none text-right pr-3 pl-2 text-neutral-400 align-top"
                                    style={{ minWidth: `${gutterWidth + 2}ch` }}
                                >
                                    {i + 1}
                                </td>
                                <td className="whitespace-pre pr-4">
                                    {line}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const previewLabel =
        fileCategory === "image" ? "Image"
        : fileCategory === "audio" ? "Audio"
        : fileCategory === "markdown" ? "Preview"
        : getLanguageHint(selectedPath || "") || "File";

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 mx-auto">
                        <i className="ri-folder-line text-xl text-neutral-400" />
                    </div>
                    <h3 className="text-sm font-medium text-neutral-900 mb-1">Sandbox unavailable</h3>
                    <p className="text-sm text-neutral-500 max-w-sm">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* Path bar */}
            <div className="px-4 py-2 border-b border-neutral-200 bg-neutral-50 flex items-center gap-2 min-h-[40px]">
                <i className="ri-folder-3-line text-neutral-400 text-sm" />
                <span className="text-sm text-neutral-600 truncate font-mono">
                    {selectedPath || columns[0]?.path || "/root"}
                </span>
                {selectedPath && (
                    <div className="ml-auto shrink-0">
                        {downloadingPath === selectedPath ? (
                            <i className="ri-loader-4-line animate-spin text-sm text-neutral-500" />
                        ) : (
                            <button
                                onClick={() => handleDownload(selectedPath)}
                                className="p-1.5 rounded border border-neutral-200 text-neutral-500 hover:bg-neutral-100 transition-colors"
                                title={selectedType === "directory" ? "Download as tar.gz" : "Download file"}
                            >
                                <i className="ri-download-2-line text-sm" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Main content: columns + preview */}
            <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
                {/* Columns container */}
                <div
                    ref={scrollContainerRef}
                    className={`flex overflow-x-auto overflow-y-hidden ${
                        showPreview
                            ? "w-full sm:w-1/2 shrink-0 sm:border-r border-b sm:border-b-0 border-neutral-200 max-h-[40vh] sm:max-h-none"
                            : "flex-1"
                    }`}
                >
                    <div className="flex h-full overflow-hidden min-w-max">
                        {columns.map((column, idx) => (
                            <div
                                key={`${column.path}-${idx}`}
                                className="w-56 flex flex-col border-r border-neutral-200 shrink-0"
                            >
                                {column.loading ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <i className="ri-loader-4-line animate-spin text-lg text-neutral-400" />
                                    </div>
                                ) : column.error ? (
                                    <div className="flex-1 flex items-center justify-center p-3">
                                        <span className="text-xs text-neutral-500">{column.error}</span>
                                    </div>
                                ) : column.entries.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center p-3">
                                        <span className="text-xs text-neutral-400">Empty folder</span>
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto">
                                        {column.entries.map((entry) => {
                                            const isSelected = column.selectedEntry === entry.name;
                                            const isDownloading = downloadingPath === entry.path;
                                            return (
                                                <div
                                                    key={entry.name}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => handleEntryClick(idx, entry)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") handleEntryClick(idx, entry);
                                                    }}
                                                    className={`group/entry w-full text-left px-3 py-1.5 flex items-center gap-2 text-sm cursor-pointer transition-colors ${
                                                        isSelected
                                                            ? "bg-neutral-900 text-white"
                                                            : "hover:bg-neutral-100 text-neutral-700"
                                                    }`}
                                                >
                                                    {entry.type === "directory" ? (
                                                        <i className={`ri-folder-fill text-xs shrink-0 ${isSelected ? "text-white" : "text-neutral-400"}`} />
                                                    ) : (
                                                        <i className={`ri-file-line text-xs shrink-0 ${isSelected ? "text-white" : "text-neutral-400"}`} />
                                                    )}
                                                    <span className="truncate">{entry.name}</span>
                                                    {entry.type === "directory" ? (
                                                        <>
                                                            {isDownloading ? (
                                                                <i className="ri-loader-4-line animate-spin text-xs ml-auto shrink-0" />
                                                            ) : (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDownload(entry.path);
                                                                    }}
                                                                    className={`ml-auto shrink-0 hidden sm:block opacity-0 group-hover/entry:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/10 ${
                                                                        isSelected ? "text-white" : "text-neutral-400 hover:text-neutral-600"
                                                                    }`}
                                                                    title="Download as tar.gz"
                                                                >
                                                                    <i className="ri-download-2-line text-xs" />
                                                                </button>
                                                            )}
                                                            <i className={`ri-arrow-right-s-line text-xs shrink-0 ${isSelected ? "text-white" : "text-neutral-400"}`} />
                                                        </>
                                                    ) : (
                                                        isDownloading ? (
                                                            <i className="ri-loader-4-line animate-spin text-xs ml-auto shrink-0" />
                                                        ) : (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDownload(entry.path);
                                                                }}
                                                                className={`ml-auto shrink-0 hidden sm:block opacity-0 group-hover/entry:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/10 ${
                                                                    isSelected ? "text-white" : "text-neutral-400 hover:text-neutral-600"
                                                                }`}
                                                                title="Download file"
                                                            >
                                                                <i className="ri-download-2-line text-xs" />
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* File preview panel */}
                {showPreview && (
                    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                        <div className="px-4 py-2 border-b border-neutral-200 bg-neutral-50 flex items-center gap-2">
                            <i className="ri-eye-line text-sm text-neutral-400 shrink-0" />
                            <span className="text-sm font-medium text-neutral-600">
                                {previewLabel}
                            </span>
                            <span className="text-xs text-neutral-400 truncate ml-1">
                                {selectedPath?.split("/").pop()}
                            </span>
                            <div className="flex items-center gap-2 ml-auto">
                                {fileCategory === "markdown" && (
                                    <button
                                        onClick={() => setShowRawMarkdown(!showRawMarkdown)}
                                        className="text-xs px-2 py-1 rounded border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                                    >
                                        {showRawMarkdown ? "Preview" : "Raw"}
                                    </button>
                                )}
                                {selectedPath && (
                                    downloadingPath === selectedPath ? (
                                        <i className="ri-loader-4-line animate-spin text-sm text-neutral-500" />
                                    ) : (
                                        <button
                                            onClick={() => handleDownload(selectedPath)}
                                            className="p-1.5 rounded border border-neutral-200 text-neutral-500 hover:bg-neutral-100 transition-colors cursor-pointer"
                                            title="Download file"
                                        >
                                            <i className="ri-download-2-line text-sm" />
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {renderPreviewContent()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
