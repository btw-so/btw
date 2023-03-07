import React from 'react';
import DashContainer from '../containers/DashContainer';

function Dash(props) {
  return (
    <div className="w-full h-full flex-grow flex flex-col">
      <DashContainer {...props} />
    </div>
  );
}

export default Dash;
