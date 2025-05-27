import React from 'react';
import styled, { keyframes } from 'styled-components';
import { px } from 'styled-minimal';

import { appColor } from 'modules/theme';

const grow = ({ size }) => keyframes`
  0% {
    height: 0;
    width: 0;
  }

  30% {
    border-width: ${px(size && size / 2.5)};
    opacity: 1;
  }

  100% {
    border-width: 0;
    height: ${px(size)};
    opacity: 0;
    width: ${px(size)};
  }
`;

const rotate = keyframes`
  100% {
    transform: rotate(360deg);
  }
`;

const ripple = ({ size }) => keyframes`
  0% {
    height: 0;
    left: ${px(size / 2)};
    opacity: 1;
    top: ${px(size / 2)};
    width: 0;
  }

  100% {
    height: ${px(size)};
    left: 0;
    opacity: 0;
    top: 0;
    width: ${px(size)};
  }
`;

/* stylelint-disable unit-disallowed-list */
const dash = keyframes`
  0% {
    stroke-dasharray: 1, 200;
    stroke-dashoffset: 0;
  }

  50% {
    stroke-dasharray: 89, 200;
    stroke-dashoffset: -35px;
  }

  100% {
    stroke-dasharray: 89, 200;
    stroke-dashoffset: -124px;
  }
`;
/* stylelint-enable unit-disallowed-list */

const LoaderGrow = styled.div`
  display: ${props => (props.block ? 'flex' : 'inline-flex')};
  height: ${props => px(props.size)};
  margin: ${props => (props.block ? '2rem' : 0)} auto;
  position: relative;
  width: ${props => px(props.size)};

  > div {
    animation: ${grow} 1.15s infinite cubic-bezier(0.2, 0.6, 0.36, 1);
    border: 0 solid ${props => props.color};
    border-radius: 50%;
    box-sizing: border-box;
    height: 0;
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 0;
  }
`;

const LoaderPulse = styled.div`
  display: ${props => (props.block ? 'flex' : 'inline-flex')};
  height: ${props => px(props.size)};
  margin: ${props => (props.block ? '2rem' : 0)} auto;
  position: relative;
  width: ${props => px(props.size)};

  > div {
    animation: ${ripple} 1.2s cubic-bezier(0, 0.2, 0.8, 1) infinite;
    border: ${props => px(Math.round(props.size / 16))} solid ${props => props.color};
    border-radius: 50%;
    opacity: 1;
    position: absolute;
  }

  > div:nth-child(2) {
    animation-delay: -0.5s;
  }
`;

const LoaderRotate = styled.div`
  display: ${props => (props.block ? 'flex' : 'inline-flex')};
  margin: ${props => (props.block ? '2rem' : 0)} auto;
  text-align: center;
`;

const LoaderRotateSVG = styled.svg.attrs({
  viewBox: '25 25 50 50',
})`
  animation: ${rotate} 2s linear infinite;
  height: ${props => px(props.size)};
  margin: auto;
  transform-origin: center center;
  width: ${props => px(props.size)};
`;

const LoaderRotateCircle = styled.circle`
  animation: ${dash} 1.5s ease-in-out infinite;
  stroke: ${props => props.color};
  stroke-dasharray: 1, 200;
  stroke-dashoffset: 0;
  stroke-linecap: round;
`;

const Loader = ({
  color = appColor,
  size = 32,
  type = 'grow',
  block,
  ...props
}) => {
  let output;

  if (type === 'rotate') {
    output = (
      <LoaderRotate color={color} size={size} block={block} {...props} data-testid="Loader">
        <LoaderRotateSVG color={color} size={size} block={block} {...props}>
          <LoaderRotateCircle color={color} size={size} block={block} {...props} cx="50" cy="50" fill="none" r="20" strokeWidth={2} />
        </LoaderRotateSVG>
      </LoaderRotate>
    );
  } else if (type === 'pulse') {
    output = (
      <LoaderPulse color={color} size={size} block={block} {...props} data-testid="Loader">
        <div />
        <div />
      </LoaderPulse>
    );
  } else {
    output = (
      <LoaderGrow color={color} size={size} block={block} {...props} data-testid="Loader">
        <div />
      </LoaderGrow>
    );
  }

  return output;
};

export default Loader;
 