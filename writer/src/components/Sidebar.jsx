import React, { useEffect } from "react";
import Tiptap from "../components/Tiptap";
import useCookie from "../hooks/useCookie";
import { selectNotes } from "../selectors";
import { useAppSelector } from "modules/hooks";
import useInterval from "beautiful-react-hooks/useInterval";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { STATUS } from "../literals";
import {
  getNotes,
  createNewNote,
  selectNote,
  saveNoteContent,
} from "../actions";

function Sidebar(props) {
  const [token, setToken] = useCookie("btw_uuid", "");
  const notesState = useAppSelector(selectNotes);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useInterval(() => {
    if (token && notesState.notesList.status !== STATUS.RUNNING) {
      dispatch(
        getNotes({
          after: notesState.notesList.lastSuccessAt || 0,
        })
      );
    }
  }, 10000);

  useEffect(() => {
    if (token) {
      dispatch(
        getNotes({
          after: notesState.notesList.lastSuccessAt || 0,
        })
      );
    }
  }, [token]);

  if (token) {
    return (
      <>
        <div className="w-full mb-8 border-gray-200 sidebar-toolkit">
          <button
            className={`w-full py-2 flex items-center hover:font-extrabold hover:text-blue-500 ${
              props.settingsPage ? "text-blue-500" : ""
            }`}
            onClick={() => {
              dispatch(
                selectNote({
                  id: undefined,
                })
              );
              navigate("/settings");
            }}
          >
            <i className={`ri-1x ri-settings-4-line mr-1`}></i>
            <span className="font-extrabold">Settings</span>
          </button>
        </div>
        <div className="flex-grow overflow-y-auto">
          <div>
            <div className="flex items-center">
              <i className={`ri-1x ri-arrow-right-down-line`}></i>
              <span className="font-extrabold">All notes</span>
            </div>
            <ul className="text-black pl-4">
              {notesState.notesList.data.map((id) => {
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
                    onClick={() => {
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
          </div>
        </div>
        <div className="w-full border-t-2 border-gray-200 sidebar-toolkit">
          <button
            className={`w-full py-2 flex items-center hover:font-extrabold hover:text-blue-500`}
            onClick={() => {
              dispatch(
                createNewNote({
                  user_id: props.userId,
                })
              );
              navigate("/dash");
            }}
          >
            <i className={`remix ri-add-line w-5 h-5 mr-1`}></i>
            <span className="font-extrabold">New note</span>
          </button>
        </div>
      </>
    );
  }
}

export default Sidebar;
