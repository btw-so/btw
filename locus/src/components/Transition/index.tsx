import React from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

import { Transitions } from 'types';

import transitions, { classNames } from './transitions';

interface Props {
  appear: boolean;
  children: React.ReactNode;
  className?: string;
  enter: boolean;
  exit: boolean;
  style?: React.CSSProperties;
  timeout: number;
  transition: Transitions;
}

function Transition({ children, className, style, transition, ...rest }: Props) {
  const Component = transitions[transition];

  if (!Component) {
    console.error(`Invalid transition: ${transition}`); // eslint-disable-line no-console

    return null;
  }

  return (
    <TransitionGroup className={className} style={style}>
      {React.Children.toArray(children)
        .filter(child => !!child)
        .map((child, key) => (
          <CSSTransition key={key} classNames={classNames[transition]} {...rest}>
            <Component>{child}</Component>
          </CSSTransition>
        ))}
    </TransitionGroup>
  );
}

Transition.defaultProps = {
  appear: true,
  enter: true,
  exit: true,
  timeout: 300,
  transition: 'fade',
};

export default Transition;
