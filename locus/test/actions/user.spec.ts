import { login, logOut } from 'actions/user';

describe('actions/user', () => {
  it('login', () => {
    expect(login()).toMatchSnapshot();
  });

  it('logOut', () => {
    expect(logOut()).toMatchSnapshot();
  });
});
