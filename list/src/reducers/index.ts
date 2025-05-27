import alerts, { alertsState } from './alerts';
import app, { appState } from './app';
import files, { filesState } from './files';
import github, { githubState } from './github';
import user, { userState } from './user';
import otp, { otpState } from './user';
import list, { listState } from './list';
import notes, { notesState } from './notes';

export const initialState = {
  alerts: alertsState,
  app: appState,
  files: filesState,
  github: githubState,
  user: userState,
  otp: otpState,
  list: listState,
  notes: notesState,
};

export default {
  ...alerts,
  ...app,
  ...github,
  ...user,
  ...otp,
  ...list,
  ...notes,
  ...files,
};
