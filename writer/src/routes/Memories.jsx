import React from "react";
import AppWrapper from "../containers/AppWraper";

// Dynamically import the Memories plugin
let MemoriesPlugin = null;
const requireCustomFile = require.context("../plugins", false, /E.*$/);
if (requireCustomFile.keys()?.length > 0) {
  if (requireCustomFile.keys()?.includes("./E.MemoriesPlugin.jsx")) {
    MemoriesPlugin = requireCustomFile("./E.MemoriesPlugin.jsx").default;
  }
}

function Memories(props) {
  return (
    <AppWrapper>
      <div className="w-full h-full overflow-auto bg-white">
        {MemoriesPlugin ? (
          <MemoriesPlugin />
        ) : (
          <div className="p-6 max-w-4xl mx-auto">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="text-yellow-800">
                Memories plugin not found. Please ensure E.MemoriesPlugin.jsx exists in the plugins directory.
              </p>
            </div>
          </div>
        )}
      </div>
    </AppWrapper>
  );
}

export default Memories;
