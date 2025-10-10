import { createReducer } from '@reduxjs/toolkit';

import { topic } from 'config';
import { STATUS } from 'literals';

import { getRepos, getReposFailure, getReposSuccess } from 'actions';

import { GitHubState } from 'types';

export const githubState: GitHubState = {
  topics: {},
};

export default {
  github: createReducer<GitHubState>(githubState, builder => {
    builder
      .addCase(getRepos, (draft, { payload }) => {
        draft.topics[payload] = draft.topics[payload] || { ...topic };

        draft.topics[payload].message = '';
        draft.topics[payload].status = STATUS.RUNNING;
      })
      .addCase(getReposSuccess, (draft, { meta, payload }) => {
        const { cached = false, query = '', updatedAt = 0 } = meta || {};

        draft.topics[query] = draft.topics[query] || { ...topic };

        draft.topics[query].cached = cached;
        draft.topics[query].data = payload;
        draft.topics[query].status = STATUS.SUCCESS;
        draft.topics[query].updatedAt = updatedAt;
      })
      .addCase(getReposFailure, (draft, { meta, payload }) => {
        const { query = '' } = meta || {};

        draft.topics[query] = draft.topics[query] || { ...topic };

        draft.topics[query].message = payload;
        draft.topics[query].status = STATUS.ERROR;
        draft.topics[query].updatedAt = 0;
      });
  }),
};
