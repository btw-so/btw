import { createSelector } from '@reduxjs/toolkit';

export const selectApp = createSelector(
  state => state.app,
  app => app,
);

export const selectGitHub = createSelector(
  state => state.github,
  github => github,
);

export const selectUser = createSelector(
  state => state.user,
  user => user,
);
