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
  getNotesSuccess,
  getNotesFailure,
  upsertNoteSuccess,
  upsertNoteFailure,
  publishNoteSuccess,
  publishNoteFailure,
  archiveNoteSuccess,
  archiveNoteFailure,
  deleteNoteSuccess,
  deleteNoteFailure,
  getNoteSuccess,
  getNoteFailure,
  resetState,
  setNoteSlugSuccess,
  setNoteSlugFailure,
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

export function* getNotesSaga({ payload }) {
  const fingerprint = yield call(getFingerPrint);

  const { after } = payload;

  let notes = [];

  let page = 1;
  let limit = 50;

  // loop through the data until we get all the notes
  try {
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

      const { success, data, error, isLoggedIn } = res;
      if (success && isLoggedIn && !error) {
        const { notes: _notes, total, page: _page, limit: _limit } = data;

        notes = [...notes, ..._notes];
        limit = _limit;
        page = _page + 1;

        if (notes.length >= total) {
          break;
        }
      } else {
        yield put(
          getNotesFailure({
            error:
              error ||
              (isLoggedIn
                ? "Stale session. Log in again."
                : "Something went wrong"),
          })
        );

        if (!isLoggedIn) {
          // if the user-details API fails, we need to clear the cookie
          // so that the user can login again
          document.cookie = `${
            process.env.REACT_APP_BTW_UUID_KEY || "btw_uuid"
          }=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          yield put(resetState());
        }
        return;
      }
    }

    // Why show connection failed toast here? because hocuspocus websocket connection failed event is not trustable sometimes
    if (window.connectionStatusToastId) {
      toast.success(`Connected`);
      toast.dismiss(window.connectionStatusToastId);
      window.connectionStatusToastId = null;
    }

    yield put(getNotesSuccess({ notes }));
  } catch (e) {
    if (!window.connectionStatusToastId) {
      window.connectionStatusToastId = toast.loading(`Trying to reconnect`);
    }

    yield put(getNotesFailure({ error: "Something went wrong" }));
    return;
  }
}

export function* upsertNote({ html, id, user_id }) {
  const fingerprint = yield call(getFingerPrint);

  try {
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
  } catch (e) {
    yield put(upsertNoteFailure({ error: "Something went wrong" }));
    return;
  }
}

export function* importNotes({ payload }) {
  const { urls } = payload;
  const fingerprint = yield call(getFingerPrint);

  try {
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
  } catch (e) {
    toast.error("Something went wrong. Try again.");
  }
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

export function* archiveNote({ payload }) {
  const { id, archive, user_id } = payload;
  const fingerprint = yield call(getFingerPrint);

  const toastId = toast.loading(
    `${archive ? "Archiving" : "Unarchiving"} note...`
  );

  try {
    const { data: res } = yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/notes/update/archive`,

        method: "POST",
        data: {
          fingerprint,
          id,
          archive,
          user_id,
        },
      })
    );

    const { success, data, error } = res;
    if (success && !error) {
      toast.success(`Note ${archive ? "archived" : "unarchived"}`, {
        id: toastId,
      });

      yield call(() => getNote({ payload: { id } }));

      yield put(archiveNoteSuccess(data));
    } else {
      toast.error(
        `Something went wrong ${
          archive ? "archiving" : "unarchiving"
        } the note. Try again.`,
        { id: toastId }
      );

      yield call(() => getNote({ payload: { id } }));

      yield put(
        archiveNoteFailure({
          error:
            error ||
            `Something went wrong ${
              archive ? "archiving" : "unarchiving"
            } the note`,
        })
      );
      return;
    }
  } catch (e) {
    console.log(e);
    toast.error(
      `Something went wrong ${
        archive ? "archiving" : "unarchiving"
      } the note. Try again.`,
      { id: toastId }
    );

    yield call(() => getNote({ payload: { id } }));

    yield put(
      archiveNoteFailure({
        error:
          e.message ||
          `Something went wrong ${
            archive ? "archiving" : "unarchiving"
          } the note`,
      })
    );

    return;
  }
}

export function* deleteNote({ payload }) {
  const { id, delete: deleteAs, user_id, moveToArchive } = payload;
  const fingerprint = yield call(getFingerPrint);

  const toastId = toast.loading(
    `${
      deleteAs ? "Deleting" : moveToArchive ? "Moving to archive" : "Recovering"
    } note...`
  );

  try {
    const { data: res } = yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/notes/update/delete`,

        method: "POST",
        data: {
          fingerprint,
          id,
          delete: deleteAs,
          moveToArchive,
          user_id,
        },
      })
    );

    const { success, data, error } = res;
    if (success && !error) {
      toast.success(
        `Note ${
          deleteAs
            ? "deleted"
            : moveToArchive
            ? "moved to archive"
            : "recovered"
        }`,
        {
          id: toastId,
        }
      );

      yield call(() => getNote({ payload: { id } }));

      yield put(deleteNoteSuccess(data));
    } else {
      toast.error(
        `Something went wrong ${
          deleteAs
            ? "Deleting"
            : moveToArchive
            ? "Moving to archive"
            : "Recovering"
        } the note. Try again.`,
        { id: toastId }
      );

      yield call(() => getNote({ payload: { id } }));

      yield put(
        deleteNoteFailure({
          error:
            error ||
            `Something went wrong ${
              deleteAs
                ? "Deleting"
                : moveToArchive
                ? "Moving to archive"
                : "Recovering"
            } the note`,
        })
      );
      return;
    }
  } catch (e) {
    console.log(e);
    toast.error(
      `Something went wrong ${
        deleteAs
          ? "Deleting"
          : moveToArchive
          ? "Moving to archive"
          : "Recovering"
      } the note. Try again.`,
      { id: toastId }
    );

    yield call(() => getNote({ payload: { id } }));

    yield put(
      deleteNoteFailure({
        error:
          e.message ||
          `Something went wrong ${
            deleteAs
              ? "Deleting"
              : moveToArchive
              ? "Moving to archive"
              : "Recovering"
          } the note`,
      })
    );

    return;
  }
}

export function* setNoteSlug({ payload }) {
  const { id, slug, user_id } = payload;
  const fingerprint = yield call(getFingerPrint);

  const toastId = toast.loading(`Changing the note url...`);

  try {
    const { data: res } = yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/notes/update/slug`,

        method: "POST",
        data: {
          fingerprint,
          id,
          user_id,
          slug,
        },
      })
    );

    const { success, data, error } = res;
    if (success && !error) {
      toast.success(`Success`, {
        id: toastId,
      });

      yield call(() => getNote({ payload: { id } }));

      yield put(setNoteSlugSuccess(data));
    } else {
      toast.error(
        `Something went wrong changing the URL of the note. Try again.`,
        { id: toastId }
      );

      yield call(() => getNote({ payload: { id } }));

      yield put(
        setNoteSlugFailure({
          error:
            error ||
            `Something went wrong changing the URL of the note. Try again.`,
        })
      );
      return;
    }
  } catch (e) {
    console.log(e);
    toast.error(
      `Something went wrong changing the URL of the note. Try again.`,
      { id: toastId }
    );

    yield call(() => getNote({ payload: { id } }));

    yield put(
      setNoteSlugFailure({
        error:
          e.message ||
          `Something went wrong changing the URL of the note. Try again.`,
      })
    );

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
    takeEvery(ActionTypes.ARCHIVE_NOTE, archiveNote),
    takeEvery(ActionTypes.DELETE_NOTE, deleteNote),
    takeEvery(ActionTypes.GET_NOTE, getNote),
    takeEvery(ActionTypes.SET_NOTE_SLUG, setNoteSlug),
  ]);
}
