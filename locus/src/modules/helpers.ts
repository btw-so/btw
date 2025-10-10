import { now } from '@gilbarbara/helpers';
import { createAction } from '@reduxjs/toolkit';
import { REHYDRATE } from 'redux-persist';

import { RootState } from 'types';

export function actionPayload<T = any, M = Record<string, string>>(payload: T, meta?: M) {
  return { payload, meta };
}

/**
 * Check if cache is valid
 */
export function hasValidCache(lastUpdated: number, max = 10): boolean {
  if (!navigator.onLine) {
    return true;
  }

  return lastUpdated + max * 60 > now();
}

export const rehydrateAction = createAction<RootState>(REHYDRATE);
