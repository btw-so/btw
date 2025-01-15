import React, { useEffect, useState } from "react";
import Tiptap from "../components/Tiptap";
import useCookie from "../hooks/useCookie";
import { useAppSelector } from "modules/hooks";
import useInterval from "beautiful-react-hooks/useInterval";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { STATUS } from "../literals";
import useLocalStorage from "../hooks/useLocalStorage";
import { changeSelectedNode } from "../actions";

function Sidebar(props) {
  const [token, setToken] = useCookie(
    process.env.REACT_APP_BTW_UUID_KEY || "btw_uuid",
    ""
  );
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const [sidebarIsOpen, setSidebarIsOpen] = useLocalStorage(
    "sidebarIsOpen",
    false
  );

  // useInterval(() => {
  //   if (token && notesState.notesList.status !== STATUS.RUNNING) {
  //     dispatch(
  //       getNotes({
  //         after: notesState.notesList.lastSuccessAt || 0,
  //       })
  //     );
  //   }
  // }, 15000);

  // if there is a connection failure earlier, which can be seen from connectionStatusToastId variable, then we can increase the interval.
  // useInterval(() => {
  //   if (
  //     token &&
  //     notesState.notesList.status !== STATUS.RUNNING &&
  //     window.connectionStatusToastId
  //   ) {
  //     dispatch(
  //       getNotes({
  //         after: notesState.notesList.lastSuccessAt || 0,
  //       })
  //     );
  //   }
  // }, 4000);

  // useEffect(() => {
  //   if (token) {
  //     dispatch(
  //       getNotes({
  //         after: notesState.notesList.lastSuccessAt || 0,
  //       })
  //     );
  //   }
  // }, [token]);

  const [contextMenu, showContextMenu] = React.useState(false);
  const [pointX, setPointX] = React.useState(0);
  const [pointY, setPointY] = React.useState(0);
  const [contextNoteId, setContextNoteId] = React.useState(null);

  useEffect(() => {
    const handleClick = () => showContextMenu(false);
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);

  if (token) {
    return (
      <>
        {/* {contextMenu && notesState.notesMap[contextNoteId].ydoc ? (
          <div
            className={`${
              sidebarIsOpen ? "hidden" : "absolute"
            } w-32 text-blue-500 z-10 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            style={{
              top: pointY,
              left: pointX,
            }}
          >
            <div className="cursor-pointer" role="none">
              {notesState.notesMap[contextNoteId].publish ? (
                <div
                  className="block px-4 py-2 text-sm font-bold hover:bg-gray-100"
                  onClick={() => {
                    dispatch(
                      publishNote({
                        id: contextNoteId,
                        publish: false,
                        user_id: props.userId,
                      })
                    );
                    showContextMenu(false);
                  }}
                >
                  Unpublish
                </div>
              ) : null}
              {!notesState.notesMap[contextNoteId].publish &&
              !notesState.notesMap[contextNoteId].delete &&
              !notesState.notesMap[contextNoteId].archive ? (
                <div
                  className="block px-4 py-2 text-sm font-bold hover:bg-gray-100"
                  onClick={() => {
                    dispatch(
                      publishNote({
                        id: contextNoteId,
                        publish: true,
                        user_id: props.userId,
                      })
                    );
                    showContextMenu(false);
                  }}
                >
                  Publish
                </div>
              ) : null}
              {!notesState.notesMap[contextNoteId].publish &&
              !notesState.notesMap[contextNoteId].delete &&
              !notesState.notesMap[contextNoteId].archive ? (
                <div
                  className="block px-4 py-2 text-sm font-bold hover:bg-gray-100"
                  onClick={() => {
                    dispatch(
                      archiveNote({
                        id: contextNoteId,
                        archive: true,
                        user_id: props.userId,
                      })
                    );
                    showContextMenu(false);
                  }}
                >
                  Archive
                </div>
              ) : null}
              {notesState.notesMap[contextNoteId].archive ? (
                <div
                  className="block px-4 py-2 text-sm font-bold hover:bg-gray-100"
                  onClick={() => {
                    dispatch(
                      archiveNote({
                        id: contextNoteId,
                        archive: false,
                        user_id: props.userId,
                      })
                    );
                    showContextMenu(false);
                  }}
                >
                  Unarchive
                </div>
              ) : null}
              {!notesState.notesMap[contextNoteId].publish &&
              !notesState.notesMap[contextNoteId].delete ? (
                <div
                  className="block px-4 py-2 text-sm font-bold hover:bg-gray-100"
                  onClick={() => {
                    dispatch(
                      deleteNote({
                        id: contextNoteId,
                        delete: true,
                        user_id: props.userId,
                      })
                    );
                    showContextMenu(false);
                  }}
                >
                  Move to trash
                </div>
              ) : null}
              {notesState.notesMap[contextNoteId].delete ? (
                <div
                  className="block px-4 py-2 text-sm font-bold hover:bg-gray-100"
                  onClick={() => {
                    dispatch(
                      deleteNote({
                        id: contextNoteId,
                        delete: false,
                        user_id: props.userId,
                      })
                    );
                    showContextMenu(false);
                  }}
                >
                  Recover
                </div>
              ) : null}
              {notesState.notesMap[contextNoteId].delete ? (
                <div
                  className="block px-4 py-2 text-sm font-bold hover:bg-gray-100"
                  onClick={() => {
                    dispatch(
                      deleteNote({
                        id: contextNoteId,
                        delete: false,
                        user_id: props.userId,
                        moveToArchive: true,
                      })
                    );
                    showContextMenu(false);
                  }}
                >
                  Move to archive
                </div>
              ) : null}
            </div>
          </div>
        ) : null} */}

        <div className="space-x-2 w-full mb-8 border-gray-200 sidebar-toolkit flex items-center">
          <div className="flex-grow">
            <div className="relative rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                <div>
                  <div className="mr-1">
                    <div className={`flex justify-center items-center`}>
                      <i className={`remix ri-search-line`}></i>
                    </div>
                  </div>
                </div>
              </div>
              <input
                type="text"
                name="search"
                id="search"
                className="block w-full rounded-md border-0 py-1 pl-8 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  // dispatch(
                  //   searchNotes({
                  //     query: e.target.value,
                  //   })
                  // );
                }}
              />
            </div>
          </div>

          {/* <button
            className={`py-2 flex items-center hover:font-extrabold hover:text-blue-500`}
            onClick={() => {
              dispatch(
                createNewNote({
                  user_id: props.userId,
                })
              );
              setSidebarIsOpen(false);
              navigate("/dash");
            }}
          >
            <i className={`remix ri-edit-box-line w-5 h-5 ml-2 ml-auto`}></i>
          </button> */}
        </div>
        <div className="flex-grow overflow-y-auto">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => {
              dispatch(
                changeSelectedNode({
                  id: "home",
                })
              );
            }}
          >
            <span className="mr-1 pt-0.5">
              <i className="ri-bookmark-line ri-1x"></i>
            </span>
            <span>Home</span>
          </div>
        </div>
        <div className="w-full border-t-2 border-gray-200 sidebar-toolkit">
          <button
            className={`w-full pb-2 pt-4 flex items-center hover:font-extrabold hover:text-blue-500 ${
              props.settingsPage ? "text-blue-500" : ""
            }`}
            onClick={() => {
              setSidebarIsOpen(false);
              navigate("/settings");
            }}
          >
            <i className={`ri-1x ri-settings-4-line mr-1`}></i>
            <span className="font-extrabold">Settings</span>
          </button>
        </div>
      </>
    );
  }
}

export default Sidebar;
