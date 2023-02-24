import React from 'react';

import Loader from 'components/Loader';

import { render, screen } from 'test-utils';

describe('Loader', () => {
  describe('with type `grow` (default)', () => {
    it('should render properly', () => {
      render(<Loader />);

      expect(screen.getByTestId('Loader')).toMatchSnapshot();
    });

    it('should render properly with options', () => {
      render(<Loader block size={100} />);

      expect(screen.getByTestId('Loader')).toMatchSnapshot();
    });
  });

  describe('with type `pulse`', () => {
    it('should render properly', () => {
      render(<Loader type="pulse" />);

      expect(screen.getByTestId('Loader')).toMatchSnapshot();
    });

    it('should render properly with options', () => {
      render(<Loader block type="pulse" />);

      expect(screen.getByTestId('Loader')).toMatchSnapshot();
    });
  });

  describe('with type `rotate`', () => {
    it('should render properly', () => {
      render(<Loader type="rotate" />);

      expect(screen.getByTestId('Loader')).toMatchSnapshot();
    });

    it('should render properly with options', () => {
      render(<Loader block type="rotate" />);

      expect(screen.getByTestId('Loader')).toMatchSnapshot();
    });
  });
});
