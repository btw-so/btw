import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { sendMessage, getTasks, getTaskMessages } from "../api";
import ChatMessage from "../components/ChatMessage";
import ChatInput from "../components/ChatInput";
import TaskList from "../components/TaskList";
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
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    // Load tasks on mount
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

    // Load messages when active task changes
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
            // Optimistic: show user message immediately
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

                    // Update active task
                    if (!activeTaskId || activeTaskId !== taskId) {
                        setActiveTaskId(taskId);
                    }

                    // Add bot response
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "assistant",
                            text: response,
                            timestamp: Date.now(),
                        },
                    ]);

                    // Refresh task list
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
    };

    const handleSelectTask = (taskId) => {
        setActiveTaskId(taskId);
        // Close sidebar on mobile
        if (window.innerWidth < 768) setSidebarOpen(false);
    };

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    return (
        <div className="flex h-screen bg-white">
            {/* Sidebar */}
            <aside
                className={`${
                    sidebarOpen ? "w-72" : "w-0"
                } flex-shrink-0 border-r border-gray-100 transition-all duration-200 overflow-hidden md:relative absolute z-20 bg-white h-full`}
            >
                <div className="flex h-full w-72 flex-col">
                    <TaskList
                        tasks={tasks}
                        activeTaskId={activeTaskId}
                        onSelect={handleSelectTask}
                        onNewChat={handleNewChat}
                    />

                    {/* Footer */}
                    <div className="border-t border-gray-100 px-4 py-3">
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
                        >
                            <i className="ri-logout-box-r-line mr-2" />
                            Sign out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main chat area */}
            <main className="flex flex-1 flex-col min-w-0">
                {/* Chat header */}
                <header className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
                    >
                        <i
                            className={`${sidebarOpen ? "ri-sidebar-fold-line" : "ri-sidebar-unfold-line"} text-lg`}
                        />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-display text-sm font-semibold text-gray-900 truncate">
                            {activeTaskId
                                ? tasks.find((t) => t.id === activeTaskId)
                                      ?.name || "Chat"
                                : "New chat"}
                        </h1>
                    </div>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="mx-auto max-w-3xl">
                        {messages.length === 0 && !sending && (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
                                    <i className="ri-sparkling-2-fill text-2xl text-brand" />
                                </div>
                                <h2 className="font-display text-lg font-semibold text-gray-900">
                                    How can I help?
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Send a message to start a conversation.
                                </p>
                            </div>
                        )}

                        {loadingMessages && messages.length === 0 && (
                            <div className="flex items-center justify-center py-20">
                                <i className="ri-loader-4-line animate-spin text-2xl text-gray-300" />
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
                            <div className="flex justify-start mb-3">
                                <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                                        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                                        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input */}
                <ChatInput onSend={handleSend} disabled={sending} />
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
