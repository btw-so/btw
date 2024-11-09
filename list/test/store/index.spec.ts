import { configStore } from 'store';

describe('store', () => {
  it('should be able to create a new store', () => {
    expect(configStore().store.getState()).toMatchSnapshot();
  });
});
