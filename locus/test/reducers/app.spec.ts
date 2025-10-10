import { ActionTypes } from 'literals';

import { setAppOptions } from 'actions';
import reducer from 'reducers/app';

import { emptyAction } from 'test-utils';

describe('reducers/app', () => {
  let app = reducer.app(undefined, emptyAction);

  it('should return the initial state', () => {
    expect(reducer.app(app, emptyAction)).toMatchSnapshot();
  });

  it(`should handle ${ActionTypes.SET_APP_OPTIONS}`, () => {
    app = reducer.app(app, setAppOptions({ query: 'test' }));
    expect(app).toMatchSnapshot();
  });
});
