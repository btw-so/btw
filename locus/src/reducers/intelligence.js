import { createReducer } from "@reduxjs/toolkit";

import { STATUS } from "literals";

import { v4 as uuidv4 } from "uuid";


import {
  saveIntelligenceApiKeys,
  savePreferredTabs,
} from "actions";

export const intelligenceState = {
  apiKeys: {},
  preferredTabs: []
};

export default {
  intelligence: createReducer(intelligenceState, (builder) => {
    builder.addCase(saveIntelligenceApiKeys, (draft, { payload }) => {
      draft.apiKeys = payload.apiKeys;
    });
    builder.addCase(savePreferredTabs, (draft, { payload }) => {
      draft.preferredTabs = payload.preferredTabs;
    });
  }),
};
