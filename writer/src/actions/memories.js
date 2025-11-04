import { createAction } from "@reduxjs/toolkit";

import { ActionTypes } from "literals";

export const getMemories = createAction(ActionTypes.GET_MEMORIES, (data) => ({
  payload: data,
}));

export const getMemoriesSuccess = createAction(
  ActionTypes.GET_MEMORIES_SUCCESS,
  (data) => ({
    payload: data,
  })
);

export const getMemoriesFailure = createAction(
  ActionTypes.GET_MEMORIES_FAILURE,
  (data) => ({
    payload: data,
  })
);

export const addMemory = createAction(ActionTypes.ADD_MEMORY, (data) => ({
  payload: data,
}));

export const addMemorySuccess = createAction(
  ActionTypes.ADD_MEMORY_SUCCESS,
  (data) => ({
    payload: data,
  })
);

export const addMemoryFailure = createAction(
  ActionTypes.ADD_MEMORY_FAILURE,
  (data) => ({
    payload: data,
  })
);

export const updateMemory = createAction(ActionTypes.UPDATE_MEMORY, (data) => ({
  payload: data,
}));

export const updateMemorySuccess = createAction(
  ActionTypes.UPDATE_MEMORY_SUCCESS,
  (data) => ({
    payload: data,
  })
);

export const updateMemoryFailure = createAction(
  ActionTypes.UPDATE_MEMORY_FAILURE,
  (data) => ({
    payload: data,
  })
);

export const deleteMemory = createAction(ActionTypes.DELETE_MEMORY, (data) => ({
  payload: data,
}));

export const deleteMemorySuccess = createAction(
  ActionTypes.DELETE_MEMORY_SUCCESS,
  (data) => ({
    payload: data,
  })
);

export const deleteMemoryFailure = createAction(
  ActionTypes.DELETE_MEMORY_FAILURE,
  (data) => ({
    payload: data,
  })
);
