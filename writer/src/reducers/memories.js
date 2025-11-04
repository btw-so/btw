import { createReducer } from "@reduxjs/toolkit";

import { STATUS } from "literals";

import {
  getMemories,
  getMemoriesSuccess,
  getMemoriesFailure,
  addMemory,
  addMemorySuccess,
  addMemoryFailure,
  updateMemory,
  updateMemorySuccess,
  updateMemoryFailure,
  deleteMemory,
  deleteMemorySuccess,
  deleteMemoryFailure,
} from "actions";

export const memoriesState = {
  memoriesList: {
    status: STATUS.IDLE,
    data: [],
    error: null,
  },
  addMemoryStatus: {
    status: STATUS.IDLE,
    error: null,
  },
  updateMemoryStatus: {
    status: STATUS.IDLE,
    error: null,
  },
  deleteMemoryStatus: {
    status: STATUS.IDLE,
    error: null,
  },
};

export default {
  memories: createReducer(memoriesState, (builder) => {
    builder
      .addCase(getMemories, (draft) => {
        draft.memoriesList.status = STATUS.RUNNING;
      })
      .addCase(getMemoriesSuccess, (draft, action) => {
        draft.memoriesList.status = STATUS.SUCCESS;
        draft.memoriesList.data = action.payload.memories || [];
        draft.memoriesList.error = null;
      })
      .addCase(getMemoriesFailure, (draft, action) => {
        draft.memoriesList.status = STATUS.ERROR;
        draft.memoriesList.error = action.payload;
      })
      .addCase(addMemory, (draft) => {
        draft.addMemoryStatus.status = STATUS.RUNNING;
        draft.addMemoryStatus.error = null;
      })
      .addCase(addMemorySuccess, (draft, action) => {
        draft.addMemoryStatus.status = STATUS.SUCCESS;
        draft.addMemoryStatus.error = null;
        // Add the new memory to the list
        if (action.payload.memory) {
          draft.memoriesList.data.unshift(action.payload.memory);
        }
      })
      .addCase(addMemoryFailure, (draft, action) => {
        draft.addMemoryStatus.status = STATUS.ERROR;
        draft.addMemoryStatus.error = action.payload;
      })
      .addCase(updateMemory, (draft) => {
        draft.updateMemoryStatus.status = STATUS.RUNNING;
        draft.updateMemoryStatus.error = null;
      })
      .addCase(updateMemorySuccess, (draft, action) => {
        draft.updateMemoryStatus.status = STATUS.SUCCESS;
        draft.updateMemoryStatus.error = null;
        // Update the memory in the list
        if (action.payload.memory) {
          const index = draft.memoriesList.data.findIndex(
            (m) => m.id === action.payload.memory.id
          );
          if (index !== -1) {
            draft.memoriesList.data[index] = action.payload.memory;
          }
        }
      })
      .addCase(updateMemoryFailure, (draft, action) => {
        draft.updateMemoryStatus.status = STATUS.ERROR;
        draft.updateMemoryStatus.error = action.payload;
      })
      .addCase(deleteMemory, (draft) => {
        draft.deleteMemoryStatus.status = STATUS.RUNNING;
        draft.deleteMemoryStatus.error = null;
      })
      .addCase(deleteMemorySuccess, (draft, action) => {
        draft.deleteMemoryStatus.status = STATUS.SUCCESS;
        draft.deleteMemoryStatus.error = null;
        // Remove the deleted memory from the list
        if (action.payload.memoryId) {
          draft.memoriesList.data = draft.memoriesList.data.filter(
            (m) => m.id !== action.payload.memoryId
          );
        }
      })
      .addCase(deleteMemoryFailure, (draft, action) => {
        draft.deleteMemoryStatus.status = STATUS.ERROR;
        draft.deleteMemoryStatus.error = action.payload;
      });
  }),
};
