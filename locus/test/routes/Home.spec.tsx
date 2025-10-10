import React from 'react';

import Home from 'routes/Home';

import { fireEvent, render, screen } from 'test-utils';

const mockDispatch = jest.fn();

describe('Home', () => {
  it('should render properly', () => {
    render(<Home />);
    expect(screen.getByTestId('Home')).toMatchSnapshot();
  });

  it('should handle clicks', () => {
    render(<Home />, { mockDispatch });
    fireEvent.click(screen.getByTestId('Login'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'USER_LOGIN_REQUEST',
    });
  });
});
