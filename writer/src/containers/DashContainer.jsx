import React, { useEffect } from 'react';
import Tiptap from '../components/Tiptap';
import useCookie from '../hooks/useCookie';
import { selectNotes } from '../selectors';
import { useAppSelector } from 'modules/hooks';
import useInterval from 'beautiful-react-hooks/useInterval';
import { useDispatch } from 'react-redux';
import { STATUS } from '../literals';
import { getNotes, createNewNote, selectNote, saveNoteContent } from '../actions';
import 'remixicon/fonts/remixicon.css';

function Dash(props) {
  const [token, setToken] = useCookie('btw_uuid', '');
  const notesState = useAppSelector(selectNotes);
  const dispatch = useDispatch();

  useInterval(() => {
    if (token && notesState.notesList.status !== STATUS.RUNNING) {
      dispatch(
        getNotes({
          after: notesState.notesList.lastSuccessAt || 0,
        }),
      );
    }
  }, 10000);

  useEffect(() => {
    if (token) {
      dispatch(
        getNotes({
          after: notesState.notesList.lastSuccessAt || 0,
        }),
      );
    }
  }, [token]);

  if (token) {
    return (
      <div className="w-full h-full flex flex-col flex-grow">
        <div className="w-full h-full flex flex-grow">
          <div className="w-64 p-4 border-r-2 border-gray-200 flex flex-col">
            <ul className="text-black flex-grow">
              <span className="font-bold">All notes</span>
              {notesState.notesList.data.map(id => {
                let note = notesState.notesMap[id];
                let d = new Date(note.updated_at || note.created_at);
                // convert do to MMM DD, YYYY
                let date = d.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                return (
                  <li
                    className={`mb-2 py-2 px-3 text-gray-500 cursor-pointer hover:bg-gray-200 pl-2 ${
                      notesState.selectedNoteId === id
                        ? 'border-l-2 border-solid border-blue-500'
                        : ''
                    }`}
                    key={id}
                    onClick={() => {
                      dispatch(
                        selectNote({
                          id,
                        }),
                      );
                    }}
                  >
                    <span
                      className={`text-sm block ${
                        notesState.selectedNoteId === id ? 'font-bold text-black' : 'text-black'
                      }`}
                    >
                      {note.title || 'New Note'}
                    </span>
                    <span className="text-xs block">{date}</span>
                  </li>
                );
              })}
            </ul>
            <div className="w-full border-t-2 border-gray-200">
              <button
                className={`w-full p-2 flex items-center hover:font-extrabold hover:text-blue-500`}
                onClick={() => {
                  dispatch(
                    createNewNote({
                      user_id: props.userId,
                    }),
                  );
                }}
              >
                <svg className="remix w-5 h-5 mr-1">
                  <use xlinkHref={`/media/icons/remixicon.symbol.svg#ri-add-line`} />
                </svg>
                <span className="font-bold text-sm">New note</span>
              </button>
            </div>
          </div>
          <div className="flex-grow p-2 flex flex-col">
            {token && props.userId && notesState.selectedNoteId ? (
              <Tiptap
                className="h-full"
                note={notesState.notesMap[notesState.selectedNoteId]}
                key={notesState.selectedNoteId}
                token={token}
                userId={props.userId}
                email={props.userEmail}
                name={props.userName}
                docId={notesState.selectedNoteId}
                savedContent={notesState.notesMap[notesState.selectedNoteId].content}
                onChange={html => {
                  const isEmpty = content => !content || content == '<h1></h1>';
                  if (
                    (isEmpty(html) &&
                      isEmpty(notesState.notesMap[notesState.selectedNoteId].content)) ||
                    html === notesState.notesMap[notesState.selectedNoteId].content
                  ) {
                    return;
                  }
                  dispatch(
                    saveNoteContent({
                      id: notesState.selectedNoteId,
                      content: html,
                    }),
                  );
                }}
              />
            ) : null}
          </div>
        </div>
      </div>
    );
  }
}

export default Dash;
