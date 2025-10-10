import { now, request } from '@gilbarbara/helpers';
import { all, call, put, select, takeLatest } from 'redux-saga/effects';

import { hasValidCache } from 'modules/helpers';

import { ActionTypes } from 'literals';

import { getRepos, getReposFailure, getReposSuccess } from 'actions';

/**
 * Get Repos
 *
 * @param {Object} action
 *
 */
export function* getReposSaga({ payload }: ReturnType<typeof getRepos>) {
  try {
    const { data = [], updatedAt = 0 } = yield select(s => s.github.topics?.[payload] || {});
    const hasCache = hasValidCache(updatedAt);
    let items;

    if (!hasCache) {
      ({ items = [] } = yield call(
        request,
        `https://api.github.com/search/repositories?q=${payload}&sort=stars`,
      ));
    }

    yield put(
      getReposSuccess(items || data, { cached: hasCache, query: payload, updatedAt: now() }),
    );
  } catch (error: any) {
    yield put(getReposFailure(error.message, payload));
  }
}

/**
 * GitHub Sagas
 */
export default function* root() {
  yield all([takeLatest(ActionTypes.GITHUB_GET_REPOS_REQUEST, getReposSaga)]);
}
