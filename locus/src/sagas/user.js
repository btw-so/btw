import {
  all,
  delay,
  put,
  takeLatest,
  call,
  takeEvery,
} from "redux-saga/effects";

import toast from "react-hot-toast";

import { ActionTypes } from "literals";

import {
  getUserSuccess,
  getUserFailure,
  generateOtpSuccess,
  generateOtpFailure,
  verifyOtpSuccess,
  verifyOtpFailure,
  updateUserSuccess,
  updateUserFailure,
  resetState,
} from "actions";

import axios from "axios";
const axiosInstance = axios.create({
  timeout: 20000,
  withCredentials: true,
});

import genFingerprint from "../fingerprint";

// import FingerprintJS from '@fingerprintjs/fingerprintjs';

async function getFingerPrint() {
  return genFingerprint();
  // const fp = await FingerprintJS.load();

  // const { visitorId } = await fp.get();

  // return visitorId;
}

export function* getUserSaga() {
  // do a fetch call to process.env.REACT_APP_TASKS_PUBLIC_URL
  // const response = yield call(fetch, 'https://jsonplaceholder.typicode.com/todos/1');
  // const data = yield response.json();

  const fingerprint = yield call(getFingerPrint);

  // Check if we're on a private note page and include the URL
  const privateNoteUrl = window.location.pathname.includes('/private/note/')
    ? window.location.href
    : null;

  try {
    const { data: res } = yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/user/details`,
        method: "POST",
        data: {
          fingerprint,
          privateNoteUrl,
        },
      })
    );

    const { success, data, error } = res;

    if (success && data.user && data.isLoggedIn) {
      // If backend sent new fingerprint (from private note auth), save it
      if (data.fingerprint && data.fingerprint !== fingerprint) {
        localStorage.setItem('fingerprint_uuid', data.fingerprint);
        console.log('[getUserSaga] Updated fingerprint to:', data.fingerprint);
      }

      yield put(getUserSuccess(data.user));
    } else {
      yield put(getUserFailure({ error: error || "Something went wrong" }));

      if (!data.isLoggedIn) {
        // reset the state
        yield put(resetState());
        // if the user-details API fails, we need to clear the cookie
        // so that the user can login again
        document.cookie = `${
          process.env.REACT_APP_BTW_UUID_KEY || "btw_uuid"
        }=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        // update the user state fresh
        yield put(getUserFailure({ error: error || "Something went wrong" }));
      }
    }
  } catch (e) {
    yield put(getUserFailure({ error: e.message }));
  }
}

export function* generateOtp({ payload }) {
  const fingerprint = yield call(getFingerPrint);
  const { email } = payload || {};

  try {
    const { data } = yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/otp/generate`,
        method: "POST",
        data: {
          email,
          fingerprint,
        },
      })
    );

    const { success, error } = data;

    if (success) {
      yield put(generateOtpSuccess({ success, error }));
    } else {
      yield put(generateOtpFailure({ error: error || "Something went wrong" }));
    }
  } catch (e) {
    yield put(
      generateOtpFailure({ error: e.message || "Something went wrong" })
    );
  }
}

export function* verifyOtp({ payload }) {
  const fingerprint = yield call(getFingerPrint);
  const { email, otp } = payload || {};

  try {
    const { data: res } = yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/otp/validate`,
        method: "POST",
        data: {
          email,
          otp,
          fingerprint,
        },
      })
    );

    const { success, data, error } = res;

    if (success && data.isValid) {
      // 200ms delay
      yield delay(200);

      // get user details
      yield call(getUserSaga);

      yield delay(200);

      yield put(verifyOtpSuccess());
    } else {
      yield put(verifyOtpFailure({ error: error || "Something went wrong" }));
    }
  } catch (e) {
    yield put(verifyOtpFailure({ error: e.message || "Something went wrong" }));
  }
}

export function* updateUser({ payload }) {
  const fingerprint = yield call(getFingerPrint);
  const { name, slug, bio, pic, twitter, linkedin, instagram, settings } =
    payload || {};

  const toastId = toast.loading("Updating user details");

  try {
    const { data: res } = yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/user/update`,
        method: "POST",
        data: {
          fingerprint,
          name,
          slug,
          bio,
          pic,
          twitter,
          linkedin,
          instagram,
          settings,
        },
      })
    );

    const { success, error } = res;

    if (success) {
      yield put(updateUserSuccess());

      // call getUserSaga to update the user in the store
      yield call(getUserSaga);

      toast.success("Profile updated", {
        id: toastId,
      });
    } else {
      yield put(updateUserFailure({ error: error || "Something went wrong" }));

      toast.error(`Error: ${error}`, {
        id: toastId,
      });
    }
  } catch (e) {
    yield put(
      updateUserFailure({ error: e.message || "Something went wrong" })
    );

    toast.error(`Error: ${e.message}`, {
      id: toastId,
    });
  }
}

export function* logOutSaga() {
  const fingerprint = yield call(getFingerPrint);
  try {
    yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/user/logout`,
        method: "POST",
        data: { fingerprint },
      })
    );
    // Clear cookie
    document.cookie = `${process.env.REACT_APP_BTW_UUID_KEY || "btw_uuid"}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    // Reset user state
    yield put(resetState());
    toast.success("Logged out successfully");
  } catch (e) {
    toast.error("Logout failed");
  }
}

export default function* root() {
  yield all([
    takeEvery(ActionTypes.GET_USER, getUserSaga),
    takeEvery(ActionTypes.GENERATE_OTP, generateOtp),
    takeEvery(ActionTypes.VERIFY_OTP, verifyOtp),
    takeEvery(ActionTypes.UPDATE_USER, updateUser),
    takeEvery(ActionTypes.USER_LOGOUT_REQUEST, logOutSaga),
  ]);
}
