import React, { useEffect } from "react";
import Tiptap from "../components/Tiptap";
import useCookie from "../hooks/useCookie";
import { selectNotes, selectNoteActions } from "../selectors";
import { useAppSelector } from "modules/hooks";
import useInterval from "beautiful-react-hooks/useInterval";
import { useDispatch } from "react-redux";
import { STATUS } from "../literals";
import {
  getNotes,
  createNewNote,
  selectNote,
  saveNoteContent,
  publishNote,
} from "../actions";
import { Switch } from "@headlessui/react";
import AppWrapper from "./AppWraper";
import useTreeChanges from "tree-changes-hook";

function Dash(props) {
  const [token, setToken] = useCookie("btw_uuid", "");
  const notesState = useAppSelector(selectNotes);
  const noteActionsState = useAppSelector(selectNoteActions);
  const selectedNote = notesState.selectedNoteId
    ? notesState.notesMap[notesState.selectedNoteId]
    : null;
  const [enabled, setEnabled] = React.useState(selectedNote?.publish);
  const { changed } = useTreeChanges(noteActionsState);
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

  if (token) {
    return (
      <AppWrapper {...props}>
        {token && props.userId && notesState.selectedNoteId ? (
          <div className="flex flex-grow flex-col max-h-screen">
            <div className="mb-2 px-2 border-b-2 border-gray-200 py-2 flex">
              <div className="flex flex-grow"></div>
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
}

export default Dash;
