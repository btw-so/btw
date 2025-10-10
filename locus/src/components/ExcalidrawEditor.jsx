import React, { useState, useRef, useEffect, useCallback } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

const ExcalidrawEditor = ({ 
  initialData, 
  onChange, 
  readOnly = false,
  height = "100%"
}) => {
  const excalidrawRef = useRef(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);

  const handleChange = useCallback((elements, appState, files) => {
    if (onChange && !readOnly) {
      onChange({
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
      });
    }
  }, [onChange, readOnly]);

  useEffect(() => {
    if (excalidrawAPI && initialData) {
      excalidrawAPI.updateScene(initialData);
    }
  }, [excalidrawAPI, initialData]);

  return (
    <div style={{ height, width: "100%" }} className="excalidraw-container">
      <Excalidraw
        ref={excalidrawRef}
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={initialData}
        onChange={handleChange}
        viewModeEnabled={readOnly}
        zenModeEnabled={false}
        gridModeEnabled={false}
        theme="light"
        UIOptions={{
          canvasActions: {
            export: false,
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
            changeViewBackgroundColor: !readOnly,
          },
        }}
      />
    </div>
  );
};

export default ExcalidrawEditor;