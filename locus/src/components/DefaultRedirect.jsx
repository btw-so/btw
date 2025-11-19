import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from 'modules/hooks';

export default function DefaultRedirect() {
  const pinnedNodes = useAppSelector((state) => state.list.pinnedNodes);

  // Check if user has pinned nodes
  const hasPinnedNodes = pinnedNodes?.data && pinnedNodes.data.length > 0;

  // Check localStorage for cached info
  const cachedHasPinned = localStorage.getItem('hasPinnedNodes');

  // Store in localStorage whenever it changes
  useEffect(() => {
    if (pinnedNodes?.data) {
      localStorage.setItem('hasPinnedNodes', hasPinnedNodes ? 'true' : 'false');
    }
  }, [hasPinnedNodes]);

  // Decide where to redirect
  const redirectTo = (cachedHasPinned === 'true' || hasPinnedNodes) ? '/dash' : '/list';

  return <Navigate to={redirectTo} replace />;
}
