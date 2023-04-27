import React, { useEffect } from "react";
import Tiptap from "../components/Tiptap";
import useCookie from "../hooks/useCookie";
import { selectNotes } from "../selectors";
import { useAppSelector } from "modules/hooks";
import useInterval from "beautiful-react-hooks/useInterval";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { STATUS } from "../literals";
import useLocalStorage from "../hooks/useLocalStorage";
import {
  getNotes,
  createNewNote,
  selectNote,
  saveNoteContent,
  archiveNote,
  deleteNote,
  publishNote,
} from "../actions";

function Sidebar(props) {
  const [token, setToken] = useCookie(
    process.env.REACT_APP_BTW_UUID_KEY || "btw_uuid",
    ""
  );
  const notesState = useAppSelector(selectNotes);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [expandAllNotes, setExpandAllNotes] = useLocalStorage(
    "expandAllNotes",
    true
  );
  const [expandPublishedNotes, setExpandPublishedNotes] = useLocalStorage(
    "expandPublishedNotes",
    false
  );
  const [expandUnpublishedNotes, setExpandUnpublishedNotes] = useLocalStorage(
    "expandUnpublishedNotes",
    false
  );
  const [expandTrashNotes, setExpandTrashNotes] = useLocalStorage(
    "expandTrashNotes",
    false
  );
  const [expandArchivedNotes, setExpandArchivedNotes] = useLocalStorage(
    "expandArchivedNotes",
    false
  );
  const [sidebarIsOpen, setSidebarIsOpen] = useLocalStorage(
    "sidebarIsOpen",
    false
  );

  useInterval(() => {
    if (token && notesState.notesList.status !== STATUS.RUNNING) {
      dispatch(
        getNotes({
          after: notesState.notesList.lastSuccessAt || 0,
        })
      );
    }
  }, 15000);

  // if there is a connection failure earlier, which can be seen from connectionStatusToastId variable, then we can increase the interval.
  useInterval(() => {
    if (
      token &&
      notesState.notesList.status !== STATUS.RUNNING &&
      window.connectionStatusToastId
    ) {
      dispatch(
        getNotes({
          after: notesState.notesList.lastSuccessAt || 0,
        })
      );
    }
  }, 4000);

  useEffect(() => {
    if (token) {
      dispatch(
        getNotes({
          after: notesState.notesList.lastSuccessAt || 0,
        })
      );
    }
  }, [token]);

  var noteLists = [
    {
      title: "All",
      notes: notesState.notesList.data,
      expanded: expandAllNotes,
      toggle: () => setExpandAllNotes(!expandAllNotes),
    },
    {
      title: "Published",
      notes: notesState.notesList.data.filter(
        (id) => notesState.notesMap[id].publish
      ),
      expanded: expandPublishedNotes,
      toggle: () => setExpandPublishedNotes(!expandPublishedNotes),
    },
    {
      title: "Drafts",
      notes: notesState.notesList.data.filter(
        (id) =>
          !notesState.notesMap[id].publish &&
          !notesState.notesMap[id].archive &&
          !notesState.notesMap[id].delete
      ),
      expanded: expandUnpublishedNotes,
      toggle: () => setExpandUnpublishedNotes(!expandUnpublishedNotes),
    },
    {
      title: "Archived",
      notes: notesState.notesList.data.filter(
        (id) => notesState.notesMap[id].archive
      ),
      expanded: expandArchivedNotes,
      toggle: () => setExpandArchivedNotes(!expandArchivedNotes),
    },
    {
      title: "Trash",
      notes: notesState.notesList.data.filter(
        (id) => notesState.notesMap[id].delete
      ),
      expanded: expandTrashNotes,
      toggle: () => setExpandTrashNotes(!expandTrashNotes),
    },
  ];

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
        {contextMenu ? (
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
        ) : null}
        <div className="w-full mb-8 border-gray-200 sidebar-toolkit">
          <button
            className={`w-full py-2 flex items-center hover:font-extrabold hover:text-blue-500`}
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
            <i className={`remix ri-edit-box-line w-5 h-5 mr-1 ml-auto`}></i>
          </button>
        </div>
        <div className="flex-grow overflow-y-auto">
          {noteLists
            .filter((x) => x.notes && x.notes.length > 0)
            .map((noteList) => {
              return (
                <div key={noteList.title} className="mb-4">
                  <div
                    className="flex items-center cursor-pointer"
                    onClick={() => {
                      noteList.toggle();
                    }}
                  >
                    <i
                      className={`ri-1x ri-arrow-down-s-line ${
                        noteList.expanded ? "" : "hidden"
                      }`}
                    ></i>
                    <i
                      className={`ri-1x ri-arrow-right-s-line ${
                        noteList.expanded ? "hidden" : ""
                      }`}
                    ></i>
                    <span className="font-extrabold">{noteList.title}</span>
                  </div>
                  {noteList.expanded ? (
                    <ul className="text-black pl-4">
                      {noteList.notes.map((id) => {
                        let note = notesState.notesMap[id];
                        let d = new Date(note.updated_at || note.created_at);
                        // convert do to MMM DD, YYYY
                        let date = d.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                        return (
                          <li
                            className={`mb-2 py-2 px-3 text-gray-500 cursor-pointer hover:bg-gray-200 pl-2 ${
                              notesState.selectedNoteId === id
                                ? "border-l-2 border-solid border-blue-500"
                                : ""
                            }`}
                            key={id}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setPointX(e.pageX);
                              setPointY(e.pageY);
                              showContextMenu(true);
                              setContextNoteId(id);
                            }}
                            onClick={() => {
                              setSidebarIsOpen(false);
                              console.log("HEE");
                              dispatch(
                                selectNote({
                                  id,
                                })
                              );
                              navigate("/dash");
                            }}
                          >
                            <span
                              className={`text-sm block ${
                                notesState.selectedNoteId === id
                                  ? "font-bold text-black"
                                  : "text-black"
                              }`}
                            >
                              {note.title || "New Note"}
                            </span>
                            <span className="text-xs block">{date}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              );
            })}
        </div>
        <div className="w-full border-t-2 border-gray-200 sidebar-toolkit">
          <button
            className={`w-full pb-2 pt-4 flex items-center hover:font-extrabold hover:text-blue-500 ${
              props.settingsPage ? "text-blue-500" : ""
            }`}
            onClick={() => {
              dispatch(
                selectNote({
                  id: undefined,
                })
              );
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
