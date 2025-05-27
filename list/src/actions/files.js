import { createAction } from "@reduxjs/toolkit";

import { ActionTypes } from "literals";


export const addFile = createAction(
  ActionTypes.ADD_FILE,
  (data) => ({
    payload: data,
  })
);
export const addFileSuccess = createAction(
  ActionTypes.ADD_FILE_SUCCESS,
  (data) => ({
    payload: data,
  })
);
export const addFileFailure = createAction(
  ActionTypes.ADD_FILE_FAILURE,
  (data) => ({
    payload: data,
  })
);

export const getFile = createAction(ActionTypes.GET_FILE, (data) => ({
  payload: data,
}));
export const getFileSuccess = createAction(
  ActionTypes.GET_FILE_SUCCESS,
  (data) => ({
    payload: data,
  })
);
export const getFileFailure = createAction(
  ActionTypes.GET_FILE_FAILURE,
  (data) => ({
    payload: data,
  })
);
