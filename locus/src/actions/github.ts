import { createAction } from '@reduxjs/toolkit';

import { actionPayload } from 'modules/helpers';

import { ActionTypes } from 'literals';

export interface GetReposSuccessMeta {
  cached: boolean;
  query: string;
  updatedAt: number;
}

export const getRepos = createAction<string>(ActionTypes.GITHUB_GET_REPOS_REQUEST);
export const getReposSuccess = createAction(
  ActionTypes.GITHUB_GET_REPOS_SUCCESS,
  (payload: Record<string, any>[], meta: GetReposSuccessMeta) => actionPayload(payload, meta),
);
export const getReposFailure = createAction(
  ActionTypes.GITHUB_GET_REPOS_FAILURE,
  (payload: string, query: string) => actionPayload(payload, { query }),
);
