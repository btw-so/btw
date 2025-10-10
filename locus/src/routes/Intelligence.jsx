import React from 'react';
import IntelligenceContainer from '../containers/IntelligenceContainer';

function Intelligence(props) {
  return (
    <div className="w-full h-full min-h-full flex-grow flex flex-col">
      <IntelligenceContainer {...props} />
    </div>
  );
}

export default Intelligence;
