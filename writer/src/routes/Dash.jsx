import React from 'react';
import DashContainer from '../containers/DashContainer';

function Dash(props) {
  return (
    <div className="w-full h-full min-h-full">
      <DashContainer {...props} />
    </div>
  );
}

export default Dash;
