import React from 'react';

import Background from 'components/Background';

import { render } from 'test-utils';

describe('Background', () => {
  it('should render properly', () => {
    const { container } = render(<Background />);

    expect(container).toMatchSnapshot();
  });
});
