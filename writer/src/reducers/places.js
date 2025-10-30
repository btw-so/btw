import { createReducer } from "@reduxjs/toolkit";

import { STATUS } from "literals";

import {
  getPlaces,
  getPlacesSuccess,
  getPlacesFailure,
} from "actions";

export const placesState = {
  placesList: {
    status: STATUS.IDLE,
    data: [],
    error: null,
  },
};

export default {
  places: createReducer(placesState, (builder) => {
    builder
      .addCase(getPlaces, (draft) => {
        draft.placesList.status = STATUS.RUNNING;
      })
      .addCase(getPlacesSuccess, (draft, action) => {
        draft.placesList.status = STATUS.SUCCESS;
        draft.placesList.data = action.payload.places || [];
        draft.placesList.error = null;
      })
      .addCase(getPlacesFailure, (draft, action) => {
        draft.placesList.status = STATUS.ERROR;
        draft.placesList.error = action.payload;
      });
  }),
};
