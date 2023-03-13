import { keyMirror } from "@gilbarbara/helpers";

// import { Status } from "types";

export const ActionTypes = keyMirror({
  GITHUB_GET_REPOS_REQUEST: undefined,
  GITHUB_GET_REPOS_SUCCESS: undefined,
  GITHUB_GET_REPOS_FAILURE: undefined,
  HIDE_ALERT: undefined,
  SHOW_ALERT: undefined,
  SET_APP_OPTIONS: undefined,
  USER_LOGIN_REQUEST: undefined,
  USER_LOGIN_SUCCESS: undefined,
  USER_LOGIN_FAILURE: undefined,
  USER_LOGOUT_REQUEST: undefined,
  USER_LOGOUT_SUCCESS: undefined,
  USER_LOGOUT_FAILURE: undefined,
  GET_USER: undefined,
  GET_USER_SUCCESS: undefined,
  GET_USER_FAILURE: undefined,
  GENERATE_OTP: undefined,
  GENERATE_OTP_SUCCESS: undefined,
  GENERATE_OTP_FAILURE: undefined,
  VERIFY_OTP: undefined,
  VERIFY_OTP_SUCCESS: undefined,
  VERIFY_OTP_FAILURE: undefined,
  UPDATE_USER: undefined,
  UPDATE_USER_SUCCESS: undefined,
  UPDATE_USER_FAILURE: undefined,
  GET_NOTES: undefined,
  GET_NOTES_SUCCESS: undefined,
  GET_NOTES_FAILURE: undefined,
  UPSERT_NOTE: undefined,
  UPSERT_NOTE_SUCCESS: undefined,
  UPSERT_NOTE_FAILURE: undefined,
  CREATE_NEW_NOTE: undefined,
  SELECT_NOTE: undefined,
  SAVE_NOTE_CONTENT: undefined,
  IMPORT_NOTES: undefined,
});

export const STATUS = {
  IDLE: "idle",
  RUNNING: "running",
  READY: "ready",
  SUCCESS: "success",
  ERROR: "error",
};
