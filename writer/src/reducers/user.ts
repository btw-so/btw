import { createReducer } from '@reduxjs/toolkit';

import { STATUS } from 'literals';

import { login, loginSuccess, logOut, logOutSuccess } from 'actions';

import { UserState } from 'types';

export const userState = {
  isAuthenticated: false,
  status: STATUS.IDLE,
};

export default {
  user: createReducer<UserState>(userState, builder => {
    builder
      .addCase(login, draft => {
        draft.status = STATUS.RUNNING;
      })
      .addCase(loginSuccess, draft => {
        draft.isAuthenticated = true;
        draft.status = STATUS.READY;
      });

    builder
      .addCase(logOut, draft => {
        draft.status = STATUS.RUNNING;
      })
      .addCase(logOutSuccess, draft => {
        draft.isAuthenticated = false;
        draft.status = STATUS.IDLE;
      });
  }),
};
