import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Container, Heading } from 'styled-minimal';

import Background from 'components/Background';

const StyledContainer = styled(Container)`
  align-items: center;
  text-align: center;

  h1,
  a {
    color: #fff;
    line-height: 1;
  }

  a {
    text-decoration: underline;
  }
`;

function NotFound() {
  // use effect to see if this is the first time it is being displayed
  // if it is, then redirect to "/"
  // if it is not, then leave as is
  let navigate = useNavigate();

  useEffect(() => {
    const firstTime = localStorage.getItem('firstTime');
    if (!firstTime) {
      localStorage.setItem('firstTime', 'true');
      navigate('/');
    }
  }, []);

  return (
    <Background key="404" data-testid="NotFound">
      <StyledContainer fullScreen ySpacing>
        <Heading fontSize={100}>404</Heading>
        <Link to="/">
          <Heading as="h2">go home</Heading>
        </Link>
      </StyledContainer>
    </Background>
  );
}

export default NotFound;
