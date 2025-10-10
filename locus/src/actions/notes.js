import { createAction } from "@reduxjs/toolkit";

import { ActionTypes } from "literals";


export const saveNoteContent = createAction(
  ActionTypes.SAVE_NOTE_CONTENT,
  (data) => ({
    payload: data,
  })
);

export const getNote = createAction(ActionTypes.GET_NOTE, (data) => ({
  payload: data,
}));
export const getNoteSuccess = createAction(
  ActionTypes.GET_NOTE_SUCCESS,
  (data) => ({
    payload: data,
  })
);
export const getNoteFailure = createAction(
  ActionTypes.GET_NOTE_FAILURE,
  (data) => ({
    payload: data,
  })
);
