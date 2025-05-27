import { createReducer } from "@reduxjs/toolkit";

import { STATUS } from "literals";

import { v4 as uuidv4 } from "uuid";

import {
  getNote,
  getNoteSuccess,
  getNoteFailure,
  resetState,
  saveNoteContent,
} from "actions";

import TurndownService from "turndown";
const turndown = new TurndownService();

export const notesState = {
  notesMap: {},
};

export default {
  notes: createReducer(notesState, (builder) => {
    builder.addCase(resetState, (draft) => {
      draft.notesMap = {};
    });
    builder
      .addCase(saveNoteContent, (draft, { payload }) => {
        let md = "";
        if (payload.content) {
          try {
            md = turndown.turndown(
              payload.content.replace(/<h1.*?>.*?<\/h1>/g, "")
            );
          } catch (e) {
            console.log(e);
          }
        }

        const changesMade =
          ((draft.notesMap[payload.id] || {}).md || "") !== (md || "");

        draft.notesMap[payload.id] = Object.assign(
          {},
          draft.notesMap[payload.id] || {},
          {
            html: payload.content,
            md,
            ...(changesMade
              ? {
                  updated_at: Date.now(),
                }
              : {}),
          }
        );

        draft.notesList.data = Object.keys(draft.notesMap).sort((a, b) => {
          return draft.notesMap[b].updated_at - draft.notesMap[a].updated_at;
        });
      });

    builder
      .addCase(getNote, (draft, { payload }) => {
        draft.notesMap[payload.id].status = STATUS.RUNNING;
        draft.notesMap[payload.id].error = null;
      })
      .addCase(getNoteSuccess, (draft, { payload }) => {
        draft.notesMap[payload.id].status = STATUS.SUCCESS;
        draft.notesMap[payload.id].error = null;
        draft.notesMap[payload.id].ydoc = payload.ydoc;
        draft.notesMap[payload.id].md = payload.md;
        draft.notesMap[payload.id].title = payload.title;
        draft.notesMap[payload.id].slug = payload.slug;
        draft.notesMap[payload.id].updated_at = payload.updated_at
          ? new Date(payload.updated_at).getTime()
          : null;
        draft.notesMap[payload.id].created_at = payload.created_at
          ? new Date(payload.created_at).getTime()
          : null;
        draft.notesMap[payload.id].published_at = payload.published_at
          ? new Date(payload.published_at).getTime()
          : null;
        draft.notesMap[payload.id].publish = payload.publish;
        draft.notesMap[payload.id].archive = payload.archive;
        draft.notesMap[payload.id].private = payload.private;
        draft.notesMap[payload.id].delete = payload.delete;
        draft.notesMap[payload.id].deleted_at = payload.deleted_at
          ? new Date(payload.deleted_at).getTime()
          : null;
      })
      .addCase(getNoteFailure, (draft, { payload }) => {
        draft.notesMap[payload.id].status = STATUS.ERROR;
        draft.notesMap[payload.id].error = payload.error;
      });
  }),
};
