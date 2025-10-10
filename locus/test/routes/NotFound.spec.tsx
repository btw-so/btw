import React from 'react';

import NotFound from 'routes/NotFound';

import { fireEvent, navigate, render, screen } from 'test-utils';

describe('NotFound', () => {
  it('should render properly', () => {
    render(<NotFound />);

    expect(screen.getByTestId('NotFound')).toMatchSnapshot();
  });

  it('should redirect to home', () => {
    navigate({ pathname: '/some-page' });

    render(<NotFound />);

    fireEvent.click(screen.getByRole('link'));

    expect(window.location.pathname).toBe('/');
  });
});
