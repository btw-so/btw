import React, { useEffect, useState, useRef } from "react";
import Tiptap from "../components/Tiptap";
import useCookie from "../hooks/useCookie";
import { selectNotes, selectNoteActions } from "../selectors";
import { useAppSelector } from "modules/hooks";
import useInterval from "beautiful-react-hooks/useInterval";
import { useDispatch } from "react-redux";
import { STATUS } from "../literals";
import { useNavigate } from "react-router-dom";
import {
  getNotes,
  createNewNote,
  selectNote,
  saveNoteContent,
  publishNote,
  setNoteSlug,
} from "../actions";
import { Switch } from "@headlessui/react";
import AppWrapper from "./AppWraper";
import useTreeChanges from "tree-changes-hook";
import toast from "react-hot-toast";

function Dash(props) {
  const navigate = useNavigate();
  const [token, setToken] = useCookie(
    process.env.REACT_APP_BTW_UUID_KEY || "btw_uuid",
    ""
  );
  const notesState = useAppSelector(selectNotes);
  const noteActionsState = useAppSelector(selectNoteActions);
  const selectedNote = notesState.selectedNoteId
    ? notesState.notesMap[notesState.selectedNoteId]
    : null;
  const [enabled, setEnabled] = useState(selectedNote?.publish);
  const { changed } = useTreeChanges(noteActionsState);
  const { changed: notesStateChanged } = useTreeChanges(notesState);
  const dispatch = useDispatch();

  useEffect(() => {
    setEnabled(selectedNote?.publish || false);
  }, [selectedNote?.publish]);

  useEffect(() => {
    if (
      changed("publishNote.status") &&
      noteActionsState.publishNote.status !== STATUS.RUNNING
    ) {
      setEnabled(selectedNote?.publish || false);
    }
  }, [changed("publishNote.status")]);

  const userDomain = props.domain;
  const [showEditUrl, setShowEditUrl] = useState(false);
  const editUrlRef = useRef(null);
  const [currentUrl, setCurrentUrl] = useState(selectedNote?.slug || "");

  useEffect(() => {
    if (selectedNote?.slug !== currentUrl) {
      setCurrentUrl(selectedNote?.slug || "");
    }
  }, [selectedNote?.slug]);

  useEffect(() => {
    if (changed("setNoteSlug.status")) {
      if (noteActionsState.setNoteSlug.status !== STATUS.RUNNING) {
        setCurrentUrl(selectedNote?.slug || "");
      }
    }
  }, [changed("setNoteSlug.status")]);

  if (token) {
    return (
      <AppWrapper {...props}>
        {token && props.userId && notesState.selectedNoteId ? (
          <div className="flex flex-grow flex-col max-h-screen">
            <div className="mb-2 px-2 border-b-2 border-gray-200 py-2 flex">
              <div className="flex flex-grow">
                {enabled && userDomain ? (
                  <div
                    className="text-sm flex items-center flex-grow"
                    style={{ flex: "1", minWidth: "0" }}
                  >
                    <div className="hidden sm:block border-black">
                      <span
                        onClick={() => {
                          window.open(
                            `https://${userDomain}/${currentUrl}`,
                            "_blank"
                          );
                        }}
                        className={`${
                          showEditUrl ? "hidden" : ""
                        } cursor-pointer border-dotted border-b-2 border-black text-ellipsis overflow-hidden`}
                      >
                        {`https://${userDomain}/${currentUrl}`}
                      </span>
                      <span className={`${showEditUrl ? "" : "hidden"}`}>
                        {`https://${userDomain}/`}
                      </span>{" "}
                      <input
                        ref={editUrlRef}
                        value={currentUrl}
                        onChange={(e) => {
                          setCurrentUrl(e.target.value);
                        }}
                        onBlur={() => {
                          setShowEditUrl(false);
                          if (
                            currentUrl !== "" &&
                            currentUrl !== selectedNote?.slug
                          ) {
                            // if current url is different from url in state
                            // then dispatch an action to update it
                            dispatch(
                              setNoteSlug({
                                id: selectedNote.id,
                                user_id: props.userId,
                                slug: currentUrl,
                              })
                            );
                          } else {
                            setCurrentUrl(selectedNote?.slug || "");
                          }
                        }}
                        className={`${showEditUrl ? "" : "hidden"} px-2 py-0.5`}
                      />
                    </div>
                    <button
                      className={`hidden sm:block w-5 h-5 flex items-center hover:text-blue-500 ${
                        showEditUrl ? "hidden" : ""
                      }`}
                      onClick={() => {
                        setShowEditUrl(true);
                        if (editUrlRef.current) {
                          setTimeout(() => {
                            editUrlRef.current.focus();
                          });
                        }
                      }}
                    >
                      <i
                        className={`remix ri-pencil-line w-5 h-5 ml-1 mr-1 ml-auto flex items-center justify-center`}
                      ></i>
                    </button>
                  </div>
                ) : null}
              </div>
              <div>
                <Switch.Group as="div" className="flex items-center">
                  <Switch.Label as="span" className="mr-3 text-sm">
                    <span className="font-medium text-gray-900">
                      {enabled ? "Published" : "Publish"}
                    </span>{" "}
                  </Switch.Label>
                  <Switch
                    checked={enabled}
                    onChange={() => {
                      // check if name and slug are present for this user

                      if (!props.name || !props.slug) {
                        toast.error(
                          "Please set your name and slug before publishing"
                        );
                        navigate("/settings");
                        return;
                      }

                      // check the title of this note. if it is empty or "New note", then ask the user to change
                      if (
                        selectedNote.title === "New note" ||
                        selectedNote.title === ""
                      ) {
                        toast.error(
                          "Please set a title for this note before publishing"
                        );
                        return;
                      }

                      // allow change only if no publishing action is going on
                      if (
                        noteActionsState.publishNote.status !== STATUS.RUNNING
                      ) {
                        setEnabled(!enabled);
                        dispatch(
                          publishNote({
                            id: selectedNote.id,
                            publish: !enabled,
                            user_id: props.userId,
                          })
                        );
                      }
                    }}
                    className={`${
                      enabled ? "bg-blue-600" : "bg-gray-200"
                    } flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mx-0.5 ${
                        enabled ? "translate-x-5" : "translate-x-0"
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </Switch>
                </Switch.Group>
              </div>
            </div>
            <Tiptap
              className="h-full p-2"
              note={notesState.notesMap[notesState.selectedNoteId]}
              key={notesState.selectedNoteId}
              token={token}
              userId={props.userId}
              email={props.email}
              name={props.name}
              docId={notesState.selectedNoteId}
              savedContent={
                notesState.notesMap[notesState.selectedNoteId].content
              }
              enableServerSync={true}
              mandatoryH1={true}
              onChange={(html) => {
                const isEmpty = (content) => !content || content == "<h1></h1>";
                if (
                  (isEmpty(html) &&
                    isEmpty(
                      notesState.notesMap[notesState.selectedNoteId].content
                    )) ||
                  html ===
                    notesState.notesMap[notesState.selectedNoteId].content
                ) {
                  return;
                }
                dispatch(
                  saveNoteContent({
                    id: notesState.selectedNoteId,
                    content: html,
                  })
                );
              }}
            />
          </div>
        ) : null}
      </AppWrapper>
    );
  }

  return null;
}

export default Dash;
