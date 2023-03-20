import { createReducer } from "@reduxjs/toolkit";

import { STATUS } from "literals";

import { v4 as uuidv4 } from "uuid";

import {
  getNotes,
  getNotesSuccess,
  getNotesFailure,
  upsertNote,
  upsertNoteSuccess,
  upsertNoteFailure,
  createNewNote,
  selectNote,
  saveNoteContent,
  getNote,
  getNoteSuccess,
  getNoteFailure,
  publishNote,
  publishNoteSuccess,
  publishNoteFailure,
} from "actions";

export const notesState = {
  notesMap: {},
  notesList: {
    status: STATUS.IDLE,
    data: [],
    error: null,
  },
  selectedNoteId: null,
};

export const actionState = {
  publishNote: {
    status: STATUS.IDLE,
    data: null,
  },
};

export default {
  notes: createReducer(notesState, (builder) => {
    builder
      .addCase(getNotes, (draft) => {
        draft.notesList.status = STATUS.RUNNING;
        draft.notesList.error = null;
        draft.notesList.lastFetchedAt = Date.now();
      })
      .addCase(getNotesSuccess, (draft, { payload }) => {
        draft.notesList.status = STATUS.SUCCESS;
        draft.notesList.error = null;
        draft.notesList.lastSuccessAt = draft.notesList.lastFetchedAt;

        if (payload.notes) {
          // loop through notes and merge them into notesMap
          payload.notes.forEach((note) => {
            let { ydoc, id, user_id, title, created_at, updated_at } = note;
            created_at = new Date(created_at).getTime();
            updated_at = new Date(updated_at).getTime();

            if (
              draft.notesMap[id] &&
              draft.notesMap[id].updated_at > updated_at
            ) {
              updated_at = draft.notesMap[id].updated_at;
            }

            draft.notesMap[id] = Object.assign({}, draft.notesMap[id], {
              id,
              user_id,
              title,
              created_at,
              updated_at,
              ydoc,
            });
          });
        }

        draft.notesList.data = Object.keys(draft.notesMap).sort((a, b) => {
          return draft.notesMap[b].updated_at - draft.notesMap[a].updated_at;
        });

        if (
          !draft.selectedNoteId &&
          typeof draft.selectedNoteId !== "undefined"
        ) {
          if (draft.notesList.data.length === 0) {
            // create a random new uuid
            draft.selectedNoteId = uuidv4();
            // insert this random new uuid element into notesMap and notesList
            draft.notesMap[draft.selectedNoteId] = {
              status: STATUS.IDLE,
              error: null,
              created_at: Date.now(),
              user_id: payload.user_id,
              title: "",
              id: draft.selectedNoteId,
            };
            draft.notesList.data.push(draft.selectedNoteId);
          } else {
            draft.selectedNoteId = draft.notesList.data[0];
          }
        }
      })
      .addCase(getNotesFailure, (draft, { payload }) => {
        draft.notesList.status = STATUS.ERROR;
        draft.notesList.error = payload.error;
      })
      .addCase(createNewNote, (draft, { payload }) => {
        const newId = uuidv4();
        // insert this random new uuid element into notesMap and notesList
        draft.notesMap[newId] = {
          status: STATUS.IDLE,
          error: null,
          created_at: Date.now(),
          user_id: payload.user_id,
          title: "New note",
          id: newId,
        };
        draft.notesList.data.push(newId);
        draft.selectedNoteId = newId;
      })
      .addCase(selectNote, (draft, { payload }) => {
        draft.selectedNoteId = payload.id;
      })
      .addCase(saveNoteContent, (draft, { payload }) => {
        draft.notesMap[payload.id] = Object.assign(
          {},
          draft.notesMap[payload.id] || {},
          {
            content: payload.content,
            updated_at: Date.now(),
          }
        );
      });

    builder
      .addCase(upsertNote, (draft, payload) => {
        if (draft.notesMap[payload.id]) {
          draft.notesMap[payload.id].status = STATUS.RUNNING;
          draft.notesMap[payload.id].error = null;
          draft.notesMap[payload.id].updated_at = Date.now();
        } else {
          draft.notesMap[payload.id] = {
            status: STATUS.RUNNING,
            error: null,
            created_at: Date.now(),
            user_id: payload.user_id,
            title: payload.title,
            id: payload.id,
          };
        }
      })
      .addCase(upsertNoteSuccess, (draft, { payload }) => {
        draft.notesMap[payload.id].status = STATUS.SUCCESS;
        draft.notesMap[payload.id].error = null;
      })
      .addCase(upsertNoteFailure, (draft, { payload }) => {
        draft.notesMap[payload.id].status = STATUS.ERROR;
        draft.notesMap[payload.id].error = payload.error;
      })
      .addCase(getNote, (draft, { payload }) => {
        draft.notesMap[payload.id].status = STATUS.RUNNING;
        draft.notesMap[payload.id].error = null;
      })
      .addCase(getNoteSuccess, (draft, { payload }) => {
        draft.notesMap[payload.id].status = STATUS.SUCCESS;
        draft.notesMap[payload.id].error = null;
        draft.notesMap[payload.id].ydoc = payload.ydoc;
        draft.notesMap[payload.id].title = payload.title;
        draft.notesMap[payload.id].updated_at = payload.updated_at;
        draft.notesMap[payload.id].created_at = payload.created_at;
        draft.notesMap[payload.id].published_at = payload.published_at;
        draft.notesMap[payload.id].publish = payload.publish;
      })
      .addCase(getNoteFailure, (draft, { payload }) => {
        draft.notesMap[payload.id].status = STATUS.ERROR;
        draft.notesMap[payload.id].error = payload.error;
      });
  }),
  actions: createReducer(actionState, (builder) => {
    builder
      .addCase(publishNote, (draft) => {
        draft.publishNote.status = STATUS.RUNNING;
        draft.publishNote.error = null;
      })
      .addCase(publishNoteSuccess, (draft, { payload }) => {
        draft.publishNote.status = STATUS.SUCCESS;
        draft.publishNote.error = null;
      })
      .addCase(publishNoteFailure, (draft, { payload }) => {
        draft.publishNote.status = STATUS.ERROR;
        draft.publishNote.error = payload.error;
      });
  }),
};
