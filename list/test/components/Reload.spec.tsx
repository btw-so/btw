import React from 'react';

import Reload from 'components/Reload';

import { fireEvent, render, screen } from 'test-utils';

describe('Reload', () => {
  const { location } = window;

  beforeAll(() => {
    // @ts-ignore
    delete window.location;
    window.location = { ...location, reload: jest.fn() };
  });

  afterAll(() => {
    window.location = location;
  });

  it('should render properly', () => {
    render(<Reload />);

    expect(screen.getByTestId('Reload')).toMatchSnapshot();

    fireEvent.click(screen.getByRole('button'));

    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });
});
