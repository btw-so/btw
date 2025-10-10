import React, { useCallback } from 'react';
import styled from 'styled-components';
import { Button, Heading } from 'styled-minimal';

export const ReloadWrapper = styled.div`
  button {
    pointer-events: all;
  }
`;

function Reload() {
  const handleClick = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <ReloadWrapper data-testid="Reload">
      <Heading as="h6" mb={3}>
        There's a new version of this app!
      </Heading>
      <Button invert onClick={handleClick} size="sm" variant="dark">
        Reload
      </Button>
    </ReloadWrapper>
  );
}

export default Reload; 