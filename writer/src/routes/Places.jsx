import React from "react";
import AppWrapper from "../containers/AppWraper";

// Dynamically import the Places plugin
let PlacesPlugin = null;
const requireCustomFile = require.context("../plugins", false, /E.*$/);
if (requireCustomFile.keys()?.length > 0) {
  if (requireCustomFile.keys()?.includes("./E.PlacesPlugin.jsx")) {
    PlacesPlugin = requireCustomFile("./E.PlacesPlugin.jsx").default;
  }
}

function Places(props) {
  return (
    <AppWrapper>
      <div className="w-full h-full overflow-auto bg-white">
        {PlacesPlugin ? (
          <PlacesPlugin />
        ) : (
          <div className="p-6 max-w-4xl mx-auto">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="text-yellow-800">
                Places plugin not found. Please ensure E.PlacesPlugin.jsx exists in the plugins directory.
              </p>
            </div>
          </div>
        )}
      </div>
    </AppWrapper>
  );
}

export default Places;
