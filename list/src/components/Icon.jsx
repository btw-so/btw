import React from 'react';
import SVG from 'react-inlinesvg';
import styled from 'styled-components';
import { px } from 'styled-minimal';

// import { Icons } from 'types'; // Removed TypeScript type import

// Removed TypeScript interface Props
// function Icon({ name, width = 20 }: Props) {
function Icon({ name, width = 20 }) {
  return (
    <IconWrapper
      height="100%"
      src={`${process.env.PUBLIC_URL}/media/icons/${name}.svg`}
      width={px(width)}
    />
  );
}

const IconWrapper = styled(SVG)`
  display: inline-block;
  line-height: 0;

  svg {
    height: auto;
    max-height: 100%;
    width: ${({ width }) => width};
  }
`;

export default Icon;
