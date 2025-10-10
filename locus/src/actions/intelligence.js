
import { createAction } from "@reduxjs/toolkit";

import { ActionTypes } from "literals";

export const saveIntelligenceApiKeys = createAction(
  ActionTypes.SAVE_INTELLIGENCE_API_KEYS,
  (apiKeys) => ({
    payload: { apiKeys },
  })
);

export const savePreferredTabs = createAction(
  ActionTypes.SAVE_PREFERRED_TABS,
  (preferredTabs) => ({
    payload: { preferredTabs },
  })
);
