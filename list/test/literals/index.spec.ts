import { ActionTypes, STATUS } from 'literals';

describe('literals', () => {
  it('should match the snapshot', () => {
    expect(ActionTypes).toMatchSnapshot();
    expect(STATUS).toMatchSnapshot();
  });
});
