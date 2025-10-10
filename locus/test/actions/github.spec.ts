import { getRepos } from 'actions/github';

describe('actions/github', () => {
  it('getRepos', () => {
    expect(getRepos('react')).toMatchSnapshot();
  });
});
