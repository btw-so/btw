import React from 'react';

import { navigate } from 'test-utils';

export * from 'react-router-dom/umd/react-router-dom.development';

export function Link(props) {
  const { children, className, onClick, style, to, ...rest } = props;

  delete rest.end;

  return (
    <a
      className={typeof className === 'function' ? undefined : className}
      href={to.pathname || to}
      onClick={event => {
        event.preventDefault();
        const [pathname, search] = (event.currentTarget.getAttribute('href') || '').split('?');

        navigate({ pathname, search });

        if (typeof onClick === 'function') {
          onClick(event);
        }
      }}
      style={style}
      {...rest}
    >
      {children}
    </a>
  );
}

export function NavLink(props) {
  const {
    activeClassName,
    activeStyle,
    className,
    isActive: getIsActive,
    style,
    to,
    ...rest
  } = props;
  let match;

  if ((to.pathname || to) === window.location.pathname) {
    match = { path: window.location.pathname };
  }

  const isActive = typeof getIsActive === 'function' ? getIsActive(match, window.location) : null;

  return (
    <Link
      className={isActive ? [activeClassName, className].join(' ') : className}
      style={isActive ? { ...style, ...activeStyle } : style}
      to={to}
      {...rest}
    />
  );
}

export function Navigate({ to }) {
  return (
    <div data-component-name="Navigate" data-to={to.pathname}>
      NAVIGATE
    </div>
  );
}

export function useParams() {
  return {};
}

export function useLocation() {
  return {};
}
