import React from 'react';
import styled from 'styled-components';
import { Box, Container, Heading, Link, Paragraph, Text } from 'styled-minimal';

import { spacer } from 'modules/theme';

import Github from 'containers/GitHub';

const Header = styled.div`
  margin-bottom: ${spacer(3)};
  text-align: center;
`;

function Private() {
  return (
    <Box key="Private" data-testid="Private">
      <Container ySpacing>
        <Header>
          <h1 className="mt-2 text-5xl">Oh hai!</h1>
          <Paragraph>
            You can get this boilerplate{' '}
            <Link
              href="https://github.com/gilbarbara/react-redux-saga-boilerplate/"
              target="_blank"
            >
              here
            </Link>
          </Paragraph>
        </Header>
        <Box mb={4} textAlign="center">
          <Heading as="h5">Here's some GitHub data</Heading>
          <Text fontSize={1}>
            <i>*Just to have some requests in the sagas...</i>
          </Text>
        </Box>
        <Github />
      </Container>
    </Box>
  );
}

export default Private;
