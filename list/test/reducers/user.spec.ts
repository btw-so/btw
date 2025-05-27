import { ActionTypes } from 'literals';

import reducer from 'reducers/user';

import { emptyAction } from 'test-utils';

describe('User', () => {
  it('should return the initial state', () => {
    expect(reducer.user(undefined, emptyAction)).toMatchSnapshot();
  });

  describe('USER_LOGIN', () => {
    it('should handle REQUEST', () => {
      expect(reducer.user(undefined, { type: ActionTypes.USER_LOGIN_REQUEST })).toMatchSnapshot();
    });

    it('should handle SUCCESS', () => {
      expect(reducer.user(undefined, { type: ActionTypes.USER_LOGIN_SUCCESS })).toMatchSnapshot();
    });
  });

  describe('USER_LOGOUT', () => {
    it('should handle REQUEST', () => {
      expect(reducer.user(undefined, { type: ActionTypes.USER_LOGOUT_REQUEST })).toMatchSnapshot();
    });

    it('should handle SUCCESS', () => {
      expect(reducer.user(undefined, { type: ActionTypes.USER_LOGOUT_SUCCESS })).toMatchSnapshot();
    });
  });
});
