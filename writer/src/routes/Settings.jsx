import React from "react";
import SettingsContainer from "../containers/SettingsContainer";

function Settings(props) {
  return (
    <div className="w-full h-full min-h-full flex flex-col flex-grow">
      <SettingsContainer {...props} />
    </div>
  );
}

export default Settings;
