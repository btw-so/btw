import React from 'react';
import { Button, Container, Paragraph } from 'styled-minimal';

import Icon from 'components/Icon';

interface Props {
  error: Error;
  resetErrorBoundary: () => void;
}

export default function ErrorHandler({ error, resetErrorBoundary }: Props) {
  const handleClickReset = () => {
    resetErrorBoundary();
  };

  return (
    <Container data-testid="ErrorHandler" fullScreen verticalAlign="center">
      <Icon name="exclamation-circle" width={64} />
      <Paragraph my={3}>{error.message}</Paragraph>

      <Button onClick={handleClickReset} variant="red">
        Tentar novamente
      </Button>
    </Container>
  );
}
