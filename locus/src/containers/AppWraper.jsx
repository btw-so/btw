import React, { useEffect, useState } from "react";
import useCookie from "../hooks/useCookie";
import { useDispatch } from "react-redux";
import { changeSelectedNode } from "../actions";
import Sidebar from "../components/Sidebar";
import useLocalStorage from "../hooks/useLocalStorage";
import { useNavigate } from "react-router-dom";

function AppWrapper(props) {
  const [token, setToken] = useCookie(
    process.env.REACT_APP_BTW_UUID_KEY || "btw_uuid",
    ""
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage("sidebarCollapsed", false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  if (token) {
    return (
      <div className="w-full h-full flex flex-col flex-grow">
        <div className="w-full h-full flex flex-grow max-h-screen">
          <div
            className={`${
              props.isSidebarOpen
                ? "w-full sm:w-64 px-4 pb-4 pt-10 sm:pt-4 absolute sm:relative top-0 bottom-0 left-0 right-0 bg-white z-20"
                : isSidebarCollapsed 
                  ? "w-12 p-0 hidden sm:flex" // Collapsed state - thin bar
                  : "w-64 p-4 hidden sm:visible sm:flex" // Expanded state
            } border-r-2 border-gray-100 flex flex-col max-h-screen shrink-0 bg-white transition-all duration-300`}
            style={{
              background: "#FBFBFB",
            }}
          >
            {isSidebarCollapsed && !props.isSidebarOpen ? (
              // Collapsed sidebar view
              <div className="flex flex-col h-full items-center py-4">
                {/* Expand button at top */}
                <button
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="p-2"
                  title="Expand sidebar"
                >
                  <i className="ri-side-bar-fill text-gray-400 hover:text-gray-700 transition-colors duration-200"></i>
                </button>

                {/* Home node button */}
                <button
                  onClick={() => {
                    navigate("/list");
                    dispatch(
                      changeSelectedNode({
                        id: "home",
                      })
                    );
                  }}
                  className="p-2"
                  title="Home"
                >
                  <i className="ri-home-7-line text-gray-400 hover:text-gray-700 transition-colors duration-200"></i>
                </button>
                
                {/* Settings button at bottom */}
                <div className="mt-auto">
                  <button
                    onClick={() => navigate("/settings")}
                    className="p-2 hover:bg-gray-200 rounded-md transition-colors duration-200"
                    title="Settings"
                  >
                    <i className="ri-settings-3-line text-gray-700"></i>
                  </button>
                </div>
              </div>
            ) : (
              <Sidebar {...props} onCollapse={() => setIsSidebarCollapsed(true)} />
            )}
          </div>
          <div
            className="flex-grow flex flex-col max-h-screen"
            style={{
              background: "#FBFBFB",
            }}
          >
            {/* children go here */}
            {props.children}
          </div>
        </div>
      </div>
    );
  }
}

export default AppWrapper;
