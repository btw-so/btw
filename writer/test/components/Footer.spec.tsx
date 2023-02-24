import React from 'react';

import Footer from 'components/Footer';

import { render } from 'test-utils';

describe('Footer', () => {
  it('should render properly', () => {
    const { container } = render(<Footer />);

    expect(container).toMatchSnapshot();
  });
});
