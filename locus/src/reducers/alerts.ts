import { createReducer } from '@reduxjs/toolkit';

import { hideAlert, showAlert } from 'actions';

import { AlertsState } from 'types';

export const alertsState: AlertsState = {
  data: [],
};

export default {
  alerts: createReducer<AlertsState>(alertsState, builder => {
    builder
      .addCase(hideAlert, (draft, { payload }) => {
        draft.data = draft.data.filter(d => d.id !== payload);
      })
      .addCase(showAlert, (draft, { payload }) => {
        draft.data.push(payload);
      });
  }),
};
