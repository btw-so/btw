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

import axios from "axios";
const axiosInstance = axios.create({
  timeout: 20000,
  withCredentials: true,
});

const axiosInstanceWithoutCredentials = axios.create({
  timeout: 20000,
});

import genFingerprint from "../fingerprint";
import toast from "react-hot-toast";
import {
  batchPushNodes,
  getListFailure,
  getListSuccess,
  resetState,
  getFile,
  getPinnedNodesSuccess,
  getPinnedNodesFailure,
  getPublicNoteSuccess,
  getPublicNoteFailure,
  searchNodesSuccess,
  searchNodesFailure,
} from "../actions";

async function getServerTime({ attempts = 1 }) {
  // window.SERVER_TIME
  // window.BROWSER_TIME
  // window.LATENCY
  const getPingDomain = () => {
    if (window.location.protocol === "http:") {
      return `https://ping.adaface-flow-worker.workers.dev/`;
    } else {
      return `${window.location.protocol}//pings.adaface-flow-worker.workers.dev/`;
    }
  };

  const run = async (domain) => {
    const st = Date.now();
    const res = await axiosInstanceWithoutCredentials.head(domain);
    const et = Date.now();
    const time = (res.headers || {})["adaface-time"];
    if (time) {
      window.SERVER_TIME = Number(time);
      window.BROWSER_TIME = et * 0.75 + st * 0.25;
      window.LATENCY = et - st;

      // if (window.LATENCY > 30 * 1000) {
      // }
    }
  };
  let promises = [];
  for (var i = 0; i < attempts; i++) {
    promises.push(run(getPingDomain()));
  }

  try {
    await Promise.all(promises);
  } catch (err) {
    // major issue could happen. for now, let's silent fail
    toast.error("Your device could be not in sync with the correct timezone");
    console.log(err);
  }
}

// import FingerprintJS from '@fingerprintjs/fingerprintjs';

async function getFingerPrint() {
  return genFingerprint();
  // const fp = await FingerprintJS.load();

  // const { visitorId } = await fp.get();

  // return visitorId;
}

export function* getPinnedNodesSaga({ payload }) {
  const { user_id } = payload;

  const fingerprint = yield call(getFingerPrint);

  try {
    const { data: res } = yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/list/pinned`,
        method: "POST",
        data: {
          fingerprint,
          user_id,
        },
      })
    );

    yield put(getPinnedNodesSuccess({ pinnedNodes: res.data.pinnedNodes }));
  } catch (e) {
    yield put(getPinnedNodesFailure({ error: "Something went wrong" }));
  }
}

export function* getListSaga({ payload }) {
  // await on getServerTime
  yield call(getServerTime, { attempts: 1 });

  const fingerprint = yield call(getFingerPrint);

  const { after, id } = payload;

  // check if this api is being called first in the app. use window variable so on reload it fetches fresh again
  const isInitialFetch = !window.notesInitialFetchDone;

  // save the time when call started
  const st = window.SERVER_TIME
    ? window.SERVER_TIME + Date.now() - window.BROWSER_TIME
    : Date.now();

  let nodes = [];

  let page = 1;
  let limit = 200;

  // loop through the data until we get all the nodes
  try {
    while (true) {
      const { data: res } = yield call(() =>
        axiosInstance.request({
          url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/list/get`,
          method: "POST",
          data: {
            fingerprint,
            after: isInitialFetch ? 0 : after,
            page,
            limit,
            id,
          },
        })
      );

      // if the node is fetched and if the node has a non-empty file_id, then let's fetch the file
      const nodesWithFile = nodes.filter(
        (node) => node.id === id && node.file_id
      );

      if (nodesWithFile.length > 0) {
        yield call(() =>
          getFile({
            file_id: nodesWithFile[0].file_id,
            user_id: nodesWithFile[0].user_id,
          })
        );
      }

      const { success, data, error, isLoggedIn } = res;
      if (success && isLoggedIn && !error) {
        const { nodes: _nodes, total, page: _page, limit: _limit } = data;

        nodes = [...nodes, ..._nodes];
        limit = _limit;
        page = _page + 1;

        yield put(getListSuccess({ nodes, partial: true, isInitialFetch }));

        if (nodes.length >= total) {
          break;
        }
      } else {
        yield put(
          getListFailure({
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

    window.notesInitialFetchDone = true;

    yield put(getListSuccess({ nodes, partial: false, st }));
  } catch (e) {
    yield put(getListFailure({ error: "Something went wrong" }));
    return;
  }
}

export function* batchPushNodesSaga({ payload }) {
  const fingerprint = yield call(getFingerPrint);

  const { nodes } = payload;

  var attempt = 1;

  try {
    while (true) {
      const { data: res } = yield call(() =>
        axiosInstance.request({
          url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/list/update`,
          method: "POST",
          data: {
            fingerprint,
            nodes,
          },
        })
      );
      if (res.success) {
        if (window.nodeConnectionStatusToastId) {
          toast.success(`Connected`);
          toast.dismiss(window.nodeConnectionStatusToastId);
          window.nodeConnectionStatusToastId = null;
        }

        break;
      } else {
        if (!window.nodeConnectionStatusToastId) {
          window.nodeConnectionStatusToastId = toast.loading(
            `Trying to upload your list`
          );
        }

        if (attempt === 10) {
          // convey proper failure and ask to reload.

          toast.error(
            "Looks like you are not connected to the internet. Reload and try again."
          );

          break;
        }
        attempt++;
      }
    }
  } catch (err) {
    console.log(err);
    toast.error("Error uploading your list");
  }
}

export function* getPublicNoteSaga({ payload }) {
  const { id, hash } = payload;

  try {
    const { data: res } = yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/list/public/note`,
        method: "POST",
        data: {
          id,
          hash,
        },
      })
    );

    yield put(getPublicNoteSuccess({ note: res.data.note }));
  } catch (e) {
    yield put(getPublicNoteFailure({ error: "Something went wrong" }));
  }
}

export function* searchNodesSaga({ payload }) {
  const { user_id, query, limit = 50, page = 1 } = payload;
  const fingerprint = yield call(getFingerPrint);

  try {
    const { data: res } = yield call(() =>
      axiosInstance.request({
        url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/list/search`,
        method: "POST",
        data: {
          user_id,
          query,
          limit,
          page,
          fingerprint,
        },
      })
    );

    yield put(searchNodesSuccess({ data: res.data }));
  } catch (e) {
    console.log(e);
    yield put(searchNodesFailure({ error: "Something went wrong" }));
  }
}

export default function* root() {
  yield all([
    takeEvery(ActionTypes.GET_LIST, getListSaga),
    takeEvery(ActionTypes.BATCH_PUSH_NODES, batchPushNodesSaga),
    takeEvery(ActionTypes.GET_PINNED_NODES, getPinnedNodesSaga),
    takeEvery(ActionTypes.GET_PUBLIC_NOTE, getPublicNoteSaga),
    takeEvery(ActionTypes.SEARCH_NODES, searchNodesSaga),
  ]);
}
