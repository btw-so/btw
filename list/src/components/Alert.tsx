import React from 'react';
import styled from 'styled-components';
import { Alert as AlertComponent, Box } from 'styled-minimal';
import { Variants } from 'styled-minimal/lib/types';

import { spacer, variants } from 'modules/theme';

import Icon from 'components/Icon';

import { Icons } from 'types';

interface Props {
  children: React.ReactNode;
  handleClickClose?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  icon?: Icons;
  id?: string;
  variant?: string;
}

AlertComponent.displayName = 'AlertComponent';

const AlertIcon = styled.div`
  align-items: flex-start;
  background-color: ${({ variant }: { variant: Variants }) => variants[variant]};
  color: #fff;
  display: flex;
`;

const AlertButton = styled.button`
  background-color: ${({ variant }: { variant: Variants }) => variants[variant]};
  color: #fff;
  line-height: 0;
  pointer-events: all;
  position: absolute;
  right: ${spacer(1)};
  top: ${spacer(1)};
`;

function Alert({ children, handleClickClose, icon, id, variant = 'gray', ...rest }: Props) {
  const output: Record<string, any> = {};
  let name: Icons;

  switch (variant) {
    case 'success': {
      name = icon || 'check-circle';
      break;
    }
    case 'warning': {
      name = icon || 'exclamation-circle';
      break;
    }
    case 'danger': {
      name = icon || 'times-circle';
      break;
    }
    case 'info': {
      name = icon || 'question-circle';
      break;
    }
    case 'dark': {
      name = icon || 'bell-o';
      break;
    }
    default: {
      name = icon || 'dot-circle-o';
    }
  }

  if (handleClickClose) {
    output.button = (
      <AlertButton data-id={id} onClick={handleClickClose} type="button" variant={variant}>
        <Icon name="times" width={10} />
      </AlertButton>
    );
  }

  return (
    <AlertComponent
      {...rest}
      alignItems="center"
      data-testid="Alert"
      display="flex"
      position="relative"
      variant={variant}
    >
      <AlertIcon variant={variant} {...rest}>
        <Icon name={name} width={24} />
      </AlertIcon>
      <Box pl={handleClickClose ? 3 : 2}>{children}</Box>
      {output.button}
    </AlertComponent>
  );
}

export default Alert;
