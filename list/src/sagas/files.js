import {
  all,
  delay,
  put,
  takeLatest,
  call,
  takeEvery,
  debounce,
} from "redux-saga/effects";

import { ActionTypes } from "literals";

import {
  addFileSuccess,
  addFileFailure,
  getFileSuccess,
  getFileFailure,
  resetState,
} from "actions";

import axios from "axios";
const axiosInstance = axios.create({
  timeout: 20000,
  withCredentials: true,
});

import genFingerprint from "../fingerprint";
import toast from "react-hot-toast";

// import FingerprintJS from '@fingerprintjs/fingerprintjs';

async function getFingerPrint() {
  return genFingerprint();
  // const fp = await FingerprintJS.load();

  // const { visitorId } = await fp.get();

  // return visitorId;
}

export function* getFile({ payload }) {
  const { user_id, file_id } = payload;
  const fingerprint = yield call(getFingerPrint);

  try {
    const { data: res } = yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/files/get-by-id`,
        method: "POST",
        data: {
          fingerprint,
          user_id,
          file_id,
        },
      })
    );

    const { success, data, error } = res;

    if (success && !error && data.file) {
      yield put(getFileSuccess({ ...data }));
    } else {
      yield put(getFileFailure({ file_id, error: error || "Something went wrong getting the file" }));
      toast.error("Something went wrong getting the file. Try again.");
    }
  } catch (e) {
    console.log(e);
    yield put(getFileFailure({ file_id, error: "Something went wrong getting the file" }));
    toast.error("Something went wrong getting the file. Try again.");
  }
}

export function* addFile({ payload }) {
  const { id, url, name, user_id } = payload;
  const fingerprint = yield call(getFingerPrint);

  try {
    const { data: res } = yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/files/add-file`,
        method: "POST",
        data: {
          fingerprint,
          id,
          url,
          name,
          user_id,
        },
      })
    );

    const { success, data, error } = res;
    if (success && !error && data.file_id) {
      yield put(addFileSuccess({ ...data }));

      toast.success(`${name} added successfully`);
    } else {
      yield put(
        addFileFailure({
          error: error || "Something went wrong adding the file",
          id,
        })
      );

      toast.error("Something went wrong adding the file. Try again.");

      return;
    }
  } catch (e) {
    yield put(
      addFileFailure({
        error: "Something went wrong adding the file",
        id,
      })
    );

    toast.error("Something went wrong adding the file. Try again.");

    return;
  }
}

export default function* root() {
  yield all([
    takeEvery(ActionTypes.GET_FILE, getFile),
    takeEvery(ActionTypes.ADD_FILE, addFile),
  ]);
}
