import React, { useEffect } from "react";
import useCookie from "../hooks/useCookie";
import Sidebar from "../components/Sidebar";
import useLocalStorage from "../hooks/useLocalStorage";

function AppWrapper(props) {
  const [token, setToken] = useCookie(
    process.env.REACT_APP_BTW_UUID_KEY || "btw_uuid",
    ""
  );

  const [sidebarIsOpen, setSidebarIsOpen] = useLocalStorage(
    "sidebarIsOpen",
    false
  );

  if (token) {
    return (
      <div className="w-full h-full flex flex-col flex-grow">
        <div className="w-full h-full flex flex-grow max-h-screen">
          <div
            className={`${
              sidebarIsOpen
                ? "w-full sm:w-64 px-4 pb-4 pt-16 sm:pt-4 absolute sm:relative top-0 bottom-0 left-0 right-0 bg-white z-20"
                : "w-64 p-4 hidden sm:visible sm:flex"
            } border-r-2 border-gray-200 flex flex-col max-h-screen shrink-0 bg-white`}
          >
            <Sidebar {...props} closeSidebar={() => setSidebarIsOpen(false)} />
          </div>
          <div
            className="absolute right-1 w-16 h-12 top-1 bg-white flex items-center justify-center z-20 sm:hidden"
            onClick={() => {
              setSidebarIsOpen(!sidebarIsOpen);
            }}
          >
            <i
              className={`remix ri-menu-line ri-lg ${
                sidebarIsOpen ? "hidden" : ""
              }`}
            ></i>
            <i
              className={`remix ri-close-line ri-lg ${
                sidebarIsOpen ? "" : "hidden"
              }`}
            ></i>
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
