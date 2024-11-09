import React from 'react';
import { config } from 'react-transition-group';

import { ActionTypes } from 'literals';

import { showAlert } from 'actions';

import SystemAlerts from 'containers/SystemAlerts';

import { fireEvent, render, screen } from 'test-utils';

config.disabled = true;

jest.mock('components/Transition', () => ({ children }) => (
  <div className="transition">{children}</div>
));

jest.useFakeTimers();

const mockDispatch = jest.fn();

describe('SystemAlerts', () => {
  it('should render all zones', () => {
    const { container } = render(<SystemAlerts />);

    expect(container).toMatchSnapshot();
  });

  it('should render an alert and hide itself after the timeout', async () => {
    render(<SystemAlerts />, {
      actions: [
        showAlert('Hello World', {
          position: 'top-left',
          variant: 'success',
        }),
      ],
      mockDispatch,
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();

    jest.runOnlyPendingTimers();

    expect(mockDispatch).toHaveBeenCalledWith({
      type: ActionTypes.HIDE_ALERT,
      payload: '8cdee72f-28d4-4441-91f0-c61f6e3d9684',
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should render an alert without timeout and close it', () => {
    render(<SystemAlerts />, {
      actions: [
        showAlert('Hello Mars', {
          id: 'ABD13',
          position: 'bottom-right',
          variant: 'dark',
          timeout: 0,
        }),
      ],
      mockDispatch,
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.queryByRole('alert')?.querySelector('button')!);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
