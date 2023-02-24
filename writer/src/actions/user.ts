import { createAction } from '@reduxjs/toolkit';

import { ActionTypes } from 'literals';

export const login = createAction(ActionTypes.USER_LOGIN_REQUEST);
export const loginSuccess = createAction(ActionTypes.USER_LOGIN_SUCCESS);

export const logOut = createAction(ActionTypes.USER_LOGOUT_REQUEST);
export const logOutSuccess = createAction(ActionTypes.USER_LOGOUT_SUCCESS);
