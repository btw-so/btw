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
  addCustomDomainSuccess,
  addCustomDomainFailure,
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

  const { data: res } = yield call(() =>
    axiosInstance.request({
      url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/user/details`,
      method: "POST",
      data: {
        fingerprint,
      },
    })
  );

  const { success, data, error } = res;

  if (success && data.user && data.isLoggedIn) {
    yield put(getUserSuccess(data.user));
  } else {
    yield put(getUserFailure({ error: error || "Something went wrong" }));
  }
}

export function* generateOtp({ payload }) {
  const fingerprint = yield call(getFingerPrint);
  const { email } = payload || {};

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
}

export function* verifyOtp({ payload }) {
  const fingerprint = yield call(getFingerPrint);
  const { email, otp } = payload || {};

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
}

export function* updateUser({ payload }) {
  const fingerprint = yield call(getFingerPrint);
  const { name, slug } = payload || {};

  const toastId = toast.loading("Updating user details");

  const { data: res } = yield call(() =>
    axiosInstance.request({
      url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/user/update`,
      method: "POST",
      data: {
        fingerprint,
        name,
        slug,
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
}

export function* addCustomDomain({ payload }) {
  const fingerprint = yield call(getFingerPrint);
  const { domain } = payload || {};

  const toastId = toast.loading("Adding custom domain");

  const { data: res } = yield call(() =>
    axiosInstance.request({
      url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/user/add/domain`,
      method: "POST",
      data: {
        fingerprint,
        domain,
      },
    })
  );

  const { success, error } = res;

  if (success) {
    yield put(addCustomDomainSuccess());

    toast.success(`Added domain: ${domain}`, {
      id: toastId,
    });

    toast.success(
      "Domain verification instructions will be sent to your email with in 24 hours"
    );

    // call getUserSaga to update the user in the store
    yield call(getUserSaga);
  } else {
    yield put(
      addCustomDomainFailure({ error: error || "Something went wrong" })
    );

    toast.error(`Error: ${error}`, {
      id: toastId,
    });
  }
}

export default function* root() {
  yield all([
    takeEvery(ActionTypes.GET_USER, getUserSaga),
    takeEvery(ActionTypes.GENERATE_OTP, generateOtp),
    takeEvery(ActionTypes.VERIFY_OTP, verifyOtp),
    takeEvery(ActionTypes.UPDATE_USER, updateUser),
    takeEvery(ActionTypes.ADD_CUSTOM_DOMAIN, addCustomDomain),
  ]);
}
