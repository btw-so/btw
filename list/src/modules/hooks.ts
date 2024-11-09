import { shallowEqual, useSelector } from 'react-redux';

import { RootState } from 'types';

export function useAppSelector<TReturn>(selector: (state: RootState) => TReturn) {
  return useSelector(selector, shallowEqual);
}
