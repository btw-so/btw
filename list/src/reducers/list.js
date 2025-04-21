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
  getList,
  getListSuccess,
  getListFailure,
  editListNodeContent,
  editListNodePos,
  newListNode,
  upsertListNode,
  changeSelectedNode,
  getPinnedNodes,
  getPinnedNodesSuccess,
  getPinnedNodesFailure,
  getPublicNote,
  getPublicNoteSuccess,
  getPublicNoteFailure,
  searchNodes,
  searchNodesSuccess,
  searchNodesFailure,
} from "actions";

export const listState = {
  nodeDBMap: {
    home: {
      id: "home",
      parent_id: null,
      text: "Home",
      checked: false,
      pos: 1,
      note_id: "00000000-0000-0000-0000-000000000000",
      pinned_pos: 0,
    },
    init: {
      id: "init",
      parent_id: "home",
      text: "Your first item",
      collapsed: false,
      pos: 1,
      checked: false,
      checked_date: null,
      note_id: "11111111-1111-1111-1111-111111111111",
    },
  },
  nodeUIMap: {
    home: {
      children: ["init"],
    },
  },
  pinnedNodes: {
    status: STATUS.IDLE,
    data: [
      {
        id: "home",
        pinned_pos: 0,
        text: "Home",
      },
    ],
    error: null,
  },
  publicNote: {
    status: STATUS.IDLE,
    data: {},
    error: null,
  },
  searchNodes: {
    status: STATUS.IDLE,
    data: {},
    error: null,
  },
  selectedListId: "home",
};

export default {
  list: createReducer(listState, (builder) => {
    builder.addCase(upsertListNode, (draft, { payload }) => {
      let oldParentId;
      if (payload.posChange) {
        oldParentId = draft.nodeDBMap[payload.id].parent_id;
      }

      draft.nodeDBMap[payload.id] = {
        ...draft.nodeDBMap[payload.id],
        ...payload,
        updated_at: window.SERVER_TIME
          ? window.SERVER_TIME + Date.now() - window.BROWSER_TIME
          : Date.now(),
      };

      if (payload.new || payload.posChange) {
        draft.nodeUIMap[payload.parent_id] = {
          children: Object.keys(draft.nodeDBMap)
            .filter((x) => !!draft.nodeDBMap[x])
            .filter((x) => draft.nodeDBMap[x].parent_id === payload.parent_id)
            .sort((a, b) => draft.nodeDBMap[a].pos - draft.nodeDBMap[b].pos),
        };

        if (oldParentId) {
          draft.nodeUIMap[oldParentId] = {
            children: Object.keys(draft.nodeDBMap)
              .filter((x) => !!draft.nodeDBMap[x])
              .filter((x) => draft.nodeDBMap[x].parent_id === oldParentId)
              .sort((a, b) => draft.nodeDBMap[a].pos - draft.nodeDBMap[b].pos),
          };
        }
      }

      if (payload.pinned_pos) {
        // if it is not in pinnedNodes, then add it
        if (!draft.pinnedNodes.data.find((x) => x.id === payload.id)) {
          draft.pinnedNodes.data = [
            ...draft.pinnedNodes.data,
            {
              id: payload.id,
              pinned_pos: payload.pinned_pos,
              text: draft.nodeDBMap[payload.id].text,
            },
          ];

          // sort pinnedNodes by pinned_pos
          draft.pinnedNodes.data = draft.pinnedNodes.data.sort(
            (a, b) => a.pinned_pos - b.pinned_pos
          );
        }

        // if it is in pinnedNodes, then update it
        if (draft.pinnedNodes.data.find((x) => x.id === payload.id)) {
          draft.pinnedNodes.data = draft.pinnedNodes.data.map((x) =>
            x.id === payload.id ? { ...x, pinned_pos: payload.pinned_pos } : x
          );
        }

        // sort pinnedNodes by pinned_pos
        draft.pinnedNodes.data = draft.pinnedNodes.data.sort(
          (a, b) => a.pinned_pos - b.pinned_pos
        );
      } else {
        // if it is not pinned, then remove it from pinnedNodes
        draft.pinnedNodes.data = draft.pinnedNodes.data.filter(
          (x) => x.id !== payload.id
        );
      }
    });

    builder.addCase(searchNodes, (draft, { payload }) => {
      draft.searchNodes.status = STATUS.RUNNING;
      draft.searchNodes.error = null;
      draft.searchNodes.data = {};
    });

    builder.addCase(searchNodesSuccess, (draft, { payload }) => {
      draft.searchNodes.status = STATUS.SUCCESS;
      draft.searchNodes.data = payload.data;
    });

    builder.addCase(searchNodesFailure, (draft, { payload }) => {
      draft.searchNodes.status = STATUS.ERROR;
      draft.searchNodes.error = payload.error;
    });

    builder.addCase(getPublicNote, (draft, { payload }) => {
      draft.publicNote.status = STATUS.RUNNING;
      draft.publicNote.error = null;
    });

    builder.addCase(getPublicNoteSuccess, (draft, { payload }) => {
      draft.publicNote.status = STATUS.SUCCESS;
      draft.publicNote.data = payload.note;
    });

    builder.addCase(getPublicNoteFailure, (draft, { payload }) => {
      draft.publicNote.status = STATUS.ERROR;
      draft.publicNote.error = payload.error;
    });

    builder.addCase(getPinnedNodes, (draft, { payload }) => {
      draft.pinnedNodes.status = STATUS.RUNNING;
      draft.pinnedNodes.error = null;
    });

    builder.addCase(getPinnedNodesSuccess, (draft, { payload }) => {
      draft.pinnedNodes.status = STATUS.SUCCESS;
      draft.pinnedNodes.data = [
        {
          id: "home",
          pinned_pos: 0,
          text: "Home",
        },
        ...payload.pinnedNodes,
      ];
    });

    builder.addCase(getPinnedNodesFailure, (draft, { payload }) => {
      draft.pinnedNodes.status = STATUS.ERROR;
      draft.pinnedNodes.error = payload.error;
    });

    builder.addCase(changeSelectedNode, (draft, { payload }) => {
      draft.selectedListId = payload.id;
    });

    builder.addCase(getList, (draft, { payload }) => {
      draft.fetchInProgress = true;
      draft.fetchError = null;
    });

    builder.addCase(getListSuccess, (draft, { payload }) => {
      if (payload.isInitialFetch && payload.nodes.length > 1) {
        // delete "init" node in nodeDBMap and make children of home as empty in nodeUIMap
        // delete draft.nodeDBMap.init;
        // draft.nodeUIMap.home.children = [];

        draft.nodeDBMap = {
          home: {
            id: "home",
            parent_id: null,
            text: "Home",
            checked: false,
            pos: 1,
          },
        };

        draft.nodeUIMap = {
          home: {
            children: [],
          },
        };
      }

      for (var node of payload.nodes) {
        if (
          draft.nodeDBMap[node.id] &&
          draft.nodeDBMap[node.id].updated_at &&
          draft.nodeDBMap[node.id].updated_at >
            new Date(node.updated_at).getTime()
        ) {
          // What we have is fresher update than what is in DB. so dismiss
          continue;
        }

        node.updated_at = new Date(node.updated_at).getTime();

        draft.nodeDBMap[node.id] = { ...node };

        if (node.parent_id) {
          draft.nodeUIMap[node.parent_id] = draft.nodeUIMap[node.parent_id] || {
            children: [],
          };

          draft.nodeUIMap[node.parent_id].children = [
            ...new Set([
              ...((draft.nodeUIMap[node.parent_id] || {}).children || []),
              node.id,
            ]),
          ].sort((a, b) => {
            return draft.nodeDBMap[a].pos - draft.nodeDBMap[b].pos;
          });
        }
      }

      if (!payload.partial) {
        draft.fetchInProgress = false;
        draft.fetchError = null;
        draft.lastSuccessfulCallTime = payload.st;
      }
    });

    builder.addCase(getListFailure, (draft, { payload }) => {
      draft.fetchInProgress = false;
      draft.fetchError = payload.error;
    });
  }),
  // listActions: createReducer(actionState, (builder) => {}),
};
