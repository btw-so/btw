import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatMessage({ role, text }) {
    const isUser = role === "user";

    return (
        <div
            className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
        >
            <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isUser
                        ? "bg-brand text-white rounded-br-md"
                        : "bg-gray-100 text-gray-900 rounded-bl-md"
                }`}
            >
                {isUser ? (
                    <p className="whitespace-pre-wrap">{text}</p>
                ) : (
                    <div className="prose-chat">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {text}
                        </ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    );
}
