import { createAction } from "@reduxjs/toolkit";

import { ActionTypes } from "literals";

export const getPlaces = createAction(ActionTypes.GET_PLACES, (data) => ({
  payload: data,
}));

export const getPlacesSuccess = createAction(
  ActionTypes.GET_PLACES_SUCCESS,
  (data) => ({
    payload: data,
  })
);

export const getPlacesFailure = createAction(
  ActionTypes.GET_PLACES_FAILURE,
  (data) => ({
    payload: data,
  })
);
