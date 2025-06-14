import { createSelector } from "@reduxjs/toolkit";

export const selectApp = createSelector(
  (state) => state.app,
  (app) => app
);

export const selectGitHub = createSelector(
  (state) => state.github,
  (github) => github
);

export const selectUser = createSelector(
  (state) => state.user,
  (user) => user
);

export const selectOtp = createSelector(
  (state) => state.otp,
  (otp) => otp
);

export const selectList = createSelector(
  (state) => state.list,
  (list) => list
);

export const selectNotes = createSelector(
  (state) => state.notes,
  (notes) => notes
);

export const selectFiles = createSelector(
  (state) => state.files,
  (files) => files
);

export const selectIntelligence = createSelector(
  (state) => state.intelligence,
  (intelligence) => intelligence
);