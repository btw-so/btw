import { all, delay, put, takeLatest, call, takeEvery } from 'redux-saga/effects';

import { ActionTypes } from 'literals';

import { getNotesSuccess, getNotesFailure, upsertNoteSuccess, upsertNoteFailure } from 'actions';

import axios from 'axios';
const axiosInstance = axios.create({
  timeout: 20000,
  withCredentials: true,
});

import genFingerprint from './fingerprint';

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
        method: 'POST',
        data: {
          fingerprint,
          after,
          page,
          limit,
        },
      }),
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
      yield put(getNotesFailure({ error: error || 'Something went wrong' }));
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
      method: 'POST',
      data: {
        fingerprint,
        id,
        user_id,
        html,
      },
    }),
  );

  const { success, data, error } = res;
  if (success && !error) {
    yield put(upsertNoteSuccess(data));
  } else {
    yield put(upsertNoteFailure({ error: error || 'Something went wrong' }));
    return;
  }
}

export default function* root() {
  yield all([
    takeEvery(ActionTypes.GET_NOTES, getNotesSaga),
    takeEvery(ActionTypes.UPSERT_NOTE, upsertNote),
  ]);
}
