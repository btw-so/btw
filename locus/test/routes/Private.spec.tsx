import React from 'react';

import Private from 'routes/Private';

import { render, screen } from 'test-utils';

describe('Private', () => {
  it('should render properly', () => {
    render(<Private />);

    expect(screen.getByTestId('Private')).toMatchSnapshot();
  });
});
