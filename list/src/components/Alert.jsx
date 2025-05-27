import React from 'react';
import styled from 'styled-components';
import { Alert as AlertComponent, Box } from 'styled-minimal';
import { Variants } from 'styled-minimal/lib/types';

import { spacer, variants } from 'modules/theme';

import Icon from 'components/Icon';

import { Icons } from 'types';

const AlertIcon = styled.div`
  align-items: flex-start;
  background-color: ${({ variant }) => variants[variant]};
  color: #fff;
  display: flex;
`;

const AlertButton = styled.button`
  background-color: ${({ variant }) => variants[variant]};
  color: #fff;
  line-height: 0;
  pointer-events: all;
  position: absolute;
  right: ${spacer(1)};
  top: ${spacer(1)};
`;

AlertComponent.displayName = 'AlertComponent';

function Alert({ children, handleClickClose, icon, id, variant = 'gray', ...rest }) {
  let name;

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
      {handleClickClose && (
        <AlertButton data-id={id} onClick={handleClickClose} type="button" variant={variant}>
          <Icon name="times" width={10} />
        </AlertButton>
      )}
    </AlertComponent>
  );
}

export default Alert;
