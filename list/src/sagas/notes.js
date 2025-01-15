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
  getNoteSuccess,
  getNoteFailure,
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

export function* getNote({ payload }) {
  const { id } = payload;
  const fingerprint = yield call(getFingerPrint);

  try {
    const { data: res } = yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/notes/get-by-id`,
        method: "POST",
        data: {
          fingerprint,
          id,
        },
      })
    );

    const { success, data, error } = res;
    if (success && !error && data.note) {
      yield put(getNoteSuccess({ ...data.note }));
    } else {
      yield put(
        getNoteFailure({
          error: error || "Something went wrong updating the note",
          id,
        })
      );

      toast.error("Something went wrong updating the note. Try again.");

      return;
    }
  } catch (e) {
    yield put(
      getNoteFailure({
        error: "Something went wrong updating the note",
        id,
      })
    );

    toast.error("Something went wrong updating the note. Try again.");

    return;
  }
}

export default function* root() {
  yield all([
    takeEvery(ActionTypes.GET_NOTE, getNote),
  ]);
}
