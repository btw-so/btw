import React from 'react';

import Logo from 'components/Logo';

import { render } from 'test-utils';

describe('Logo', () => {
  it('should render properly', () => {
    const { container } = render(<Logo />);

    expect(container).toMatchSnapshot();
  });
});
