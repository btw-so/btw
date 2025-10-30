import {
  all,
  put,
  takeLatest,
  call,
} from "redux-saga/effects";

import { ActionTypes } from "literals";

import {
  getPlacesSuccess,
  getPlacesFailure,
} from "actions";

import axios from "axios";
const axiosInstance = axios.create({
  timeout: 20000,
  withCredentials: true,
});

import genFingerprint from "../fingerprint";

async function getFingerPrint() {
  return genFingerprint();
}

export function* getPlacesSaga({ payload }) {
  const fingerprint = yield call(getFingerPrint);

  try {
    const { data: res } = yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/places/get`,
        method: "POST",
        data: {
          fingerprint,
        },
      })
    );

    const { success, data, error, isLoggedIn } = res;

    if (success && isLoggedIn && !error) {
      const { places } = data;
      yield put(getPlacesSuccess({ places }));
    } else {
      yield put(
        getPlacesFailure({
          error: error || "Failed to fetch places",
        })
      );
    }
  } catch (e) {
    yield put(getPlacesFailure({ error: "Something went wrong" }));
    return;
  }
}

export default function* root() {
  yield all([
    takeLatest(ActionTypes.GET_PLACES, getPlacesSaga),
  ]);
}
