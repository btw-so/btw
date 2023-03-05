import { createAction } from '@reduxjs/toolkit';

import { ActionTypes } from 'literals';

export const login = createAction(ActionTypes.USER_LOGIN_REQUEST);
export const loginSuccess = createAction(ActionTypes.USER_LOGIN_SUCCESS);

export const logOut = createAction(ActionTypes.USER_LOGOUT_REQUEST);
export const logOutSuccess = createAction(ActionTypes.USER_LOGOUT_SUCCESS);

export const getUser = createAction(ActionTypes.GET_USER);
export const getUserSuccess = createAction(ActionTypes.GET_USER_SUCCESS, data => ({
  payload: data,
}));
export const getUserFailure = createAction(ActionTypes.GET_USER_FAILURE, data => ({
  payload: data,
}));

export const generateOtp = createAction(ActionTypes.GENERATE_OTP, data => ({
  payload: data,
}));
export const generateOtpSuccess = createAction(
  ActionTypes.GENERATE_OTP_SUCCESS,
  ({ success, error, data }) => ({ payload: { success, error, data } }),
);
export const generateOtpFailure = createAction(ActionTypes.GENERATE_OTP_FAILURE, data => ({
  payload: data,
}));

export const verifyOtp = createAction(ActionTypes.VERIFY_OTP, ({ email, otp } = {}) => ({
  payload: { email, otp },
}));
export const verifyOtpSuccess = createAction(ActionTypes.VERIFY_OTP_SUCCESS, data => ({
  payload: data,
}));
export const verifyOtpFailure = createAction(ActionTypes.VERIFY_OTP_FAILURE, data => ({
  payload: data,
}));

export const updateUser = createAction(ActionTypes.UPDATE_USER, ({ name, slug } = {}) => ({
  payload: { name, slug },
}));
export const updateUserSuccess = createAction(ActionTypes.UPDATE_USER_SUCCESS, data => ({
  payload: data,
}));
export const updateUserFailure = createAction(ActionTypes.UPDATE_USER_FAILURE, data => ({
  payload: data,
}));
