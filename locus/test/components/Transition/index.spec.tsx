import React from 'react';

import Transition from 'components/Transition/index';

import { render } from 'test-utils';

describe('Transition', () => {
  it('should render properly', () => {
    const { container } = render(
      <Transition transition="fade">
        <div className="transition" />
      </Transition>,
    );

    expect(container).toMatchSnapshot();
  });

  it("should not render if transition don't exist", () => {
    const { container } = render(
      // @ts-ignore
      <Transition transition="rotate">
        <div className="transition" />
      </Transition>,
    );

    expect(container).toMatchSnapshot();
  });
});
