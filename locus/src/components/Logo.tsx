import React from 'react';
import SVG from 'react-inlinesvg';
import styled from 'styled-components';

export const Wrapper = styled.div`
  align-items: flex-start;
  display: inline-flex;
  font-size: 0;

  svg {
    height: 4.2rem;
    max-height: 100%;
    width: auto;
  }
`;

function Logo() {
  return (
    <Wrapper>
      <SVG src={`${process.env.PUBLIC_URL}/media/brand/icon.svg`} />
    </Wrapper>
  );
}

export default Logo;
