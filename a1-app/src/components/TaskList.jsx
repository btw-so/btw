export default function TaskList({ tasks, activeTaskId, onSelect, onNewChat }) {
    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h2 className="font-display text-lg font-semibold text-gray-900">
                    Chats
                </h2>
                <button
                    onClick={onNewChat}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    title="New chat"
                >
                    <i className="ri-add-line text-lg" />
                </button>
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
                {tasks.length === 0 && (
                    <p className="px-2 py-8 text-center text-sm text-gray-400">
                        No conversations yet
                    </p>
                )}
                {tasks.map((task) => (
                    <button
                        key={task.id}
                        onClick={() => onSelect(task.id)}
                        className={`mb-0.5 flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                            task.id === activeTaskId
                                ? "bg-brand/10 text-brand-700 font-medium"
                                : "text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                        <i
                            className={`ri-chat-3-line mr-2.5 flex-shrink-0 ${
                                task.id === activeTaskId
                                    ? "text-brand"
                                    : "text-gray-400"
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
