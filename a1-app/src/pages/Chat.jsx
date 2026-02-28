import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { sendMessage, getTasks, getTaskMessages } from "../api";
import ChatMessage from "../components/ChatMessage";
import ChatInput from "../components/ChatInput";
import TaskList from "../components/TaskList";
import FileExplorer from "../components/FileExplorer";
import toast from "react-hot-toast";

export default function Chat() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const [tasks, setTasks] = useState([]);
    const [activeTaskId, setActiveTaskId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [sending, setSending] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [view, setView] = useState("chat"); // chat | files
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        try {
            const res = await getTasks();
            if (res.success) {
                setTasks(res.data.tasks);
            }
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login", { replace: true });
            }
        }
    };

    useEffect(() => {
        if (activeTaskId) {
            loadMessages(activeTaskId);
        }
    }, [activeTaskId]);

    const loadMessages = async (taskId) => {
        setLoadingMessages(true);
        try {
            const res = await getTaskMessages(taskId);
            if (res.success) {
                setMessages(res.data.messages);
            }
        } catch {}
        setLoadingMessages(false);
    };

    const handleSend = useCallback(
        async (text) => {
            setMessages((prev) => [
                ...prev,
                { role: "user", text, timestamp: Date.now() },
            ]);
            setSending(true);

            try {
                const res = await sendMessage({
                    message: text,
                    taskId: activeTaskId,
                });

                if (res.success) {
                    const { taskId, taskName, response } = res.data;

                    if (!activeTaskId || activeTaskId !== taskId) {
                        setActiveTaskId(taskId);
                    }

                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "assistant",
                            text: response,
                            timestamp: Date.now(),
                        },
                    ]);

                    loadTasks();
                } else {
                    toast.error(res.error || "Failed to send message");
                }
            } catch (err) {
                if (err.response?.status === 401) {
                    logout();
                    navigate("/login", { replace: true });
                    return;
                }
                toast.error("Network error. Please try again.");
            }

            setSending(false);
        },
        [activeTaskId]
    );

    const handleNewChat = () => {
        setActiveTaskId(null);
        setMessages([]);
        setView("chat");
    };

    const handleSelectTask = (taskId) => {
        setActiveTaskId(taskId);
        setView("chat");
        if (window.innerWidth < 768) setSidebarOpen(false);
    };

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    const activeTaskName = activeTaskId
        ? tasks.find((t) => t.id === activeTaskId)?.name || "Chat"
        : "New chat";

    return (
        <div className="flex h-screen bg-white">
            {/* Sidebar */}
            <aside
                className={`${
                    sidebarOpen ? "w-64" : "w-0"
                } flex-shrink-0 border-r border-neutral-200 transition-all duration-200 overflow-hidden md:relative absolute z-20 bg-neutral-50 h-full`}
            >
                <div className="flex h-full w-64 flex-col">
                    <TaskList
                        tasks={tasks}
                        activeTaskId={activeTaskId}
                        onSelect={handleSelectTask}
                        onNewChat={handleNewChat}
                    />

                    {/* Footer */}
                    <div className="border-t border-neutral-200 px-4 py-3">
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                        >
                            <i className="ri-logout-box-r-line mr-2 text-xs" />
                            Sign out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main area */}
            <main className="flex flex-1 flex-col min-w-0">
                {/* Header */}
                <header className="flex items-center gap-3 border-b border-neutral-200 px-4 py-2.5">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100"
                    >
                        <i
                            className={`${sidebarOpen ? "ri-sidebar-fold-line" : "ri-sidebar-unfold-line"} text-lg`}
                        />
                    </button>

                    {/* View toggle */}
                    <div className="flex items-center gap-0.5 rounded-lg bg-neutral-100 p-0.5">
                        <button
                            onClick={() => setView("chat")}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                                view === "chat"
                                    ? "bg-white text-neutral-900 shadow-sm"
                                    : "text-neutral-500 hover:text-neutral-700"
                            }`}
                        >
                            Chat
                        </button>
                        <button
                            onClick={() => setView("files")}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                                view === "files"
                                    ? "bg-white text-neutral-900 shadow-sm"
                                    : "text-neutral-500 hover:text-neutral-700"
                            }`}
                        >
                            Files
                        </button>
                    </div>

                    {view === "chat" && (
                        <div className="flex-1 min-w-0">
                            <h1 className="text-sm font-medium text-neutral-900 truncate">
                                {activeTaskName}
                            </h1>
                        </div>
                    )}

                    {view === "files" && (
                        <div className="flex-1 min-w-0">
                            <h1 className="text-sm font-medium text-neutral-900 truncate">
                                Sandbox Files
                            </h1>
                        </div>
                    )}
                </header>

                {/* Content area */}
                {view === "chat" ? (
                    <>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-4">
                            <div className="mx-auto max-w-3xl">
                                {messages.length === 0 && !sending && (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100">
                                            <i className="ri-sparkling-2-fill text-xl text-neutral-400" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-neutral-900">
                                            How can I help?
                                        </h2>
                                        <p className="mt-1 text-sm text-neutral-500">
                                            Send a message to start a
                                            conversation.
                                        </p>
                                    </div>
                                )}

                                {loadingMessages && messages.length === 0 && (
                                    <div className="flex items-center justify-center py-20">
                                        <i className="ri-loader-4-line animate-spin text-2xl text-neutral-300" />
                                    </div>
                                )}

                                {messages.map((msg, i) => (
                                    <ChatMessage
                                        key={i}
                                        role={msg.role}
                                        text={msg.text}
                                    />
                                ))}

                                {sending && (
                                    <div className="flex justify-start mb-4">
                                        <div className="rounded-2xl rounded-bl-sm bg-neutral-100 px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0ms]" />
                                                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:150ms]" />
                                                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:300ms]" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* Input */}
                        <ChatInput onSend={handleSend} disabled={sending} />
                    </>
                ) : (
                    <FileExplorer />
                )}
            </main>

            {/* Sidebar backdrop on mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-10 bg-black/20 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}
