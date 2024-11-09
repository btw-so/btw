import { createAction } from '@reduxjs/toolkit';

import { ActionTypes } from 'literals';

import { SetAppOOptions } from 'types';

export const setAppOptions = createAction<SetAppOOptions>(ActionTypes.SET_APP_OPTIONS);
