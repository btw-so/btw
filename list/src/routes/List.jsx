import React from "react";
import ListContainer from "../containers/ListContainer";

function List(props) {
  return (
    <div className="w-full h-full min-h-full flex flex-col flex-grow">
      <ListContainer {...props} />
    </div>
  );
}

export default List;
