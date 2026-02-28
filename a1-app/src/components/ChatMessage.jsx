import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatMessage({ role, text }) {
    const isUser = role === "user";

    return (
        <div
            className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
        >
            <div
                className={`max-w-[80%] text-sm leading-relaxed ${
                    isUser
                        ? "bg-neutral-900 text-white rounded-2xl rounded-br-sm px-4 py-2.5"
                        : "text-neutral-800"
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
