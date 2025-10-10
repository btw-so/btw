import { ActionTypes } from 'literals';

import { hideAlert, showAlert } from 'actions';
import reducer from 'reducers/alerts';

import { emptyAction } from 'test-utils';

describe('reducers/alerts', () => {
  let alerts = reducer.alerts(undefined, emptyAction);

  it('should return the initial state', () => {
    expect(reducer.alerts(alerts, emptyAction)).toMatchSnapshot();
  });

  it(`should handle ${ActionTypes.SHOW_ALERT}`, () => {
    alerts = reducer.alerts(alerts, showAlert('HELLO', { id: 'test', variant: 'success' }));
    expect(alerts).toMatchSnapshot();
  });

  it(`should handle ${ActionTypes.HIDE_ALERT}`, () => {
    alerts = reducer.alerts(alerts, hideAlert('test'));
    expect(alerts).toMatchSnapshot();
  });
});
