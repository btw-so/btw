import {
  all,
  delay,
  put,
  takeLatest,
  call,
  takeEvery,
} from "redux-saga/effects";

import { ActionTypes } from "literals";

import {
  getNotesSuccess,
  getNotesFailure,
  upsertNoteSuccess,
  upsertNoteFailure,
  publishNoteSuccess,
  publishNoteFailure,
  getNoteSuccess,
  getNoteFailure,
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

export function* getNotesSaga({ after }) {
  const fingerprint = yield call(getFingerPrint);

  let notes = [];

  let page = 1;
  let limit = 50;

  // loop through the data until we get all the notes
  while (true) {
    const { data: res } = yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/notes/get`,
        method: "POST",
        data: {
          fingerprint,
          after,
          page,
          limit,
        },
      })
    );

    const { success, data, error } = res;
    if (success && !error) {
      const { notes: _notes, total, page: _page, limit: _limit } = data;

      notes = [...notes, ..._notes];
      limit = _limit;
      page = _page + 1;

      if (notes.length >= total) {
        break;
      }
    } else {
      yield put(getNotesFailure({ error: error || "Something went wrong" }));
      return;
    }
  }

  yield put(getNotesSuccess({ notes }));
}

export function* upsertNote({ html, id, user_id }) {
  const fingerprint = yield call(getFingerPrint);

  const { data: res } = yield call(() =>
    axiosInstance.request({
      url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/notes/update/html`,
      method: "POST",
      data: {
        fingerprint,
        id,
        user_id,
        html,
      },
    })
  );

  const { success, data, error } = res;
  if (success && !error) {
    yield put(upsertNoteSuccess(data));
  } else {
    yield put(upsertNoteFailure({ error: error || "Something went wrong" }));
    return;
  }
}

export function* importNotes({ payload }) {
  const { urls } = payload;
  const fingerprint = yield call(getFingerPrint);

  const { data: res } = yield call(() =>
    axiosInstance.request({
      url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/notes/import`,
      method: "POST",
      data: {
        fingerprint,
        urls,
      },
    })
  );

  if (res.success) {
    toast.success("Import started!");
  } else {
    toast.error("Something went wrong. Try again.");
  }
}

export function* getNote({ payload }) {
  const { id } = payload;
  const fingerprint = yield call(getFingerPrint);

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
      })
    );

    toast.error("Something went wrong updating the note. Try again.");

    return;
  }
}

export function* publishNote({ payload }) {
  const { id, publish, user_id } = payload;
  const fingerprint = yield call(getFingerPrint);

  const toastId = toast.loading(
    `${publish ? "Publishing" : "Unpublishing"} note...`
  );

  try {
    const { data: res } = yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/notes/update/publish`,

        method: "POST",
        data: {
          fingerprint,
          id,
          publish,
          user_id,
        },
      })
    );

    const { success, data, error } = res;
    if (success && !error) {
      toast.success(`Note ${publish ? "published" : "unpublished"}`, {
        id: toastId,
      });

      yield call(() => getNote({ payload: { id } }));

      yield put(publishNoteSuccess(data));
    } else {
      toast.error(
        `Something went wrong ${
          publish ? "publishing" : "unpublishing"
        } the note. Try again.`,
        { id: toastId }
      );

      yield call(() => getNote({ payload: { id } }));

      yield put(
        publishNoteFailure({
          error:
            error ||
            `Something went wrong ${
              publish ? "publishing" : "unpublishing"
            } the note`,
        })
      );
      return;
    }
  } catch (e) {
    console.log(e);
    toast.error(
      `Something went wrong ${
        publish ? "publishing" : "unpublishing"
      } the note. Try again.`,
      { id: toastId }
    );

    yield call(() => getNote({ payload: { id } }));

    yield put(
      publishNoteFailure({
        error:
          e.message ||
          `Something went wrong ${
            publish ? "publishing" : "unpublishing"
          } the note`,
      })
    );

    return;
  }
}

export default function* root() {
  yield all([
    takeEvery(ActionTypes.GET_NOTES, getNotesSaga),
    takeEvery(ActionTypes.UPSERT_NOTE, upsertNote),
    takeEvery(ActionTypes.IMPORT_NOTES, importNotes),
    takeEvery(ActionTypes.PUBLISH_NOTE, publishNote),
    takeEvery(ActionTypes.GET_NOTE, getNote),
  ]);
}
