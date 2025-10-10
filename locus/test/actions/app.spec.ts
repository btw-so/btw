import { setAppOptions } from 'actions/app';

describe('actions/app', () => {
  describe('setAppOptions', () => {
    it('should return an action', () => {
      expect(setAppOptions({ query: 'react' })).toMatchSnapshot();
    });
  });
});
