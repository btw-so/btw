import React, { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useUpdateEffect } from 'react-use';
import { selectApp, selectGitHub } from 'selectors';
import styled from 'styled-components';
import {
  Button,
  ButtonGroup,
  Flex,
  Grid,
  Heading,
  Image,
  Link,
  Paragraph,
  responsive,
} from 'styled-minimal';
import useTreeChanges from 'tree-changes-hook';

import { useAppSelector } from 'modules/hooks';
import theme, { appColor, spacer } from 'modules/theme';

import { topic } from 'config';
import { STATUS } from 'literals';

import { getRepos, setAppOptions, showAlert } from 'actions';

import Loader from 'components/Loader';

const Item = styled(Link)`
  align-items: center;
  border: solid 0.1rem ${appColor};
  border-radius: 0.4rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: ${spacer(3)};
  text-align: center;
  width: 100%;
  /* stylelint-disable */
  ${responsive({
    md: {
      padding: spacer(3),
    },
    lg: {
      padding: spacer(4),
    },
  })};
  /* stylelint-enable */

  p {
    color: #000;
  }

  img {
    height: 8rem;
    margin-bottom: ${spacer(2)};
  }
`;

const ItemHeader = styled.div`
  margin-bottom: ${spacer(3)};

  small {
    color: ${theme.colors.gray60};
  }
`;

function GitHub() {
  const dispatch = useDispatch();
  const gitHub = useAppSelector(selectGitHub);
  const { query } = useAppSelector(selectApp);

  const { changed } = useTreeChanges(gitHub.topics[query] || topic);

  const { data = [], message = '', status = STATUS.IDLE } = gitHub.topics[query] || topic;

  useEffect(() => {
    dispatch(getRepos(query));
  }, [dispatch, query]);

  useUpdateEffect(() => {
    if (changed('status', STATUS.ERROR)) {
      dispatch(showAlert(message, { variant: 'danger' }));
    }
  }, [changed, dispatch, message]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const { value = '' } = event.currentTarget.dataset;

      dispatch(setAppOptions({ query: value }));
    },
    [dispatch],
  );

  const isRunning = status === STATUS.RUNNING;
  let output;

  if (status === STATUS.SUCCESS) {
    output = data.length ? (
      <Grid
        data-testid="GitHubGrid"
        data-value={query}
        gridGap={{
          _: spacer(2),
          sm: spacer(3),
          xl: spacer(4),
        }}
        gridTemplateColumns={{
          _: '100%',
          md: 'repeat(2, 1fr)',
          lg: 'repeat(3, 1fr)',
          xl: 'repeat(4, 1fr)',
        }}
        m="0 auto"
        mt={5}
        padding={0}
        width={{
          _: '100%',
          sm: '90%',
        }}
      >
        {data.map((d: Record<string, any>) => (
          <Item key={d.id} href={d.html_url} target="_blank">
            <Image alt={d.owner.login} src={d.owner.avatar_url} />
            <ItemHeader>
              <Heading as="h5" h={100} lineHeight={1}>
                {d.name}
              </Heading>
              <small>{d.owner.login}</small>
            </ItemHeader>
            <Paragraph>{d.description}</Paragraph>
          </Item>
        ))}
      </Grid>
    ) : (
      <h3>Nothing found</h3>
    );
  } else {
    output = <Loader block />;
  }

  return (
    <div key="GitHub" data-testid="GitHubWrapper">
      <Flex justifyContent="center">
        <ButtonGroup aria-label="GitHub Selector" data-testid="GitHubSelector" role="group">
          <Button
            busy={query === 'react' && isRunning}
            data-value="react"
            invert={query !== 'react'}
            onClick={handleClick}
            size="lg"
          >
            React
          </Button>
          <Button
            busy={query === 'redux' && isRunning}
            data-value="redux"
            invert={query !== 'redux'}
            onClick={handleClick}
            size="lg"
          >
            Redux
          </Button>
        </ButtonGroup>
      </Flex>
      {output}
    </div>
  );
}

export default GitHub;
