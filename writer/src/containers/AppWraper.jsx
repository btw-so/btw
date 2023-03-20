import React, { useEffect } from "react";
import useCookie from "../hooks/useCookie";
import Sidebar from "../components/Sidebar";

function AppWrapper(props) {
  const [token, setToken] = useCookie("btw_uuid", "");

  if (token) {
    return (
      <div className="w-full h-full flex flex-col flex-grow">
        <div className="w-full h-full flex flex-grow max-h-screen">
          <div className="w-64 p-4 border-r-2 border-gray-200 flex flex-col max-h-screen shrink-0">
            <Sidebar {...props} />
          </div>
          <div className="flex-grow flex flex-col max-h-screen">
            {/* children go here */}
            {props.children}
          </div>
        </div>
      </div>
    );
  }
}

export default AppWrapper;
