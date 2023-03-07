import { createAction } from '@reduxjs/toolkit';

import { ActionTypes } from 'literals';

export const getNotes = createAction(ActionTypes.GET_NOTES, data => ({
  payload: data,
}));
export const getNotesSuccess = createAction(ActionTypes.GET_NOTES_SUCCESS, data => ({
  payload: data,
}));
export const getNotesFailure = createAction(ActionTypes.GET_NOTES_FAILURE, data => ({
  payload: data,
}));

export const upsertNote = createAction(ActionTypes.UPSERT_NOTE, data => ({
  payload: data,
}));
export const upsertNoteSuccess = createAction(ActionTypes.UPSERT_NOTE_SUCCESS, data => ({
  payload: data,
}));
export const upsertNoteFailure = createAction(ActionTypes.UPSERT_NOTE_FAILURE, data => ({
  payload: data,
}));
