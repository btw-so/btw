import React, { useEffect } from "react";
import { useAppSelector } from "modules/hooks";
import useInterval from "beautiful-react-hooks/useInterval";
import { useDispatch } from "react-redux";
import { STATUS } from "../literals";
import useCookie from "../hooks/useCookie";
import UppyComponent from "../components/Uppy";
import { selectUser } from "../selectors";
import { importNotes } from "../actions";

function SettingsContainer() {
  const dispatch = useDispatch();
  const user = useAppSelector(selectUser);

  return (
    <div className="w-full h-full flex flex-col flex-grow">
      <div className="w-full h-full flex flex-grow">
        <div className="w-64 p-4 border-r-2 border-gray-200 flex flex-col">
          <ul className="text-black flex-grow">
            <span className="font-bold">All settings</span>
            <li>Import notes</li>
          </ul>
        </div>
        <div className="flex-grow p-2 flex flex-col">
          <UppyComponent
            onResults={(res) => {
              // dispatch an action to backend for this now
              dispatch(
                importNotes({
                  urls: res.urls,
                })
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default SettingsContainer;
