// Backend URL
export const API_BASE_URL = 'https://api.siddg.com';

export const API_ENDPOINTS = {
  GENERATE_OTP: '/otp/generate',
  VALIDATE_OTP: '/otp/validate',
  GET_LIST: '/list/get',
  GET_NODE: '/list/api/node',
  SEARCH: '/list/search',
  CREATE_NOTE: '/list/api/note/create',
  GET_PINNED: '/list/pinned',
};

export const STORAGE_KEYS = {
  QUICK_NOTE: '@locus_quick_note',
  USER_EMAIL: '@locus_user_email',
  USER_FINGERPRINT: '@locus_user_fingerprint',
  AUTH_TOKEN: '@locus_auth_token',
};
