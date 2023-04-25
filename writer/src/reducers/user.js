import { createReducer } from "@reduxjs/toolkit";

import { STATUS } from "literals";

import {
  login,
  loginSuccess,
  logOut,
  logOutSuccess,
  getUser,
  getUserSuccess,
  getUserFailure,
  generateOtp,
  generateOtpSuccess,
  generateOtpFailure,
  verifyOtp,
  verifyOtpSuccess,
  verifyOtpFailure,
  updateUser,
  updateUserSuccess,
  updateUserFailure,
  resetState,
  addCustomDomain,
  addCustomDomainSuccess,
  addCustomDomainFailure,
} from "actions";

export const userState = {
  user: {
    status: STATUS.IDLE,
    data: null,
    error: null,
    isLoggedIn: false,
  },
};

export const otpState = {
  otp: {
    status: STATUS.IDLE,
    data: null,
    error: null,
  },
  verifyOtp: {
    status: STATUS.IDLE,
    data: null,
    error: null,
  },
  addCustomDomain: {
    status: STATUS.IDLE,
    data: null,
    error: null,
  },
};

export default {
  user: createReducer(userState, (builder) => {
    builder.addCase(resetState, (draft) => {
      draft.user = userState.user;
    });

    builder
      .addCase(getUser, (draft) => {
        draft.user.status = STATUS.RUNNING;
        draft.user.error = null;
      })
      .addCase(getUserSuccess, (draft, { payload }) => {
        draft.user.status = STATUS.SUCCESS;
        draft.user.data = payload;
        draft.user.isLoggedIn = true;
      })
      .addCase(getUserFailure, (draft, { payload }) => {
        draft.user.status = STATUS.ERROR;
        draft.user.error = payload;
        draft.user.isLoggedIn = false;
      });

    builder
      .addCase(updateUser, (draft) => {
        draft.user.status = STATUS.RUNNING;
        draft.user.error = null;
      })
      .addCase(updateUserSuccess, (draft, { payload }) => {
        draft.user.status = STATUS.SUCCESS;
      })
      .addCase(updateUserFailure, (draft, { payload }) => {
        draft.user.status = STATUS.ERROR;
        draft.user.error = payload.error;
      });
  }),

  otp: createReducer(otpState, (builder) => {
    builder.addCase(resetState, (draft) => {
      return otpState;
    });

    builder
      .addCase(generateOtp, (draft) => {
        draft.otp.status = STATUS.RUNNING;
        draft.otp.error = null;
      })
      .addCase(generateOtpSuccess, (draft, { payload }) => {
        draft.otp.status = STATUS.SUCCESS;
      })
      .addCase(generateOtpFailure, (draft, { payload }) => {
        draft.otp.status = STATUS.ERROR;
        draft.otp.error = payload.error;
      });

    builder
      .addCase(verifyOtp, (draft) => {
        draft.verifyOtp.status = STATUS.RUNNING;
        draft.verifyOtp.error = null;
      })
      .addCase(verifyOtpSuccess, (draft, { payload }) => {
        draft.verifyOtp.status = STATUS.SUCCESS;
        draft.verifyOtp.error = null;
      })
      .addCase(verifyOtpFailure, (draft, { payload }) => {
        draft.verifyOtp.status = STATUS.ERROR;
        draft.verifyOtp.error = payload.error;
      });

    builder
      .addCase(addCustomDomain, (draft) => {
        draft.addCustomDomain.status = STATUS.RUNNING;
        draft.addCustomDomain.error = null;
      })
      .addCase(addCustomDomainSuccess, (draft, { payload }) => {
        draft.addCustomDomain.status = STATUS.SUCCESS;
        draft.addCustomDomain.error = null;
      })
      .addCase(addCustomDomainFailure, (draft, { payload }) => {
        draft.addCustomDomain.status = STATUS.ERROR;
        draft.addCustomDomain.error = payload.error;
      });
  }),
};
