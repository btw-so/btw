import React from 'react';

import PrivateRoute from 'components/PrivateRoute';

import { render } from 'test-utils';

describe('PrivateRoute', () => {
  it('should redirect for unauthenticated access', () => {
    const { container } = render(
      <PrivateRoute isAuthenticated={false}>
        <div>PRIVATE</div>
      </PrivateRoute>,
    );

    expect(container).toMatchSnapshot();
  });

  it('should allow navigation for authenticated access', () => {
    const { container } = render(
      <PrivateRoute isAuthenticated>
        <div>PRIVATE</div>
      </PrivateRoute>,
    );

    expect(container).toMatchSnapshot();
  });
});
