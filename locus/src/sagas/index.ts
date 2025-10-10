import { all, fork } from 'redux-saga/effects';

import github from './github';
import user from './user';
import list from './list';
import files from './files';

/**
 * rootSaga
 */
export default function* root() {
  yield all([fork(github), fork(user), fork(list), fork(files)]);
}
