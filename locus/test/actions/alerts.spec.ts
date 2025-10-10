import { hideAlert, showAlert } from 'actions/alerts';

describe('actions/alerts', () => {
  describe('showAlert', () => {
    it('should return an action with variant `error`', () => {
      expect(showAlert('Alright!', { id: 'test', variant: 'danger' })).toMatchSnapshot();
    });

    it('should return an action with variant `success`', () => {
      expect(
        showAlert('Alright!', { id: 'test', variant: 'success', timeout: 10 }),
      ).toMatchSnapshot();
    });
  });

  describe('hideAlert', () => {
    it('should return an action', () => {
      expect(hideAlert('test')).toMatchSnapshot();
    });
  });
});
