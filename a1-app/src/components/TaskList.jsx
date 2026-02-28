export default function TaskList({
    tasks,
    activeTaskId,
    onSelect,
    onNewChat,
}) {
    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900">
                        <span className="text-xs font-bold text-white tracking-tight">
                            A1
                        </span>
                    </div>
                </div>
                <button
                    onClick={onNewChat}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-700"
                    title="New chat"
                >
                    <i className="ri-add-line text-lg" />
                </button>
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto px-2 py-1">
                {tasks.length === 0 && (
                    <p className="px-2 py-8 text-center text-sm text-neutral-400">
                        No conversations yet
                    </p>
                )}
                {tasks.map((task) => (
                    <button
                        key={task.id}
                        onClick={() => onSelect(task.id)}
                        className={`mb-0.5 flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            task.id === activeTaskId
                                ? "bg-neutral-200 text-neutral-900 font-medium"
                                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                        }`}
                    >
                        <i
                            className={`ri-chat-3-line mr-2.5 flex-shrink-0 text-xs ${
                                task.id === activeTaskId
                                    ? "text-neutral-700"
                                    : "text-neutral-400"
                            }`}
                        />
                        <span className="truncate">
                            {task.name || "New chat"}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
