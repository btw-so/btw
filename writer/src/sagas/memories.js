import {
  all,
  put,
  takeLatest,
  call,
} from "redux-saga/effects";

import { ActionTypes } from "literals";

import {
  getMemoriesSuccess,
  getMemoriesFailure,
  addMemorySuccess,
  addMemoryFailure,
  updateMemorySuccess,
  updateMemoryFailure,
  deleteMemorySuccess,
  deleteMemoryFailure,
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

export function* getMemoriesSaga({ payload }) {
  const fingerprint = yield call(getFingerPrint);

  try {
    const { data: res } = yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/memories/get`,
        method: "POST",
        data: {
          fingerprint,
        },
      })
    );

    const { success, data, error, isLoggedIn } = res;

    if (success && isLoggedIn && !error) {
      const { memories } = data;
      yield put(getMemoriesSuccess({ memories }));
    } else {
      yield put(
        getMemoriesFailure({
          error: error || "Failed to fetch memories",
        })
      );
    }
  } catch (e) {
    yield put(getMemoriesFailure({ error: "Something went wrong" }));
    return;
  }
}

export function* addMemorySaga({ payload }) {
  const fingerprint = yield call(getFingerPrint);
  const { memory } = payload;

  try {
    const { data: res } = yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/memories/add`,
        method: "POST",
        data: {
          fingerprint,
          memory,
        },
      })
    );

    const { success, data, error, isLoggedIn } = res;

    if (success && isLoggedIn && !error) {
      const { memory: newMemory } = data;
      yield put(addMemorySuccess({ memory: newMemory }));
    } else {
      yield put(
        addMemoryFailure({
          error: error || "Failed to add memory",
        })
      );
    }
  } catch (e) {
    yield put(addMemoryFailure({ error: "Something went wrong" }));
    return;
  }
}

export function* updateMemorySaga({ payload }) {
  const fingerprint = yield call(getFingerPrint);
  const { memoryId, memory } = payload;

  try {
    const { data: res } = yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/memories/update`,
        method: "PUT",
        data: {
          fingerprint,
          memoryId,
          memory,
        },
      })
    );

    const { success, data, error, isLoggedIn } = res;

    if (success && isLoggedIn && !error) {
      const { memory: updatedMemory } = data;
      yield put(updateMemorySuccess({ memory: updatedMemory }));
    } else {
      yield put(
        updateMemoryFailure({
          error: error || "Failed to update memory",
        })
      );
    }
  } catch (e) {
    yield put(updateMemoryFailure({ error: "Something went wrong" }));
    return;
  }
}

export function* deleteMemorySaga({ payload }) {
  const fingerprint = yield call(getFingerPrint);
  const { memoryId } = payload;

  try {
    const { data: res } = yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/memories/delete`,
        method: "DELETE",
        data: {
          fingerprint,
          memoryId,
        },
      })
    );

    const { success, data, error, isLoggedIn } = res;

    if (success && isLoggedIn && !error) {
      yield put(deleteMemorySuccess({ memoryId }));
    } else {
      yield put(
        deleteMemoryFailure({
          error: error || "Failed to delete memory",
        })
      );
    }
  } catch (e) {
    yield put(deleteMemoryFailure({ error: "Something went wrong" }));
    return;
  }
}

export default function* root() {
  yield all([
    takeLatest(ActionTypes.GET_MEMORIES, getMemoriesSaga),
    takeLatest(ActionTypes.ADD_MEMORY, addMemorySaga),
    takeLatest(ActionTypes.UPDATE_MEMORY, updateMemorySaga),
    takeLatest(ActionTypes.DELETE_MEMORY, deleteMemorySaga),
  ]);
}
