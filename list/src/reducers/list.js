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
