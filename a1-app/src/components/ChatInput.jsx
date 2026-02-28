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
        <div className="border-t border-neutral-200 bg-white px-4 py-3">
            <div className="mx-auto flex max-w-3xl items-end gap-2">
                <textarea
                    ref={textareaRef}
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm outline-none transition-all placeholder-neutral-400 focus:border-neutral-400 focus:bg-white focus:ring-1 focus:ring-neutral-900/5"
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
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white transition-all hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <i className="ri-arrow-up-line text-base" />
                </button>
            </div>
        </div>
    );
}
