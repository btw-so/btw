import { all, delay, put, takeLatest } from 'redux-saga/effects';

import { ActionTypes } from 'literals';

import { loginSuccess, logOutSuccess } from 'actions';

export function* loginSaga() {
  yield delay(400);

  yield put(loginSuccess());
}

export function* logoutSaga() {
  yield delay(200);

  yield put(logOutSuccess());
}

export default function* root() {
  yield all([
    takeLatest(ActionTypes.USER_LOGIN_REQUEST, loginSaga),
    takeLatest(ActionTypes.USER_LOGOUT_REQUEST, logoutSaga),
  ]);
}
