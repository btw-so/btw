import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface Props {
  children: React.ReactElement;
  isAuthenticated: boolean;
  to?: string;
}

export default function PrivateRoute(props: Props): JSX.Element {
  const { children, isAuthenticated, to = '/login' } = props;
  const { pathname } = useLocation();

  return isAuthenticated ? (
    children
  ) : (
    <Navigate state={{ redirect: pathname, isAuthenticated }} to={to} />
  );
}
