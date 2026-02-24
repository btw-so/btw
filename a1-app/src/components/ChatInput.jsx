import { useState, useRef, useEffect } from "react";

export default function ChatInput({ onSend, disabled }) {
    const [text, setText] = useState("");
    const textareaRef = useRef(null);

    useEffect(() => {
        if (!disabled) textareaRef.current?.focus();
    }, [disabled]);

    const adjustHeight = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 160) + "px";
    };

    const handleSubmit = () => {
        const trimmed = text.trim();
        if (!trimmed || disabled) return;
        onSend(trimmed);
        setText("");
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="border-t border-gray-100 bg-white px-4 py-3">
            <div className="mx-auto flex max-w-3xl items-end gap-2">
                <textarea
                    ref={textareaRef}
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-colors placeholder-gray-400 focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand/30"
                    placeholder="Message A1..."
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        adjustHeight();
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                />
                <button
                    onClick={handleSubmit}
                    disabled={!text.trim() || disabled}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <i className="ri-send-plane-2-fill text-base" />
                </button>
            </div>
        </div>
    );
}
