import { createReducer } from "@reduxjs/toolkit";

import { STATUS } from "literals";

import { v4 as uuidv4 } from "uuid";

import Fuse from "fuse.js";

const fuse = new Fuse([], {
  minMatchCharLength: 3,
  keys: ["title", "md"],
  threshold: 0,
  ignoreLocation: true,
});

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
  archiveNote,
  archiveNoteSuccess,
  archiveNoteFailure,
  deleteNote,
  deleteNoteSuccess,
  deleteNoteFailure,
  resetState,
  setNoteSlug,
  setNoteSlugSuccess,
  setNoteSlugFailure,
  searchNotes,
  searchNotesSuccess,
  searchNotesFailure,
} from "actions";

import TurndownService from "turndown";
const turndown = new TurndownService();

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
  archiveNote: {
    status: STATUS.IDLE,
    data: null,
  },
  deleteNote: {
    status: STATUS.IDLE,
    data: null,
  },
  setNoteSlug: {
    status: STATUS.IDLE,
    data: null,
  },
  searchNotes: {
    status: STATUS.IDLE,
    data: null,
  },
};

export default {
  notes: createReducer(notesState, (builder) => {
    builder.addCase(resetState, (draft) => {
      draft.notesMap = {};
      draft.notesList = notesState.notesList;
      draft.selectedNoteId = null;
    });

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
            let {
              md,
              ydoc,
              id,
              user_id,
              title,
              created_at,
              updated_at,
              archive,
              publish,
              delete: deletedAs,
              deleted_at,
              slug,
            } = note;
            created_at = new Date(created_at).getTime();
            updated_at = new Date(updated_at).getTime();
            deleted_at = deleted_at ? new Date(deleted_at).getTime() : null;

            // for search, remove any images from markdown like ![image](https://example.com/image.png)

            fuse.remove((doc) => doc.id === id);
            fuse.add({
              id,
              title,
              md: (md || "").replace(/!\[.*?\]\(.*?\)/g, ""),
            });

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
              md,
              archive,
              publish,
              deleted: deletedAs,
              deleted_at,
              slug,
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
        let md = "";
        let title = "";
        if (payload.content) {
          try {
            md = turndown.turndown(
              payload.content.replace(/<h1.*?>.*?<\/h1>/g, "")
            );

            // get <h1> content from payload.content
            const h1 = payload.content.match(/<h1.*?>(.*?)<\/h1>/);
            if (h1 && h1[1]) {
              title = h1[1];
            }
          } catch (e) {
            console.log(e);
          }
        }

        fuse.remove((doc) => doc.id === payload.id);
        fuse.add({
          id: payload.id,
          title: title || "",
          md: (md || "").replace(/!\[.*?\]\(.*?\)/g, ""),
        });

        draft.notesMap[payload.id] = Object.assign(
          {},
          draft.notesMap[payload.id] || {},
          {
            html: payload.content,
            updated_at: Date.now(),
            md,
            title: title || "",
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
        draft.notesMap[payload.id].delete = payload.delete;
        draft.notesMap[payload.id].deleted_at = payload.deleted_at
          ? new Date(payload.deleted_at).getTime()
          : null;

        fuse.remove((doc) => doc.id === payload.id);
        fuse.add({
          id: payload.id,
          title: payload.title,
          md: (payload.md || "").replace(/!\[.*?\]\(.*?\)/g, ""),
        });
      })
      .addCase(getNoteFailure, (draft, { payload }) => {
        draft.notesMap[payload.id].status = STATUS.ERROR;
        draft.notesMap[payload.id].error = payload.error;
      });
  }),
  actions: createReducer(actionState, (builder) => {
    builder.addCase(resetState, (draft) => {
      return actionState;
    });

    builder
      .addCase(searchNotes, (draft, { payload }) => {
        // draft.searchNotes.status = STATUS.RUNNING;
        // draft.searchNotes.error = null;
        const query = payload.query;
        let results = JSON.parse(JSON.stringify(fuse.search(query)));

        var highlighter = function (matchedItem, indices) {
          var text = matchedItem;
          var result = [];
          var matches = [].concat(indices); // limpar referencia
          var pair = matches.shift();

          for (var i = 0; i < text.length; i++) {
            var char = text.charAt(i);
            if (pair && i == pair[0]) {
              result.push("<mark>");
            }
            result.push(char);
            if (pair && i == pair[1]) {
              result.push("</mark>");
              pair = matches.shift();
            }
          }
          var highlight = result.join("");

          return highlight;
        };

        // convert results.matches to a <mark> highlighted string
        results.map((result) => {
          const title = result.item.title || "";
          const md = result.item.md || "";
          const titleMatch = title.toLowerCase().indexOf(query.toLowerCase());
          const mdMatch = md.toLowerCase().indexOf(query.toLowerCase());

          if (titleMatch !== -1) {
            const highlightedTitle = highlighter(title, [
              [titleMatch, titleMatch + Math.max(query.length - 1, 0)],
            ]);
            result.item.highlightedTitle = highlightedTitle;
          } else {
            result.item.highlightedTitle = title;
          }

          if (mdMatch !== -1) {
            const highlightedMd = highlighter(md, [
              [mdMatch, mdMatch + Math.max(query.length - 1, 0)],
            ]);
            result.item.highlightedMd = highlightedMd;

            // we can't show the whole md, it's too much
            // find the first <mark> and show 30 chars before it and 30 chars after it
            const firstMark = highlightedMd.indexOf("<mark>");
            const lastMark = highlightedMd.indexOf("</mark>");
            const start = firstMark - 30;
            const end = lastMark + 30;
            const highlightedMdShort = highlightedMd.substring(start, end);
            result.item.highlightedMdShort = highlightedMdShort;
          } else {
            // first 42 chars of content
            const highlightedMd = (md || "").substring(0, 42);
            result.item.highlightedMd = highlightedMd;
          }
        });

        draft.searchNotes.data = results;
      })
      .addCase(searchNotesSuccess, (draft, { payload }) => {
        draft.searchNotes.status = STATUS.SUCCESS;
        draft.searchNotes.error = null;
        draft.searchNotes.data = payload.notes;
      })
      .addCase(searchNotesFailure, (draft, { payload }) => {
        draft.searchNotes.status = STATUS.ERROR;
        draft.searchNotes.error = payload.error;
      });

    builder
      .addCase(setNoteSlug, (draft) => {
        draft.setNoteSlug.status = STATUS.RUNNING;
        draft.setNoteSlug.error = null;
      })
      .addCase(setNoteSlugSuccess, (draft, { payload }) => {
        draft.setNoteSlug.status = STATUS.SUCCESS;
        draft.setNoteSlug.error = null;
      })
      .addCase(setNoteSlugFailure, (draft, { payload }) => {
        draft.setNoteSlug.status = STATUS.ERROR;
        draft.setNoteSlug.error = payload.error;
      });

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

    builder
      .addCase(deleteNote, (draft) => {
        draft.deleteNote.status = STATUS.RUNNING;
        draft.deleteNote.error = null;
      })
      .addCase(deleteNoteSuccess, (draft, { payload }) => {
        draft.deleteNote.status = STATUS.SUCCESS;
        draft.deleteNote.error = null;
      })
      .addCase(deleteNoteFailure, (draft, { payload }) => {
        draft.deleteNote.status = STATUS.ERROR;
        draft.deleteNote.error = payload.error;
      });

    builder
      .addCase(archiveNote, (draft) => {
        draft.archiveNote.status = STATUS.RUNNING;
        draft.archiveNote.error = null;
      })
      .addCase(archiveNoteSuccess, (draft, { payload }) => {
        draft.archiveNote.status = STATUS.SUCCESS;
        draft.archiveNote.error = null;
      })
      .addCase(archiveNoteFailure, (draft, { payload }) => {
        draft.archiveNote.status = STATUS.ERROR;
        draft.archiveNote.error = payload.error;
      });
  }),
};
