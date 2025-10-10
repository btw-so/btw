import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

const ExcalidrawNodeView = ({ node, updateAttributes, editor }) => {
  const [isEditing, setIsEditing] = useState(!node.attrs.data);
  const excalidrawRef = useRef(null);
  const containerRef = useRef(null);

  const handleDataChange = useCallback((elements, appState, files) => {
    const data = {
      elements,
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        currentItemFontFamily: appState.currentItemFontFamily,
        gridSize: appState.gridSize,
        zoom: appState.zoom,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
      },
      files,
    };
    updateAttributes({ data: JSON.stringify(data) });
  }, [updateAttributes]);

  const handleClose = useCallback(() => {
    if (!node.attrs.data) {
      editor.commands.deleteSelection();
    } else {
      setIsEditing(false);
    }
  }, [node.attrs.data, editor.commands]);

  const getInitialData = () => {
    if (node.attrs.data) {
      try {
        return JSON.parse(node.attrs.data);
      } catch (e) {
        console.error("Failed to parse Excalidraw data:", e);
        return null;
      }
    }
    return null;
  };

  const initialData = getInitialData();

  return (
    <NodeViewWrapper className="excalidraw-wrapper" ref={containerRef}>
      <div className="relative">
        {isEditing ? (
          <div className="excalidraw-editor border rounded p-2 hover:bg-gray-50">
            <div style={{ height: "calc(100vh - 300px)", width: "100%", maxWidth: "100%" }}>
              <Excalidraw
                renderTopRightUI={() => {
                  return (
                    <button
                      onClick={handleClose}
                      style={{
                        color: "#040402",
                        backgroundColor: "transparent",
                        border: "none",
                        borderRadius: "11px",
                        padding: "2px",
                        margin: "2px",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        style={{ verticalAlign: "middle" }}
                      >
                        <circle cx="10" cy="10" r="10" fill="#f3f4f6" />
                        <path
                          d="M13.53 6.47a.75.75 0 0 0-1.06 0L10 8.94 7.53 6.47a.75.75 0 1 0-1.06 1.06L8.94 10l-2.47 2.47a.75.75 0 1 0 1.06 1.06L10 11.06l2.47 2.47a.75.75 0 0 0 1.06-1.06L11.06 10l2.47-2.47a.75.75 0 0 0 0-1.06z"
                          fill="#111827"
                        />
                      </svg>
                    </button>
                  );
                }}
                ref={excalidrawRef}
                initialData={initialData}
                onChange={handleDataChange}
                theme="light"
                gridModeEnabled={false}
                viewModeEnabled={false}
                zenModeEnabled={false}
                UIOptions={{
                  canvasActions: {
                    export: false,
                    loadScene: false,
                    saveToActiveFile: false,
                    toggleTheme: false,
                    changeViewBackgroundColor: true,
                  },
                }}
              />
            </div>
          </div>
        ) : (
          <div
            className="excalidraw-preview cursor-pointer border rounded p-2 hover:bg-gray-50"
            onClick={() => setIsEditing(true)}
          >
            {initialData ? (
              <div
                style={{
                  height: "calc(100vh - 300px)",
                  width: "100%",
                  maxWidth: "100%",
                  pointerEvents: "none",
                }}
              >
                <Excalidraw
                  initialData={initialData}
                  viewModeEnabled={true}
                  zenModeEnabled={false}
                  gridModeEnabled={false}
                  theme="light"
                  UIOptions={{
                    canvasActions: {
                      export: false,
                      loadScene: false,
                      saveToActiveFile: false,
                      toggleTheme: false,
                      changeViewBackgroundColor: false,
                    },
                  }}
                />
              </div>
            ) : (
              <div 
                className="flex items-center justify-center text-gray-500 bg-gray-50 border-2 border-dashed border-gray-300 rounded"
                style={{ height: "calc(100vh - 300px)", width: "100%", maxWidth: "100%" }}
              >
                Click to create an Excalidraw diagram
              </div>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

const ExcalidrawExtension = Node.create({
  name: "excalidraw",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      data: {
        default: null,
        parseHTML: element => element.getAttribute("data-excalidraw"),
        renderHTML: attributes => {
          if (!attributes.data) {
            return {};
          }
          return {
            "data-excalidraw": attributes.data,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-type='excalidraw']",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "excalidraw" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExcalidrawNodeView);
  },

  addCommands() {
    return {
      insertExcalidraw: () => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            data: null,
          },
        });
      },
    };
  },
});

export default ExcalidrawExtension;