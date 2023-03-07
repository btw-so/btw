import { createReducer } from '@reduxjs/toolkit';

import { STATUS } from 'literals';

import { v4 as uuidv4 } from 'uuid';

import {
  getNotes,
  getNotesSuccess,
  getNotesFailure,
  upsertNote,
  upsertNoteSuccess,
  upsertNoteFailure,
} from 'actions';

export const notesState = {
  notesMap: {},
  notesList: {
    status: STATUS.IDLE,
    data: [],
    error: null,
  },
  selectedNoteId: null,
};

export default {
  notes: createReducer(notesState, builder => {
    builder
      .addCase(getNotes, draft => {
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
          payload.notes.forEach(note => {
            let { id, user_id, title, created_at, updated_at } = note;
            created_at = new Date(created_at).getTime();
            updated_at = new Date(updated_at).getTime();

            if (draft.notesMap[id].updated_at > updated_at) {
              updated_at = draft.notesMap[id].updated_at;
            }

            draft.notesMap[id] = Object.assign({}, draft.notesMap[id], {
              id,
              user_id,
              title,
              created_at,
              updated_at,
            });
          });
        }

        draft.notesList.data = Object.keys(draft.notesMap).sort((a, b) => {
          return draft.notesMap[b].updated_at - draft.notesMap[a].updated_at;
        });

        if (!draft.selectedNoteId) {
          if (draft.notesList.data.length === 0) {
            // create a random new uuid
            draft.selectedNoteId = uuidv4();
            // insert this random new uuid element into notesMap and notesList
            draft.notesMap[draft.selectedNoteId] = {
              status: STATUS.IDLE,
              error: null,
              created_at: Date.now(),
              user_id: payload.user_id,
              title: '',
              id: draft.selectedNoteId,
            };
            draft.notesList.data.push(draft.selectedNoteId);
          } else {
            draft.selectedNoteId = draft.notesList.data[0].id;
          }
        }
      })
      .addCase(getNotesFailure, (draft, { payload }) => {
        draft.notesList.status = STATUS.ERROR;
        draft.notesList.error = payload.error;
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
      });
  }),
};
