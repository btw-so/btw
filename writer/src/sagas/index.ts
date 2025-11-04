import { all, fork } from 'redux-saga/effects';

import github from './github';
import user from './user';
import notes from './notes';
import list from './list';
import memories from './memories';

/**
 * rootSaga
 */
export default function* root() {
  yield all([fork(github), fork(user), fork(notes), fork(list), fork(memories)]);
}
