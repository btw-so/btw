import React from 'react';
import App from 'Root';

import { ActionTypes } from 'literals';

import { loginSuccess } from 'actions';

import { act, render, screen } from 'test-utils';

const mockDispatch = jest.fn();

describe('Root', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render properly for anonymous users', () => {
    render(<App />, { mockDispatch });
    expect(screen.getByTestId('app')).toMatchSnapshot();
  });

  it('should render properly for logged users', () => {
    const { store } = render(<App />, {
      mockDispatch,
    });

    act(() => {
      store.dispatch(loginSuccess());
    });

    expect(screen.getByTestId('app')).toMatchSnapshot();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: ActionTypes.SHOW_ALERT,
      payload: {
        id: '8cdee72f-28d4-4441-91f0-c61f6e3d9684',
        icon: 'bell',
        message: 'Hello! And welcome!',
        position: 'bottom-right',
        variant: 'success',
        timeout: 10,
      },
    });
  });
});
