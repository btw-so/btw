import React from 'react';
import Tiptap from '../components/Tiptap';
import useCookie from '../hooks/useCookie';

function Dash(props) {
  const [token, setToken] = useCookie('btw_uuid', '');

  console.log('A', token, props.userId);

  if (token) {
    return (
      <div className="w-full h-full min-h-full">
        {token && props.userId ? (
          <Tiptap
            className="h-full"
            token={token}
            userId={props.userId}
            docId={'1'}
            onChange={html => {
              // TODO: call an action to save the document
              console.log(html);
            }}
          />
        ) : null}
      </div>
    );
  }
}

export default Dash;
