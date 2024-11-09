import React from 'react';
import SVG from 'react-inlinesvg';
import styled from 'styled-components';
import { px } from 'styled-minimal';

import { Icons } from 'types';

interface Props {
  name: Icons;
  width?: number;
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

function Icon({ name, width = 20 }: Props) {
  return (
    <IconWrapper
      height="100%"
      src={`${process.env.PUBLIC_URL}/media/icons/${name}.svg`}
      width={px(width)}
    />
  );
}

export default Icon;
