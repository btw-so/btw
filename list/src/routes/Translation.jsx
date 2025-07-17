import React from 'react';
import TranslationContainer from '../containers/TranslationContainer';

function Translation(props) {
  return (
    <div className="w-full h-full min-h-full flex-grow flex flex-col">
      <TranslationContainer {...props} />
    </div>
  );
}

export default Translation; 