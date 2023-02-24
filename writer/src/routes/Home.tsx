import React from 'react';
// import { useDispatch } from 'react-redux';
// import styled from 'styled-components';
// import { Button, Container, responsive, Text } from 'styled-minimal';
// import '../styles.css';
// import { spacer } from 'modules/theme';
// import { name } from 'config';
// import { STATUS } from 'literals';

// import { login } from 'actions';

// import Background from 'components/Background';
// import Icon from 'components/Icon';
// import Logo from 'components/Logo';
import Tiptap from 'components/Tiptap';

// import { RootState } from 'types';

function Home() {
  // const dispatch = useDispatch();
  // const status = useSelector<RootState>(({ user }) => user.status);

  // const handleClickLogin = () => {
  //   dispatch(login());
  // };

  return (
    // <Background key="Home" data-testid="Home">
    <div className="w-full h-full min-h-full">
      <div className="m-2 p-2 border-2 focus:outline-none ring-offset-0 ring-0 mx-auto w-full max-w-5xl h-full">
        <Tiptap className="h-full" />
      </div>
    </div>
    // </Background>
  );
}

export default Home;
