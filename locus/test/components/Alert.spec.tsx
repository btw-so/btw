import React from 'react';

import Alert from 'components/Alert';

import { render, screen } from 'test-utils';

describe('Alert', () => {
  it('should render the default alert', () => {
    render(<Alert>Basic Alert</Alert>);

    expect(screen.getByRole('alert')).toMatchSnapshot();
  });

  it.each([
    ['success', 'This is a success message'],
    ['danger', <p key="danger">This is an error message</p>],
    ['warning', 'This is a warning message'],
    ['info', 'This is an info message'],
    ['dark', <div key="dark">This is a message</div>],
  ])('should render the %p type', (variant, children) => {
    render(<Alert variant={variant}>{children}</Alert>);

    expect(screen.getByRole('alert')).toMatchSnapshot();
  });
});
