import { createReducer } from "@reduxjs/toolkit";

import { STATUS } from "literals";

import { v4 as uuidv4 } from "uuid";

import {
  getFile,
  getFileSuccess,
  getFileFailure,
  resetState,
  addFile,
  addFileSuccess,
  addFileFailure,
} from "actions";

import TurndownService from "turndown";
const turndown = new TurndownService();

export const filesState = {
  filesMap: {},
};

export default {
  files: createReducer(filesState, (builder) => {
    builder.addCase(resetState, (draft) => {
      draft.filesMap = {};
    });
    builder
      .addCase(getFile, (draft, { payload }) => {
        if (!draft.filesMap[payload.file_id]) {
          draft.filesMap[payload.file_id] = Object.assign(
            {},
            draft.filesMap[payload.file_id] || {},
            {
              status: STATUS.RUNNING,
              error: null,
            }
          );
        }
      })
      .addCase(getFileSuccess, (draft, { payload }) => {
        draft.filesMap[payload.file.id].status = STATUS.SUCCESS;
        draft.filesMap[payload.file.id].error = null;
        draft.filesMap[payload.file.id].file = payload.file;
      })
      .addCase(getFileFailure, (draft, { payload }) => {
        draft.filesMap[payload.file_id].status = STATUS.ERROR;
        draft.filesMap[payload.file_id].error = payload.error;
      });
  }),
};

