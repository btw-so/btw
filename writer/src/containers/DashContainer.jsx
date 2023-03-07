import React, { useEffect } from 'react';
import Tiptap from '../components/Tiptap';
import useCookie from '../hooks/useCookie';
import { selectNotes } from '../selectors';
import { useAppSelector } from 'modules/hooks';
import useInterval from 'beautiful-react-hooks/useInterval';
import { useDispatch } from 'react-redux';
import { STATUS } from '../literals';
import { getNotes } from '../actions';

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
          <div className="w-64 p-4 border-r-2 border-gray-200">
            <ul className="text-black">
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
                    className={`mb-2 py-2 px-3 text-gray-500 hover:bg-gray-200 pl-2 ${
                      notesState.selectedNoteId === id
                        ? 'border-l-2 border-solid border-blue-500'
                        : ''
                    }`}
                    key={id}
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
          </div>
          <div className="flex-grow p-2 flex flex-col">
            {token && props.userId && notesState.selectedNoteId ? (
              <Tiptap
                className="h-full"
                token={token}
                userId={props.userId}
                docId={notesState.selectedNoteId}
                onChange={html => {
                  //   console.log(html);
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
