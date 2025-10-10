import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function PublicRoute(props) {
  const { children, isLoggedIn, to = '/' } = props;
  const { state } = useLocation();

  return isLoggedIn ? <Navigate to={state?.redirect || to} /> : children;
}
