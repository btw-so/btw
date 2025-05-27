import React from 'react';
import PublicNoteContainer from '../containers/PublicNoteContainer';

function PublicNote() {
  return (
    <div className="w-full h-full min-h-full flex-grow flex flex-col">
      <PublicNoteContainer />
    </div>
  );
}

export default PublicNote;
