import alerts, { alertsState } from './alerts';
import app, { appState } from './app';
import github, { githubState } from './github';
import user, { userState } from './user';
import otp, { otpState } from './user';
import notes, { notesState } from './notes';

export const initialState = {
  alerts: alertsState,
  app: appState,
  github: githubState,
  user: userState,
  notes: notesState,
  otp: otpState,
};

export default {
  ...alerts,
  ...app,
  ...github,
  ...user,
  ...notes,
  ...otp,
};
