import React from 'react';
import { createGlobalStyle } from 'styled-components';

import { appColor } from 'modules/theme';

const GlobalStyle = createGlobalStyle`
  *,
  *:before,
  *:after {
    box-sizing: border-box;
  }

  html {
  /*  -webkit-font-smoothing: antialiased; */
    height: 100%;
  }

  body {
    font-size: 16px; /* stylelint-disable unit-disallowed-list */
    margin: 0;
    min-height: 100vh;
    padding: 0;
  }

  img {
    height: auto;
    max-width: 100%;
  }

  a {
    color: ${appColor};
    text-decoration: none;

    &.disabled {
      pointer-events: none;
    }
  }

  button {
    appearance: none;
    background-color: transparent;
    border: 0;
    cursor: pointer;
    display: inline-block;
    font-family: inherit;
    line-height: 1;
    padding: 0;
  }
`;

export default function GlobalStyles() {
  return <GlobalStyle />;
}
