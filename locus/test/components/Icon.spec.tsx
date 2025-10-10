import React from 'react';

import Icon from 'components/Icon';

import { render } from 'test-utils';

describe('Icon', () => {
  it('should render properly', () => {
    const { container } = render(<Icon name="check" />);

    expect(container).toMatchSnapshot();
  });
});
