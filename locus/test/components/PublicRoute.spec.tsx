import React from 'react';

import PublicRoute from 'components/PublicRoute';

import { render } from 'test-utils';

describe('PublicRoute', () => {
  it('should render the Login component for unauthenticated access', () => {
    const { container } = render(
      <PublicRoute isAuthenticated={false}>
        <div>LOGIN</div>
      </PublicRoute>,
    );

    expect(container).toMatchSnapshot();
  });

  it('should redirect to /private for authenticated access', () => {
    const { container } = render(
      <PublicRoute isAuthenticated>
        <div>LOGIN</div>
      </PublicRoute>,
    );

    expect(container).toMatchSnapshot();
  });
});
