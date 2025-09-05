import React, { useState, useEffect, useRef, useCallback } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { ExcalidrawBinding } from "y-excalidraw";
import genFingerprint from "../fingerprint";
import toast from "react-hot-toast";

// Add CSS to hide the library button
const hideLibraryCSS = `
  .excalidraw .sidebar-trigger {
    display: none !important;
  }
`;

const ExcalidrawYjs = ({ 
  scribbleId,
  userId,
  token,
  userName,
  initialData,
  onChange,
  height = "100%"
}) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const ydocRef = useRef(null);

  useEffect(() => {
    if (!scribbleId || !userId || !token) return;

    // Create Y.Doc
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Initialize with existing data if provided
    if (initialData?.ydoc?.data) {
      Y.applyUpdate(ydoc, Uint8Array.from(initialData.ydoc.data));
    }

    // Create HocuspocusProvider for real-time sync
    const provider = new HocuspocusProvider({
      url: process.env.REACT_APP_YJS_DOMAIN,
      name: `scribble.${userId}.${scribbleId}`,
      document: ydoc,
      token: `${token}:::${genFingerprint()}`,
      onDisconnect: () => {
        if (!window.scribbleToastId) {
          window.scribbleToastId = toast.loading(`Scribble sync: Trying to reconnect`);
        }
      },
      onConnect: () => {
        if (window.scribbleToastId) {
          toast.success(`Scribble sync: Connected`);
          toast.dismiss(window.scribbleToastId);
          window.scribbleToastId = null;
        }
      },
    });

    providerRef.current = provider;

    // Cleanup on unmount
    return () => {
      // Binding will be cleaned up in its own effect
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
    };
  }, [scribbleId, userId, token, initialData]);

  // Set up the binding once Excalidraw API is available
  useEffect(() => {
    if (!excalidrawAPI || !ydocRef.current || !providerRef.current) return;
    
    // Prevent creating multiple bindings
    if (bindingRef.current) return;

    // Create Y.Array for storing Excalidraw elements and Y.Map for assets
    const yElements = ydocRef.current.getArray("elements");
    const yAssets = ydocRef.current.getMap("assets");
    
    // Create ExcalidrawBinding
    try {
      const binding = new ExcalidrawBinding(
        yElements,
        yAssets,
        excalidrawAPI,
        providerRef.current.awareness
      );
      bindingRef.current = binding;

      // Set user awareness
      providerRef.current.awareness.setLocalStateField("user", {
        name: userName || "Anonymous",
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      });

      // Cleanup function
      return () => {
        if (bindingRef.current) {
          bindingRef.current.destroy();
          bindingRef.current = null;
        }
      };
    } catch (error) {
      console.error("Failed to create ExcalidrawBinding:", error);
      toast.error("Failed to initialize collaborative editing");
    }
  }, [excalidrawAPI, userName]); // Remove onChange from dependencies to prevent recreation

  return (
    <div style={{ height, width: "100%" }} className="excalidraw-yjs-container">
      <style>{hideLibraryCSS}</style>
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={{
          appState: {
            viewBackgroundColor: "#f9fafb", // Tailwind gray-50 to match your UI
          }
        }}
        viewModeEnabled={false}
        zenModeEnabled={false}
        gridModeEnabled={false}
        theme="light"
        UIOptions={{
          canvasActions: {
            export: {
              saveFileToDisk: true,
            },
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
            changeViewBackgroundColor: true,
          },
        }}
        libraryReturnUrl={null} // This removes the library button
      />
    </div>
  );
};

export default ExcalidrawYjs;