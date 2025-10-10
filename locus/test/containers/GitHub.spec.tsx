import React from 'react';

import { ActionTypes } from 'literals';

import GitHub from 'containers/GitHub';

import githubRepos from 'test/__fixtures__/github-repos.json';
import { fireEvent, render, screen, waitFor } from 'test-utils';

const mockDispatch = jest.fn();

describe('GitHub', () => {
  afterEach(() => {
    mockDispatch.mockClear();
    fetchMock.resetMocks();
  });

  it('should render a loader and dispatch the action', () => {
    const { container } = render(<GitHub />, { mockDispatch });

    expect(container).toMatchSnapshot();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: ActionTypes.GITHUB_GET_REPOS_REQUEST,
      payload: 'react',
    });
  });

  it('should render the repos', async () => {
    fetchMock.mockResponse(JSON.stringify({ items: githubRepos.items.slice(0, 2) }));

    render(<GitHub />);
    const repos = await screen.findByTestId('GitHubGrid');

    expect(repos.outerHTML).toMatchSnapshot();
  });

  it("should render a message if there's no data", async () => {
    fetchMock.mockResponse(JSON.stringify({ items: [] }));

    render(<GitHub />);

    const repos = await screen.findByText('Nothing found');

    expect(repos).toMatchSnapshot();
  });

  it('should dispatch an action when click selector button', async () => {
    fetchMock.mockResponse(JSON.stringify({ items: [] }));
    render(<GitHub />, { mockDispatch });

    fireEvent.click(screen.getByRole('button', { name: 'Redux' }));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'GITHUB_GET_REPOS_REQUEST',
      payload: 'redux',
    });
  });

  it('should dispatch an alert with errors', async () => {
    fetchMock.mockReject(new Error('Nothing found'));

    render(<GitHub />, { mockDispatch });

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SHOW_ALERT',
        payload: {
          id: '8cdee72f-28d4-4441-91f0-c61f6e3d9684',
          icon: 'dot-circle-o',
          message: 'Nothing found',
          position: 'bottom-right',
          variant: 'danger',
          timeout: 0,
        },
      });
    });
  });
});
