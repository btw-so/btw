import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function PrivateRoute(props) {
  const { children, isLoggedIn, to = '/login' } = props;
  const { pathname } = useLocation();

  return isLoggedIn ? children : <Navigate state={{ redirect: pathname, isLoggedIn }} to={to} />;
}
