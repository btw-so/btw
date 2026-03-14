import React, { useEffect } from "react";
import { useAppSelector } from "modules/hooks";
import { selectUser } from "selectors";
import Sidebar from "../components/Sidebar";
import useLocalStorage from "../hooks/useLocalStorage";

function AppWrapper(props) {
  const userState = useAppSelector(selectUser);
  const isLoggedIn = userState.user.isLoggedIn;

  const [sidebarIsOpen, setSidebarIsOpen] = useLocalStorage(
    "sidebarIsOpen",
    false
  );

  if (isLoggedIn) {
    return (
      <div className="w-full h-full flex flex-col flex-grow">
        <div className="w-full h-full flex flex-grow max-h-screen">
          <div
            className={`${
              sidebarIsOpen
                ? "w-full sm:w-64 px-4 pb-4 pt-16 sm:pt-4 absolute sm:relative top-0 bottom-0 left-0 right-0 bg-white z-10"
                : "w-64 p-4 hidden sm:visible sm:flex"
            } border-r-2 border-gray-200 flex flex-col max-h-screen shrink-0`}
          >
            <Sidebar {...props} />
          </div>
          <div
            className="absolute left-4 top-2 z-10 sm:hidden"
            onClick={() => {
              setSidebarIsOpen(!sidebarIsOpen);
            }}
          >
            <i
              className={`remix ri-menu-line w-6 h-6 ${
                sidebarIsOpen ? "hidden" : ""
              }`}
            ></i>
            <i
              className={`remix ri-close-line w-6 h-6 ${
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
