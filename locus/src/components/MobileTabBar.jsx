import React, { useState } from "react";

export default function MobileTabBar({
  showFileOption,
  showNoteOption,
  showListOption,
  showSearchOption,
  showHomeOption,
  isFileSelected,
  isNoteSelected,
  isListSelected,
  isSearchSelected,
  isHomeSelected,
  showSettingsOption,
  isSettingsSelected,
  showChatsOption,
  isChatsSelected,
  onSelect,
}) {
  const options = [
    showHomeOption && {
      key: "home",
      label: "Home",
      icon: "ri-home-5-line",
      selected: isHomeSelected,
    },
    showListOption && {
      key: "list",
      label: "List",
      icon: "ri-list-check",
      selected: isListSelected,
    },
    showFileOption && {
      key: "file",
      label: "File",
      icon: "ri-attachment-line",
      selected: isFileSelected,
    },
    showNoteOption && {
      key: "note",
      label: "Note",
      icon: isNoteSelected ? "ri-quill-pen-fill" : "ri-quill-pen-line",
      selected: isNoteSelected,
    },
    showSearchOption && {
      key: "search",
      label: "Search",
      icon: "ri-search-line",
      selected: isSearchSelected,
    },
    showSettingsOption && {
      key: "settings",
      label: "Settings",
      icon: "ri-settings-line",
      selected: isSettingsSelected,
    },
    showChatsOption && {
      key: "chats",
      label: "Chats",
      icon: "ri-chat-1-line",
      selected: isChatsSelected,
    },
  ].filter(Boolean);

  return (
    <div className="fixed bottom-4 left-0 w-full flex justify-center z-50 md:hidden">
      <div className="bg-white/90 shadow-lg rounded-full flex px-4 py-2 gap-3 border border-gray-200 backdrop-blur-md">
        {options.map((opt) => (
          <button
            key={opt.key}
            className={`flex flex-col items-center px-3 py-1 focus:outline-none ${
              opt.selected ? "text-gray-900 font-bold" : "text-gray-400"
            }`}
            onClick={() => onSelect && onSelect(opt.key)}
            aria-label={`Show ${opt.label}`}
          >
            <i className={opt.icon}></i>
            <span className="text-xs mt-0.5">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
