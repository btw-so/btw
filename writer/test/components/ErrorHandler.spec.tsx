import React from 'react';

import ErrorHandler from 'components/ErrorHandler';

import { fireEvent, render, screen } from 'test-utils';

const mockResetError = jest.fn();

describe('ErrorHandler', () => {
  it('should render the error and clicks', () => {
    render(<ErrorHandler error={new Error('Oh No!')} resetErrorBoundary={mockResetError} />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByTestId('ErrorHandler')).toMatchSnapshot();
    expect(mockResetError).toHaveBeenCalledTimes(1);
  });
});
