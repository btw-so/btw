import { selectApp, selectGitHub, selectUser } from 'selectors';
import { configStore } from 'store';

describe('selectors', () => {
  const { store } = configStore();

  describe('selectApp', () => {
    it('should return the app', () => {
      expect(selectApp(store.getState())).toMatchSnapshot();
    });
  });

  describe('selectGitHub', () => {
    it('should return the github', () => {
      expect(selectGitHub(store.getState())).toMatchSnapshot();
    });
  });

  describe('selectUser', () => {
    it('should return the user', () => {
      expect(selectUser(store.getState())).toMatchSnapshot();
    });
  });
});
