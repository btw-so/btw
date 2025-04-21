import { createAction } from "@reduxjs/toolkit";

import { ActionTypes } from "literals";

export const batchPushNodes = createAction(
  ActionTypes.BATCH_PUSH_NODES,
  (data) => ({
    payload: data,
  })
);

export const getList = createAction(ActionTypes.GET_LIST, (data) => ({
  payload: data,
}));
export const getListSuccess = createAction(
  ActionTypes.GET_LIST_SUCCESS,
  (data) => ({
    payload: data,
  })
);
export const getListFailure = createAction(
  ActionTypes.GET_LIST_FAILURE,
  (data) => ({
    payload: data,
  })
);

export const newListNode = createAction(ActionTypes.NEW_LIST_NODE, (data) => ({
  payload: data,
}));

export const editListNodePos = createAction(
  ActionTypes.EDIT_LIST_NODE_POS,
  (data) => ({
    payload: data,
  })
);

export const editListNodeContent = createAction(
  ActionTypes.EDIT_LIST_NODE_CONTENT,
  (data) => ({
    payload: data,
  })
);

export const upsertListNode = createAction(
  ActionTypes.UPSERT_LIST_NODE,
  (data) => ({
    payload: data,
  })
);

export const changeSelectedNode = createAction(
  ActionTypes.CHANGE_SELECTED_NODE,
  (data) => ({
    payload: data,
  })
);

export const getPinnedNodes = createAction(
  ActionTypes.GET_PINNED_NODES,
  (data) => ({
    payload: data,
  })
);

export const getPinnedNodesSuccess = createAction(
  ActionTypes.GET_PINNED_NODES_SUCCESS,
  (data) => ({
    payload: data,
  })
);

export const getPinnedNodesFailure = createAction(
  ActionTypes.GET_PINNED_NODES_FAILURE,
  (data) => ({
    payload: data,
  })
);

export const getPublicNote = createAction(
  ActionTypes.GET_PUBLIC_NOTE,
  (data) => ({
    payload: data,
  })
);

export const getPublicNoteSuccess = createAction(
  ActionTypes.GET_PUBLIC_NOTE_SUCCESS,
  (data) => ({
    payload: data,
  })
);

export const getPublicNoteFailure = createAction(
  ActionTypes.GET_PUBLIC_NOTE_FAILURE,
  (data) => ({
    payload: data,
  })
);

export const searchNodes = createAction(
  ActionTypes.SEARCH_NODES,
  (data) => ({
    payload: data,
  })
);

export const searchNodesSuccess = createAction(
  ActionTypes.SEARCH_NODES_SUCCESS,
  (data) => ({
    payload: data,
  })
);

export const searchNodesFailure = createAction(
  ActionTypes.SEARCH_NODES_FAILURE,
  (data) => ({
    payload: data,
  })
);
